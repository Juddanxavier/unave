import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

import { getServerSideURL } from '@/utilities/getURL'

export const GOOGLE_AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
export const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo'

export const GOOGLE_CALLBACK_PATH = '/api/customers/oauth/google/callback'

/** Every provider call is bounded, so a hung Google never holds a request open. */
const PROVIDER_TIMEOUT_MS = 10_000

export type GoogleCredentials = {
  clientId: string
  clientSecret: string
}

/**
 * The OAuth client, or null when the deployment has no credentials. Callers treat
 * null as "this feature is switched off", never as an error to surface.
 */
export const googleCredentials = (): GoogleCredentials | null => {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) return null

  return { clientId, clientSecret }
}

/** Must match a redirect URI registered on the Google Cloud OAuth client, exactly. */
export const googleRedirectUri = (): string => `${getServerSideURL()}${GOOGLE_CALLBACK_PATH}`

export type GoogleAuthRequest = {
  codeChallenge: string
  state: string
  verifier: string
}

/** What we remember between the authorize redirect and the callback. */
export type GoogleAuthState = {
  returnTo?: string
  state: string
  verifier: string
}

/**
 * Sign the packed state with `PAYLOAD_SECRET`, the same key Payload uses.
 *
 * The cookie is `HttpOnly`, host only and `SameSite=Lax`, so a cross site page
 * cannot set it. The signature is the second lock: a value that did not come from
 * this server is refused before its JSON is even parsed.
 */
const signState = (payload: string): string =>
  createHmac('sha256', Buffer.from(process.env.PAYLOAD_SECRET ?? '', 'utf8'))
    .update(payload)
    .digest('base64url')

/** Pack the state and verifier into one cookie safe, signed value. */
export const packAuthState = (value: GoogleAuthState): string => {
  const payload = Buffer.from(JSON.stringify(value)).toString('base64url')

  return `${payload}.${signState(payload)}`
}

/** Read it back. A tampered, forged or truncated value is simply absent, never a throw. */
export const parseAuthState = (raw: string | null | undefined): GoogleAuthState | null => {
  if (typeof raw !== 'string' || raw.length === 0) return null

  const separator = raw.lastIndexOf('.')
  if (separator <= 0) return null

  const payload = raw.slice(0, separator)
  const signature = raw.slice(separator + 1)

  // A cookie we did not sign is not ours, even if its JSON parses.
  if (!safeCompare(signature, signState(payload))) return null

  try {
    const parsed: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (!parsed || typeof parsed !== 'object') return null

    const { returnTo, state, verifier } = parsed as Record<string, unknown>
    if (typeof state !== 'string' || state.length === 0) return null
    if (typeof verifier !== 'string' || verifier.length === 0) return null

    return {
      ...(typeof returnTo === 'string' && returnTo.length > 0 ? { returnTo } : {}),
      state,
      verifier,
    }
  } catch {
    return null
  }
}

/**
 * A fresh state value and PKCE pair. State defends against a forged callback; the
 * verifier means an intercepted authorization code is useless to another client.
 */
export const createGoogleAuthRequest = (): GoogleAuthRequest => {
  const verifier = randomBytes(32).toString('base64url')

  return {
    codeChallenge: createHash('sha256').update(verifier).digest('base64url'),
    state: randomBytes(32).toString('base64url'),
    verifier,
  }
}

/** The URL we send the browser to. `access_type=online` because we need no refresh token. */
export const buildGoogleAuthorizeUrl = (args: {
  clientId: string
  codeChallenge: string
  state: string
}): string => {
  const url = new URL(GOOGLE_AUTHORIZE_URL)

  url.searchParams.set('client_id', args.clientId)
  url.searchParams.set('code_challenge', args.codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')
  url.searchParams.set('redirect_uri', googleRedirectUri())
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'openid email profile')
  url.searchParams.set('state', args.state)
  url.searchParams.set('access_type', 'online')
  url.searchParams.set('prompt', 'select_account')

  return url.toString()
}

export type GoogleProfile = {
  email: string
  emailVerified: boolean
  googleId: string
  name: string | null
  picture: string | null
}

const CUSTOMER_EMAIL_MAX = 320

/** Trim and lowercase, matching how `customers.email` is normalised. */
export const normalizeCustomerEmail = (value: string): string =>
  value.trim().toLowerCase().slice(0, CUSTOMER_EMAIL_MAX)

/**
 * Exchange the authorization code for an access token. Returns null on any
 * non-2xx, malformed body, timeout or network failure. Never throws.
 */
export const exchangeGoogleCode = async (args: {
  clientId: string
  clientSecret: string
  code: string
  codeVerifier: string
}): Promise<string | null> => {
  const body = new URLSearchParams({
    client_id: args.clientId,
    client_secret: args.clientSecret,
    code: args.code,
    code_verifier: args.codeVerifier,
    grant_type: 'authorization_code',
    redirect_uri: googleRedirectUri(),
  })

  try {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      method: 'POST',
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    })

    if (!response.ok) return null

    const data: unknown = await response.json()
    if (!data || typeof data !== 'object') return null

    const accessToken = (data as { access_token?: unknown }).access_token
    return typeof accessToken === 'string' && accessToken.length > 0 ? accessToken : null
  } catch {
    return null
  }
}

/**
 * Read the profile from Google's userinfo endpoint.
 *
 * We do not verify the ID token locally. Reading userinfo over TLS with the access
 * token we just exchanged is a supported OIDC pattern and avoids pulling in a JOSE
 * library and an algorithm negotiation surface for one code path.
 */
export const fetchGoogleProfile = async (accessToken: string): Promise<GoogleProfile | null> => {
  try {
    const response = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    })

    if (!response.ok) return null

    const data: unknown = await response.json()
    if (!data || typeof data !== 'object') return null

    const raw = data as Record<string, unknown>
    const sub = raw.sub
    const email = raw.email
    const emailVerified = raw.email_verified

    if (typeof sub !== 'string' || sub.length === 0) return null
    if (typeof email !== 'string' || email.length === 0) return null
    // An unverified address must never create or link an account.
    if (emailVerified !== true) return null

    const normalized = normalizeCustomerEmail(email)
    if (normalized.length === 0) return null

    return {
      email: normalized,
      emailVerified: true,
      googleId: sub,
      name: typeof raw.name === 'string' && raw.name.trim().length > 0 ? raw.name.trim() : null,
      picture: typeof raw.picture === 'string' && raw.picture.length > 0 ? raw.picture : null,
    }
  } catch {
    return null
  }
}

/** Constant time comparison for two state values. Length mismatch is a mismatch. */
export const safeCompare = (a: string, b: string): boolean => {
  const left = Buffer.from(a)
  const right = Buffer.from(b)

  if (left.length !== right.length) return false

  return timingSafeEqual(left, right)
}
