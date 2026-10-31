import { describe, expect, it } from 'vitest'

import {
  CUSTOMER_AUTH_COPY,
  CUSTOMER_AUTH_ERRORS,
  customerAuthError,
} from '@/components/CustomerAuth/copy'

/**
 * The two auth screens are one flow seen from two directions, so the only thing
 * that can silently rot is the copy: a screen that stops linking to the other one
 * becomes a dead end. These are cheap guards on that contract.
 */
describe('customer auth copy', () => {
  it('gives each screen a way to reach the other', () => {
    expect(CUSTOMER_AUTH_COPY['sign-in'].switchHref).toBe('/sign-up')
    expect(CUSTOMER_AUTH_COPY['sign-up'].switchHref).toBe('/sign-in')
  })

  it('names the destination the same way the link does', () => {
    expect(CUSTOMER_AUTH_COPY['sign-in'].switchLabel).toBe('Sign up')
    expect(CUSTOMER_AUTH_COPY['sign-up'].switchLabel).toBe('Sign in')
  })

  it('gives both screens a distinct heading and a line of context', () => {
    const titles = Object.values(CUSTOMER_AUTH_COPY).map((copy) => copy.title)

    expect(new Set(titles).size).toBe(titles.length)
    expect(titles.every((title) => title.length > 0)).toBe(true)
    expect(Object.values(CUSTOMER_AUTH_COPY).every((copy) => copy.intro.length > 0)).toBe(true)
  })

  it('turns each callback outcome into its own plain line', () => {
    for (const code of Object.keys(CUSTOMER_AUTH_ERRORS)) {
      expect(customerAuthError(code)).toBe(CUSTOMER_AUTH_ERRORS[code])
    }
  })

  it('shows no line on a clean visit', () => {
    expect(customerAuthError(undefined)).toBeNull()
    expect(customerAuthError('')).toBeNull()
  })

  it('falls back to the neutral line for a code it does not know', () => {
    expect(customerAuthError('something-new')).toBe(CUSTOMER_AUTH_ERRORS.session)
  })
})
