import { beforeEach, describe, expect, it } from 'vitest'

import { consumeRateLimit, getClientIp, resetRateLimits } from '../../src/utilities/rateLimit'

beforeEach(() => resetRateLimits())

const headers = (values: Record<string, string>) => ({
  get: (name: string) => values[name.toLowerCase()] ?? null,
})

describe('sliding window rate limit', () => {
  it('allows up to the limit then blocks, and reports the reset time', () => {
    const start = 1_000_000
    for (let i = 0; i < 3; i += 1) {
      expect(consumeRateLimit('scope', 'subject', 3, 60_000, start + i)).toEqual({ limited: false })
    }

    const blocked = consumeRateLimit('scope', 'subject', 3, 60_000, start + 3)
    expect(blocked.limited).toBe(true)
    expect(blocked.limited && blocked.resetAt.getTime()).toBe(start + 60_000)
  })

  it('drops entries older than the window', () => {
    const start = 5_000_000
    for (let i = 0; i < 3; i += 1) {
      consumeRateLimit('scope', 'subject', 3, 60_000, start)
    }

    // A timestamp past the window frees the earliest slot.
    expect(consumeRateLimit('scope', 'subject', 3, 60_000, start + 60_001)).toEqual({
      limited: false,
    })
  })

  it('keeps separate budgets per scope and subject', () => {
    const start = 6_000_000
    consumeRateLimit('a', 'one', 1, 60_000, start)
    expect(consumeRateLimit('a', 'one', 1, 60_000, start).limited).toBe(true)
    expect(consumeRateLimit('a', 'two', 1, 60_000, start).limited).toBe(false)
    expect(consumeRateLimit('b', 'one', 1, 60_000, start).limited).toBe(false)
  })
})

describe('client IP extraction', () => {
  it('takes the first forwarded address', () => {
    expect(getClientIp(headers({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }))).toBe('1.2.3.4')
  })

  it('falls back to x-real-ip', () => {
    expect(getClientIp(headers({ 'x-real-ip': '9.9.9.9' }))).toBe('9.9.9.9')
  })

  it('returns null when no address is present', () => {
    expect(getClientIp(headers({}))).toBeNull()
  })
})
