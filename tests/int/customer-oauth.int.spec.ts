import { describe, expect, it } from 'vitest'

import { packAuthState, parseAuthState, safeCompare } from '@/auth/google/oauth'

/**
 * The OAuth round-trip helpers.
 *
 * The session cookie itself is a Payload JWT now, so there is no session signing
 * code of ours left to unit test. The state cookie is still ours to defend: it is
 * signed with `PAYLOAD_SECRET`, so a value this server did not mint is refused.
 */
describe('packAuthState and parseAuthState', () => {
  it('round trips the state and verifier', () => {
    const packed = packAuthState({ state: 'state-value', verifier: 'verifier-value' })

    expect(parseAuthState(packed)).toEqual({ state: 'state-value', verifier: 'verifier-value' })
  })

  it('produces a cookie safe value', () => {
    expect(packAuthState({ state: 'a', verifier: 'b' })).toMatch(/^[\w.-]+$/)
  })

  it('returns null for anything it cannot trust', () => {
    expect(parseAuthState(null)).toBeNull()
    expect(parseAuthState(undefined)).toBeNull()
    expect(parseAuthState('')).toBeNull()
    expect(parseAuthState('not-base64-json')).toBeNull()

    const missingVerifier = Buffer.from(JSON.stringify({ state: 'only-state' })).toString(
      'base64url',
    )
    expect(parseAuthState(missingVerifier)).toBeNull()
  })

  it('refuses a value this server did not sign', () => {
    const unsigned = Buffer.from(
      JSON.stringify({ state: 'forged', verifier: 'forged' }),
    ).toString('base64url')

    // A well formed payload with no signature, and one with a flipped signature.
    expect(parseAuthState(unsigned)).toBeNull()

    const packed = packAuthState({ state: 'state-value', verifier: 'verifier-value' })
    const [payload, signature] = packed.split('.')
    const tampered = signature!.slice(0, -1) + (signature!.endsWith('a') ? 'b' : 'a')

    expect(parseAuthState(`${payload}.${tampered}`)).toBeNull()
    expect(parseAuthState(`${unsigned}.${signature}`)).toBeNull()
  })
})

describe('safeCompare', () => {
  it('is true only for identical values', () => {
    expect(safeCompare('abc', 'abc')).toBe(true)
    expect(safeCompare('abc', 'abd')).toBe(false)
  })

  it('is false, not a throw, when the lengths differ', () => {
    expect(safeCompare('abc', 'abcd')).toBe(false)
    expect(safeCompare('', 'a')).toBe(false)
  })
})
