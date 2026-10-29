import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import config from '@/payload.config'

// The dev database is remote, so a single test can make several slow round trips.
vi.setConfig({ testTimeout: 60_000 })

/**
 * These tests run against the configured Postgres database through the Payload
 * local API, the same way the checkout and guest page will. Every record carries
 * a unique run prefix and is deleted afterwards.
 */

let payload: Payload

const run = `it-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const planIDs: (number | string)[] = []
const subscriptionIDs: (number | string)[] = []
const userIDs: (number | string)[] = []

const staff = { id: 910001, role: 'staff', email: 'staff@unave.test', collection: 'users' } as any
const admin = { id: 910002, role: 'admin', email: 'admin@unave.test', collection: 'users' } as any

const asError = async (promise: Promise<unknown>) => {
  try {
    await promise
    return null
  } catch (error) {
    return error as { status?: number; message?: string; name?: string }
  }
}

const createPlan = async (overrides: Record<string, unknown> = {}) => {
  const plan = await payload.create({
    collection: 'plans',
    overrideAccess: true,
    data: {
      title: `Plan ${run}`,
      slug: `${run}-${Math.random().toString(36).slice(2, 8)}`,
      billingPeriod: 'weekly',
      mealsPerWeek: 5,
      price: 999,
      isActive: true,
      ...overrides,
    } as any,
  })

  planIDs.push(plan.id)
  return plan
}

const createSubscription = async (
  planID: number | string,
  overrides: Record<string, unknown> = {},
) => {
  const subscription = await payload.create({
    collection: 'subscriptions',
    overrideAccess: true,
    data: {
      plan: planID,
      customerName: 'Test Guest',
      email: `${run}@unave.test`,
      phone: '9876543210',
      address: {
        line1: '1 Test Street',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411001',
      },
      ...overrides,
    } as any,
  })

  subscriptionIDs.push(subscription.id)
  return subscription
}

// The dev database pulls the schema on first connect, which can take a while.
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
  for (const id of userIDs) {
    await payload.delete({ collection: 'users', id, overrideAccess: true }).catch(() => {})
  }
}, 120_000)

describe('plans', () => {
  it('creates a plan with the sellable fields and is off by default', async () => {
    const plan = await createPlan({ isActive: undefined })

    expect(plan.title).toBe(`Plan ${run}`)
    expect(plan.billingPeriod).toBe('weekly')
    expect(plan.mealsPerWeek).toBe(5)
    expect(plan.price).toBe(999)
    expect(plan.isActive).toBe(false)
  })

  it('rejects a plan without a title', async () => {
    const error = await asError(
      payload.create({
        collection: 'plans',
        overrideAccess: true,
        data: {
          slug: `${run}-no-title`,
          billingPeriod: 'weekly',
          mealsPerWeek: 5,
          price: 500,
        } as any,
      }),
    )

    expect(error?.status).toBe(400)
  })

  it('rejects a plan with no meals per week or a price below one rupee', async () => {
    const noMeals = await asError(createPlan({ mealsPerWeek: 0 }))
    const noPrice = await asError(createPlan({ price: 0 }))

    expect(noMeals?.status).toBe(400)
    expect(noPrice?.status).toBe(400)
  })

  it('rejects a billing period outside weekly and monthly', async () => {
    const error = await asError(createPlan({ billingPeriod: 'daily' }))

    expect(error?.status).toBe(400)
  })

  it('rejects a duplicate slug', async () => {
    const slug = `${run}-duplicate`
    await createPlan({ slug })

    const error = await asError(createPlan({ slug }))

    expect(error?.status).toBe(400)
  })

  it('hides inactive plans from anonymous reads but shows them to staff', async () => {
    const visible = await createPlan({ slug: `${run}-visible`, isActive: true })
    const hidden = await createPlan({ slug: `${run}-hidden`, isActive: false })
    const where = { slug: { in: [`${run}-visible`, `${run}-hidden`] } }

    const anonymous = await payload.find({
      collection: 'plans',
      overrideAccess: false,
      where,
      limit: 10,
    })
    const staffView = await payload.find({
      collection: 'plans',
      overrideAccess: false,
      user: staff,
      where,
      limit: 10,
    } as any)

    expect(anonymous.docs.map((doc) => doc.id)).toEqual([visible.id])
    expect(staffView.docs.map((doc) => doc.id).sort()).toEqual([visible.id, hidden.id].sort())
  })

  it('refuses an anonymous attempt to create a plan', async () => {
    const error = await asError(
      payload.create({
        collection: 'plans',
        overrideAccess: false,
        data: {
          title: 'Anonymous plan',
          slug: `${run}-anonymous`,
          billingPeriod: 'weekly',
          mealsPerWeek: 5,
          price: 500,
        } as any,
      }),
    )

    expect(error?.status).toBe(403)
  })

  it('lets staff create a plan', async () => {
    const plan = await payload.create({
      collection: 'plans',
      overrideAccess: false,
      user: staff,
      data: {
        title: 'Staff plan',
        slug: `${run}-staff`,
        billingPeriod: 'monthly',
        mealsPerWeek: 6,
        price: 2500,
      } as any,
    })
    planIDs.push(plan.id)

    expect(plan.slug).toBe(`${run}-staff`)
  })

  it('refuses to delete a plan that has a subscription attached', async () => {
    const plan = await createPlan()
    const subscription = await createSubscription(plan.id)

    const blocked = await asError(
      payload.delete({ collection: 'plans', id: plan.id, overrideAccess: true }),
    )
    expect(blocked?.status).toBe(400)
    expect(blocked?.message).toMatch(/cannot be deleted/i)

    await payload.delete({
      collection: 'subscriptions',
      id: subscription.id,
      overrideAccess: true,
    })

    const deleted = await payload.delete({
      collection: 'plans',
      id: plan.id,
      overrideAccess: true,
    })
    expect(deleted.id).toBe(plan.id)
  })
})

describe('subscriptions', () => {
  it('refuses anonymous reads with 403', async () => {
    const error = await asError(
      payload.find({ collection: 'subscriptions', overrideAccess: false, limit: 1 }),
    )

    expect(error?.status).toBe(403)
  })

  it('lets staff read subscriptions', async () => {
    const subscription = await createSubscription((await createPlan()).id)

    const found = await payload.find({
      collection: 'subscriptions',
      overrideAccess: false,
      user: staff,
      where: { id: { equals: subscription.id } },
    } as any)

    expect(found.docs.map((doc) => doc.id)).toEqual([subscription.id])
  })

  it('copies the plan period, meals and price and ignores client values', async () => {
    const plan = await createPlan({ billingPeriod: 'monthly', mealsPerWeek: 6, price: 3499 })

    const subscription = await createSubscription(plan.id, {
      billingPeriod: 'weekly',
      mealsPerWeek: 1,
      price: 1,
    })

    expect(subscription.billingPeriod).toBe('monthly')
    expect(subscription.mealsPerWeek).toBe(6)
    expect(subscription.price).toBe(3499)
  })

  it('keeps the copied values when the plan changes later', async () => {
    const plan = await createPlan({ billingPeriod: 'weekly', mealsPerWeek: 5, price: 1000 })
    const subscription = await createSubscription(plan.id)

    await payload.update({
      collection: 'plans',
      id: plan.id,
      overrideAccess: true,
      data: { billingPeriod: 'monthly', mealsPerWeek: 2, price: 2000 },
    })

    const after = await payload.findByID({
      collection: 'subscriptions',
      id: subscription.id,
      overrideAccess: true,
    })

    expect(after.price).toBe(1000)
    expect(after.mealsPerWeek).toBe(5)
    expect(after.billingPeriod).toBe('weekly')
  })

  it('defaults the status to new', async () => {
    const subscription = await createSubscription((await createPlan()).id)

    expect(subscription.status).toBe('new')
  })

  it('stores a SHA-256 hash with a seven day expiry', async () => {
    const subscription = await createSubscription((await createPlan()).id)
    const hash = subscription.accessTokenHash as string
    const days =
      (new Date(subscription.accessTokenExpiresAt as string).getTime() -
        new Date(subscription.createdAt as string).getTime()) /
      86_400_000

    expect(hash).toMatch(/^[0-9a-f]{64}$/)
    expect(Math.round(days)).toBe(7)
  })

  it('gives every subscription a different token hash', async () => {
    const plan = await createPlan()
    const first = await createSubscription(plan.id)
    const second = await createSubscription(plan.id)

    expect(first.accessTokenHash).not.toBe(second.accessTokenHash)
  })

  it('hides the token hash from a staff read', async () => {
    const subscription = await createSubscription((await createPlan()).id)

    const staffView: any = await payload.findByID({
      collection: 'subscriptions',
      id: subscription.id,
      overrideAccess: false,
      user: staff,
    } as any)

    expect(staffView.accessTokenHash).toBeUndefined()
    expect(JSON.stringify(staffView)).not.toMatch(/[0-9a-f]{64}/)
  })

  it('rejects activating without a start date', async () => {
    const subscription = await createSubscription((await createPlan({ billingPeriod: 'weekly' })).id)

    const error = await asError(
      payload.update({
        collection: 'subscriptions',
        id: subscription.id,
        overrideAccess: true,
        data: { status: 'active' },
      }),
    )

    expect(error?.status).toBe(400)
    expect(error?.message).toMatch(/start date/i)
  })

  it('computes a weekly end date on activation', async () => {
    const subscription = await createSubscription((await createPlan({ billingPeriod: 'weekly' })).id)

    const updated = await payload.update({
      collection: 'subscriptions',
      id: subscription.id,
      overrideAccess: true,
      data: { status: 'active', startDate: '2026-03-01T00:00:00.000Z' },
    })

    expect(updated.endDate).toBe('2026-03-08T00:00:00.000Z')
  })

  it('computes a monthly end date clamped to the last day of the month', async () => {
    const subscription = await createSubscription(
      (await createPlan({ billingPeriod: 'monthly' })).id,
    )

    const updated = await payload.update({
      collection: 'subscriptions',
      id: subscription.id,
      overrideAccess: true,
      data: { status: 'active', startDate: '2026-01-31T00:00:00.000Z' },
    })

    expect(updated.endDate).toBe('2026-02-28T00:00:00.000Z')
  })

  it('rejects a status outside the allowed list', async () => {
    const subscription = await createSubscription((await createPlan()).id)

    const error = await asError(
      payload.update({
        collection: 'subscriptions',
        id: subscription.id,
        overrideAccess: true,
        data: { status: 'paused' } as any,
      }),
    )

    expect(error?.status).toBe(400)
  })
})

describe('users and roles', () => {
  it('refuses a staff member creating a user', async () => {
    const error = await asError(
      payload.create({
        collection: 'users',
        overrideAccess: false,
        user: staff,
        data: {
          email: `${run}-new-staff@unave.test`,
          password: 'TestPass123!',
          role: 'staff',
        } as any,
      }),
    )

    expect(error?.status).toBe(403)
  })

  it('strips a role change made by staff but keeps the rest of the update', async () => {
    const victim = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: `${run}-victim@unave.test`,
        password: 'TestPass123!',
        name: 'Victim',
        role: 'staff',
      } as any,
    })
    userIDs.push(victim.id)

    await payload.update({
      collection: 'users',
      id: victim.id,
      overrideAccess: false,
      user: staff,
      data: { name: 'Renamed by staff', role: 'admin' },
    } as any)

    const after = await payload.findByID({
      collection: 'users',
      id: victim.id,
      overrideAccess: true,
    })

    expect(after.name).toBe('Renamed by staff')
    expect(after.role).toBe('staff')
  })

  it('lets an admin change a role', async () => {
    const victim = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: `${run}-promote@unave.test`,
        password: 'TestPass123!',
        role: 'staff',
      } as any,
    })
    userIDs.push(victim.id)

    await payload.update({
      collection: 'users',
      id: victim.id,
      overrideAccess: false,
      user: admin,
      data: { role: 'admin' },
    } as any)

    const after = await payload.findByID({
      collection: 'users',
      id: victim.id,
      overrideAccess: true,
    })

    expect(after.role).toBe('admin')
  })

  it('lets staff read another user but refuses staff deleting one', async () => {
    const victim = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email: `${run}-read@unave.test`,
        password: 'TestPass123!',
        role: 'staff',
      } as any,
    })
    userIDs.push(victim.id)

    const readable = await payload.find({
      collection: 'users',
      overrideAccess: false,
      user: staff,
      where: { id: { equals: victim.id } },
    } as any)
    const blocked = await asError(
      payload.delete({
        collection: 'users',
        id: victim.id,
        overrideAccess: false,
        user: staff,
      } as any),
    )

    expect(readable.docs.map((doc) => doc.id)).toEqual([victim.id])
    expect(blocked?.status).toBe(403)
  })
})
