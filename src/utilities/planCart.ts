/** The one cookie the shop uses. It holds a single chosen plan. */
export const CART_COOKIE = 'unave_cart'

/** A month, in seconds. Long enough to survive a closed browser. */
export const CART_MAX_AGE = 60 * 60 * 24 * 30

export type CartEntry = {
  planId: number
  slug: string
  addedAt: string
}

/** URI encode the entry so it is safe as a cookie value. */
export const packCart = (entry: CartEntry): string => encodeURIComponent(JSON.stringify(entry))

/**
 * Read the cookie value back. A hand edited, truncated or foreign value is an
 * empty cart, never a throw.
 */
export const parseCart = (value: string | null | undefined): CartEntry | null => {
  if (!value) return null

  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(value))
    if (!parsed || typeof parsed !== 'object') return null

    const { planId, slug, addedAt } = parsed as Record<string, unknown>

    if (typeof planId !== 'number' || !Number.isInteger(planId) || planId <= 0) return null
    if (typeof slug !== 'string' || slug.length === 0) return null

    return {
      addedAt: typeof addedAt === 'string' ? addedAt : '',
      planId,
      slug,
    }
  } catch {
    return null
  }
}

export const cartCookieOptions = {
  httpOnly: true,
  maxAge: CART_MAX_AGE,
  path: '/',
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
}