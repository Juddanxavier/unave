import type { Payload } from 'payload'

import type { Plan } from '@/payload-types'

/**
 * Resolving the one plan a checkout link names (spec 0007, AC-2 and AC-3).
 *
 * The link carries a plan slug and a duration label only. The price and the day
 * count always come from the plan record at request time, so a doctored URL
 * cannot change an amount. The checkout page and the create endpoint share this
 * resolver, so what the customer sees is what the server charges.
 */

export type CheckoutDuration = {
  days: number
  label: string
  price: number
}

export type CheckoutRefusalReason = 'missing-duration' | 'paused' | 'unknown-plan'

export type CheckoutSelection =
  | {
      duration: CheckoutDuration
      durationIndex: number
      ok: true
      plan: Plan
      total: number
    }
  | { ok: false; reason: CheckoutRefusalReason }

/** The index of the duration whose label matches, or -1. Labels are the stable key. */
export const findDurationIndex = (plan: Plan | null | undefined, label: string): number => {
  const wanted = label.trim()

  if (!plan || wanted.length === 0) return -1

  return (plan.durations ?? []).findIndex((duration) => duration.label.trim() === wanted)
}

/** Read one plan and one duration, live, for checkout. */
export const resolveCheckoutPlan = async (args: {
  durationLabel: string
  payload: Payload
  planSlug: string
}): Promise<CheckoutSelection> => {
  const slug = args.planSlug.trim()

  if (slug.length === 0) return { ok: false, reason: 'unknown-plan' }

  const found = await args.payload.find({
    collection: 'plans',
    depth: 0,
    limit: 1,
    where: { slug: { equals: slug } },
  })

  const plan = found.docs[0]

  if (!plan) return { ok: false, reason: 'unknown-plan' }
  if (!plan.available) return { ok: false, reason: 'paused' }

  const durationIndex = findDurationIndex(plan, args.durationLabel)

  if (durationIndex < 0) return { ok: false, reason: 'missing-duration' }

  const duration = plan.durations?.[durationIndex]

  if (!duration) return { ok: false, reason: 'missing-duration' }

  return {
    duration: {
      days: Number(duration.days),
      label: duration.label,
      price: Number(duration.price),
    },
    durationIndex,
    ok: true,
    plan,
    total: Number(duration.price),
  }
}
