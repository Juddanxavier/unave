import { z } from 'zod'

/**
 * What a customer can ask the kitchen to do with a paid order (design.md §6.15).
 *
 * A paid order is never edited again — its amounts and its plan snapshot are the
 * receipt — so stopping or skipping one is a request rather than a change. Each
 * request is its own row for the kitchen to answer, and this schema is the rule
 * both sides of the network share: the dialog checks it in the browser, the
 * server action runs it again as the real gate.
 *
 * A cancellation needs nothing but the press; a pause needs the two days it
 * covers, because "pause" without dates cannot be acted on.
 */
export const ORDER_REQUEST_TYPES = ['cancel', 'pause'] as const

export type OrderRequestType = (typeof ORDER_REQUEST_TYPES)[number]

/** A `date` input's value: the day alone, never a time. */
export const ORDER_REQUEST_DAY = /^\d{4}-\d{2}-\d{2}$/

const day = (message: string) =>
  z
    .string()
    .trim()
    .regex(ORDER_REQUEST_DAY, { message })

export const orderRequestSchema = z
  .object({
    from: z.string().trim().default(''),
    orderId: z.string().trim().min(1, { message: 'That order could not be found.' }),
    reason: z
      .string()
      .trim()
      .min(1, { message: 'Tell us why. A short line is enough.' })
      .max(1000, { message: 'Keep this to 1000 characters or fewer.' }),
    to: z.string().trim().default(''),
    type: z.enum(ORDER_REQUEST_TYPES, { message: 'Choose what you want us to do.' }),
  })
  .superRefine((value, context) => {
    if (value.type !== 'pause') return

    const from = day('Choose the day to pause from.').safeParse(value.from)
    const to = day('Choose the day to start again.').safeParse(value.to)

    if (!from.success) context.addIssue({ ...from.error.issues[0], path: ['from'] })
    if (!to.success) context.addIssue({ ...to.error.issues[0], path: ['to'] })

    if (from.success && to.success && value.to <= value.from) {
      context.addIssue({
        code: 'custom',
        message: 'The resume day must be after the pause day.',
        path: ['to'],
      })
    }
  })

export type OrderRequestInput = z.infer<typeof orderRequestSchema>
