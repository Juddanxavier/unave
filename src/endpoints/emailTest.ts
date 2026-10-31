import type { Endpoint, PayloadRequest } from 'payload'

import { hasAdminRole } from '@/access/isAdmin'
import { isValidRecipient, normalizeRecipientText } from '@/email/recipient'
import { sendSystemMail } from '@/email/send'

const HOUR_MS = 60 * 60 * 1000
const RATE_LIMIT = 5

type TestBody = {
  to?: unknown
}

const readBody = async (req: PayloadRequest): Promise<TestBody> => {
  try {
    const body = await req.json?.()
    return body && typeof body === 'object' ? (body as TestBody) : {}
  } catch {
    return {}
  }
}

const TEST_SUBJECT = 'Unave test email'
const TEST_TEXT =
  'This is a test message from the Unave dashboard. If you can read it, the mail path works.'
const TEST_HTML = `<p>${TEST_TEXT}</p>`

/**
 * Admin only test send. Rejected requests (auth, validation, rate limit) write
 * no log row; a send that starts writes exactly one.
 *
 * The message is plain rather than a template, so a test can never be mistaken
 * for a real customer email. It logs under the system key with the admin as the
 * trigger, and the hourly limit counts that pair, which nothing else writes.
 */
export const emailTestEndpoint: Endpoint = {
  path: '/email/test',
  method: 'post',
  handler: async (req) => {
    if (!req.user) {
      return Response.json({ message: 'Sign in to send a test email.' }, { status: 401 })
    }

    if (!hasAdminRole(req.user)) {
      return Response.json({ message: 'Only an admin can send a test email.' }, { status: 403 })
    }

    const body = await readBody(req)
    const to = normalizeRecipientText(typeof body.to === 'string' ? body.to : '')

    if (!isValidRecipient(to)) {
      return Response.json({ message: 'Enter a valid email address.' }, { status: 400 })
    }

    const since = new Date(Date.now() - HOUR_MS).toISOString()
    const recent = await req.payload.count({
      collection: 'email-log',
      overrideAccess: true,
      where: {
        and: [
          { triggeredBy: { equals: req.user.id } },
          { templateKey: { equals: 'system' } },
          { createdAt: { greater_than_equal: since } },
        ],
      },
    })

    if (recent.totalDocs >= RATE_LIMIT) {
      return Response.json(
        { message: 'The hourly test limit is reached. Try again later.' },
        { status: 429 },
      )
    }

    const result = await sendSystemMail(req.payload, {
      html: TEST_HTML,
      subject: TEST_SUBJECT,
      text: TEST_TEXT,
      to,
      triggeredBy: req.user.id,
    })

    return Response.json({ status: result.status, transport: result.transport })
  },
}
