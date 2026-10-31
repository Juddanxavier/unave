import { randomUUID } from 'node:crypto'

import {
  getFieldsToSign,
  JWTAuthentication,
  jwtSign,
  type AuthStrategy,
  type Payload,
  type PayloadRequest,
} from 'payload'

import type { Customer } from '@/payload-types'
import { CUSTOMER_SESSION_COOKIE, readCookie } from '@/utilities/customerSession'

/**
 * Customer sessions are Payload JWTs.
 *
 * The token is signed, verified, expired and session tracked entirely by Payload's
 * own auth engine. The only thing this module adds is the cookie name: customers
 * travel in `unave-customer`, so a storefront sign-in can never overwrite a staff
 * member's `payload-token` in the same browser.
 */

export type AuthenticatedCustomer = Customer & {
  collection: 'customers'
  /** Set by Payload's JWT strategy from the token, used to revoke on sign-out. */
  _sid?: string
}

/**
 * Verify one customer JWT without going through `payload.auth`.
 *
 * `JWTAuthentication` is Payload's own strategy. Feeding it a synthesized
 * `payload-token` header lets it do the signature check, expiry check, `_verified`
 * gate and session lookup, rather than reimplementing any of that here.
 *
 * `DisableAutologin` matters: without it Payload may fall back to `admin.autoLogin`
 * when a token is stale, which must never turn a customer request into a staff one.
 */
export const authenticateCustomerToken = async (
  payload: Payload,
  token: string | null | undefined,
  req?: PayloadRequest,
): Promise<AuthenticatedCustomer | null> => {
  if (!token) return null

  const headers = new Headers({
    cookie: `payload-token=${token}`,
    DisableAutologin: 'true',
    'Sec-Fetch-Site': 'same-origin',
  })

  const { user } = await JWTAuthentication({ headers, payload, req })
  const candidate = user as AuthenticatedCustomer | null

  return candidate && candidate.collection === 'customers' ? candidate : null
}

/**
 * Authenticate a request from the `unave-customer` cookie.
 *
 * Registered on the customers collection, so Payload treats a verified customer as
 * the request's user for access control. It only ever reads our cookie, never the
 * staff one.
 */
export const customerSessionStrategy: AuthStrategy = {
  name: 'customer-session',
  authenticate: async ({ headers, payload, req }) => {
    const token = readCookie(headers.get('cookie'), CUSTOMER_SESSION_COOKIE)

    return { user: await authenticateCustomerToken(payload, token, req) }
  },
}

/**
 * Mint a customer JWT for a sign-in that did not come through a password.
 *
 * Google OAuth is the only caller. Payload has no OAuth endpoint of its own, but the
 * token it issues here is exactly the one `payload.login` issues: same signer, same
 * `getFieldsToSign`, same session row, same expiry. The only skipped step is the
 * password comparison, because Google already proved the identity.
 */
export const mintCustomerSession = async (
  payload: Payload,
  customer: Customer,
  req?: PayloadRequest,
): Promise<string> => {
  const collectionConfig = payload.collections.customers.config
  const tokenExpiration = collectionConfig.auth.tokenExpiration
  const now = new Date()
  const sid = randomUUID()

  // Read the row directly: `sessions` is only readable by its owner through the
  // API, and a staff-side local read should not silently drop existing sessions.
  const raw = await payload.db.findOne<Customer>({
    collection: 'customers',
    req,
    where: { id: { equals: customer.id } },
  })

  const sessions = [
    // Payload drops expired sessions when it adds one, so do the same.
    ...(raw?.sessions ?? []).filter(
      (session) => new Date(session.expiresAt).getTime() > now.getTime(),
    ),
    {
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + tokenExpiration * 1000).toISOString(),
      id: sid,
    },
  ]

  await payload.db.updateOne({
    collection: 'customers',
    data: { sessions },
    id: customer.id,
    req,
    returning: false,
  })

  const fieldsToSign = getFieldsToSign({
    collectionConfig,
    email: typeof customer.email === 'string' ? customer.email : '',
    sid,
    user: { ...customer, sessions },
  })

  const { token } = await jwtSign({
    fieldsToSign,
    secret: payload.secret,
    tokenExpiration,
  })

  return token
}

/** Revoke the session behind a customer token, so sign-out is not only a cookie drop. */
export const revokeCustomerSession = async (
  payload: Payload,
  token: string | null | undefined,
  req?: PayloadRequest,
): Promise<void> => {
  if (!token) return

  const customer = await authenticateCustomerToken(payload, token, req)
  if (!customer?._sid) return

  const sessions = (customer.sessions ?? []).filter((session) => session.id !== customer._sid)

  await payload.db.updateOne({
    collection: 'customers',
    data: { sessions },
    id: customer.id,
    req,
    returning: false,
  })
}
