import { z } from 'zod'

import { customerProfileSchema } from '@/utilities/customerProfile'

/**
 * What the checkout may send, and nothing more (spec 0007).
 *
 * The browser's numbers are never trusted: the plan slug and duration label
 * arrive as a claim, and the server resolves both against the live plan before
 * any price is used. The delivery rules are the profile rules of spec 0005,
 * reused verbatim, so the checkout form and the account form can never disagree
 * about what an address is. The name is checkout's own requirement, added on top.
 */

const required = (message: string) => z.string().trim().min(1, { message })

export const orderDeliverySchema = customerProfileSchema.extend({
  name: required('Enter a name for the delivery.'),
})

export const orderCreateSchema = z.object({
  delivery: orderDeliverySchema,
  plan: z
    .string({ error: 'Choose a plan first.' })
    .trim()
    .min(1, { message: 'Choose a plan first.' }),
  duration: z
    .string({ error: 'Choose a duration first.' })
    .trim()
    .min(1, { message: 'Choose a duration first.' })
    .max(80),
  note: z
    .string()
    .trim()
    .max(1000, { message: 'Keep the note to 1000 characters or fewer.' })
    .optional()
    .default(''),
})

/**
 * What the Razorpay popup hands back on success. The names are Razorpay's own,
 * because the browser forwards the handler's response untouched.
 */
export const orderVerifySchema = z.object({
  razorpay_order_id: z.string().trim().min(1),
  razorpay_payment_id: z.string().trim().min(1),
  razorpay_signature: z.string().trim().min(1),
})
