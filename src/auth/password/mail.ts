import type { Payload } from 'payload'

import { sendCustomerAuthMail, renderCustomerAuth } from '@/email'
import { getServerSideURL } from '@/utilities/getURL'

/**
 * The two account security messages. Both carry a link built from a one time
 * token that Payload generated and stored, so this module never decides what a
 * valid token is: it only puts the token in the link.
 *
 * A failed send is logged by the mail module and reported back, so a caller can
 * tell the person to try again rather than leaving them waiting for a message
 * that will never arrive.
 */

type SendArgs = {
  payload: Payload
  recipientName?: string
  to: string
  token: string
}

export const sendVerifyEmail = async ({ payload, recipientName, to, token }: SendArgs) => {
  const link = `${getServerSideURL()}/verify-email?token=${encodeURIComponent(token)}`

  const rendered = await renderCustomerAuth({ action: 'verify', link, recipientName })

  return sendCustomerAuthMail(payload, {
    html: rendered.html,
    recipientName,
    subject: 'Confirm your UNAVE account',
    text: rendered.text,
    to,
  })
}

export const sendResetEmail = async ({ payload, recipientName, to, token }: SendArgs) => {
  const link = `${getServerSideURL()}/reset-password?token=${encodeURIComponent(token)}`

  const rendered = await renderCustomerAuth({ action: 'reset', link, recipientName })

  return sendCustomerAuthMail(payload, {
    html: rendered.html,
    recipientName,
    subject: 'Choose a new UNAVE password',
    text: rendered.text,
    to,
  })
}
