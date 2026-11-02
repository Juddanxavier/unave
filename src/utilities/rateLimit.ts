import { createHash } from 'node:crypto'

type Bucket = number[]

export type RateLimitResult =
  | { limited: false }
  | { limited: true; resetAt: Date }

/**
 * One server process, one map. Keys are hashed before they are stored, and the
 * raw IP or email is never written down. This is best effort protection only:
 * it resets on deploy and does not coordinate across instances.
 */
const buckets = new Map<string, Bucket>()

const keyFor = (scope: string, subject: string): string =>
  createHash('sha256').update(`${scope}:${subject}`).digest('hex')

/**
 * Sliding window: drops timestamps older than the window, then either records
 * the moment or reports the block. `resetAt` is the oldest kept timestamp plus
 * the window.
 */
export const consumeRateLimit = (
  scope: string,
  subject: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult => {
  const key = keyFor(scope, subject)
  const windowStart = now - windowMs
  const kept = (buckets.get(key) ?? []).filter((stamp) => stamp > windowStart)

  if (kept.length >= limit) {
    buckets.set(key, kept)
    return { limited: true, resetAt: new Date(kept[0] + windowMs) }
  }

  kept.push(now)
  buckets.set(key, kept)
  return { limited: false }
}

/** Clears every bucket. Used by the tests, never by the app. */
export const resetRateLimits = (): void => {
  buckets.clear()
}

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE

/**
 * Password sign-in. Two buckets, because they stop different things: the IP
 * bucket stops one machine guessing across many accounts, and the email bucket
 * stops many machines guessing at one account.
 *
 * Payload now owns the per account lock (`auth.maxLoginAttempts`), but these still
 * earn their place: the limits bound the cost of an unauthenticated request before
 * Payload ever hashes a password, and they slow a distributed attempt across
 * accounts that no single account lock would see.
 */
export const LOGIN_IP_LIMIT = 20
export const LOGIN_IP_WINDOW_MS = 10 * MINUTE
export const LOGIN_EMAIL_LIMIT = 10
export const LOGIN_EMAIL_WINDOW_MS = 10 * MINUTE

export const checkLoginIpLimit = (ip: string | null, now: number = Date.now()): RateLimitResult =>
  ip === null ? { limited: false } : consumeRateLimit('login-ip', ip, LOGIN_IP_LIMIT, LOGIN_IP_WINDOW_MS, now)

export const checkLoginEmailLimit = (
  email: string,
  now: number = Date.now(),
): RateLimitResult =>
  consumeRateLimit('login-email', email, LOGIN_EMAIL_LIMIT, LOGIN_EMAIL_WINDOW_MS, now)

/**
 * The routes that mail a link to an address the caller typed: register,
 * forgot-password and resend-verification. Every attempt counts, whether or not
 * the address exists, so the limit is on the sender rather than the account.
 */
export const ACCOUNT_MAIL_IP_LIMIT = 15
export const ACCOUNT_MAIL_IP_WINDOW_MS = HOUR

export const checkAccountMailIpLimit = (
  ip: string | null,
  now: number = Date.now(),
): RateLimitResult =>
  ip === null
    ? { limited: false }
    : consumeRateLimit('account-mail-ip', ip, ACCOUNT_MAIL_IP_LIMIT, ACCOUNT_MAIL_IP_WINDOW_MS, now)

/**
 * The public contact form. It writes a row and mails the kitchen, which is worth
 * more to a spam script than to a visitor. Five an hour from one address is plenty
 * for a person with several questions and starves the scripts.
 */
export const ENQUIRY_IP_LIMIT = 5
export const ENQUIRY_IP_WINDOW_MS = HOUR

export const checkEnquiryIpLimit = (
  ip: string | null,
  now: number = Date.now(),
): RateLimitResult =>
  ip === null
    ? { limited: false }
    : consumeRateLimit('enquiry-ip', ip, ENQUIRY_IP_LIMIT, ENQUIRY_IP_WINDOW_MS, now)

/**
 * Order creation. The same shape as the enquiry limit, and for the same reason:
 * an attempt writes rows and talks to a paid gateway. Five an hour from one
 * address is generous for a person who is retrying a payment.
 */
export const ORDER_IP_LIMIT = 5
export const ORDER_IP_WINDOW_MS = HOUR

export const checkOrderIpLimit = (ip: string | null, now: number = Date.now()): RateLimitResult =>
  ip === null
    ? { limited: false }
    : consumeRateLimit('order-ip', ip, ORDER_IP_LIMIT, ORDER_IP_WINDOW_MS, now)

type HeaderLike = { get: (name: string) => string | null | undefined }

/**
 * First value of `x-forwarded-for`, else `x-real-ip`, else none. With no
 * address the caller skips the IP limits rather than bucketing everyone under
 * one shared key.
 */
export const getClientIp = (headers: HeaderLike): string | null => {
  const forwarded = headers.get('x-forwarded-for')

  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }

  const real = headers.get('x-real-ip')
  if (real && real.trim()) return real.trim()

  return null
}
