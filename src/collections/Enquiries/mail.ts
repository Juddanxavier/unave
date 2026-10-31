import type { Payload } from 'payload'

import type { Footer } from '@/payload-types'
import { sendSystemMail } from '@/email'
import type { MailStatus } from '@/email/types'

import type { Enquiry } from './schema'

/**
 * The kitchen's copy of a new enquiry.
 *
 * The row in the `enquiries` collection is the record; this email is the knock on
 * the shoulder. The reply address is the enquirer's own, so answering the message
 * is just answering the mail. The recipient is the contact email the footer global
 * already manages for the site — one place to change it — and when none is set the
 * notice is skipped rather than guessed: the row still lands in the admin.
 */

export type EnquiryNotice = {
  reason: MailStatus | 'no-recipient'
  sent: boolean
}

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Split out so the shape of the message can be tested without a transport. */
export const enquiryMailContent = (enquiry: Enquiry): {
  html: string
  subject: string
  text: string
} => {
  const subject = `New enquiry from ${enquiry.name}`
  const lines = [
    `Name: ${enquiry.name}`,
    `Email: ${enquiry.email}`,
    `Phone: ${enquiry.phone || 'not given'}`,
    '',
    enquiry.message,
  ]

  return {
    html: [
      '<p>',
      `${escapeHtml(enquiry.name)} (${escapeHtml(enquiry.email)}) wrote from the contact form:`,
      '</p><p>',
      escapeHtml(enquiry.message).replace(/\n/g, '<br/>'),
      `</p><p>Phone: ${escapeHtml(enquiry.phone || 'not given')}</p>`,
    ].join(''),
    subject,
    text: lines.join('\n'),
  }
}

export const sendEnquiryNotice = async (
  payload: Payload,
  enquiry: Enquiry,
): Promise<EnquiryNotice> => {
  const footer = (await payload.findGlobal({ slug: 'footer', depth: 0 })) as Footer | null
  const to = footer?.contact?.email?.trim() ?? ''

  if (!to) {
    payload.logger.warn({ msg: 'enquiry_no_recipient' })
    return { reason: 'no-recipient', sent: false }
  }

  const { html, subject, text } = enquiryMailContent(enquiry)
  const result = await sendSystemMail(payload, {
    html,
    replyTo: enquiry.email,
    subject,
    text,
    to,
  })

  if (result.status === 'failed') {
    payload.logger.error({ msg: 'enquiry_notice_failed', status: result.status })
  } else if (result.status === 'skipped') {
    // No transport is configured. The row is the record; the admin is the inbox.
    payload.logger.warn({ msg: 'enquiry_notice_skipped' })
  }

  return { reason: result.status, sent: result.status === 'sent' }
}
