import { z } from 'zod'

import { FOOD_PREFERENCE_VALUES } from '@/utilities/foodPreference'

/**
 * The one set of rules for a customer's credentials.
 *
 * This module is deliberately free of `node:` imports and of Payload, because it is
 * imported by three places with different constraints:
 *
 * - the browser, where the form checks the same rules before it posts;
 * - the Payload endpoints, which are the real gate;
 * - `password.ts`, which only needs the two length bounds.
 *
 * Keeping one source of truth matters more here than anywhere else in the app: a
 * client rule that is looser than the server rule shows a green tick on a form that
 * is about to fail, and a client rule that is tighter blocks a valid password.
 */

export const MIN_PASSWORD_LENGTH = 10

/**
 * A ceiling, not a policy. It bounds the work one unauthenticated request can ask
 * for, because the login and register routes are reachable without a session.
 */
export const MAX_PASSWORD_LENGTH = 200

export const MAX_EMAIL_LENGTH = 254

/** Loose by design. Payload's own `email` field validation is the stricter one. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const isEmailish = (value: string): boolean =>
  value.length > 0 && value.length <= MAX_EMAIL_LENGTH && EMAIL_PATTERN.test(value)

/**
 * Trimmed and lowercased before it is checked, so the parsed value is already in
 * the form the `customers.email` column stores and every lookup expects.
 */
export const emailSchema = z
  .string()
  .transform((value) => value.trim().toLowerCase())
  .refine(isEmailish, { message: 'Please enter a valid email address.' })

export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, { message: `Use at least ${MIN_PASSWORD_LENGTH} characters.` })
  .max(MAX_PASSWORD_LENGTH, { message: `Use no more than ${MAX_PASSWORD_LENGTH} characters.` })

/**
 * Signing in only checks that something was typed. Length is a rule for *choosing*
 * a password; an account created under an older, shorter rule must still be able to
 * sign in, and the endpoint answers "do not match" either way.
 */
export const signInSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, { message: 'Enter your password.' })
    .max(MAX_PASSWORD_LENGTH, { message: 'That password is too long.' }),
})

export const signUpSchema = z.object({
  email: emailSchema,
  /** Optional. An unknown or missing value falls back to the default rather than failing. */
  foodPreference: z.enum(FOOD_PREFERENCE_VALUES).optional().catch('none'),
  password: passwordSchema,
})

export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export const resetPasswordSchema = z.object({
  password: passwordSchema,
  token: z.string().min(1, { message: 'Ask for a new link.' }),
})

export const customerAuthSchemas = {
  forgot: forgotPasswordSchema,
  reset: resetPasswordSchema,
  'sign-in': signInSchema,
  'sign-up': signUpSchema,
} as const

export type CustomerAuthIntent = keyof typeof customerAuthSchemas

export { toFieldErrors, type FieldErrors } from '@/utilities/fieldErrors'