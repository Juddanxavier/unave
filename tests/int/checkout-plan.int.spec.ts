/**
 * @vitest-environment node
 */
import type { Payload } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import type { Plan } from '@/payload-types'
import {
  findDurationIndex,
  resolveCheckoutPlan,
  type CheckoutRefusalReason,
} from '@/utilities/checkoutPlan'
import { readCreatedOrder } from '@/utilities/orderCreate'

/**
 * The direct buy path's resolver (spec 0007, AC-2 and AC-3).
 *
 * A checkout link names a plan slug and a duration label and nothing else. These
 * tests hold the resolver to that: the label is the only key into a duration,
 * the price and day count always come from the record, and every refusal has a
 * reason the page can turn into one plain sentence.
 */

const plan = {
  available: true,
  durations: [
    { days: 5, id: 'one-week', label: 'One week', price: 150000 },
    { days: 22, id: 'one-month', label: 'One month', price: 660000 },
  ],
  id: 1,
  slug: 'lunch-plan',
  title: 'Lunch plan',
} as unknown as Plan

const payloadServing = (rows: Plan[]): Payload =>
  ({
    find: vi.fn().mockResolvedValue({ docs: rows }),
  }) as unknown as Payload

describe('findDurationIndex', () => {
  it('matches the duration by its label', () => {
    expect(findDurationIndex(plan, 'One week')).toBe(0)
    expect(findDurationIndex(plan, 'One month')).toBe(1)
  })

  it('trims the label before matching', () => {
    expect(findDurationIndex(plan, '  One month  ')).toBe(1)
  })

  it('does not match a blank label, an unknown label, a missing plan or no durations', () => {
    expect(findDurationIndex(plan, '')).toBe(-1)
    expect(findDurationIndex(plan, 'Two weeks')).toBe(-1)
    expect(findDurationIndex(null, 'One week')).toBe(-1)
    expect(findDurationIndex({ ...plan, durations: null } as unknown as Plan, 'One week')).toBe(-1)
  })
})

describe('resolveCheckoutPlan', () => {
  it('reads the price and day count from the live record', async () => {
    const result = await resolveCheckoutPlan({
      durationLabel: 'One month',
      payload: payloadServing([plan]),
      planSlug: 'lunch-plan',
    })

    expect(result).toMatchObject({
      duration: { days: 22, label: 'One month', price: 660000 },
      durationIndex: 1,
      ok: true,
      total: 660000,
    })
  })

  it('refuses a plan the shelf does not have', async () => {
    const result = await resolveCheckoutPlan({
      durationLabel: 'One week',
      payload: payloadServing([]),
      planSlug: 'gone',
    })

    expect(result).toEqual({ ok: false, reason: 'unknown-plan' } satisfies {
      ok: false
      reason: CheckoutRefusalReason
    })
  })

  it('refuses a paused plan even when the duration exists', async () => {
    const result = await resolveCheckoutPlan({
      durationLabel: 'One week',
      payload: payloadServing([{ ...plan, available: false } as Plan]),
      planSlug: 'lunch-plan',
    })

    expect(result).toEqual({ ok: false, reason: 'paused' })
  })

  it('refuses a duration that is no longer on the plan, without looking at a price', async () => {
    const result = await resolveCheckoutPlan({
      durationLabel: 'Two weeks',
      payload: payloadServing([plan]),
      planSlug: 'lunch-plan',
    })

    expect(result).toEqual({ ok: false, reason: 'missing-duration' })
  })

  it('refuses an empty slug without asking the database', async () => {
    const payload = payloadServing([plan])

    const result = await resolveCheckoutPlan({
      durationLabel: 'One week',
      payload,
      planSlug: '   ',
    })

    expect(result).toEqual({ ok: false, reason: 'unknown-plan' })
    expect(payload.find).not.toHaveBeenCalled()
  })
})

describe('readCreatedOrder', () => {
  it('accepts the shape the create endpoint answers with', () => {
    const result = readCreatedOrder({
      amount: 150000,
      gatewayOrderId: 'order_test_123',
      keyId: 'rzp_test_key',
    })

    expect(result).toEqual({
      amount: 150000,
      gatewayOrderId: 'order_test_123',
      keyId: 'rzp_test_key',
    })
  })

  it('rejects an answer with no gateway order id', () => {
    const result = readCreatedOrder({
      amount: 150000,
      keyId: 'rzp_test_key',
    })

    expect(result).toBeNull()
  })
})
