import { describe, expect, it } from 'vitest'

import {
  ACCESS_TOKEN_TTL_DAYS,
  accessTokenExpiry,
  generateAccessToken,
  hashAccessToken,
} from '@/utilities/accessToken'

describe('generateAccessToken', () => {
  it('returns 32 random bytes as an unpadded base64url string', () => {
    const token = generateAccessToken()

    expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(token).not.toContain('=')
    expect(Buffer.from(token, 'base64url')).toHaveLength(32)
  })

  it('returns a different token on every call', () => {
    const tokens = new Set(Array.from({ length: 25 }, () => generateAccessToken()))

    expect(tokens.size).toBe(25)
  })
})

describe('hashAccessToken', () => {
  it('returns a lowercase 64 character SHA-256 hex digest', () => {
    const hash = hashAccessToken('any raw token value')

    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('is stable for the same token so a stored hash can be looked up', () => {
    const token = generateAccessToken()

    expect(hashAccessToken(token)).toBe(hashAccessToken(token))
  })

  it('produces a different hash for every different token', () => {
    const first = hashAccessToken('token one')
    const second = hashAccessToken('token two')

    expect(first).not.toBe(second)
  })

  it('never equals the raw token it hashes', () => {
    const token = generateAccessToken()

    expect(hashAccessToken(token)).not.toBe(token)
  })
})

describe('accessTokenExpiry', () => {
  it('is exactly seven days after the given moment', () => {
    expect(accessTokenExpiry(new Date('2026-01-31T10:15:30.000Z'))).toBe(
      '2026-02-07T10:15:30.000Z',
    )
  })

  it('uses the seven day lifetime constant', () => {
    const from = new Date('2026-06-01T00:00:00.000Z')
    const expiry = new Date(accessTokenExpiry(from))

    expect(expiry.getTime() - from.getTime()).toBe(ACCESS_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)
  })

  it('does not mutate the moment it was given', () => {
    const from = new Date('2026-06-01T00:00:00.000Z')

    accessTokenExpiry(from)

    expect(from.toISOString()).toBe('2026-06-01T00:00:00.000Z')
  })

  it('defaults to seven days from now', () => {
    const before = Date.now()
    const expiry = new Date(accessTokenExpiry()).getTime()
    const after = Date.now()
    const sevenDays = ACCESS_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000

    expect(expiry).toBeGreaterThanOrEqual(before + sevenDays)
    expect(expiry).toBeLessThanOrEqual(after + sevenDays)
  })
})
