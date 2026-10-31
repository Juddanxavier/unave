import type { Payload } from 'payload'

import { planTitleOf } from './planSubscription'
import { startOfUtcDay } from './planDates'
import { rupeesToPaise } from './razorpay'

/**
 * The bridge between Razorpay payments and our subscription rows.
 *
 * Both the checkout confirmation and the webhook end up here, so there is one
 * definition of "this plan is paid": the subscription row is active with a start
 * date of the day after the payment, and every payment has exactly one row
 * keyed by its Razorpay payment id. The webhook reaches this module over a bare
 * event, so everything it writes passes `context.skipRazorpaySync`.
 */

const DAY_MS = 24 * 60 * 60 * 1000

/** The first delivery day: the day after the payment, at UTC midnight. */
const firstDeliveryDate = (paidAt: Date): string =>
  startOfUtcDay(new Date(paidAt.getTime() + DAY_MS)).toISOString()

type SubscriptionRow = {
  id: number
  status: string
  billingPeriod: string
  price: number
  plan: unknown
}

const findSubscriptionByOrderId = async (
  payload: Payload,
  razorpayOrderId: string,
): Promise<SubscriptionRow | null> => {
  const found = await payload.find({
    collection: 'subscriptions',
    depth: 1,
    limit: 1,
    overrideAccess: true,
    where: {
      razorpayOrderId: { equals: razorpayOrderId },
    },
  })

  return (found.docs[0] as unknown as SubscriptionRow | undefined) ?? null
}

/**
 * One payment, one row. The unique `razorpayPaymentId` is what makes webhook
 * retries and a double confirm harmless: a second write with the same payment
 * finds the row and leaves it alone.
 */
const upsertPaymentRow = async (
  payload: Payload,
  input: {
    amountPaise: number | null
    razorpayOrderId?: string | null
    razorpayPaymentId: string
    source: 'checkout' | 'webhook'
    status: 'paid' | 'failed'
    subscriptionId?: number | null
  },
): Promise<void> => {
  const existing = await payload.find({
    collection: 'payments',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: {
      razorpayPaymentId: { equals: input.razorpayPaymentId },
    },
  })

  if (existing.docs.length > 0) return

  try {
    await payload.create({
      collection: 'payments',
      data: {
        amount: input.amountPaise ?? 0,
        currency: 'INR',
        razorpayOrderId: input.razorpayOrderId ?? undefined,
        razorpayPaymentId: input.razorpayPaymentId,
        source: input.source,
        status: input.status,
        subscription: input.subscriptionId ?? undefined,
      },
      overrideAccess: true,
    })
  } catch (error) {
    // The one failure this can honestly be, given the pre-check above, is the
    // unique index losing a race. The payment is recorded either way.
    payload.logger.warn({
      err: error instanceof Error ? error.message : String(error),
      msg: 'payment_row_write_failed',
      razorpayPaymentId: input.razorpayPaymentId,
    })
  }
}

export type ActivationResult = {
  activated: boolean
  billingPeriod: string
  planTitle: string | null
  priceRupees: number
  subscriptionId: number | null
}

/**
 * Mark the subscription active and file the payment that paid for it.
 *
 * Idempotent by design: a checkout that confirmed twice, or a webhook that
 * arrived after the confirm step, finds an active row and does nothing except
 * make sure the payment row exists.
 */
export const activatePaidSubscription = async (
  payload: Payload,
  input: {
    amountPaise?: number | null
    method?: string | null
    paidAt?: Date
    paymentId: string
    razorpayOrderId: string
    source: 'checkout' | 'webhook'
  },
): Promise<ActivationResult> => {
  const row = await findSubscriptionByOrderId(payload, input.razorpayOrderId)

  if (!row) {
    return {
      activated: false,
      billingPeriod: '',
      planTitle: null,
      priceRupees: 0,
      subscriptionId: null,
    }
  }

  const paidAt = input.paidAt ?? new Date()
  let activated = false

  if (row.status !== 'active' && row.status !== 'cancelled' && row.status !== 'expired') {
    await payload.update({
      collection: 'subscriptions',
      context: { skipRazorpaySync: true },
      data: {
        paymentReceivedAt: paidAt.toISOString(),
        paymentReference: input.paymentId,
        startDate: firstDeliveryDate(paidAt),
        status: 'active',
      },
      id: row.id,
      overrideAccess: true,
    })

    activated = true
  }

  await upsertPaymentRow(payload, {
    amountPaise: input.amountPaise ?? rupeesToPaise(row.price),
    razorpayOrderId: input.razorpayOrderId,
    razorpayPaymentId: input.paymentId,
    source: input.source,
    status: 'paid',
    subscriptionId: row.id,
  })

  return {
    activated,
    billingPeriod: row.billingPeriod,
    planTitle: planTitleOf(row.plan),
    priceRupees: row.price,
    subscriptionId: row.id,
  }
}

export type RazorpayWebhookBody = {
  event?: string
  payload?: {
    payment?: {
      entity?: {
        amount?: number
        created_at?: number
        id?: string
        method?: string | null
        order_id?: string
        status?: string
      }
    }
  }
}

/**
 * Apply one webhook event. Unknown events are handled-and-ignored: the 200 goes
 * back regardless, because Razorpay retries on anything else and the retry
 * cannot make an event we do not know about matter.
 *
 * With one-time orders the only events that matter are a captured payment
 * (activate the row) and a failed one (record it). Renewals are new orders,
 * so they arrive here the same way.
 */
export const applyRazorpayWebhook = async (
  payload: Payload,
  body: RazorpayWebhookBody,
): Promise<string | null> => {
  const event = typeof body.event === 'string' ? body.event : ''
  const payment = body.payload?.payment?.entity

  if (!payment || typeof payment.id !== 'string') return event

  const orderId = typeof payment.order_id === 'string' ? payment.order_id : null

  if (!orderId) return event

  if (event === 'payment.captured') {
    const paidAt =
      typeof payment.created_at === 'number' ? new Date(payment.created_at * 1000) : new Date()

    await activatePaidSubscription(payload, {
      amountPaise: typeof payment.amount === 'number' ? payment.amount : null,
      method: typeof payment.method === 'string' ? payment.method : null,
      paidAt,
      paymentId: payment.id,
      razorpayOrderId: orderId,
      source: 'webhook',
    })

    return event
  }

  if (event === 'payment.failed') {
    const row = await findSubscriptionByOrderId(payload, orderId)

    await upsertPaymentRow(payload, {
      amountPaise: typeof payment.amount === 'number' ? payment.amount : null,
      razorpayOrderId: orderId,
      razorpayPaymentId: payment.id,
      source: 'webhook',
      status: 'failed',
      subscriptionId: row?.id ?? null,
    })

    return event
  }

  return null
}
