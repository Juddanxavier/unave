/**
 * @vitest-environment node
 */
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { authenticateCustomerToken } from '../../src/auth/customerSession'
import { customerLogoutEndpoint } from '../../src/auth/google/endpoints'
import {
  customerForgotPasswordEndpoint,
  customerLoginEndpoint,
  customerRegisterEndpoint,
  customerResendVerificationEndpoint,
  customerResetPasswordEndpoint,
} from '../../src/auth/password/endpoints'
import config from '@/payload.config'
import type { Customer } from '@/payload-types'

// The dev database is remote, so a single test can make several slow round trips,
// and the first `getPayload` in a worker pulls the schema from it.
vi.setConfig({ hookTimeout: 120_000, testTimeout: 60_000 })

/**
 * The endpoints the sign-in and sign-up forms actually post to.
 *
 * `customer-auth-form.int.spec.tsx` proves the browser half (Zod fires, the right
 * message lands on the right field). This file proves the server half: a plain HTML
 * `method="post"` to `/api/customers/login` and `/api/customers/register` really does
 * answer with the 303 and the `?error=` code the pages render.
 *
 * The handlers are called directly with a fabricated `PayloadRequest` — the same
 * approach `email-admin.int.spec.ts` uses for the test endpoint — because that is the
 * only seam below the HTTP server. The mail module is mocked so registration can reach
 * its success branch without a configured transport.
 *
 * The session cookie is now a Payload JWT. The tests verify it with Payload's own
 * strategy (`authenticateCustomerToken`), not with a helper of ours, so a broken
 * signature, expiry or session row would fail here.
 */

const mocks = vi.hoisted(() => ({
  sendResetEmail: vi.fn(),
  sendVerifyEmail: vi.fn(),
}))

vi.mock('../../src/auth/password/mail', () => ({
  sendResetEmail: mocks.sendResetEmail,
  sendVerifyEmail: mocks.sendVerifyEmail,
}))

let payload: Payload

const PASSWORD = 'correct-horse-battery'
const run = `it-auth-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const customerIDs: (number | string)[] = []

const uniqueEmail = () => `${run}-${Math.random().toString(36).slice(2, 8)}@unave.test`

const makeRequest = (
  fields: Record<string, string>,
  options: { cookies?: string; crossSite?: boolean } = {},
) => {
  const headers = new Headers()

  if (options.cookies) headers.set('cookie', options.cookies)

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

const createCustomer = async (verified = true) => {
  const email = uniqueEmail()

  const created = await payload.create({
    collection: 'customers',
    data: {
      email,
      name: 'Test Customer',
      password: PASSWORD,
    },
    depth: 0,
    disableVerificationEmail: true,
    overrideAccess: true,
  })

  if (verified) {
    // Payload's `_verified` is an auth field with its own access control; write it
    // the way the confirmation endpoint does.
    await payload.db.updateOne({
      collection: 'customers',
      data: { _verificationToken: null, _verified: true },
      id: created.id,
    })
  }

  customerIDs.push(created.id)
  return { email, id: created.id }
}

const locationOf = (response: Response): string =>
  new URL(response.headers.get('location') ?? '', 'http://localhost:3000').toString()

beforeAll(async () => {
  payload = await getPayload({ config })
})

beforeEach(() => {
  mocks.sendResetEmail.mockReset()
  mocks.sendVerifyEmail.mockReset()
  mocks.sendResetEmail.mockResolvedValue({ status: 'sent' })
  mocks.sendVerifyEmail.mockResolvedValue({ status: 'sent' })
})

afterAll(async () => {
  for (const id of customerIDs) {
    try {
      await payload.delete({ collection: 'customers', id, overrideAccess: true })
    } catch {
      // Best effort cleanup.
    }
  }
})

describe('the sign-in form posting to /api/customers/login', () => {
  it('signs a verified customer in and sets a Payload JWT in the customer cookie', async () => {
    const account = await createCustomer(true)

    const response = await customerLoginEndpoint.handler(
      makeRequest({ email: account.email, password: PASSWORD }) as never,
    )

    expect(response.status).toBe(303)
    expect(locationOf(response)).toBe('http://localhost:3000/account')

    const cookie = response.headers.getSetCookie().find((value) => value.startsWith('unave-customer='))
    expect(cookie).toBeDefined()

    const value = cookie!.split(';')[0]!.slice('unave-customer='.length)
    const customer = await authenticateCustomerToken(payload, value)

    expect(customer?.id).toBe(account.id)
    expect(customer?.collection).toBe('customers')
  })

  it('refuses a token that Payload did not sign', async () => {
    const account = await createCustomer(true)

    const response = await customerLoginEndpoint.handler(
      makeRequest({ email: account.email, password: PASSWORD }) as never,
    )
    const cookie = response.headers.getSetCookie().find((value) => value.startsWith('unave-customer='))
    const value = cookie!.split(';')[0]!.slice('unave-customer='.length)

    expect(await authenticateCustomerToken(payload, `${value.slice(0, -4)}nope`)).toBeNull()
  })

  it('backfills the has-password flag for an account created before the flag existed', async () => {
    const account = await createCustomer(true)

    // A row from before the column existed reads as false until something proves
    // the customer holds a working password. A completed sign-in is that proof.
    await payload.db.updateOne({
      collection: 'customers',
      data: { hasPassword: false },
      id: account.id,
    })

    const response = await customerLoginEndpoint.handler(
      makeRequest({ email: account.email, password: PASSWORD }) as never,
    )
    expect(locationOf(response)).toBe('http://localhost:3000/account')

    const found = await payload.db.findOne<Customer>({
      collection: 'customers',
      where: { id: { equals: account.id } },
    })
    expect(found?.hasPassword).toBe(true)
  })

  it('refuses a wrong password with the same word as an unknown address', async () => {
    const account = await createCustomer(true)

    const wrong = await customerLoginEndpoint.handler(
      makeRequest({ email: account.email, password: 'definitely-wrong' }) as never,
    )
    const unknown = await customerLoginEndpoint.handler(
      makeRequest({ email: uniqueEmail(), password: PASSWORD }) as never,
    )

    expect(locationOf(wrong)).toBe('http://localhost:3000/sign-in?error=credentials')
    expect(locationOf(unknown)).toBe('http://localhost:3000/sign-in?error=credentials')
    expect(wrong.headers.getSetCookie()).toHaveLength(0)
  })

  it('names the real problem when the password is right but the address is unconfirmed', async () => {
    const account = await createCustomer(false)

    const response = await customerLoginEndpoint.handler(
      makeRequest({ email: account.email, password: PASSWORD }) as never,
    )

    expect(locationOf(response)).toBe('http://localhost:3000/sign-in?error=unverified')
  })

  it('refuses a cross site post before it reads any credentials', async () => {
    const account = await createCustomer(true)

    const response = await customerLoginEndpoint.handler(
      makeRequest({ email: account.email, password: PASSWORD }, { crossSite: true }) as never,
    )

    expect(locationOf(response)).toBe('http://localhost:3000/sign-in?error=session')
    expect(response.headers.getSetCookie()).toHaveLength(0)
  })
})

describe('the sign-up form posting to /api/customers/register', () => {
  it('creates an unverified account and sends the person to sign in', async () => {
    const email = uniqueEmail()

    const response = await customerRegisterEndpoint.handler(
      makeRequest({ email, foodPreference: 'vegan', password: PASSWORD }) as never,
    )

    expect(response.status).toBe(303)
    expect(locationOf(response)).toBe('http://localhost:3000/sign-in?registered=1')
    expect(mocks.sendVerifyEmail).toHaveBeenCalledOnce()

    const found = await payload.db.findOne<Customer>({
      collection: 'customers',
      where: { email: { equals: email } },
    })

    expect(found).not.toBeNull()
    customerIDs.push(found!.id)
    expect(found!._verified).toBe(false)
    // The account card reads this to say the customer can sign in with a password.
    expect(found!.hasPassword).toBe(true)
    // The preference the sign-up form offered came through with the account.
    expect(found!.foodPreference).toBe('vegan')
  })

  it('keeps an unknown preference from blocking sign-up', async () => {
    const email = uniqueEmail()

    const response = await customerRegisterEndpoint.handler(
      makeRequest({ email, foodPreference: 'meat', password: PASSWORD }) as never,
    )

    expect(response.status).toBe(303)

    const found = await payload.db.findOne<Customer>({
      collection: 'customers',
      where: { email: { equals: email } },
    })

    expect(found).not.toBeNull()
    customerIDs.push(found!.id)
    // A tampered or stale select value reads as the default, never as a failure.
    expect(found!.foodPreference).toBe('none')
  })

  it('sends a duplicate address to sign in rather than taking the account over', async () => {
    const account = await createCustomer(true)

    const response = await customerRegisterEndpoint.handler(
      makeRequest({ email: account.email.toUpperCase(), password: PASSWORD }) as never,
    )

    expect(locationOf(response)).toBe('http://localhost:3000/sign-in?error=exists')
    expect(mocks.sendVerifyEmail).not.toHaveBeenCalled()
  })

  it('reports a short password against the password field', async () => {
    const response = await customerRegisterEndpoint.handler(
      makeRequest({ email: uniqueEmail(), password: 'short' }) as never,
    )

    expect(locationOf(response)).toBe('http://localhost:3000/sign-up?error=password')
  })

  it('reports a malformed address against the email field', async () => {
    const response = await customerRegisterEndpoint.handler(
      makeRequest({ email: 'not-an-address', password: PASSWORD }) as never,
    )

    expect(locationOf(response)).toBe('http://localhost:3000/sign-up?error=email')
  })

  it('refuses a cross site post before it writes anything', async () => {
    const email = uniqueEmail()

    const response = await customerRegisterEndpoint.handler(
      makeRequest({ email, password: PASSWORD }, { crossSite: true }) as never,
    )

    expect(locationOf(response)).toBe('http://localhost:3000/sign-up?error=session')

    const found = await payload.find({
      collection: 'customers',
      depth: 0,
      overrideAccess: true,
      where: { email: { equals: email } },
    })

    expect(found.docs).toHaveLength(0)
  })
})

describe('the forgot-password and reset-password forms', () => {
  it('issues a reset link and spends it to set a new password', async () => {
    const account = await createCustomer(true)

    const forgot = await customerForgotPasswordEndpoint.handler(
      makeRequest({ email: account.email }) as never,
    )

    expect(locationOf(forgot)).toBe('http://localhost:3000/forgot-password?sent=1')
    expect(mocks.sendResetEmail).toHaveBeenCalledOnce()

    const token = mocks.sendResetEmail.mock.calls[0]![0].token as string
    expect(token).toBeTruthy()

    const newPassword = 'a-brand-new-correct-horse'
    const reset = await customerResetPasswordEndpoint.handler(
      makeRequest({ password: newPassword, token }) as never,
    )

    expect(locationOf(reset)).toBe('http://localhost:3000/account')
    expect(
      reset.headers.getSetCookie().some((value) => value.startsWith('unave-customer=')),
    ).toBe(true)

    // Payload spent the token and stored the new hash, so the new password signs in.
    const signedIn = await customerLoginEndpoint.handler(
      makeRequest({ email: account.email, password: newPassword }) as never,
    )
    expect(locationOf(signedIn)).toBe('http://localhost:3000/account')

    // A reset link is how a Google-only account sets a password, so the flag the
    // account card reads has to flip with it.
    const resetRow = await payload.db.findOne<Customer>({
      collection: 'customers',
      where: { id: { equals: account.id } },
    })
    expect(resetRow?.hasPassword).toBe(true)
    expect(resetRow?._verified).toBe(true)
  })

  it('refuses a reset token Payload never issued', async () => {
    const response = await customerResetPasswordEndpoint.handler(
      makeRequest({ password: 'a-brand-new-correct-horse', token: 'not-a-token' }) as never,
    )

    expect(locationOf(response)).toBe(
      'http://localhost:3000/reset-password?error=token&token=not-a-token',
    )
  })
})

describe('the resend-confirmation form', () => {
  it('issues a fresh Payload verification token that really confirms the address', async () => {
    const account = await createCustomer(false)

    const response = await customerResendVerificationEndpoint.handler(
      makeRequest({ email: account.email }) as never,
    )

    expect(locationOf(response)).toBe('http://localhost:3000/sign-in?resent=1')
    expect(mocks.sendVerifyEmail).toHaveBeenCalledOnce()

    const token = mocks.sendVerifyEmail.mock.calls[0]![0].token as string
    await payload.verifyEmail({ collection: 'customers', token })

    const found = await payload.db.findOne<Customer>({
      collection: 'customers',
      where: { id: { equals: account.id } },
    })

    expect(found?._verified).toBe(true)
    expect(found?._verificationToken).toBeNull()
  })
})

describe('the sign-out endpoint', () => {
  it('revokes the Payload session row, so a copied cookie stops working', async () => {
    const account = await createCustomer(true)

    const signedIn = await customerLoginEndpoint.handler(
      makeRequest({ email: account.email, password: PASSWORD }) as never,
    )
    const cookie = signedIn.headers
      .getSetCookie()
      .find((value) => value.startsWith('unave-customer='))

    expect(cookie).toBeDefined()

    const token = cookie!.slice('unave-customer='.length).split(';')[0]!
    expect(await authenticateCustomerToken(payload, token)).not.toBeNull()

    const signedOut = await customerLogoutEndpoint.handler(
      makeRequest({}, { cookies: `unave-customer=${token}` }) as never,
    )

    expect(signedOut.status).toBe(303)
    expect(locationOf(signedOut)).toBe('http://localhost:3000/')
    // The cookie value is unchanged, but Payload no longer finds its session row.
    expect(await authenticateCustomerToken(payload, token)).toBeNull()
  })
})
