import type { Payload } from 'payload'

import { sendSystemMail } from '@/email'
import { kitchenInbox } from '@/email/kitchen'
import { formatDateTime } from '@/utilities/formatDateTime'
import { getServerSideURL } from '@/utilities/getURL'

/**
 * The kitchen's copy of a pause or cancellation request (design.md §6.15).
 *
 * The row in `order-requests` is the record; this email is the knock on the
 * shoulder, so a request does not wait for somebody to open the admin. The reply
 * address is the customer's own, so answering the mail answers the customer.
 * Nothing here can fail the request: the request is already written when this
 * runs, and a failed or skipped send is only logged.
 */

export type OrderRequestNotice = {
  customer: { email: string; name: string | null }
  orderId: number | string
  /** The plans on the order, so the kitchen knows what to stop. */
  orderSummary: string
  pauseFrom?: null | string
  pauseTo?: null | string
  reason: string
  requestId: number | string
  type: 'cancel' | 'pause'
}

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const TYPE_WORD = { cancel: 'cancellation', pause: 'pause' } as const

/** Split out so the shape of the message can be checked without a transport. */
export const orderRequestMailContent = (
  notice: OrderRequestNotice,
): { html: string; subject: string; text: string } => {
  const { customer } = notice
  const who = customer.name ? `${customer.name} (${customer.email})` : customer.email
  const verb = notice.type === 'cancel' ? 'asked to cancel' : 'asked to pause'
  const summary = notice.orderSummary ? ` (${notice.orderSummary})` : ''
  const adminUrl = `${getServerSideURL()}/admin/collections/order-requests/${notice.requestId}`

  const dates: string[] = []
  if (notice.type === 'pause') {
    if (notice.pauseFrom) dates.push(`Pause from: ${formatDateTime(notice.pauseFrom)}`)
    if (notice.pauseTo) dates.push(`Resume on: ${formatDateTime(notice.pauseTo)}`)
  }

  const text = [
    `${who} ${verb} order ${notice.orderId}${summary}.`,
    ...dates,
    '',
    'Reason:',
    notice.reason,
    '',
    'Open the request in the admin:',
    adminUrl,
  ].join('\n')

  return {
    html: [
      `<p>${escapeHtml(who)} ${escapeHtml(verb)} order ${escapeHtml(String(notice.orderId))}${escapeHtml(summary)}.</p>`,
      ...dates.map((line) => `<p>${escapeHtml(line)}</p>`),
      '<p><strong>Reason:</strong></p>',
      `<p>${escapeHtml(notice.reason).replace(/\n/g, '<br/>')}</p>`,
      `<p><a href="${escapeHtml(adminUrl)}">Open the request in the admin</a></p>`,
    ].join(''),
    subject: `New ${TYPE_WORD[notice.type]} request for order ${notice.orderId}`,
    text,
  }
}

export const sendOrderRequestNotice = async (
  payload: Payload,
  notice: OrderRequestNotice,
): Promise<void> => {
  try {
    const to = await kitchenInbox(payload)

    if (!to) {
      payload.logger.warn({ msg: 'order_request_notice_no_recipient', request: notice.requestId })
      return
    }

    const { html, subject, text } = orderRequestMailContent(notice)
    const result = await sendSystemMail(payload, {
      html,
      replyTo: notice.customer.email,
      subject,
      text,
      to,
    })

    if (result.status === 'failed') {
      payload.logger.error({
        msg: 'order_request_notice_failed',
        request: notice.requestId,
        status: result.status,
      })
    } else if (result.status === 'skipped') {
      payload.logger.warn({ msg: 'order_request_notice_skipped', request: notice.requestId })
    }
  } catch {
    payload.logger.error({ msg: 'order_request_notice_error', request: notice.requestId })
  }
}
