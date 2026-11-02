import { z } from 'zod'

import { FOOD_PREFERENCE_VALUES } from './foodPreference'

/**
 * The rules for the delivery details and food preference a customer saves on their
 * profile (design.md §6.13).
 *
 * Client-safe like the auth schemas, and for the same reason: the account form
 * checks the same rules in the browser before it submits, and the server action
 * runs them again as the real gate. One source of truth, so a client rule that is
 * looser than the server rule can never show a green tick on a form about to fail.
 *
 * The profile as a whole is optional — an account can exist with no address on it —
 * but a customer who saves it gives us the whole delivery set. The form requires
 * the delivery fields rather than storing half an address, and the food preference
 * alone stays optional.
 */

/** The phone shape the kitchen uses, shared by the profile form and the enquiry form. */
export const PHONE_PATTERN = /^[0-9+\s-]{7,15}$/

export const PINCODE_PATTERN = /^\d{6}$/

const required = (message: string) => z.string().trim().min(1, { message })

export const customerProfileSchema = z.object({
  city: required('Enter your city.'),
  /** An unknown or missing value falls back to the default rather than failing. */
  foodPreference: z.enum(FOOD_PREFERENCE_VALUES).optional().catch('none'),
  line1: required('Enter your address.'),
  line2: z
    .string()
    .trim()
    .max(160, { message: 'Keep address line 2 to 160 characters or fewer.' })
    .optional()
    .default(''),
  phone: required('Enter a phone number.').regex(PHONE_PATTERN, {
    message: 'Enter a valid phone number.',
  }),
  pincode: z
    .string()
    .trim()
    .regex(PINCODE_PATTERN, { message: 'Enter a 6 digit pincode.' }),
  state: required('Enter your state.'),
})

export type CustomerProfile = z.infer<typeof customerProfileSchema>
