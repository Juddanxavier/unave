import type { Payload } from 'payload'

import type { Customer, Footer, Order } from '@/payload-types'
import { renderOrder } from '@/email/templates/render'
import { sendOrderMail } from '@/email/send'
import { formatPaise } from '@/utilities/money'

/**
 * The two emails a paid order sends (spec 0007, AC-7).
 *
 * The customer learns their plan is booked; the kitchen learns who to cook for
 * and where to deliver. Both go through the transport spec 0002 already runs,
 * both log under the `order` key, and neither failure can fail the order — the
 * row is the record, the emails are the knock on the shoulder.
 *
 * The copy is admin editable in EmailSettings (the `orderCopy` group). Blank
 * fields fall back to these defaults, so a fresh install mails sensible words
 * before anybody has opened the admin.
 */

export type OrderMailCopy = {
  confirmationIntro: string
  confirmationOutro: string
  confirmationSubject: string
  kitchenIntro: string
  kitchenSubject: string
}

export const ORDER_MAIL_DEFAULTS: OrderMailCopy = {
  confirmationIntro: 'Thank you. Your payment went through and the kitchen has your order.',
  confirmationOutro:
    'We will message you about when your deliveries begin. If anything looks wrong, reply to this email.',
  confirmationSubject: 'Your UNAVE order is confirmed',
  kitchenIntro: 'A plan order was paid on the website. The details are below.',
  kitchenSubject: 'New paid order from the website',
}

export const loadOrderMailCopy = async (payload: Payload): Promise<OrderMailCopy> => {
  try {
    const settings = await payload.findGlobal({ slug: 'email-settings', depth: 0 })
    const copy = settings.orderCopy

    return {
      confirmationIntro: copy?.confirmationIntro?.trim() || ORDER_MAIL_DEFAULTS.confirmationIntro,
      confirmationOutro: copy?.confirmationOutro?.trim() || ORDER_MAIL_DEFAULTS.confirmationOutro,
      confirmationSubject:
        copy?.confirmationSubject?.trim() || ORDER_MAIL_DEFAULTS.confirmationSubject,
      kitchenIntro: copy?.kitchenIntro?.trim() || ORDER_MAIL_DEFAULTS.kitchenIntro,
      kitchenSubject: copy?.kitchenSubject?.trim() || ORDER_MAIL_DEFAULTS.kitchenSubject,
    }
  } catch {
    return ORDER_MAIL_DEFAULTS
  }
}

const addressLabel = (order: Order): string => {
  const delivery = order.delivery ?? {}
  const parts = [
    delivery.addressLine1,
    delivery.addressLine2,
    [delivery.city, delivery.state].filter(Boolean).join(', '),
    delivery.pincode,
  ].filter((part) => typeof part === 'string' && part.trim().length > 0)

  return parts.join('\n')
}

export const sendOrderMails = async (payload: Payload, order: Order): Promise<void> => {
  const copy = await loadOrderMailCopy(payload)

  const lines = (order.items ?? []).map((item) => ({
    amountLabel: formatPaise(Number(item.unitPrice ?? 0)),
    durationLabel: item.durationLabel ?? '',
    title: item.planTitle ?? '',
  }))

  const totalLabel = formatPaise(Number(order.total ?? 0))
  const paymentId = order.gatewayPaymentId ?? ''
  const delivery = order.delivery ?? {}
  const name = delivery.name ?? ''

  let customer: Pick<Customer, 'email' | 'name'> | null = null

  try {
    customer = await payload.findByID({
      collection: 'customers',
      depth: 0,
      id: order.customer as number,
      overrideAccess: true,
      select: { email: true, name: true },
    })
  } catch {
    payload.logger.error({ msg: 'order_mail_customer_unreadable', order: order.id })
  }

  if (customer?.email) {
    const rendered = await renderOrder({
      intro: copy.confirmationIntro,
      lines,
      outro: copy.confirmationOutro,
      paymentId,
      recipientName: (customer.name ?? name) || undefined,
      totalLabel,
      variant: 'confirmation',
    })

    const result = await sendOrderMail(payload, {
      html: rendered.html,
      subject: copy.confirmationSubject,
      text: rendered.text,
      to: customer.email,
    })

    if (result.status !== 'sent') {
      payload.logger.warn({ msg: 'order_confirmation_mail_not_sent', order: order.id, status: result.status })
    }
  } else {
    payload.logger.warn({ msg: 'order_confirmation_mail_no_recipient', order: order.id })
  }

  const footer = (await payload.findGlobal({ slug: 'footer', depth: 0 }).catch(() => null)) as
    | Footer
    | null
  const kitchen = footer?.contact?.email?.trim() ?? ''

  if (kitchen) {
    const rendered = await renderOrder({
      delivery: {
        addressLabel: addressLabel(order),
        name,
        note: delivery.note || undefined,
        phone: delivery.phone ?? '',
      },
      intro: copy.kitchenIntro,
      lines,
      paymentId,
      totalLabel,
      variant: 'kitchenNotice',
    })

    const result = await sendOrderMail(payload, {
      html: rendered.html,
      subject: `${copy.kitchenSubject} · order ${order.id}`,
      text: rendered.text,
      to: kitchen,
    })

    if (result.status !== 'sent') {
      payload.logger.warn({ msg: 'order_kitchen_mail_not_sent', order: order.id, status: result.status })
    }
  } else {
    payload.logger.warn({ msg: 'order_kitchen_mail_no_recipient', order: order.id })
  }
}
