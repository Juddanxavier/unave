import { z } from 'zod'

/**
 * The one set of rules for the contact form on `/contact`.
 *
 * Free of `node:` imports and of Payload, like the password schema, because the
 * same rules could run in a browser pass one day. The endpoint is the real gate;
 * the form's HTML `required` attributes are the courtesy that keeps an honest
 * visitor from ever losing typed text to a server-side rejection.
 *
 * An enquiry's email is a reply address, not a credential, so the check here is
 * deliberately its own and stays looser than anything the `customers` collection
 * would accept.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const emailSchema = z
  .string()
  .transform((value) => value.trim().toLowerCase())
  .refine((value) => value.length > 0 && value.length <= 254 && EMAIL_PATTERN.test(value), {
    message: 'Please enter a valid email address.',
  })

const digitsIn = (value: string): number => (value.match(/\d/g) ?? []).length

/**
 * Optional, and loose on purpose: people write `+91 98xxx` and `098xxx` and both
 * are a phone. What matters is that there are enough digits to call back on.
 */
const phoneSchema = z
  .string()
  .transform((value) => value.trim())
  .refine((value) => value.length === 0 || (digitsIn(value) >= 10 && value.length <= 20), {
    message: 'Please enter a valid phone number, at least 10 digits.',
  })

export const enquirySchema = z.object({
  email: emailSchema,
  message: z
    .string()
    .transform((value) => value.trim())
    .refine(
      (value) => value.length >= 10 && value.length <= 2000,
      { message: 'Please add a few words about what you need.' },
    ),
  name: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => value.length >= 2 && value.length <= 80, {
      message: 'Please tell us your name.',
    }),
  phone: phoneSchema,
})

export type Enquiry = z.infer<typeof enquirySchema>

/**
 * The honeypot: a field a person never sees and a script fills in. It is named
 * after the one thing a spam bot assumes a web form wants to know.
 */
export const ENQUIRY_HONEYPOT_FIELD = 'website'
