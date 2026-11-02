import { randomUUID } from 'node:crypto'

import type { Endpoint, PayloadRequest } from 'payload'

import { authenticateCustomerToken } from '@/auth/customerSession'
import { CUSTOMER_SESSION_COOKIE, readCookie } from '@/utilities/customerSession'
import { isSameOriginPost } from '@/utilities/formPost'
import { checkOrderIpLimit, getClientIp } from '@/utilities/rateLimit'
import {
  createRazorpayOrder,
  fetchRazorpayOrder,
  fetchRazorpayPayment,
  isRazorpayConfigured,
  razorpayMode,
  verifyPaymentSignature,
} from '@/utilities/razorpay'

import { findDurationIndex } from '@/utilities/checkoutPlan'

import { recordPaidOrder } from './confirm'
import { buildOrderNotes, readOrderNotes } from './intent'
import { orderCreateSchema, orderVerifySchema } from './schema'

/**
 * The two order endpoints (spec 0007).
 *
 * They are Payload collection endpoints, like the enquiry endpoint, but they
 * answer JSON instead of redirects: the browser needs values back (the gateway
 * order id, the amount, the key id) to open the Razorpay popup, and a plain
 * form redirect cannot carry those.
 *
 * Every money value is computed here from the plan record a checkout link names.
 * The link is a claim — a plan slug and a duration label — and both are checked
 * against the live plan before a rupee is used.
 *
 * No order row is written at checkout. The plan, its duration and the delivery
 * details ride on the Razorpay order's notes, so a row can be written the moment
 * a payment is captured, whether that signal comes from the browser's return or
 * from the signed webhook. An abandoned checkout therefore leaves nothing
 * behind, and a row in Orders always means one completed payment.
 */

const readJson = async (req: PayloadRequest): Promise<Record<string, unknown> | null> => {
  try {
    const body = await req.json?.()
    return body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

/** The signed in customer for an endpoint request, verified through Payload's strategy. */
const endpointCustomer = async (req: PayloadRequest) => {
  const token = readCookie(req.headers.get('cookie'), CUSTOMER_SESSION_COOKIE)

  return authenticateCustomerToken(req.payload, token, req)
}

const CROSS_SITE = 'Your session could not be verified. Please try again.'
const SIGN_IN_FIRST = 'Please sign in to place your order.'
const SLOW_DOWN = 'That was too many attempts. Please wait a bit and try again.'
const NOT_CONFIGURED =
  'Online payment is not set up yet. Please message the kitchen to place your order.'
const BAD_BODY = 'Something in the order did not read correctly. Please try again.'
const PLAN_NOT_FOUND = 'That plan is not on the menu any more. Please choose a plan again.'
const PLAN_CHANGED = 'That duration has changed. Please choose again.'
const PLAN_PAUSED = 'That plan is paused right now. Message the kitchen and we will help.'
const PAYMENT_UNCONFIRMED =
  'We could not confirm this payment yet. If your bank debited the amount it usually settles within a few minutes, and the order will appear on your account page.'
const ORDER_NOT_SAVED = 'Your order could not be saved. Please try again.'

const json = (message: string, status: number): Response => Response.json({ message }, { status })

export const createOrderEndpoint: Endpoint = {
  handler: async (req) => {
    if (!isSameOriginPost(req)) {
      req.payload.logger.warn({ msg: 'order_create_cross_site_rejected' })
      return json(CROSS_SITE, 403)
    }

    const customer = await endpointCustomer(req)

    if (!customer) {
      return json(SIGN_IN_FIRST, 401)
    }

    if (checkOrderIpLimit(getClientIp(req.headers)).limited) {
      return json(SLOW_DOWN, 429)
    }

    if (!isRazorpayConfigured()) {
      req.payload.logger.warn({ msg: 'order_create_not_configured' })
      return json(NOT_CONFIGURED, 503)
    }

    const body = await readJson(req)
    const parsed = orderCreateSchema.safeParse(body ?? {})

    if (!parsed.success) {
      return json(parsed.error.issues[0]?.message ?? BAD_BODY, 422)
    }

    const { delivery, duration: durationLabel, note, plan: planSlug } = parsed.data

    // Resolve the plan and the duration against the live records. The browser
    // sends no price and no day count; these values are the truth the order
    // will be written from.
    const payload = req.payload

    const plans = await payload.find({
      collection: 'plans',
      depth: 0,
      limit: 1,
      where: { slug: { equals: planSlug } },
    })

    const plan = plans.docs[0]

    if (!plan) {
      return json(PLAN_NOT_FOUND, 422)
    }

    if (!plan.available) {
      return json(PLAN_PAUSED, 422)
    }

    const durationIndex = findDurationIndex(plan, durationLabel)
    const chosenDuration = plan.durations?.[durationIndex]

    if (durationIndex < 0 || !chosenDuration) {
      return json(PLAN_CHANGED, 422)
    }

    const unitPrice = Number(chosenDuration.price)
    const days = Number(chosenDuration.days)

    // The whole checkout intent rides on the gateway order, so either payment
    // signal can write the paid row later. Nothing is written here.
    const notes = buildOrderNotes({
      customerId: customer.id,
      days,
      delivery: {
        city: delivery.city,
        foodPreference: delivery.foodPreference,
        line1: delivery.line1,
        line2: delivery.line2,
        name: delivery.name,
        phone: delivery.phone,
        pincode: delivery.pincode,
        state: delivery.state,
      },
      durationLabel: chosenDuration.label,
      note,
      planId: plan.id,
      planTitle: plan.title,
      unitPrice,
    })

    let gateway

    try {
      gateway = await createRazorpayOrder(unitPrice, randomUUID(), notes)
    } catch (error) {
      req.payload.logger.error({
        err: error instanceof Error ? error.message : String(error),
        msg: 'razorpay_order_create_failed',
      })
      return json('The payment gateway did not respond. Please try again in a moment.', 503)
    }

    const mode = razorpayMode()
    req.payload.logger.info({ msg: 'order_started', mode, total: unitPrice })

    return Response.json({
      amount: unitPrice,
      customer: { email: customer.email, name: delivery.name, phone: delivery.phone },
      gatewayOrderId: gateway.id,
      keyId: process.env.RAZORPAY_KEY_ID ?? '',
      mode,
    })
  },
  method: 'post',
  path: '/create',
}

export const verifyOrderEndpoint: Endpoint = {
  handler: async (req) => {
    if (!isSameOriginPost(req)) {
      req.payload.logger.warn({ msg: 'order_verify_cross_site_rejected' })
      return json(CROSS_SITE, 403)
    }

    const customer = await endpointCustomer(req)

    if (!customer) {
      return json(SIGN_IN_FIRST, 401)
    }

    const body = await readJson(req)
    const parsed = orderVerifySchema.safeParse(body ?? {})

    if (!parsed.success) {
      return json(BAD_BODY, 400)
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data

    if (
      !verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)
    ) {
      req.payload.logger.warn({ msg: 'order_return_signature_invalid' })
      return json(PAYMENT_UNCONFIRMED, 400)
    }

    // The plan and the delivery live on the gateway order, not in a local row.
    let razorpayOrder

    try {
      razorpayOrder = await fetchRazorpayOrder(razorpay_order_id)
    } catch (error) {
      req.payload.logger.warn({
        err: error instanceof Error ? error.message : String(error),
        msg: 'order_return_gateway_order_unreadable',
      })
      return json(PAYMENT_UNCONFIRMED, 400)
    }

    const intent = readOrderNotes(razorpayOrder.notes)

    // A 404 rather than a 403: the answer must not confirm that somebody else's
    // payment exists under that id.
    if (!intent || String(intent.customerId) !== String(customer.id)) {
      return json('That order could not be found.', 404)
    }

    let payment

    try {
      payment = await fetchRazorpayPayment(razorpay_payment_id)
    } catch (error) {
      req.payload.logger.warn({
        err: error instanceof Error ? error.message : String(error),
        msg: 'order_return_payment_fetch_failed',
      })
      return json(PAYMENT_UNCONFIRMED, 400)
    }

    if (
      payment.status !== 'captured' ||
      payment.order_id !== razorpay_order_id ||
      payment.amount !== razorpayOrder.amount ||
      payment.currency !== 'INR' ||
      intent.total !== razorpayOrder.amount
    ) {
      req.payload.logger.warn({
        amount: payment.amount,
        currency: payment.currency,
        msg: 'order_return_payment_mismatch',
        status: payment.status,
      })
      return json(PAYMENT_UNCONFIRMED, 400)
    }

    let recorded

    try {
      recorded = await recordPaidOrder(req.payload, {
        gatewayOrderId: razorpay_order_id,
        intent: { ...intent, total: payment.amount },
        paymentId: payment.id,
        signature: razorpay_signature,
      })
    } catch (error) {
      req.payload.logger.error({
        err: error instanceof Error ? error.message : String(error),
        msg: 'order_return_write_failed',
      })
      return json(ORDER_NOT_SAVED, 500)
    }

    if (!recorded.order) {
      return json(ORDER_NOT_SAVED, 500)
    }

    return Response.json({
      orderId: recorded.order.id,
      recorded: recorded.recorded,
      status: 'paid',
    })
  },
  method: 'post',
  path: '/verify',
}
