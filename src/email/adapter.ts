import type { EmailAdapter } from 'payload'

import { toRecipientList, toRecipientText } from './recipient'
import { sendSystemMail } from './send'
import type { MailResult } from './types'

const body = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (Buffer.isBuffer(value)) return value.toString('utf8')

  return ''
}

/**
 * Payload's single mail adapter. Template mail calls the module directly; every
 * other message (password resets, form notifications) lands here and is logged
 * under the `system` template key.
 */
export const unaveEmailAdapter: EmailAdapter<MailResult> = ({ payload }) => ({
  defaultFromAddress: process.env.MAIL_FROM_ADDRESS ?? '',
  defaultFromName: process.env.MAIL_FROM_NAME ?? '',
  name: 'unave',
  sendEmail: async (message) => {
    const replyTo = toRecipientText(message.replyTo)

    return sendSystemMail(payload, {
      attachments: message.attachments ?? undefined,
      bcc: toRecipientList(message.bcc),
      cc: toRecipientList(message.cc),
      html: body(message.html),
      replyTo: replyTo || undefined,
      subject: message.subject,
      text: body(message.text),
      to: toRecipientText(message.to),
    })
  },
})
