import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import config from '@/payload.config'

// The dev database is remote, so a single test can make several slow round trips,
// and the first `getPayload` in a worker pulls the schema from it.
vi.setConfig({ hookTimeout: 120_000, testTimeout: 60_000 })

/**
 * Spec 0005, AC-8. The load bearing claim of the whole feature is that adding a
 * second auth collection does not hand a customer the CMS. These tests hold the
 * four content collections and the customers collection to that claim.
 */

let payload: Payload

const run = `it-cust-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const customerIDs: (number | string)[] = []
const categoryIDs: (number | string)[] = []

const staff = { id: 910011, role: 'staff', email: 'staff@unave.test', collection: 'users' } as any
const admin = { id: 910012, role: 'admin', email: 'admin@unave.test', collection: 'users' } as any

const asError = async (promise: Promise<unknown>) => {
  try {
    await promise
    return null
  } catch (error) {
    return error as { status?: number; message?: string; name?: string }
  }
}

const createCustomer = async (overrides: Record<string, unknown> = {}) => {
  const customer = await payload.create({
    collection: 'customers',
    overrideAccess: true,
    data: {
      email: `${run}-${Math.random().toString(36).slice(2, 8)}@unave.test`,
      googleId: `google-${run}-${Math.random().toString(36).slice(2, 8)}`,
      name: 'Test Customer',
      // Payload's local strategy requires a password on create, even for a
      // customer that only ever signs in with Google.
      password: 'test-password-123',
      ...overrides,
    } as any,
  })

  customerIDs.push(customer.id)
  return customer
}

const asCustomer = (customer: { id: number | string }) =>
  ({
    id: customer.id,
    collection: 'customers',
    email: `${run}@unave.test`,
  }) as any

beforeAll(async () => {
  payload = await getPayload({ config })
})

afterAll(async () => {
  for (const id of categoryIDs) {
    try {
      await payload.delete({ collection: 'categories', id, overrideAccess: true })
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

describe('customers are created only by the sign-in callback', () => {
  it('refuses a create through the API even for an admin', async () => {
    const error = await asError(
      payload.create({
        collection: 'customers',
        overrideAccess: false,
        user: admin,
        data: { email: `${run}-admin@unave.test` } as any,
      }),
    )

    expect(error).not.toBeNull()
    expect(error?.status).toBe(403)
  })

  it('refuses an anonymous create', async () => {
    const error = await asError(
      payload.create({
        collection: 'customers',
        overrideAccess: false,
        data: { email: `${run}-anon@unave.test` } as any,
      }),
    )

    expect(error).not.toBeNull()
    expect(error?.status).toBe(403)
  })
})

describe('a customer cannot write to the CMS', () => {
  it('is refused on pages, posts, media and categories', async () => {
    const customer = await createCustomer()
    const user = asCustomer(customer)

    // Thunks, not promises: building all four up front would leave the ones not yet
    // awaited rejecting with nothing attached to them. The casts are needed because
    // these are versioned collections, so `create` is typed as a draft-aware union.
    const attempts = [
      () => payload.create({ collection: 'pages', data: {}, overrideAccess: false, user } as any),
      () => payload.create({ collection: 'posts', data: {}, overrideAccess: false, user } as any),
      () => payload.create({ collection: 'media', data: {}, overrideAccess: false, user } as any),
      () =>
        payload.create({
          collection: 'categories',
          data: { title: 'nope' },
          overrideAccess: false,
          user,
        } as any),
    ]

    const statuses: (number | undefined)[] = []
    for (const attempt of attempts) {
      const error = await asError(attempt())
      expect(error).not.toBeNull()
      statuses.push(error?.status)
    }

    expect(statuses).toEqual([403, 403, 403, 403])
  })

  it('is refused on a read of an unpublished page it does not own', async () => {
    const customer = await createCustomer()

    // `staffOrPublished` narrows a customer to published documents rather than
    // granting the every-draft read that `Boolean(user)` used to give.
    const found = await payload.find({
      collection: 'pages',
      depth: 0,
      overrideAccess: false,
      user: asCustomer(customer),
      where: { _status: { equals: 'draft' } },
    })

    expect(found.docs).toHaveLength(0)
  })

  it('is still allowed where staff are allowed', async () => {
    const category = await payload.create({
      collection: 'categories',
      data: { title: `Category ${run}`, slug: `${run}-a` } as any,
      overrideAccess: true,
    })
    categoryIDs.push(category.id)

    const created = await payload.create({
      collection: 'categories',
      data: { title: `Staff category ${run}`, slug: `${run}-b` } as any,
      overrideAccess: false,
      user: staff,
    })
    categoryIDs.push(created.id)

    expect(created.id).toBeDefined()
  })
})

describe('a customer can only reach their own record', () => {
  it('reads itself', async () => {
    const customer = await createCustomer()

    const found = await payload.findByID({
      collection: 'customers',
      id: customer.id,
      overrideAccess: false,
      user: asCustomer(customer),
    })

    expect(found.id).toBe(customer.id)
  })

  it('cannot read another customer', async () => {
    const mine = await createCustomer()
    const theirs = await createCustomer()

    const error = await asError(
      payload.findByID({
        collection: 'customers',
        id: theirs.id,
        overrideAccess: false,
        user: asCustomer(mine),
      }),
    )

    // `staffOrSelf` narrows the query to the caller's own id rather than rejecting
    // outright, so another customer is simply not found. That is the better
    // outcome: it does not confirm that the other record exists.
    expect(error).not.toBeNull()
    expect(error?.status).toBe(404)
  })

  it('cannot rewrite its own record through the API', async () => {
    const customer = await createCustomer()

    const error = await asError(
      payload.update({
        collection: 'customers',
        id: customer.id,
        data: { name: 'Renamed by myself' } as any,
        overrideAccess: false,
        user: asCustomer(customer),
      }),
    )

    expect(error).not.toBeNull()
    expect(error?.status).toBe(403)
  })
})
