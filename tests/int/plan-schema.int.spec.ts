import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import config from '@/payload.config'

vi.setConfig({ testTimeout: 60_000 })

let payload: Payload

const run = `schema-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const planIDs: (number | string)[] = []
const subscriptionIDs: (number | string)[] = []

const asError = async (promise: Promise<unknown>) => {
  try {
    await promise
    return null
  } catch (error) {
    return error as { status?: number; message?: string }
  }
}

beforeAll(async () => {
  payload = await getPayload({ config })
}, 180_000)

afterAll(async () => {
  for (const id of subscriptionIDs) {
    await payload.delete({ collection: 'subscriptions', id, overrideAccess: true }).catch(() => {})
  }
  for (const id of planIDs) {
    await payload.delete({ collection: 'plans', id, overrideAccess: true }).catch(() => {})
  }
}, 120_000)

const createPlan = async () => {
  const plan = await payload.create({
    collection: 'plans',
    overrideAccess: true,
    data: {
      title: `Schema plan ${run}`,
      slug: `${run}-${Math.random().toString(36).slice(2, 8)}`,
      billingPeriod: 'weekly',
      mealsPerWeek: 5,
      price: 999,
      isActive: true,
    } as any,
  })
  planIDs.push(plan.id)
  return plan
}

const createSubscription = async (overrides: Record<string, unknown> = {}) => {
  const plan = await createPlan()
  const subscription = await payload.create({
    collection: 'subscriptions',
    overrideAccess: true,
    data: {
      plan: plan.id,
      customerName: 'Schema Guest',
      email: `${run}@unave.test`,
      phone: '9876543210',
      address: { line1: '1 Test Street', city: 'Pune', state: 'Maharashtra', pincode: '411001' },
      ...overrides,
    } as any,
  })
  subscriptionIDs.push(subscription.id)
  return subscription
}

describe('email normalization', () => {
  it('trims and lowercases on create', async () => {
    const subscription = await createSubscription({ email: '  Mixed.Case@Example.COM  ' })

    expect(subscription.email).toBe('mixed.case@example.com')
  })

  it('trims and lowercases on update', async () => {
    const subscription = await createSubscription()

    const updated = await payload.update({
      collection: 'subscriptions',
      id: subscription.id,
      overrideAccess: true,
      data: { email: '  AGAIN@Example.COM ' },
    })

    expect(updated.email).toBe('again@example.com')
  })
})

describe('cancellation fields and transition hook', () => {
  it('sets cancelledAt and defaults cancelledBy to staff on the move into cancelled', async () => {
    const subscription = await createSubscription({
      startDate: '2026-06-01T00:00:00.000Z',
      status: 'active',
    })

    const cancelled = await payload.update({
      collection: 'subscriptions',
      id: subscription.id,
      overrideAccess: true,
      data: { status: 'cancelled' },
    })

    expect(cancelled.status).toBe('cancelled')
    expect(typeof cancelled.cancelledAt).toBe('string')
    expect(cancelled.cancelledBy).toBe('staff')
  })

  it('never rewrites the cancellation history on a later edit', async () => {
    const subscription = await createSubscription({
      startDate: '2026-06-01T00:00:00.000Z',
      status: 'active',
    })
    const first = await payload.update({
      collection: 'subscriptions',
      id: subscription.id,
      overrideAccess: true,
      data: { status: 'cancelled' },
    })

    const second = await payload.update({
      collection: 'subscriptions',
      id: subscription.id,
      overrideAccess: true,
      data: { adminNotes: 'followed up' },
    })

    expect(second.cancelledBy).toBe(first.cancelledBy)
    expect(second.cancelledAt).toBe(first.cancelledAt)
  })

  it('requires a reason when cancelled by guest', async () => {
    const subscription = await createSubscription()

    const error = await asError(
      payload.update({
        collection: 'subscriptions',
        id: subscription.id,
        overrideAccess: true,
        data: { cancelledBy: 'guest' },
      }),
    )

    expect(error?.status).toBe(400)
  })

  it('accepts a guest cancel with a reason and rejects an over long one', async () => {
    const subscription = await createSubscription()

    const ok = await payload.update({
      collection: 'subscriptions',
      id: subscription.id,
      overrideAccess: true,
      data: { cancellationReason: 'Moved house', cancelledBy: 'guest' },
    })
    expect(ok.cancelledBy).toBe('guest')
    expect(ok.cancellationReason).toBe('Moved house')

    const error = await asError(
      payload.update({
        collection: 'subscriptions',
        id: subscription.id,
        overrideAccess: true,
        data: { cancellationReason: 'x'.repeat(501), cancelledBy: 'guest' },
      }),
    )
    expect(error?.status).toBe(400)
  })
})

describe('compound index', () => {
  it('exists on email and status', async () => {
    const result = await payload.db.pool.query<{ indexdef: string; indexname: string }>(
      `select indexname, indexdef from pg_indexes where tablename = 'subscriptions'`,
    )
    const names = result.rows.map((row) => row.indexname)

    expect(names).toContain('email_status_idx')
  })
})
