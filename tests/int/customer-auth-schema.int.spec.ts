import { describe, expect, it } from 'vitest'

import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  emailSchema,
  forgotPasswordSchema,
  isEmailish,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  toFieldErrors,
} from '../../src/auth/password/schema'

/**
 * The credential rules are shared by the browser form and the Payload endpoints, so
 * these tests pin the two properties that make that safe: the parsed value is
 * already normalised, and the messages are the ones the pages show.
 */
describe('email schema', () => {
  it('trims and lowercases before it returns a value', () => {
    const result = emailSchema.safeParse('  Priya@Example.COM ')

    expect(result.success && result.data).toBe('priya@example.com')
  })

  it('refuses an address with no domain, no dot or a space', () => {
    for (const value of ['', 'nope', 'a@b', 'a b@example.com', '@example.com']) {
      expect(emailSchema.safeParse(value).success).toBe(false)
    }
  })
})

describe('password rules', () => {
  it('accepts a password at the minimum and refuses one under it', () => {
    expect(signUpSchema.safeParse({ email: 'a@b.co', password: 'a'.repeat(MIN_PASSWORD_LENGTH) }).success).toBe(true)
    expect(signUpSchema.safeParse({ email: 'a@b.co', password: 'a'.repeat(MIN_PASSWORD_LENGTH - 1) }).success).toBe(false)
  })

  it('refuses a password past the ceiling an unauthenticated route can be asked for', () => {
    const result = signUpSchema.safeParse({ email: 'a@b.co', password: 'a'.repeat(MAX_PASSWORD_LENGTH + 1) })

    expect(result.success).toBe(false)
  })

  it('lets sign in accept a short password, because old accounts must still get in', () => {
    const result = signInSchema.safeParse({ email: 'a@b.co', password: 'short' })

    expect(result.success).toBe(true)
  })
})

describe('reset schema', () => {
  it('needs both a long enough password and a token', () => {
    const missingToken = resetPasswordSchema.safeParse({ password: 'longenough1', token: '' })
    const shortPassword = resetPasswordSchema.safeParse({ password: 'short', token: 'tok' })

    expect(missingToken.success).toBe(false)
    expect(shortPassword.success).toBe(false)
    expect(resetPasswordSchema.safeParse({ password: 'longenough1', token: 'tok' }).success).toBe(true)
  })
})

describe('toFieldErrors', () => {
  it('reports the first message per field, keyed by the field name', () => {
    const result = signUpSchema.safeParse({ email: 'nope', password: 'short' })

    expect(result.success).toBe(false)

    const errors = result.success ? {} : toFieldErrors(result.error)

    expect(errors.email).toBe('Please enter a valid email address.')
    expect(errors.password).toBe(`Use at least ${MIN_PASSWORD_LENGTH} characters.`)
  })
})

describe('isEmailish', () => {
  it('is the same loose test the form and the mail guard use', () => {
    expect(isEmailish('a@b.co')).toBe(true)
    expect(isEmailish('a@b')).toBe(false)
    expect(isEmailish('a'.repeat(300) + '@b.co')).toBe(false)
  })
})

describe('forgot schema', () => {
  it('asks only for an address', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'a@b.co' }).success).toBe(true)
    expect(forgotPasswordSchema.safeParse({ email: 'nope' }).success).toBe(false)
  })
})