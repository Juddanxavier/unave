/**
 * The customer session cookie.
 *
 * The value is a Payload JWT, signed and verified by Payload's own JWT strategy.
 * Only the cookie name is ours. It is deliberately NOT `${cookiePrefix}-token`:
 * every Payload auth collection shares that one cookie name (see `extractJWT` in
 * the payload package), so a customer signing in would overwrite a staff member's
 * admin session in the same browser. A distinct name keeps the two apart.
 */
export const CUSTOMER_SESSION_COOKIE = 'unave-customer'

/**
 * Thirty days, in seconds.
 *
 * This is both Payload's `auth.tokenExpiration` for customers and the cookie's
 * `Max-Age`, so the browser and the signed token expire together.
 */
export const CUSTOMER_TOKEN_EXPIRATION = 60 * 60 * 24 * 30

/** The same window in the unit `Set-Cookie` wants. */
export const CUSTOMER_SESSION_MAX_AGE = CUSTOMER_TOKEN_EXPIRATION

/** Cookie holding the OAuth `state` and PKCE verifier during a sign-in round trip. */
export const CUSTOMER_OAUTH_COOKIE = 'unave-oauth'

/**
 * Sign-in stays switched off until a deployment provides Google credentials, so a
 * site without them is byte for byte the site it was before this feature. This lives
 * here, not in the server helper, because the header imports it and the header must
 * not pull Payload or `next/headers` into a statically rendered layout.
 */
export const isCustomerSignInConfigured = (): boolean => Boolean(process.env.GOOGLE_CLIENT_ID)

/** Ten minutes, in seconds. A sign-in that takes longer is started again. */
export const CUSTOMER_OAUTH_MAX_AGE = 60 * 10

/** Options for the session cookie itself. */
export const customerSessionCookieOptions = {
  httpOnly: true,
  maxAge: CUSTOMER_SESSION_MAX_AGE,
  path: '/',
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
}

/** Options for the short lived OAuth cookie. Scoped to the callback path. */
export const customerOauthCookieOptions = {
  httpOnly: true,
  maxAge: CUSTOMER_OAUTH_MAX_AGE,
  path: '/api/customers/oauth',
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
}

type CookieOptions = {
  httpOnly?: boolean
  maxAge?: number
  path?: string
  sameSite?: 'lax' | 'strict' | 'none'
  secure?: boolean
}

/** Serialize one `Set-Cookie` value. Kept here so both the routes and the strategy agree. */
export const serializeCookie = (name: string, value: string, options: CookieOptions): string => {
  const parts = [`${name}=${value}`]

  if (options.maxAge !== undefined) parts.push(`Max-Age=${Math.floor(options.maxAge)}`)
  parts.push(`Path=${options.path ?? '/'}`)
  if (options.httpOnly) parts.push('HttpOnly')
  if (options.secure) parts.push('Secure')
  if (options.sameSite) parts.push(`SameSite=${options.sameSite === 'lax' ? 'Lax' : options.sameSite === 'strict' ? 'Strict' : 'None'}`)

  return parts.join('; ')
}

/** Read one cookie out of a request's `Cookie` header. */
export const readCookie = (header: string | null | undefined, name: string): string | null => {
  if (!header) return null

  for (const pair of header.split(';')) {
    const index = pair.indexOf('=')
    if (index === -1) continue

    const key = pair.slice(0, index).trim()
    if (key !== name) continue

    const value = pair.slice(index + 1).trim()
    return value.length > 0 ? value : null
  }

  return null
}
