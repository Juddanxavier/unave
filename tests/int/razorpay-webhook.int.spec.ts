/**
 * @vitest-environment node
 */
import { createHmac } from 'node:crypto'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import config from '@/payload.config'
import type { Customer, Order } from '@/payload-types'

import { buildOrderNotes } from '../../src/collections/Orders/intent'

// The dev database is remote, so a single test can make several slow round trips,
// and the first `getPayload` in a worker pulls the schema from it.
vi.setConfig({ hookTimeout: 120_000, testTimeout: 60_000 })

/**
 * The Razorpay webhook route.
 *
 * The HMAC is real: the module is imported with a webhook secret planted in the
 * environment before it loads, so the signature checks below are the same
 * computation Razorpay does, not a mock agreeing with itself. The mail send is
 * mocked, because a mail transport has no place in what this file proves.
 *
 * This route is now the one that matters when the browser never comes back, so
 * these tests hold it to writing the paid order itself from the checkout intent
 * the gateway order carries, and to writing nothing when a check fails.
 */

const mocks = vi.hoisted(() => {
  const secret = `whsec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  // Hoisted above every import, so the razorpay module reads the secret when it
  // first loads and the HMAC below is the same computation Razorpay does.
  process.env.RAZORPAY_WEBHOOK_SECRET = secret

  return {
    fetchRazorpayOrder: vi.fn(),
    sendOrderMails: vi.fn(),
    secret,
  }
})

const WEBHOOK_SECRET = mocks.secret

vi.mock('../../src/utilities/razorpay', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/utilities/razorpay')>()

  return {
    ...actual,
    fetchRazorpayOrder: mocks.fetchRazorpayOrder,
  }
})

vi.mock('../../src/collections/Orders/mail', () => ({
  sendOrderMails: mocks.sendOrderMails,
}))

import { POST } from '../../src/app/(frontend)/api/razorpay/webhook/route'

let payload: Payload

const run = `it-hook-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const orderIDs: (number | string)[] = []
const customerIDs: (number | string)[] = []
let planId: number | string

const TOTAL = 150000

const createCustomer = async (): Promise<Customer> => {
  const created = (await payload.create({
    collection: 'customers',
    data: {
      email: `${run}-${Math.random().toString(36).slice(2, 8)}@unave.test`,
      name: 'Test Customer',
      password: 'correct-horse-battery',
    },
    depth: 0,
    disableVerificationEmail: true,
    overrideAccess: true,
  })) as Customer

  customerIDs.push(created.id)
  return created
}

/** The intent a browser would have put on the gateway order at checkout. */
const stagedNotes = (customer: Customer): Record<string, string> =>
  buildOrderNotes({
    customerId: customer.id,
    days: 5,
    delivery: {
      city: 'Pune',
      foodPreference: 'vegetarian',
      line1: '12 Test Road',
      name: 'Asha Kale',
      phone: '9876543210',
      pincode: '411001',
      state: 'Maharashtra',
    },
    durationLabel: 'One week',
    note: '',
    planId,
    planTitle: 'Lunch plan',
    unitPrice: TOTAL,
  })

const findOrderByGateway = async (gatewayOrderId: string): Promise<Order | null> => {
  const found = await payload.find({
    collection: 'orders',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { gatewayOrderId: { equals: gatewayOrderId } },
  })

  return (found.docs[0] as Order | undefined) ?? null
}

const sign = (rawBody: string): string =>
  createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex')

const post = async (rawBody: string, signature: string | null): Promise<Response> => {
  const headers = new Headers({ 'content-type': 'application/json' })

  if (signature !== null) headers.set('x-razorpay-signature', signature)

  return POST(
    new Request('http://localhost:3000/api/razorpay/webhook', {
      body: rawBody,
      headers,
      method: 'POST',
    }),
  )
}

const capturedEvent = (
  orderId: string,
  paymentId: string,
  options: { amount?: number; notes?: Record<string, string> } = {},
): string => {
  const amount = options.amount ?? TOTAL

  return JSON.stringify({
    event: 'payment.captured',
    payload: {
      ...(options.notes
        ? { order: { entity: { amount, currency: 'INR', id: orderId, notes: options.notes } } }
        : {}),
      payment: {
        amount,
        currency: 'INR',
        id: paymentId,
        order_id: orderId,
        status: 'captured',
      },
    },
  })
}

/**
 * The nesting Razorpay's docs show for a real delivery: each payload entry is
 * wrapped in an `entity` object. The route must write the order on this shape,
 * not only on the flat shape the hand built tests below use.
 */
const capturedEventNested = (
  orderId: string,
  paymentId: string,
  notes: Record<string, string>,
): string =>
  JSON.stringify({
    account_id: 'acc_test',
    contains: ['order', 'payment'],
    created_at: 1784541436,
    entity: 'event',
    event: 'payment.captured',
    payload: {
      order: { entity: { amount: TOTAL, currency: 'INR', entity: 'order', id: orderId, notes } },
      payment: {
        entity: {
          amount: TOTAL,
          currency: 'INR',
          entity: 'payment',
          id: paymentId,
          order_id: orderId,
          status: 'captured',
        },
      },
    },
  })

beforeAll(async () => {
  payload = await getPayload({ config })

  const plan = await payload.create({
    collection: 'plans',
    data: {
      available: true,
      durations: [{ days: 5, label: 'One week', price: TOTAL }],
      slug: `${run}-plan`,
      title: 'Lunch plan',
    },
    depth: 0,
    overrideAccess: true,
  })

  planId = plan.id
})

beforeEach(() => {
  mocks.fetchRazorpayOrder.mockReset()
  mocks.sendOrderMails.mockReset()
  mocks.sendOrderMails.mockResolvedValue({ sent: true })
})

afterAll(async () => {
  for (const id of orderIDs) {
    try {
      await payload.delete({ collection: 'orders', id, overrideAccess: true })
    } catch {
      // Best effort cleanup.
    }
  }

  try {
    await payload.delete({ collection: 'plans', id: planId, overrideAccess: true })
  } catch {
    // Best effort cleanup.
  }

  for (const id of customerIDs) {
    try {
      await payload.delete({ collection: 'customers', id, overrideAccess: true })
    } catch {
      // Best effort cleanup.
    }
  }
})

describe('the Razorpay webhook', () => {
  it('writes the paid order from a signed payment.captured event', async () => {
    const customer = await createCustomer()
    const gatewayOrderId = `order_${run}_a`

    const raw = capturedEvent(gatewayOrderId, 'pay_hook_1', { notes: stagedNotes(customer) })
    const response = await post(raw, sign(raw))

    expect(response.status).toBe(200)

    const after = await findOrderByGateway(gatewayOrderId)
    expect(after).not.toBeNull()
    orderIDs.push(after!.id)

    expect(after!.total).toBe(TOTAL)
    expect(String(after!.customer)).toBe(String(customer.id))
    expect(after!.gatewayPaymentId).toBe('pay_hook_1')
    expect(after!.delivery?.name).toBe('Asha Kale')
    expect(after!.items?.[0]?.planTitle).toBe('Lunch plan')
    expect(mocks.sendOrderMails).toHaveBeenCalledOnce()
  })

  it('writes the order on the nesting Razorpay actually sends', async () => {
    const customer = await createCustomer()
    const gatewayOrderId = `order_${run}_nested`

    const raw = capturedEventNested(gatewayOrderId, 'pay_hook_nested', stagedNotes(customer))
    const response = await post(raw, sign(raw))

    expect(response.status).toBe(200)

    const after = await findOrderByGateway(gatewayOrderId)
    expect(after).not.toBeNull()
    orderIDs.push(after!.id)

    expect(after!.gatewayPaymentId).toBe('pay_hook_nested')
    expect(mocks.sendOrderMails).toHaveBeenCalledOnce()
  })

  it('refuses an unsigned or forged body without writing anything', async () => {
    const customer = await createCustomer()
    const gatewayOrderId = `order_${run}_b`

    const raw = capturedEvent(gatewayOrderId, 'pay_hook_2', { notes: stagedNotes(customer) })

    const unsigned = await post(raw, null)
    expect(unsigned.status).toBe(400)

    const forged = await post(raw, 'a'.repeat(64))
    expect(forged.status).toBe(400)

    expect(await findOrderByGateway(gatewayOrderId)).toBeNull()
    expect(mocks.sendOrderMails).not.toHaveBeenCalled()
  })

  it('writes nothing when the event amount does not match the intent', async () => {
    const customer = await createCustomer()
    const gatewayOrderId = `order_${run}_c`

    const raw = capturedEvent(gatewayOrderId, 'pay_hook_3', {
      amount: 1,
      notes: stagedNotes(customer),
    })
    const response = await post(raw, sign(raw))

    expect(response.status).toBe(200)

    expect(await findOrderByGateway(gatewayOrderId)).toBeNull()
    expect(mocks.sendOrderMails).not.toHaveBeenCalled()
  })

  it('writes nothing when the gateway order carries no readable intent', async () => {
    const gatewayOrderId = `order_${run}_empty`

    const raw = capturedEvent(gatewayOrderId, 'pay_hook_4', { notes: {} })
    const response = await post(raw, sign(raw))

    expect(response.status).toBe(200)

    expect(await findOrderByGateway(gatewayOrderId)).toBeNull()
    expect(mocks.sendOrderMails).not.toHaveBeenCalled()
  })

  it('ignores events that are not a captured payment', async () => {
    const gatewayOrderId = `order_${run}_d`

    const raw = JSON.stringify({
      event: 'payment.failed',
      payload: {
        payment: {
          amount: TOTAL,
          currency: 'INR',
          id: 'pay_hook_5',
          order_id: gatewayOrderId,
          status: 'failed',
        },
      },
    })

    const response = await post(raw, sign(raw))

    expect(response.status).toBe(200)

    expect(await findOrderByGateway(gatewayOrderId)).toBeNull()
    expect(mocks.sendOrderMails).not.toHaveBeenCalled()
  })

  it('answers a replay idempotently without writing twice or mailing again', async () => {
    const customer = await createCustomer()
    const gatewayOrderId = `order_${run}_e`

    const raw = capturedEvent(gatewayOrderId, 'pay_hook_6', { notes: stagedNotes(customer) })

    expect((await post(raw, sign(raw))).status).toBe(200)
    expect((await post(raw, sign(raw))).status).toBe(200)

    const after = await findOrderByGateway(gatewayOrderId)
    orderIDs.push(after!.id)

    expect(mocks.sendOrderMails).toHaveBeenCalledOnce()
  })

  it('reads the intent over REST when the event omits the order entity', async () => {
    const customer = await createCustomer()
    const gatewayOrderId = `order_${run}_fetch`

    mocks.fetchRazorpayOrder.mockResolvedValue({
      amount: TOTAL,
      currency: 'INR',
      id: gatewayOrderId,
      notes: stagedNotes(customer),
    })

    const raw = capturedEvent(gatewayOrderId, 'pay_hook_7')
    const response = await post(raw, sign(raw))

    expect(response.status).toBe(200)
    expect(mocks.fetchRazorpayOrder).toHaveBeenCalledOnce()

    const after = await findOrderByGateway(gatewayOrderId)
    expect(after).not.toBeNull()
    orderIDs.push(after!.id)
  })

  it('acknowledges a signed body about an order the gateway does not know', async () => {
    mocks.fetchRazorpayOrder.mockRejectedValue(new Error('razorpay_order_fetch_failed_404'))

    const raw = capturedEvent(`order_${run}_unknown`, 'pay_hook_8')
    const response = await post(raw, sign(raw))

    expect(response.status).toBe(200)
    expect(await findOrderByGateway(`order_${run}_unknown`)).toBeNull()
    expect(mocks.sendOrderMails).not.toHaveBeenCalled()
  })
})
