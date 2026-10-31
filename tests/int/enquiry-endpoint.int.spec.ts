/**
 * @vitest-environment node
 */
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { enquiryEndpoint } from '../../src/collections/Enquiries/endpoints'
import { enquiryMailContent } from '../../src/collections/Enquiries/mail'
import { resetRateLimits } from '../../src/utilities/rateLimit'
import config from '@/payload.config'
import type { Enquiry as EnquiryRow } from '@/payload-types'

// The dev database is remote, so a single test can make several slow round trips,
// and the first `getPayload` in a worker pulls the schema from it.
vi.setConfig({ hookTimeout: 120_000, testTimeout: 60_000 })

/**
 * The endpoint the contact form on `/contact` posts to.
 *
 * The handler is called directly with a fabricated `PayloadRequest`, the same seam
 * the auth endpoint tests use. The mail module is mocked so a valid enquiry can
 * reach its success branch without a configured transport, and the rate limit
 * buckets are reset between tests so the `slow` case can be reached on purpose.
 */

const mocks = vi.hoisted(() => ({
  sendEnquiryNotice: vi.fn(),
}))

vi.mock('../../src/collections/Enquiries/mail', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../src/collections/Enquiries/mail')>()
  return { ...actual, sendEnquiryNotice: mocks.sendEnquiryNotice }
})

let payload: Payload

const run = `it-enq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const enquiryIDs: (number | string)[] = []

const uniqueEmail = () => `${run}-${Math.random().toString(36).slice(2, 8)}@unave.test`

const VALID = {
  email: 'asha@example.com',
  message: 'Do you deliver to Kothrud, and can the plan start on a Monday?',
  name: 'Asha Kale',
  phone: '9876543210',
}

const makeRequest = (
  fields: Record<string, string>,
  options: { crossSite?: boolean } = {},
) => {
  const headers = new Headers()
  // One address for every request, so the rate-limit test can fill one bucket.
  headers.set('x-forwarded-for', '203.0.113.9')

  if (options.crossSite) {
    // A cross site POST carries an Origin the browser will not let us forge away.
    headers.set('origin', 'https://evil.example')
  } else {
    headers.set('sec-fetch-site', 'same-origin')
  }

  return {
    headers,
    logger: payload.logger,
    payload,
    text: async () => new URLSearchParams(fields).toString(),
  }
}

const post = (fields: Record<string, string>, options?: { crossSite?: boolean }) =>
  enquiryEndpoint.handler(makeRequest(fields, options) as never)

const locationOf = (response: Response): string =>
  new URL(response.headers.get('location') ?? '', 'http://localhost:3000').toString()

const findRow = async (email: string): Promise<EnquiryRow | null> => {
  const found = await payload.find({
    collection: 'enquiries',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { email: { equals: email } },
  })

  return found.docs[0] ?? null
}

beforeAll(async () => {
  payload = await getPayload({ config })
})

beforeEach(() => {
  resetRateLimits()
  mocks.sendEnquiryNotice.mockReset()
  mocks.sendEnquiryNotice.mockResolvedValue({ reason: 'sent', sent: true })
})

afterAll(async () => {
  for (const id of enquiryIDs) {
    try {
      await payload.delete({ collection: 'enquiries', id, overrideAccess: true })
    } catch {
      // Best effort cleanup.
    }
  }
})

describe('the contact form posting to /api/enquiries/send', () => {
  it('stores the enquiry, emails the kitchen with the enquirer as reply-to, and confirms', async () => {
    const email = uniqueEmail()

    const response = await post({ ...VALID, email })

    expect(response.status).toBe(303)
    expect(locationOf(response)).toBe('http://localhost:3000/contact?sent=1')
    expect(mocks.sendEnquiryNotice).toHaveBeenCalledOnce()

    const notice = mocks.sendEnquiryNotice.mock.calls[0]![1] as typeof VALID
    expect(notice.email).toBe(email)
    expect(notice.name).toBe(VALID.name)

    const row = await findRow(email)
    expect(row).not.toBeNull()
    enquiryIDs.push(row!.id)
    expect(row!.name).toBe(VALID.name)
    expect(row!.message).toBe(VALID.message)
    expect(row!.phone).toBe(VALID.phone)
    expect(row!.handled).toBe(false)
  })

  it('refuses a cross site post before it reads anything', async () => {
    const email = uniqueEmail()

    const response = await post({ ...VALID, email }, { crossSite: true })

    expect(locationOf(response)).toBe('http://localhost:3000/contact?error=session')
    expect(await findRow(email)).toBeNull()
  })

  it('answers the honeypot with success and stores nothing', async () => {
    const email = uniqueEmail()

    const response = await post({ ...VALID, email, website: 'http://spam.example' })

    expect(locationOf(response)).toBe('http://localhost:3000/contact?sent=1')
    expect(mocks.sendEnquiryNotice).not.toHaveBeenCalled()
    expect(await findRow(email)).toBeNull()
  })

  it.each([
    ['an empty name', { name: 'A' }, 'name'],
    ['a malformed address', { email: 'not-an-address' }, 'email'],
    ['a phone without enough digits', { phone: '12345' }, 'phone'],
    ['a one-word message', { message: 'Too short' }, 'message'],
  ])('sends %s back to the form', async (_label, overrides, code) => {
    const response = await post({ ...VALID, ...overrides })

    expect(locationOf(response)).toBe(`http://localhost:3000/contact?error=${code}`)
    expect(mocks.sendEnquiryNotice).not.toHaveBeenCalled()
  })

  it('lets an enquiry stand without a phone number', async () => {
    const email = uniqueEmail()

    const response = await post({ ...VALID, email, phone: '' })

    expect(locationOf(response)).toBe('http://localhost:3000/contact?sent=1')

    const row = await findRow(email)
    expect(row).not.toBeNull()
    enquiryIDs.push(row!.id)
    expect(row!.phone).toBeFalsy()
  })

  it('still confirms when the notice email could not go out', async () => {
    const email = uniqueEmail()
    mocks.sendEnquiryNotice.mockResolvedValue({ reason: 'failed', sent: false })

    const response = await post({ ...VALID, email })

    expect(locationOf(response)).toBe('http://localhost:3000/contact?sent=1')

    const row = await findRow(email)
    expect(row).not.toBeNull()
    enquiryIDs.push(row!.id)
  })

  it('slows a sixth message from one address within the hour', async () => {
    for (let index = 0; index < 5; index += 1) {
      const email = uniqueEmail()
      const response = await post({ ...VALID, email })

      expect(locationOf(response)).toBe('http://localhost:3000/contact?sent=1')

      const row = await findRow(email)
      if (row) enquiryIDs.push(row.id)
    }

    const sixth = await post({ ...VALID, email: uniqueEmail() })

    expect(locationOf(sixth)).toBe('http://localhost:3000/contact?error=slow')
    expect(mocks.sendEnquiryNotice).toHaveBeenCalledTimes(5)
  })
})

describe('the enquiry notice email', () => {
  it('carries the message and escapes anything that looks like markup', () => {
    const content = enquiryMailContent({
      email: 'Asha@Example.com',
      message: 'Do you cook around allergies? A <friend> said you might.',
      name: 'Asha "Kale" <kale>',
      phone: '',
    })

    expect(content.subject).toBe('New enquiry from Asha "Kale" <kale>')
    expect(content.text).toContain('Asha "Kale" <kale>')
    expect(content.text).toContain('Phone: not given')
    expect(content.html).toContain('&lt;kale&gt;')
    expect(content.html).toContain('&lt;friend&gt;')
    expect(content.html).not.toContain('<friend>')
  })
})
