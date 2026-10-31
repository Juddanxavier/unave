import { describe, expect, it } from 'vitest'

import { cartCookieOptions, packCart, parseCart } from '../../src/utilities/planCart'

describe('cart cookie', () => {
  it('round trips one entry', () => {
    const entry = {
      addedAt: '2026-10-29T12:00:00.000Z',
      planId: 7,
      slug: 'weekly-tiffin',
    }

    expect(parseCart(packCart(entry))).toEqual(entry)
  })

  it('treats a missing, truncated or foreign value as an empty cart', () => {
    expect(parseCart(undefined)).toBeNull()
    expect(parseCart(null)).toBeNull()
    expect(parseCart('')).toBeNull()
    expect(parseCart('not-json')).toBeNull()
    expect(parseCart('%')).toBeNull()
    expect(parseCart(encodeURIComponent('{"planId":"7","slug":"weekly"}'))).toBeNull()
    expect(parseCart(encodeURIComponent('[]'))).toBeNull()
  })

  it('rejects a plan id that is not a positive integer', () => {
    for (const planId of [0, -1, 1.5, '7', null]) {
      const value = encodeURIComponent(JSON.stringify({ addedAt: 'y', planId, slug: 'x' }))
      expect(parseCart(value)).toBeNull()
    }
  })

  it('rejects a missing or empty slug', () => {
    expect(parseCart(encodeURIComponent(JSON.stringify({ planId: 7, addedAt: 'y' })))).toBeNull()
    expect(parseCart(encodeURIComponent(JSON.stringify({ planId: 7, slug: '', addedAt: 'y' })))).toBeNull()
  })

  it('keeps an entry whose added time is missing', () => {
    const value = encodeURIComponent(JSON.stringify({ planId: 7, slug: 'weekly' }))

    expect(parseCart(value)).toEqual({ addedAt: '', planId: 7, slug: 'weekly' })
  })

  it('marks the cookie http only, lax, path wide and long lived', () => {
    expect(cartCookieOptions.httpOnly).toBe(true)
    expect(cartCookieOptions.sameSite).toBe('lax')
    expect(cartCookieOptions.path).toBe('/')
    expect(cartCookieOptions.maxAge).toBe(60 * 60 * 24 * 30)
    expect(cartCookieOptions.secure).toBe(false)
  })
})