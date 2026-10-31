'use server'

import configPromise from '@payload-config'
import { cookies, headers } from 'next/headers'
import { getPayload } from 'payload'
import { z } from 'zod'

import { getSignedInCustomer } from '@/utilities/customerSessionServer'
import type { FieldErrors } from '@/utilities/fieldErrors'
import { toFieldErrors } from '@/utilities/fieldErrors'
import { CART_COOKIE, parseCart } from '@/utilities/planCart'
import { checkCheckoutIpLimit, getClientIp } from '@/utilities/rateLimit'
import {
  createRazorpayOrder,
  fetchRazorpayPayment,
  isRazorpayConfigured,
  verifyRazorpayCheckoutSignature,
} from '@/utilities/razorpay'
import { activatePaidSubscription } from '@/utilities/razorpaySync'

import {
  CART_CHECKOUT_CONFIRM_FAILED,
  CART_CHECKOUT_DETAILS_INVALID,
  CART_CHECKOUT_LIMITED,
  CART_CHECKOUT_REJECTED,
  CART_CHECKOUT_UNAVAILABLE,
  CART_EMPTY,
} from '@/utilities/planShopCopy'

/**
 * The checkout seam (spec 0007).
 *
 * `startCheckout` validates the delivery details, opens a one-time Razorpay
 * order for the plan price and saves our own subscription row in `new` —
 * nothing has been charged yet, and a customer who closes the modal leaves an
 * honest abandoned-checkout row behind.
 *
 * `confirmCheckout` runs after the modal reports success. It verifies the
 * Razorpay signature over the order and payment ids, activates the row and
 * files the payment. The Razorpay webhook applies the same two moves
 * independently, so either path alone gets a paid plan into the right state.
 *
 * Renewal is manual by design: one order buys one period, the end date passes,
 * and the customer buys again.
 */

/** The deep brand green from the design tokens, as Checkout's accent. */
const THEME_COLOR = '#1a4b36'

// The same rules the subscriptions collection validates with.
const PHONE_PATTERN = /^[0-9+\s-]{7,15}$/
const PINCODE_PATTERN = /^\d{6}$/

const required = (message: string) => z.string().trim().min(1, { message })

const checkoutDetailsSchema = z.object({
  city: required('Enter your city.'),
  customerName: required('Enter your name.'),
  email: z.string().trim().email({ message: 'Enter a valid email address.' }),
  line1: required('Enter your address.'),
  line2: z
    .string()
    .trim()
    .max(160, { message: 'Keep address line 2 to 160 characters or fewer.' })
    .optional()
    .default(''),
  phone: required('Enter a phone number.').regex(PHONE_PATTERN, {
    message: 'Enter a valid phone number.',
  }),
  pincode: z.string().trim().regex(PINCODE_PATTERN, { message: 'Enter a 6 digit pincode.' }),
  state: required('Enter your state.'),
})

export type CheckoutParams = {
  amountPaise: number
  description: string
  keyId: string
  orderId: string
  themeColor: string
}

export type StartCheckoutState =
  | { status: 'idle' }
  | { status: 'error'; fieldErrors?: FieldErrors; message: string }
  | { status: 'ready'; checkout: CheckoutParams }

export type ConfirmCheckoutState = { ok: false; message: string } | { ok: true }

const errorResult = (message: string, fieldErrors?: FieldErrors): StartCheckoutState => ({
  ...(fieldErrors ? { fieldErrors } : {}),
  message,
  status: 'error',
})

export const startCheckout = async (
  _previous: StartCheckoutState,
  formData: FormData,
): Promise<StartCheckoutState> => {
  const limit = checkCheckoutIpLimit(getClientIp(await headers()))

  if (limit.limited) return errorResult(CART_CHECKOUT_LIMITED)

  if (!isRazorpayConfigured()) return errorResult(CART_CHECKOUT_UNAVAILABLE)

  const customer = await getSignedInCustomer()

  const read = (field: string): string => String(formData.get(field) ?? '')

  const parsed = checkoutDetailsSchema.safeParse({
    city: read('city'),
    customerName: read('customerName'),
    // A signed in customer pays with the account email, whatever the form says.
    email: customer ? customer.email : read('email'),
    line1: read('line1'),
    line2: read('line2'),
    phone: read('phone'),
    pincode: read('pincode'),
    state: read('state'),
  })

  if (!parsed.success) {
    return errorResult(CART_CHECKOUT_DETAILS_INVALID, toFieldErrors(parsed.error))
  }

  const jar = await cookies()
  const entry = parseCart(jar.get(CART_COOKIE)?.value)

  if (!entry) return errorResult(CART_EMPTY)

  const payload = await getPayload({ config: configPromise })

  // The same rule as the cart page: the plan id in the cookie means nothing.
  // The plan is re-read through the public access rule, so an inactive or
  // unknown plan can never be bought.
  const found = await payload.find({
    collection: 'plans',
    depth: 0,
    limit: 1,
    overrideAccess: false,
    where: {
      id: { equals: entry.planId },
    },
  })

  const plan = found.docs[0]

  if (!plan) return errorResult(CART_CHECKOUT_UNAVAILABLE)

  let orderId: string

  try {
    const order = await createRazorpayOrder({
      notes: {
        planId: String(plan.id),
        planTitle: plan.title,
        source: 'unave-cart',
      },
      rupees: plan.price,
    })
    orderId = order.id
  } catch (error) {
    payload.logger.error({
      err: error instanceof Error ? error.message : String(error),
      msg: 'razorpay_order_create_failed',
      planId: plan.id,
    })
    return errorResult(CART_CHECKOUT_REJECTED)
  }

  try {
    await payload.create({
      collection: 'subscriptions',
      data: {
        address: {
          city: parsed.data.city,
          line1: parsed.data.line1,
          line2: parsed.data.line2 || undefined,
          pincode: parsed.data.pincode,
          state: parsed.data.state,
        },
        customer: (customer?.id as number | undefined) ?? undefined,
        customerName: parsed.data.customerName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        plan: plan.id,
        razorpayOrderId: orderId,
        status: 'new',
      },
      overrideAccess: true,
    })
  } catch (error) {
    // The order stays unpaid in Razorpay — no money moves unless the modal
    // collects it. The honest move is to fail the checkout rather than charge
    // a customer whose row we could not save.
    payload.logger.error({
      err: error instanceof Error ? error.message : String(error),
      msg: 'subscription_row_create_failed',
      razorpayOrderId: orderId,
    })
    return errorResult(CART_CHECKOUT_REJECTED)
  }

  return {
    checkout: {
      amountPaise: Math.round(plan.price * 100),
      description: plan.title,
      keyId: process.env.RAZORPAY_KEY_ID ?? '',
      orderId,
      themeColor: THEME_COLOR,
    },
    status: 'ready',
  }
}

type CheckoutConfirmation = {
  orderId: string
  paymentId: string
  signature: string
}

const isConfirmation = (value: unknown): value is CheckoutConfirmation => {
  if (!value || typeof value !== 'object') return false

  const { orderId, paymentId, signature } = value as Record<string, unknown>

  return (
    typeof orderId === 'string' &&
    orderId.length > 0 &&
    orderId.length <= 128 &&
    typeof paymentId === 'string' &&
    paymentId.length > 0 &&
    paymentId.length <= 128 &&
    typeof signature === 'string' &&
    signature.length > 0 &&
    signature.length <= 256
  )
}

export const confirmCheckout = async (value: unknown): Promise<ConfirmCheckoutState> => {
  if (!isConfirmation(value)) return { ok: false, message: CART_CHECKOUT_CONFIRM_FAILED }

  // The signature over `order_id|payment_id`, keyed with the key secret, is the
  // whole gate: only Razorpay could have produced it for this payment.
  if (!verifyRazorpayCheckoutSignature(value)) {
    return { ok: false, message: CART_CHECKOUT_CONFIRM_FAILED }
  }

  const payload = await getPayload({ config: configPromise })

  // Method and amount are metadata for the payment row, not the gate. The
  // signature already proved the payment; if this read fails the row carries
  // the plan price and the event time instead.
  let payment: { amount?: number; created_at?: number; method?: string } | undefined

  try {
    payment = await fetchRazorpayPayment(value.paymentId)
  } catch (error) {
    payload.logger.warn({
      err: error instanceof Error ? error.message : String(error),
      msg: 'razorpay_payment_read_failed',
      razorpayPaymentId: value.paymentId,
    })
  }

  const result = await activatePaidSubscription(payload, {
    amountPaise: payment?.amount ?? null,
    method: payment?.method ?? null,
    paidAt: payment?.created_at ? new Date(payment.created_at * 1000) : new Date(),
    paymentId: value.paymentId,
    razorpayOrderId: value.orderId,
    source: 'checkout',
  })

  if (!result.subscriptionId) {
    // A real payment with no row behind it. Loud, because only a failed write
    // in `startCheckout` or a dashboard payment can land here.
    payload.logger.error({
      msg: 'checkout_row_missing_for_payment',
      razorpayOrderId: value.orderId,
      razorpayPaymentId: value.paymentId,
    })
    return { ok: false, message: CART_CHECKOUT_CONFIRM_FAILED }
  }

  const jar = await cookies()
  jar.delete(CART_COOKIE)

  return { ok: true }
}
