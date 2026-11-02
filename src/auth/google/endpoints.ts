import { randomBytes } from 'node:crypto'

import type { Endpoint, Payload, PayloadRequest } from 'payload'

import type { Customer } from '@/payload-types'
import {
  authenticateCustomerToken,
  mintCustomerSession,
  revokeCustomerSession,
} from '@/auth/customerSession'
import {
  CUSTOMER_OAUTH_COOKIE,
  CUSTOMER_SESSION_COOKIE,
  CUSTOMER_SESSION_MAX_AGE,
  customerOauthCookieOptions,
  customerSessionCookieOptions,
  readCookie,
  serializeCookie,
} from '@/utilities/customerSession'
import { safeReturnPath } from '@/utilities/formPost'
import { getServerSideURL } from '@/utilities/getURL'

import {
  buildGoogleAuthorizeUrl,
  createGoogleAuthRequest,
  exchangeGoogleCode,
  fetchGoogleProfile,
  googleCredentials,
  packAuthState,
  parseAuthState,
  safeCompare,
  type GoogleProfile,
} from './oauth'

const SIGN_IN_PATH = '/sign-in'
const ACCOUNT_PATH = '/account'

/**
 * Google has proved the address, so it is as verified as a clicked email link.
 *
 * Written straight to the row because `_verified` is a Payload auth field with
 * access control; this is the same column the confirmation endpoint writes.
 */
const markGoogleVerified = async (
  payload: Payload,
  id: number | string,
  req: PayloadRequest,
): Promise<void> => {
  await payload.db.updateOne({
    collection: 'customers',
    data: { _verificationToken: null, _verified: true },
    id,
    req,
  })
}

/**
 * Find the customer behind a Google profile, link an existing one by email, or
 * create a new one.
 *
 * Linking by email is what makes an account useful before its first sign-in: a
 * customer who already has an account under that address keeps it.
 *
 * Payload's local strategy requires a password on create, including for a person
 * who will only ever use Google. A random one is generated and hashed by Payload,
 * so the column is never empty and nobody knows the value. Linking an existing
 * address rotates it for the reason the old code cleared it: a password created
 * before the address was proven must not stay valid on an account Google has just
 * taken over. A reset link can always set a real one.
 */
const findOrLinkOrCreateCustomer = async (
  payload: Payload,
  profile: GoogleProfile,
  req: PayloadRequest,
): Promise<Customer | null> => {
  const byGoogleId = await payload.find({
    collection: 'customers',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { googleId: { equals: profile.googleId } },
  })

  const known = byGoogleId.docs[0]
  if (known) {
    const updated = await payload.update({
      collection: 'customers',
      data: {
        ...(profile.name ? { name: profile.name } : {}),
        ...(profile.picture ? { picture: profile.picture } : {}),
      },
      depth: 0,
      id: known.id,
      overrideAccess: true,
      req,
    })

    // A row linked by Google in an earlier version may still carry an unverified
    // flag. Google has proved the address again, so clear it.
    await markGoogleVerified(payload, updated.id, req)
    return updated
  }

  const byEmail = await payload.find({
    collection: 'customers',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { email: { equals: profile.email } },
  })

  const sameEmail = byEmail.docs[0]
  if (sameEmail) {
    const linked = await payload.update({
      collection: 'customers',
      data: {
        googleId: profile.googleId,
        // A random password is rotated in below; this customer cannot actually use
        // one until they set it with a reset link, so the account card must not
        // claim they can.
        hasPassword: false,
        password: randomBytes(32).toString('base64url'),
        ...(profile.name ? { name: profile.name } : {}),
        ...(profile.picture ? { picture: profile.picture } : {}),
      },
      depth: 0,
      id: sameEmail.id,
      overrideAccess: true,
      req,
    })

    await markGoogleVerified(payload, linked.id, req)
    return linked
  }

  try {
    const created = await payload.create({
      collection: 'customers',
      data: {
        // Read straight off the Google profile, which is only accepted when
        // `email_verified` is true, so this address is confirmed by construction.
        email: profile.email,
        password: randomBytes(32).toString('base64url'),
        googleId: profile.googleId,
        // The random password above is never shown to anyone, so this account has
        // no password a customer could sign in with until they set one.
        hasPassword: false,
        ...(profile.name ? { name: profile.name } : {}),
        ...(profile.picture ? { picture: profile.picture } : {}),
      },
      depth: 0,
      // Google already verified the address; no confirmation email is needed.
      disableVerificationEmail: true,
      overrideAccess: true,
      req,
    })

    await markGoogleVerified(payload, created.id, req)
    return created
  } catch {
    // A concurrent first sign-in can beat us to the unique index. Re-read rather
    // than failing a sign-in that actually succeeded.
    const retry = await payload.find({
      collection: 'customers',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: { googleId: { equals: profile.googleId } },
    })

    return retry.docs[0] ?? null
  }
}

/** Build a redirect that clears the short lived OAuth cookie. */
const redirectToSignIn = (error: string): Response => {
  const headers = new Headers()
  headers.set('Location', `${SIGN_IN_PATH}?error=${encodeURIComponent(error)}`)
  headers.append(
    'Set-Cookie',
    serializeCookie(CUSTOMER_OAUTH_COOKIE, '', { ...customerOauthCookieOptions, maxAge: 0 }),
  )

  return new Response(null, { headers, status: 303 })
}

/**
 * Step one. Mint a state value and PKCE pair, remember them in a short lived
 * cookie, and send the browser to Google.
 */
export const googleAuthorizeEndpoint: Endpoint = {
  path: '/oauth/google',
  method: 'get',
  handler: async (req) => {
    const credentials = googleCredentials()

    if (!credentials) {
      req.payload.logger.error({ msg: 'customer_sign_in_unconfigured' })
      return new Response(null, { status: 503 })
    }

    const request = createGoogleAuthRequest()
    const headers = new Headers()
    let returnTo: string | null = null

    try {
      const current = new URL(req.url ?? '', getServerSideURL())
      returnTo = safeReturnPath(current.searchParams.get('return'))
    } catch {
      returnTo = null
    }

    headers.set(
      'Location',
      buildGoogleAuthorizeUrl({
        clientId: credentials.clientId,
        codeChallenge: request.codeChallenge,
        state: request.state,
      }),
    )
    headers.append(
      'Set-Cookie',
      serializeCookie(
        CUSTOMER_OAUTH_COOKIE,
        packAuthState({
          ...(returnTo ? { returnTo } : {}),
          state: request.state,
          verifier: request.verifier,
        }),
        customerOauthCookieOptions,
      ),
    )

    return new Response(null, { headers, status: 302 })
  },
}

/**
 * Step two. Check the state, exchange the code, read the profile, then set the
 * session cookie.
 *
 * The OAuth cookie is cleared on every exit, so a state value is single use
 * whether or not the sign-in worked.
 */
export const googleCallbackEndpoint: Endpoint = {
  path: '/oauth/google/callback',
  method: 'get',
  handler: async (req) => {
    const credentials = googleCredentials()

    if (!credentials) {
      req.payload.logger.error({ msg: 'customer_sign_in_unconfigured' })
      return redirectToSignIn('exchange')
    }

    let params: URLSearchParams
    try {
      params = new URL(req.url ?? '', getServerSideURL()).searchParams
    } catch {
      return redirectToSignIn('state')
    }

    const code = params.get('code')
    const returnedState = params.get('state')
    const stored = parseAuthState(readCookie(req.headers.get('cookie'), CUSTOMER_OAUTH_COOKIE))

    if (!code || !returnedState || !stored || !safeCompare(stored.state, returnedState)) {
      req.payload.logger.warn({ msg: 'customer_sign_in_state_rejected' })
      return redirectToSignIn('state')
    }

    const accessToken = await exchangeGoogleCode({
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret,
      code,
      codeVerifier: stored.verifier,
    })

    if (!accessToken) {
      req.payload.logger.warn({ msg: 'customer_sign_in_exchange_failed' })
      return redirectToSignIn('exchange')
    }

    const profile = await fetchGoogleProfile(accessToken)

    if (!profile) {
      req.payload.logger.warn({ msg: 'customer_sign_in_profile_rejected' })
      return redirectToSignIn('profile')
    }

    let customer: Customer | null
    try {
      customer = await findOrLinkOrCreateCustomer(req.payload, profile, req)
    } catch {
      req.payload.logger.error({ msg: 'customer_sign_in_write_failed' })
      return redirectToSignIn('session')
    }

    if (!customer) {
      req.payload.logger.error({ msg: 'customer_sign_in_no_customer' })
      return redirectToSignIn('session')
    }

    let token: string
    try {
      token = await mintCustomerSession(req.payload, customer, req)
    } catch {
      req.payload.logger.error({ msg: 'customer_sign_in_token_failed' })
      return redirectToSignIn('session')
    }

    const headers = new Headers()

    headers.set('Location', safeReturnPath(stored.returnTo) ?? ACCOUNT_PATH)
    // Clear the round trip cookie, then set the session.
    headers.append(
      'Set-Cookie',
      serializeCookie(CUSTOMER_OAUTH_COOKIE, '', { ...customerOauthCookieOptions, maxAge: 0 }),
    )
    headers.append(
      'Set-Cookie',
      serializeCookie(CUSTOMER_SESSION_COOKIE, token, {
        ...customerSessionCookieOptions,
        maxAge: CUSTOMER_SESSION_MAX_AGE,
      }),
    )

    return new Response(null, { headers, status: 303 })
  },
}

/**
 * Clear the customer session.
 *
 * This shadows Payload's built in `/api/customers/logout`, which clears the shared
 * `payload-token` cookie. Custom endpoints are matched first, so signing a customer
 * out can never sign a staff member out of the admin panel by accident.
 *
 * The session row is revoked too, so a copied cookie stops working immediately
 * rather than lingering until the token expires.
 */
export const customerLogoutEndpoint: Endpoint = {
  path: '/logout',
  method: 'post',
  handler: async (req) => {
    const token = readCookie(req.headers.get('cookie'), CUSTOMER_SESSION_COOKIE)

    try {
      await revokeCustomerSession(req.payload, token, req)
    } catch {
      req.payload.logger.error({ msg: 'customer_logout_revoke_failed' })
    }

    const headers = new Headers()

    headers.set('Location', '/')
    headers.append(
      'Set-Cookie',
      serializeCookie(CUSTOMER_SESSION_COOKIE, '', {
        ...customerSessionCookieOptions,
        maxAge: 0,
      }),
    )

    return new Response(null, { headers, status: 303 })
  },
}

/**
 * Whether this browser has a customer session, for the header account links.
 *
 * Payload's own `/me` reads the shared `payload-token` cookie only, so it can never
 * see our cookie and is no use here. This returns nothing but a boolean and a first
 * name: enough for the header, not an enumeration oracle.
 */
export const customerSessionEndpoint: Endpoint = {
  path: '/oauth/session',
  method: 'get',
  handler: async (req) => {
    const headers = new Headers({ 'Cache-Control': 'no-store' })
    const token = readCookie(req.headers.get('cookie'), CUSTOMER_SESSION_COOKIE)

    try {
      const customer = await authenticateCustomerToken(req.payload, token, req)

      if (!customer) {
        return Response.json({ signedIn: false }, { headers })
      }

      return Response.json(
        {
          name: typeof customer.name === 'string' ? customer.name : null,
          signedIn: true,
        },
        { headers },
      )
    } catch {
      return Response.json({ signedIn: false }, { headers })
    }
  },
}
