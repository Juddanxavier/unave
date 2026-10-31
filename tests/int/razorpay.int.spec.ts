import { createHmac } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { checkoutSignatureMatches, rupeesToPaise, webhookSignatureMatches } from '@/utilities/razorpay'

const SECRET = 'test_secret'

const checkoutSignature = (orderId: string, paymentId: string): string =>
  createHmac('sha256', SECRET).update(`${orderId}|${paymentId}`).digest('hex')

describe('checkoutSignatureMatches', () => {
  it('accepts the signature Razorpay would have sent', () => {
    expect(
      checkoutSignatureMatches('order_123', 'pay_456', checkoutSignature('order_123', 'pay_456'), SECRET),
    ).toBe(true)
  })

  it('rejects a tampered order id', () => {
    expect(
      checkoutSignatureMatches('order_999', 'pay_456', checkoutSignature('order_123', 'pay_456'), SECRET),
    ).toBe(false)
  })

  it('rejects a signature made with another secret', () => {
    expect(
      checkoutSignatureMatches(
        'order_123',
        'pay_456',
        checkoutSignature('order_123', 'pay_456'),
        'other_secret',
      ),
    ).toBe(false)
  })
})

describe('webhookSignatureMatches', () => {
  it('accepts the HMAC of the exact raw body', () => {
    const body = '{"event":"payment.captured"}'
    const signature = createHmac('sha256', SECRET).update(body).digest('hex')

    expect(webhookSignatureMatches(body, signature, SECRET)).toBe(true)
  })

  it('rejects a re-serialised body', () => {
    const signature = createHmac('sha256', SECRET)
      .update('{"event":"payment.captured"}')
      .digest('hex')

    expect(webhookSignatureMatches('{ "event": "payment.captured" }', signature, SECRET)).toBe(
      false,
    )
  })
})

describe('rupeesToPaise', () => {
  it('converts whole rupees', () => {
    expect(rupeesToPaise(499)).toBe(49900)
  })
})
