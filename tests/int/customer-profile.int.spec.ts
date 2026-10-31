import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import config from '@/payload.config'
import type { Customer } from '@/payload-types'

import { saveCustomerProfile, type SaveCustomerProfileState } from '@/app/(frontend)/(site)/account/actions'

// The dev database is remote, so a single test can make several slow round trips,
// and the first `getPayload` in a worker pulls the schema from it.
vi.setConfig({ hookTimeout: 120_000, testTimeout: 60_000 })

/**
 * The profile form's server action.
 *
 * The session helper is mocked rather than a cookie minted, because the claim under
 * test is what the action writes and refuses, not how the cookie is read — that is
 * covered by the auth specs. What matters here is that the write only ever lands on
 * the row the session names, and only ever carries the four profile fields.
 */

const session = vi.hoisted(() => ({
  customer: null as { email: string; id: number | string; name: string | null } | null,
}))

vi.mock('@/utilities/customerSessionServer', () => ({
  getSignedInCustomer: async () => session.customer,
}))

vi.mock('next/cache', () => ({
  refresh: vi.fn(),
}))

let payload: Payload

const run = `it-prof-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
let customerId: number | string

const VALID = {
  city: 'Pune',
  foodPreference: 'vegetarian',
  line1: '12 Test Road',
  line2: '',
  phone: '9876543210',
  pincode: '411001',
  state: 'Maharashtra',
}

const formData = (fields: Record<string, string>): FormData => {
  const data = new FormData()

  for (const [key, value] of Object.entries(fields)) data.append(key, value)

  return data
}

const submit = (fields: Record<string, string>): Promise<SaveCustomerProfileState> =>
  saveCustomerProfile({ status: 'idle' }, formData(fields))

const readRow = async (): Promise<Customer | null> => {
  const found = await payload.find({
    collection: 'customers',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { id: { equals: customerId } },
  })

  return (found.docs[0] as Customer) ?? null
}

beforeAll(async () => {
  payload = await getPayload({ config })

  const created = await payload.create({
    collection: 'customers',
    data: {
      email: `${run}@unave.test`,
      name: 'Profile Test',
      // Payload's local strategy requires a password on create.
      password: 'test-password-123',
    },
    depth: 0,
    disableVerificationEmail: true,
    overrideAccess: true,
  })

  customerId = created.id
  session.customer = { email: `${run}@unave.test`, id: customerId, name: 'Profile Test' }
})

afterAll(async () => {
  try {
    await payload.delete({ collection: 'customers', id: customerId, overrideAccess: true })
  } catch {
    // Best effort cleanup.
  }
})

describe('saving the delivery details and food preference', () => {
  it('writes the profile onto the signed in customer only', async () => {
    const result = await submit(VALID)

    expect(result.status).toBe('done')

    const row = await readRow()

    expect(row?.phone).toBe('9876543210')
    expect(row?.address?.line1).toBe('12 Test Road')
    expect(row?.address?.city).toBe('Pune')
    expect(row?.address?.state).toBe('Maharashtra')
    expect(row?.address?.pincode).toBe('411001')
    expect(row?.foodPreference).toBe('vegetarian')
    // An empty optional line is stored as nothing, not as an empty string.
    expect(row?.address?.line2 ?? null).toBeNull()
  })

  it('rejects an invalid pincode and changes nothing', async () => {
    const result = await submit({ ...VALID, pincode: '12' })

    expect(result.status).toBe('error')
    expect(result.status === 'error' ? result.fieldErrors?.pincode : undefined).toBeTruthy()

    const row = await readRow()

    // The last good save is still what the row holds.
    expect(row?.address?.pincode).toBe('411001')
  })

  it('rejects a bad phone number the same way', async () => {
    const result = await submit({ ...VALID, phone: 'call me maybe' })

    expect(result.status).toBe('error')
    expect(result.status === 'error' ? result.fieldErrors?.phone : undefined).toBeTruthy()
  })

  it('keeps an unknown preference value from failing the save', async () => {
    const result = await submit({ ...VALID, foodPreference: 'meat' })

    expect(result.status).toBe('done')

    const row = await readRow()

    // A tampered or stale select reads as the default, never as a failure.
    expect(row?.foodPreference).toBe('none')
  })

  it('tells a signed-out visitor to sign in again rather than writing anything', async () => {
    session.customer = null

    const result = await submit(VALID)

    expect(result).toEqual({ status: 'signed-out' })

    session.customer = { email: `${run}@unave.test`, id: customerId, name: 'Profile Test' }
  })
})
