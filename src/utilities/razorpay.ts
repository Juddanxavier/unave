import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * The gateway, spoken to over plain REST (spec 0007).
 *
 * Razorpay is two calls and two HMAC checks, which is small enough that no SDK
 * dependency earns its place. Everything money related happens here:
 *
 * - `createRazorpayOrder` opens the gateway order the checkout popup pays into.
 * - `fetchRazorpayPayment` reads a payment back, so the site can confirm with
 *   its own eyes what the browser claims happened.
 * - `verifyPaymentSignature` checks the browser return's signature.
 * - `verifyWebhookSignature` checks Razorpay's webhook, over the raw bytes.
 *
 * Amounts are always integers in paise and the currency is always INR, so no
 * conversion ever sits between the site and the gateway.
 */

const RAZORPAY_API_BASE = 'https://api.razorpay.com/v1'

const KEY_ID = process.env.RAZORPAY_KEY_ID ?? ''
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? ''
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET ?? ''

/** True when the gateway is configured enough to take a payment. */
export const isRazorpayConfigured = (): boolean => Boolean(KEY_ID && KEY_SECRET)

/** True when the webhook can be authenticated. */
export const isWebhookConfigured = (): boolean => Boolean(WEBHOOK_SECRET)

/**
 * Test or live, read from the key id's prefix (`rzp_test_…`, `rzp_live_…`).
 * Logged at order creation and shown in the admin, so a test key pointed at a
 * live dashboard is visible before it costs money.
 */
export const razorpayMode = (): 'test' | 'live' | 'unknown' => {
  if (KEY_ID.startsWith('rzp_test_')) return 'test'
  if (KEY_ID.startsWith('rzp_live_')) return 'live'

  return 'unknown'
}

const authHeader = (): string => `Basic ${Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64')}`

export type RazorpayOrder = {
  amount: number
  currency: string
  id: string
  notes: Record<string, string>
}

export type RazorpayPayment = {
  amount: number
  currency: string
  id: string
  order_id: string
  status: string
}

/**
 * Open a gateway order. `receipt` is a plain reference for the dashboard, and
 * `notes` carry the checkout intent: the plan, its duration and the delivery
 * details, so a captured payment can still be written up as an order after the
 * browser has gone (spec 0007). Razorpay caps notes at 15 pairs of 256
 * characters, so the caller keeps them small.
 */
export const createRazorpayOrder = async (
  amountInPaise: number,
  receipt: string,
  notes: Record<string, string> = {},
): Promise<RazorpayOrder> => {
  const response = await fetch(`${RAZORPAY_API_BASE}/orders`, {
    body: JSON.stringify({ amount: amountInPaise, currency: 'INR', notes, receipt }),
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`razorpay_order_create_failed_${response.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`)
  }

  const data = (await response.json()) as Partial<RazorpayOrder>

  if (typeof data.id !== 'string' || typeof data.amount !== 'number' || data.currency !== 'INR') {
    throw new Error('razorpay_order_create_unexpected_response')
  }

  return {
    amount: data.amount,
    currency: data.currency,
    id: data.id,
    notes: notes,
  }
}

/**
 * Read a gateway order back, which is where the checkout intent lives. The
 * webhook needs this when the browser never returned, and the browser's own
 * return needs it to bind the payment to the plan the customer chose.
 */
export const fetchRazorpayOrder = async (orderId: string): Promise<RazorpayOrder> => {
  const response = await fetch(`${RAZORPAY_API_BASE}/orders/${encodeURIComponent(orderId)}`, {
    headers: {
      Authorization: authHeader(),
    },
    method: 'GET',
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`razorpay_order_fetch_failed_${response.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`)
  }

  const data = (await response.json()) as Partial<RazorpayOrder>

  if (
    typeof data.id !== 'string' ||
    typeof data.amount !== 'number' ||
    data.currency !== 'INR' ||
    !data.notes ||
    typeof data.notes !== 'object'
  ) {
    throw new Error('razorpay_order_unexpected_response')
  }

  return {
    amount: data.amount,
    currency: data.currency,
    id: data.id,
    notes: data.notes as Record<string, string>,
  }
}

/** Read a payment back over REST, the honest way to confirm a return. */
export const fetchRazorpayPayment = async (paymentId: string): Promise<RazorpayPayment> => {
  const response = await fetch(`${RAZORPAY_API_BASE}/payments/${encodeURIComponent(paymentId)}`, {
    headers: {
      Authorization: authHeader(),
    },
    method: 'GET',
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`razorpay_payment_fetch_failed_${response.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`)
  }

  const data = (await response.json()) as Partial<RazorpayPayment>

  if (
    typeof data.id !== 'string' ||
    typeof data.amount !== 'number' ||
    typeof data.currency !== 'string' ||
    typeof data.order_id !== 'string' ||
    typeof data.status !== 'string'
  ) {
    throw new Error('razorpay_payment_unexpected_response')
  }

  return {
    amount: data.amount,
    currency: data.currency,
    id: data.id,
    order_id: data.order_id,
    status: data.status,
  }
}

const signaturesMatch = (expectedHex: string, provided: string): boolean => {
  const expected = Buffer.from(expectedHex, 'utf8')
  const providedBuffer = Buffer.from(provided, 'utf8')

  if (expected.length !== providedBuffer.length) return false

  return timingSafeEqual(expected, providedBuffer)
}

/**
 * The browser return's signature: HMAC SHA256 over `${orderId}|${paymentId}`
 * keyed with the key secret. A tampered amount or a swapped payment id fails
 * here before anything flips.
 */
export const verifyPaymentSignature = (
  orderId: string,
  paymentId: string,
  signature: string,
): boolean => {
  if (!KEY_SECRET || !signature) return false

  const expected = createHmac('sha256', KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex')

  return signaturesMatch(expected, signature)
}

/**
 * The webhook's signature: HMAC SHA256 over the raw request bytes, keyed with
 * the webhook secret. Raw bytes matter — re-serialized JSON can differ in
 * whitespace and fail the check or, worse, be crafted to pass one.
 */
export const verifyWebhookSignature = (rawBody: string, signature: string): boolean => {
  if (!WEBHOOK_SECRET || !signature) return false

  const expected = createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex')

  return signaturesMatch(expected, signature)
}
