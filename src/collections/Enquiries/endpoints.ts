import type { Endpoint } from 'payload'

import {
  backWithError,
  isSameOriginPost,
  readFormFields,
  seeOther,
  withParams,
} from '@/utilities/formPost'
import { checkEnquiryIpLimit, getClientIp } from '@/utilities/rateLimit'

import { sendEnquiryNotice } from './mail'
import { ENQUIRY_HONEYPOT_FIELD, enquirySchema } from './schema'

const CONTACT_PATH = '/contact'

/**
 * The contact form on `/contact` posts here (spec 0006).
 *
 * A Payload collection endpoint rather than a Next server action, for the same
 * reason the password forms are: a plain HTML form works without JavaScript, and
 * the answer is a 303 back to the page with one code on it. The rules in order:
 *
 * 1. Same origin only, like every public post on the site.
 * 2. The honeypot. A filled-in field is a script pretending to be a person; it is
 *    answered with the success redirect and nothing is stored or sent, so the
 *    script learns nothing except that it may stop.
 * 3. Validation against `enquirySchema`.
 * 4. The IP rate limit, because a written row and an emailed notice cost more
 *    than a rejected request.
 * 5. The row, written by Payload with `overrideAccess` (public REST create is off).
 * 6. The notice email. Its failure does not fail the enquiry — the row is the
 *    record, and the admin is the backup inbox.
 */
export const enquiryEndpoint: Endpoint = {
  handler: async (req) => {
    if (!isSameOriginPost(req)) {
      req.payload.logger.warn({ msg: 'enquiry_cross_site_rejected' })
      return backWithError(CONTACT_PATH, 'session')
    }

    const fields = await readFormFields(req)

    if ((fields[ENQUIRY_HONEYPOT_FIELD] ?? '').trim() !== '') {
      req.payload.logger.info({ msg: 'enquiry_honeypot_ignored' })
      return seeOther(withParams(CONTACT_PATH, { sent: '1' }))
    }

    const parsed = enquirySchema.safeParse({
      email: fields.email ?? '',
      message: fields.message ?? '',
      name: fields.name ?? '',
      phone: fields.phone ?? '',
    })

    if (!parsed.success) {
      const field = parsed.error.issues[0]?.path[0]
      const code =
        field === 'email' || field === 'message' || field === 'name' || field === 'phone'
          ? field
          : 'message'

      return backWithError(CONTACT_PATH, code)
    }

    if (checkEnquiryIpLimit(getClientIp(req.headers)).limited) {
      return backWithError(CONTACT_PATH, 'slow')
    }

    try {
      await req.payload.create({
        collection: 'enquiries',
        data: {
          email: parsed.data.email,
          message: parsed.data.message,
          name: parsed.data.name,
          phone: parsed.data.phone || undefined,
        },
        depth: 0,
        overrideAccess: true,
      })
    } catch {
      req.payload.logger.error({ msg: 'enquiry_write_failed' })
      return backWithError(CONTACT_PATH, 'tryagain')
    }

    await sendEnquiryNotice(req.payload, parsed.data)

    return seeOther(withParams(CONTACT_PATH, { sent: '1' }))
  },
  method: 'post',
  path: '/send',
}
