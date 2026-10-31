import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * The Razorpay server client.
 *
 * Hand-rolled with fetch rather than the official SDK, because the surface we
 * need is three endpoints. Everything here runs on the server only: the key
 * secret must never reach the browser, and the only value that crosses to the
 * client is the public key id, which Checkout needs to open the modal.
 *
 * Test keys start with `rzp_test_`, live keys with `rzp_live_`
 * (https://dashboard.razorpay.com/app/keys).
 */

const API_BASE = 'https://api.razorpay.com/v1'
const REQUEST_TIMEOUT_MS = 15_000

export type RazorpayOrder = {
  id: string
  amount: number
  currency: string
  status: string
}

export type RazorpayPayment = {
  id: string
  status: string
  order_id?: string
  amount?: number
  currency?: string
  method?: string
  created_at?: number
}

/**
 * Money in this app is whole rupees, tax included; Razorpay wants paise.
 */
export const rupeesToPaise = (rupees: number): number => Math.round(rupees * 100)

const readKeys = (): { keyId: string; keySecret: string } | null => {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET

  if (!keyId || !keySecret) return null

  return { keyId, keySecret }
}

/** True when checkout can actually run. The cart checks this before building the form. */
export const isRazorpayConfigured = (): boolean => readKeys() !== null

class RazorpayApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'RazorpayApiError'
    this.status = status
  }
}

const request = async <T>(
  method: 'GET' | 'POST',
  path: string,
  body?: Record<string, unknown>,
): Promise<T> => {
  const keys = readKeys()

  if (!keys) throw new RazorpayApiError('Razorpay is not configured.', 500)

  const auth = Buffer.from(`${keys.keyId}:${keys.keySecret}`).toString('base64')

  const response = await fetch(`${API_BASE}${path}`, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    method,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  const parsed: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    // Razorpay errors carry { error: { code, description } }. Surface the
    // description, because it is what ops reads in the logs at 2am.
    const description =
      parsed && typeof parsed === 'object' && 'error' in parsed
        ? String((parsed as { error?: { description?: unknown } }).error?.description ?? '')
        : ''

    throw new RazorpayApiError(
      description || `Razorpay request failed with ${response.status}.`,
      response.status,
    )
  }

  return parsed as T
}

/**
 * One order for one paid period. Renewal is a new order: the plan's end date
 * passes, the customer buys again, and nothing is ever charged automatically.
 */
export const createRazorpayOrder = async ({
  notes,
  rupees,
}: {
  notes: Record<string, string>
  rupees: number
}): Promise<RazorpayOrder> =>
  request<RazorpayOrder>('POST', '/orders', {
    amount: rupeesToPaise(rupees),
    currency: 'INR',
    notes,
  })

/** One payment, read back for its method and amount after a checkout succeeds. */
export const fetchRazorpayPayment = async (paymentId: string): Promise<RazorpayPayment> =>
  request<RazorpayPayment>('GET', `/payments/${paymentId}`)

/**
 * The HMAC over the values Checkout's `handler` returns for a one-time order:
 * `order_id | payment_id`. Keyed with the key secret, so only Razorpay could
 * have produced it.
 */
export const checkoutSignatureMatches = (
  orderId: string,
  paymentId: string,
  signature: string,
  keySecret: string,
): boolean => {
  const expected = createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex')

  const given = Buffer.from(signature, 'utf8')
  const known = Buffer.from(expected, 'utf8')

  return given.length === known.length && timingSafeEqual(given, known)
}

/**
 * Verify the checkout response against the configured keys. Returns false when
 * Razorpay is not configured, so a half-deployed env can never pass a payment.
 */
export const verifyRazorpayCheckoutSignature = (input: {
  orderId: string
  paymentId: string
  signature: string
}): boolean => {
  const keys = readKeys()

  if (!keys) return false

  return checkoutSignatureMatches(input.orderId, input.paymentId, input.signature, keys.keySecret)
}

/**
 * The webhook signature: an HMAC of the exact raw body, keyed with the webhook
 * secret from the dashboard, carried in `x-razorpay-signature`. The raw body
 * must be hashed byte for byte — re-serialising parsed JSON can reorder keys
 * and break the match.
 */
export const webhookSignatureMatches = (
  rawBody: string,
  signature: string,
  webhookSecret: string,
): boolean => {
  const expected = createHmac('sha256', webhookSecret).update(rawBody).digest('hex')

  const given = Buffer.from(signature, 'utf8')
  const known = Buffer.from(expected, 'utf8')

  return given.length === known.length && timingSafeEqual(given, known)
}

export const readWebhookSecret = (): string | null => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET

  return secret && secret.trim() ? secret : null
}
