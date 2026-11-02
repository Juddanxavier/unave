import type { Order } from '@/payload-types'

/**
 * The checkout intent, carried on the Razorpay order (spec 0007).
 *
 * No order row is written at checkout any more: a row is born only once a
 * payment is captured, so an abandoned checkout leaves nothing behind. That
 * means everything needed to write the row has to survive the wait between
 * opening the gateway order and the payment landing, including the case where
 * the browser never comes back and only the signed webhook arrives.
 *
 * The gateway order's own notes are that store. They survive a closed tab, and
 * they are the record the webhook reads. Razorpay caps notes at 15 pairs of 256
 * characters, so the plan binding travels as one small JSON value and the
 * delivery as flat values, every one of them capped.
 */

const NOTE_MAX = 240
const TITLE_MAX = 80
const DURATION_MAX = 60

const cap = (value: null | string | undefined, max = NOTE_MAX): string =>
  (value ?? '').trim().slice(0, max)

type PlanBinding = {
  /** customer id */
  c: number | string
  /** duration label */
  d: string
  days: number
  /** plan id */
  p: number | string
  /** unit price in paise */
  price: number
  /** plan title */
  t: string
}

export type OrderIntent = {
  customerId: string
  delivery: {
    addressLine1?: string
    addressLine2?: string
    city?: string
    foodPreference?: string
    name?: string
    note?: string
    phone?: string
    pincode?: string
    state?: string
  }
  items: Order['items']
  total: number
}

export const buildOrderNotes = (input: {
  customerId: number | string
  days: number
  delivery: {
    city?: string
    foodPreference?: string
    line1?: string
    line2?: string
    name?: string
    phone?: string
    pincode?: string
    state?: string
  }
  durationLabel: string
  note?: string
  planId: number | string
  planTitle: string
  unitPrice: number
}): Record<string, string> => {
  const binding: PlanBinding = {
    c: input.customerId,
    d: cap(input.durationLabel, DURATION_MAX),
    days: input.days,
    p: input.planId,
    price: input.unitPrice,
    t: cap(input.planTitle, TITLE_MAX),
  }

  return {
    d_addr1: cap(input.delivery.line1),
    d_addr2: cap(input.delivery.line2),
    d_city: cap(input.delivery.city),
    d_food: cap(input.delivery.foodPreference),
    d_name: cap(input.delivery.name),
    d_note: cap(input.note),
    d_phone: cap(input.delivery.phone),
    d_pin: cap(input.delivery.pincode),
    d_state: cap(input.delivery.state),
    plan: JSON.stringify(binding),
  }
}

const readPlanBinding = (raw: unknown): PlanBinding | null => {
  if (typeof raw !== 'string' || raw.length === 0) return null

  let value: Partial<PlanBinding>

  try {
    value = JSON.parse(raw) as Partial<PlanBinding>
  } catch {
    return null
  }

  if (
    (typeof value.c !== 'number' && typeof value.c !== 'string') ||
    (typeof value.p !== 'number' && typeof value.p !== 'string') ||
    typeof value.days !== 'number' ||
    typeof value.price !== 'number' ||
    typeof value.t !== 'string' ||
    typeof value.d !== 'string'
  ) {
    return null
  }

  return value as PlanBinding
}

const text = (value: unknown): string => (typeof value === 'string' ? value : '')

/**
 * Turn what the gateway hands back into the order to write. Returns null when
 * the notes are missing or unreadable, which is the honest answer: the caller
 * then writes nothing rather than inventing a row.
 */
export const readOrderNotes = (notes: unknown): OrderIntent | null => {
  if (!notes || typeof notes !== 'object' || Array.isArray(notes)) return null

  const values = notes as Record<string, unknown>
  const binding = readPlanBinding(values.plan)

  if (!binding) return null

  const note = text(values.d_note)

  return {
    customerId: String(binding.c),
    delivery: {
      addressLine1: text(values.d_addr1) || undefined,
      addressLine2: text(values.d_addr2) || undefined,
      city: text(values.d_city) || undefined,
      foodPreference: text(values.d_food) || undefined,
      name: text(values.d_name) || undefined,
      note: note || undefined,
      phone: text(values.d_phone) || undefined,
      pincode: text(values.d_pin) || undefined,
      state: text(values.d_state) || undefined,
    },
    items: [
      {
        days: binding.days,
        durationLabel: binding.d,
        plan: binding.p as number,
        planTitle: binding.t,
        unitPrice: binding.price,
      },
    ],
    total: binding.price,
  }
}
