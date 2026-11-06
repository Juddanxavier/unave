/**
 * @vitest-environment node
 */
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createOrderEndpoint, verifyOrderEndpoint } from '../../src/collections/Orders/endpoints'
import { buildOrderNotes } from '../../src/collections/Orders/intent'
import config from '@/payload.config'
import type { Customer, Order, Plan } from '@/payload-types'

// The dev database is remote, so a single test can make several slow round trips,
// and the first `getPayload` in a worker pulls the schema from it.
vi.setConfig({ hookTimeout: 120_000, testTimeout: 60_000 })

/**
 * The two endpoints the checkout popup talks to.
 *
 * The gateway is mocked at the module boundary: the browser half of Razorpay
 * cannot run here, and the point of these tests is what the *site* does with
 * the claims a browser makes. No order row is written at checkout any more, so
 * these tests hold two rules above all: creating opens a gateway order and
 * writes nothing, and verifying writes one paid row from what the gateway order
 * carries.
 */

const mocks = vi.hoisted(() => ({
  createRazorpayOrder: vi.fn(),
  fetchRazorpayOrder: vi.fn(),
  fetchRazorpayPayment: vi.fn(),
  isRazorpayConfigured: vi.fn(),
  sendOrderMails: vi.fn(),
  verifyPaymentSignature: vi.fn(),
}))

vi.mock('../../src/utilities/razorpay', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../src/utilities/razorpay')>()

  return {
    ...actual,
    createRazorpayOrder: mocks.createRazorpayOrder,
    fetchRazorpayOrder: mocks.fetchRazorpayOrder,
    fetchRazorpayPayment: mocks.fetchRazorpayPayment,
    isRazorpayConfigured: mocks.isRazorpayConfigured,
    razorpayMode: () => 'test',
    verifyPaymentSignature: mocks.verifyPaymentSignature,
  }
})

vi.mock('../../src/collections/Orders/mail', () => ({
  sendOrderMails: mocks.sendOrderMails,
}))

let payload: Payload

const run = `it-order-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const planIDs: (number | string)[] = []
const customerIDs: (number | string)[] = []
const orderIDs: (number | string)[] = []

const PASSWORD = 'correct-horse-battery'

let ipCounter = 0

const headers = (options: { cookies?: string; crossSite?: boolean } = {}) => {
  const built = new Headers()
  built.set('x-forwarded-for', `203.0.113.${(ipCounter += 1)}`)

  if (options.cookies) built.set('cookie', options.cookies)

  if (options.crossSite) {
    built.set('origin', 'https://evil.example')
  } else {
    built.set('sec-fetch-site', 'same-origin')
  }

  return built
}

const createRequest = (
  body: unknown,
  options: { cookies?: string; crossSite?: boolean } = {},
) =>
  ({
    headers: headers(options),
    json: async () => body,
    logger: payload.logger,
    payload,
  }) as never

const createCustomer = async (): Promise<{ email: string; id: number | string; token: string }> => {
  const email = `${run}-${Math.random().toString(36).slice(2, 8)}@unave.test`

  const created = await payload.create({
    collection: 'customers',
    data: { email, name: 'Test Customer', password: PASSWORD },
    depth: 0,
    disableVerificationEmail: true,
    overrideAccess: true,
  })

  await payload.db.updateOne({
    collection: 'customers',
    data: { _verificationToken: null, _verified: true },
    id: created.id as number,
  })

  customerIDs.push(created.id)

  const login = await payload.login({
    collection: 'customers',
    data: { email, password: PASSWORD },
  })

  return { email, id: created.id, token: login.token ?? '' }
}

const createPlan = async (overrides: Partial<{ available: boolean; title: string }> = {}) => {
  const created = (await payload.create({
    collection: 'plans',
    data: {
      available: true,
      description: undefined,
      durations: [
        { days: 5, label: 'One week', price: 150000 },
        { days: 22, label: 'One month', price: 660000 },
      ],
      slug: `${run}-${planIDs.length}-${Math.random().toString(36).slice(2, 8)}`,
      title: 'Lunch plan',
      category: 'ready-to-eat',
      audience: 'adults',
      ...overrides,
    },
    depth: 0,
    // The revalidatePlans hook calls Next's revalidateTag, which only exists
    // inside the Next runtime these specs do not run in.
    context: { disableRevalidate: true },
    overrideAccess: true,
  })) as Plan

  planIDs.push(created.id)
  return created
}

const COOKIE = 'unave-customer'

const selectionFor = (plan: Plan, index: number) => ({
  duration: plan.durations?.[index]?.label ?? '',
  plan: plan.slug,
})

const delivery = {
  city: 'Pune',
  foodPreference: 'vegetarian',
  line1: '12 Test Road',
  line2: '',
  name: 'Asha Kale',
  phone: '9876543210',
  pincode: '411001',
  state: 'Maharashtra',
}

const findOrder = async (id: number | string): Promise<Order | null> => {
  try {
    return (await payload.findByID({
      collection: 'orders',
      depth: 0,
      id,
      overrideAccess: true,
    })) as Order
  } catch {
    return null
  }
}

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

/**
 * Put a checkout intent on the gateway order the verify tests read back, and
 * make the payment look captured, so the endpoint only has to decide whether to
 * write the row.
 */
const stageGatewayOrder = (
  plan: Plan,
  customer: { id: number | string },
  gatewayOrderId: string,
  index = 0,
) => {
  const duration = plan.durations?.[index]
  const total = Number(duration?.price)

  const notes = buildOrderNotes({
    customerId: customer.id,
    days: Number(duration?.days),
    delivery,
    durationLabel: duration?.label ?? '',
    note: 'Ring the bell twice',
    planId: plan.id,
    planTitle: plan.title,
    unitPrice: total,
  })

  mocks.fetchRazorpayOrder.mockResolvedValue({
    amount: total,
    currency: 'INR',
    id: gatewayOrderId,
    notes,
  })

  mocks.fetchRazorpayPayment.mockResolvedValue({
    amount: total,
    currency: 'INR',
    id: `pay_${gatewayOrderId}`,
    order_id: gatewayOrderId,
    status: 'captured',
  })

  mocks.verifyPaymentSignature.mockReturnValue(true)

  return { notes, total }
}

beforeAll(async () => {
  payload = await getPayload({ config })
})

beforeEach(() => {
  mocks.createRazorpayOrder.mockReset()
  mocks.fetchRazorpayOrder.mockReset()
  mocks.fetchRazorpayPayment.mockReset()
  mocks.isRazorpayConfigured.mockReset()
  mocks.sendOrderMails.mockReset()
  mocks.verifyPaymentSignature.mockReset()

  mocks.isRazorpayConfigured.mockReturnValue(true)
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

  for (const id of planIDs) {
    try {
      await payload.delete({ collection: 'plans', id, overrideAccess: true, context: { disableRevalidate: true } })
    } catch {
      // Best effort cleanup.
    }
  }

  for (const id of customerIDs) {
    try {
      await payload.delete({ collection: 'customers', id, overrideAccess: true })
    } catch {
      // Best effort cleanup.
    }
  }
})

describe('POST /api/orders/create', () => {
  it('opens a gateway order with the plan and delivery on its notes and writes no row', async () => {
    const customer = await createCustomer()
    const plan = await createPlan()

    mocks.createRazorpayOrder.mockResolvedValue({
      amount: 150000,
      currency: 'INR',
      id: `order_${run}_1`,
    })

    const response = (await createOrderEndpoint.handler(
      createRequest(
        { delivery, ...selectionFor(plan, 0), note: 'Ring the bell twice' },
        { cookies: `${COOKIE}=${customer.token}` },
      ),
    )) as Response

    expect(response.status).toBe(200)

    const body = (await response.json()) as {
      amount: number
      gatewayOrderId: string
      orderId?: unknown
    }

    expect(body.amount).toBe(150000)
    expect(body.gatewayOrderId).toBe(`order_${run}_1`)
    // No local row is written, so no order id comes back.
    expect(body.orderId).toBeUndefined()

    const notes = mocks.createRazorpayOrder.mock.calls[0]?.[2] as Record<string, string>
    expect(notes.d_name).toBe('Asha Kale')
    expect(notes.d_city).toBe('Pune')
    expect(notes.d_note).toBe('Ring the bell twice')
    expect(JSON.parse(notes.plan)).toMatchObject({
      days: 5,
      price: 150000,
      t: 'Lunch plan',
    })

    // Nothing reached the orders table.
    expect(await findOrderByGateway(`order_${run}_1`)).toBeNull()
  })

  it('trusts the plan records, not the browser, for every rupee', async () => {
    const customer = await createCustomer()
    const plan = await createPlan()

    mocks.createRazorpayOrder.mockResolvedValue({
      amount: 150000,
      currency: 'INR',
      id: `order_${run}_claims`,
    })

    // A hand built body can carry any numbers it likes; the endpoint must read
    // the plan and duration from the record and ignore the rest.
    const response = (await createOrderEndpoint.handler(
      createRequest(
        {
          ...selectionFor(plan, 0),
          days: 1,
          delivery,
          price: 1,
          total: 1,
        },
        { cookies: `${COOKIE}=${customer.token}` },
      ),
    )) as Response

    expect(response.status).toBe(200)

    const body = (await response.json()) as { amount: number }
    expect(body.amount).toBe(150000)

    const notes = mocks.createRazorpayOrder.mock.calls[0]?.[2] as Record<string, string>
    expect(JSON.parse(notes.plan)).toMatchObject({ days: 5, price: 150000 })
  })

  it('opens a fresh gateway order on every attempt instead of reusing one', async () => {
    const customer = await createCustomer()
    const plan = await createPlan()

    mocks.createRazorpayOrder
      .mockResolvedValueOnce({ amount: 150000, currency: 'INR', id: `order_${run}_retry_a` })
      .mockResolvedValueOnce({ amount: 150000, currency: 'INR', id: `order_${run}_retry_b` })

    const body = { delivery, ...selectionFor(plan, 0), note: '' }

    await createOrderEndpoint.handler(
      createRequest(body, { cookies: `${COOKIE}=${customer.token}` }),
    )
    await createOrderEndpoint.handler(
      createRequest(body, { cookies: `${COOKIE}=${customer.token}` }),
    )

    expect(mocks.createRazorpayOrder).toHaveBeenCalledTimes(2)
    expect(await findOrderByGateway(`order_${run}_retry_a`)).toBeNull()
    expect(await findOrderByGateway(`order_${run}_retry_b`)).toBeNull()
  })

  it('refuses a signed out visitor with 401 and writes nothing', async () => {
    const response = (await createOrderEndpoint.handler(
      createRequest({ delivery, duration: 'One week', plan: 'lunch-plan' }),
    )) as Response

    expect(response.status).toBe(401)
    expect((await response.json()) as { message: string }).toHaveProperty('message')
  })

  it('refuses a cross site post before anything else', async () => {
    const customer = await createCustomer()

    const response = (await createOrderEndpoint.handler(
      createRequest(
        { delivery, duration: 'One week', plan: 'lunch-plan' },
        { cookies: `${COOKIE}=${customer.token}`, crossSite: true },
      ),
    )) as Response

    expect(response.status).toBe(403)
  })

  it('refuses a body with no plan or duration', async () => {
    const customer = await createCustomer()

    const response = (await createOrderEndpoint.handler(
      createRequest({ delivery }, { cookies: `${COOKIE}=${customer.token}` }),
    )) as Response

    expect(response.status).toBe(422)

    const body = (await response.json()) as { message: string }
    expect(body.message).toBe('Choose a plan first.')
  })

  it('refuses a plan slug that is not on the menu', async () => {
    const customer = await createCustomer()

    const response = (await createOrderEndpoint.handler(
      createRequest(
        { delivery, duration: 'One week', plan: `${run}-missing` },
        { cookies: `${COOKIE}=${customer.token}` },
      ),
    )) as Response

    expect(response.status).toBe(422)

    const body = (await response.json()) as { message: string }
    expect(body.message).toContain('not on the menu')
  })

  it('refuses a paused plan', async () => {
    const customer = await createCustomer()
    const plan = await createPlan({ available: false })

    const response = (await createOrderEndpoint.handler(
      createRequest(
        { delivery, ...selectionFor(plan, 0) },
        { cookies: `${COOKIE}=${customer.token}` },
      ),
    )) as Response

    expect(response.status).toBe(422)

    const body = (await response.json()) as { message: string }
    expect(body.message).toContain('paused')
  })

  it('refuses a duration that is no longer on the live plan', async () => {
    const customer = await createCustomer()
    const plan = await createPlan()

    const response = (await createOrderEndpoint.handler(
      createRequest(
        { delivery, duration: 'Two weeks', plan: plan.slug },
        { cookies: `${COOKIE}=${customer.token}` },
      ),
    )) as Response

    expect(response.status).toBe(422)

    const body = (await response.json()) as { message: string }
    expect(body.message).toContain('duration has changed')
  })

  it('answers 503 with a plain sentence when the gateway is not configured', async () => {
    mocks.isRazorpayConfigured.mockReturnValue(false)

    try {
      const customer = await createCustomer()

      const response = (await createOrderEndpoint.handler(
        createRequest(
          { delivery, duration: 'One week', plan: 'lunch-plan' },
          { cookies: `${COOKIE}=${customer.token}` },
        ),
      )) as Response

      expect(response.status).toBe(503)

      const body = (await response.json()) as { message: string }
      expect(body.message).toContain('not set up')
    } finally {
      mocks.isRazorpayConfigured.mockReturnValue(true)
    }
  })
})

describe('POST /api/orders/verify', () => {
  it('writes the paid order from the gateway notes on a verified return', async () => {
    const customer = await createCustomer()
    const plan = await createPlan()
    const gatewayOrderId = `order_${run}_v1`

    stageGatewayOrder(plan, customer, gatewayOrderId)

    const response = (await verifyOrderEndpoint.handler(
      createRequest(
        {
          razorpay_order_id: gatewayOrderId,
          razorpay_payment_id: `pay_${gatewayOrderId}`,
          razorpay_signature: 'sig',
        },
        { cookies: `${COOKIE}=${customer.token}` },
      ),
    )) as Response

    expect(response.status).toBe(200)

    const body = (await response.json()) as { orderId: number; status: string }
    expect(body.status).toBe('paid')
    expect(body.orderId).toBeDefined()

    orderIDs.push(body.orderId)

    const row = await findOrder(body.orderId)
    expect(row).not.toBeNull()
    expect(row!.total).toBe(150000)
    expect(String(row!.customer)).toBe(String(customer.id))
    expect(row!.items?.[0]?.planTitle).toBe('Lunch plan')
    expect(row!.items?.[0]?.unitPrice).toBe(150000)
    expect(row!.delivery?.name).toBe('Asha Kale')
    expect(row!.delivery?.note).toBe('Ring the bell twice')
    expect(row!.gatewayPaymentId).toBe(`pay_${gatewayOrderId}`)
    expect(row!.paidAt).toBeTruthy()
    expect(mocks.sendOrderMails).toHaveBeenCalledOnce()
  })

  it('refuses a return whose signature does not verify and writes nothing', async () => {
    const customer = await createCustomer()
    const plan = await createPlan()
    const gatewayOrderId = `order_${run}_v2`

    stageGatewayOrder(plan, customer, gatewayOrderId)
    mocks.verifyPaymentSignature.mockReturnValue(false)

    const response = (await verifyOrderEndpoint.handler(
      createRequest(
        {
          razorpay_order_id: gatewayOrderId,
          razorpay_payment_id: `pay_${gatewayOrderId}`,
          razorpay_signature: 'forged',
        },
        { cookies: `${COOKIE}=${customer.token}` },
      ),
    )) as Response

    expect(response.status).toBe(400)
    expect(await findOrderByGateway(gatewayOrderId)).toBeNull()
    expect(mocks.sendOrderMails).not.toHaveBeenCalled()
  })

  it('refuses a payment that does not match the gateway order and writes nothing', async () => {
    const customer = await createCustomer()
    const plan = await createPlan()
    const gatewayOrderId = `order_${run}_v3`

    stageGatewayOrder(plan, customer, gatewayOrderId)
    mocks.fetchRazorpayPayment.mockResolvedValue({
      amount: 999, // The browser paid a different amount.
      currency: 'INR',
      id: `pay_${gatewayOrderId}`,
      order_id: gatewayOrderId,
      status: 'captured',
    })

    const response = (await verifyOrderEndpoint.handler(
      createRequest(
        {
          razorpay_order_id: gatewayOrderId,
          razorpay_payment_id: `pay_${gatewayOrderId}`,
          razorpay_signature: 'sig',
        },
        { cookies: `${COOKIE}=${customer.token}` },
      ),
    )) as Response

    expect(response.status).toBe(400)
    expect(await findOrderByGateway(gatewayOrderId)).toBeNull()
  })

  it('answers 404 for somebody else\u2019s gateway order rather than confirming it exists', async () => {
    const owner = await createCustomer()
    const stranger = await createCustomer()
    const plan = await createPlan()
    const gatewayOrderId = `order_${run}_v4`

    stageGatewayOrder(plan, owner, gatewayOrderId)

    const response = (await verifyOrderEndpoint.handler(
      createRequest(
        {
          razorpay_order_id: gatewayOrderId,
          razorpay_payment_id: `pay_${gatewayOrderId}`,
          razorpay_signature: 'sig',
        },
        { cookies: `${COOKIE}=${stranger.token}` },
      ),
    )) as Response

    expect(response.status).toBe(404)
    expect(await findOrderByGateway(gatewayOrderId)).toBeNull()
  })

  it('answers 404 when the gateway order carries no readable intent', async () => {
    const customer = await createCustomer()
    const gatewayOrderId = `order_${run}_v5`

    mocks.verifyPaymentSignature.mockReturnValue(true)
    mocks.fetchRazorpayOrder.mockResolvedValue({
      amount: 150000,
      currency: 'INR',
      id: gatewayOrderId,
      notes: {},
    })

    const response = (await verifyOrderEndpoint.handler(
      createRequest(
        {
          razorpay_order_id: gatewayOrderId,
          razorpay_payment_id: `pay_${gatewayOrderId}`,
          razorpay_signature: 'sig',
        },
        { cookies: `${COOKIE}=${customer.token}` },
      ),
    )) as Response

    expect(response.status).toBe(404)
    expect(await findOrderByGateway(gatewayOrderId)).toBeNull()
  })

  it('records a repeated return once and does not mail twice', async () => {
    const customer = await createCustomer()
    const plan = await createPlan()
    const gatewayOrderId = `order_${run}_v6`

    stageGatewayOrder(plan, customer, gatewayOrderId)

    const body = {
      razorpay_order_id: gatewayOrderId,
      razorpay_payment_id: `pay_${gatewayOrderId}`,
      razorpay_signature: 'sig',
    }

    const first = (await verifyOrderEndpoint.handler(
      createRequest(body, { cookies: `${COOKIE}=${customer.token}` }),
    )) as Response
    const second = (await verifyOrderEndpoint.handler(
      createRequest(body, { cookies: `${COOKIE}=${customer.token}` }),
    )) as Response

    const firstBody = (await first.json()) as { orderId: number }
    const secondBody = (await second.json()) as { orderId: number }

    orderIDs.push(firstBody.orderId)

    expect(second.status).toBe(200)
    expect(secondBody.orderId).toBe(firstBody.orderId)
    expect(mocks.sendOrderMails).toHaveBeenCalledOnce()
  })

  it('refuses a signed out visitor', async () => {
    const response = (await verifyOrderEndpoint.handler(
      createRequest({
        razorpay_order_id: 'order_x',
        razorpay_payment_id: 'pay_x',
        razorpay_signature: 'sig',
      }),
    )) as Response

    expect(response.status).toBe(401)
  })
})

describe('the orders collection', () => {
  const createRow = async (customer: { id: number | string }, gatewayOrderId: string) => {
    const row = (await payload.create({
      collection: 'orders',
      data: {
        customer: customer.id as number,
        delivery: {
          addressLine1: '12 Test Road',
          city: 'Pune',
          name: 'Asha Kale',
          phone: '9876543210',
          pincode: '411001',
          state: 'Maharashtra',
        },
        gatewayOrderId,
        items: [{ days: 5, durationLabel: 'One week', planTitle: 'Lunch plan', unitPrice: 150000 }],
        subtotal: 150000,
        total: 150000,
      },
      depth: 0,
      overrideAccess: true,
    })) as Order

    orderIDs.push(row.id)
    return row
  }

  it('never lets a sessionless caller read orders through the collection API', async () => {
    // Payload's local API answers a refused access rule by throwing, the way
    // the REST layer turns it into a 403. A sessionless read is refused.
    await expect(
      payload.find({
        collection: 'orders',
        depth: 0,
        overrideAccess: false,
        where: {},
      }),
    ).rejects.toThrow()
  })

  it('keeps a customer session from reading another customer\u2019s order through the collection API', async () => {
    const owner = await createCustomer()
    const stranger = await createCustomer()
    const row = await createRow(owner, `order_${run}_acl`)

    // Authenticate as the stranger and read with the collection's own access rule.
    const strangerLogin = await payload.login({
      collection: 'customers',
      data: { email: stranger.email, password: PASSWORD },
    })

    const strangerRow = (await payload.findByID({
      collection: 'customers',
      depth: 0,
      id: stranger.id,
      overrideAccess: true,
    })) as Customer

    expect(String(strangerRow.id)).toBe(String(stranger.id))

    // Payload's local API carries no request context here, so prove the rule
    // the way the REST layer would evaluate it: a where clause limited to the
    // caller. The stranger's id cannot match the owner's row.
    const found = await payload.find({
      collection: 'orders',
      depth: 0,
      overrideAccess: false,
      user: { id: stranger.id, collection: 'customers' } as never,
      where: { id: { equals: row.id } },
    })

    void strangerLogin
    expect(found.docs).toHaveLength(0)
  })
})
