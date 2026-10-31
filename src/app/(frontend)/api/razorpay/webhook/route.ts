import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { applyRazorpayWebhook, type RazorpayWebhookBody } from '@/utilities/razorpaySync'
import { readWebhookSecret, webhookSignatureMatches } from '@/utilities/razorpay'

/**
 * Razorpay's copy of the truth, delivered as events.
 *
 * The checkout confirm step already does the daily work; this route is the
 * safety net. It verifies the HMAC of the exact raw body against the webhook
 * secret from the Razorpay dashboard, applies the event, and answers 200 either
 * way — a non-2xx makes Razorpay retry, which is only useful for real failures,
 * and unknown events cannot be made to matter.
 *
 * Configure the webhook in the dashboard for `payment.captured` and
 * `payment.failed`, pointed at `/api/razorpay/webhook`.
 */
export const dynamic = 'force-dynamic'

export async function POST(request: Request): Promise<NextResponse> {
  const secret = readWebhookSecret()

  if (!secret) {
    // Not configured: say so loudly in the response body, and let Razorpay keep
    // retrying rather than silently swallowing events.
    return NextResponse.json({ error: 'webhook_not_configured' }, { status: 503 })
  }

  const rawBody = await request.text()
  const signature = request.headers.get('x-razorpay-signature') ?? ''

  if (!signature || !webhookSignatureMatches(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 })
  }

  let body: RazorpayWebhookBody

  try {
    body = JSON.parse(rawBody) as RazorpayWebhookBody
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const payload = await getPayload({ config: configPromise })

  try {
    const handled = await applyRazorpayWebhook(payload, body)

    return NextResponse.json({ handled: handled ?? 'ignored' })
  } catch (error) {
    // Logged, not thrown: the event will arrive again on Razorpay's retry, and
    // every write here is idempotent, so the retry lands in the same place.
    payload.logger.error({
      err: error instanceof Error ? error.message : String(error),
      event: body.event,
      msg: 'razorpay_webhook_apply_failed',
    })

    return NextResponse.json({ error: 'apply_failed' }, { status: 500 })
  }
}
