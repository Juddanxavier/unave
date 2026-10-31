import { APIError } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import { computeSubscriptionEndDate } from '@/collections/Subscriptions/hooks/computeSubscriptionEndDate'
import { copyPlanSnapshot } from '@/collections/Subscriptions/hooks/copyPlanSnapshot'

const plan = {
  id: 42,
  billingPeriod: 'monthly',
  mealsPerWeek: 6,
  price: 3499,
}

describe('copyPlanSnapshot', () => {
  it('copies the billing period, meals and price from the chosen plan on create', async () => {
    const findByID = vi.fn(async () => plan)
    const req = { payload: { findByID } }

    const result: any = await copyPlanSnapshot({
      data: { plan: 42, customerName: 'Asha' },
      operation: 'create',
      req,
    } as any)

    expect(result).toMatchObject({
      customerName: 'Asha',
      plan: 42,
      billingPeriod: 'monthly',
      mealsPerWeek: 6,
      price: 3499,
    })
    expect(findByID).toHaveBeenCalledWith({
      collection: 'plans',
      id: 42,
      depth: 0,
      req,
    })
  })

  it('reads the id when the plan arrives as a populated document', async () => {
    const findByID = vi.fn(async () => plan)
    const req = { payload: { findByID } }

    await copyPlanSnapshot({
      data: { plan: { id: 42 } },
      operation: 'create',
      req,
    } as any)

    expect(findByID).toHaveBeenCalledWith(expect.objectContaining({ id: 42 }))
  })

  it('never rewrites a subscription on update', async () => {
    const findByID = vi.fn()
    const req = { payload: { findByID } }
    const data = { plan: 42, price: 1 }

    const result = await copyPlanSnapshot({ data, operation: 'update', req } as any)

    expect(result).toBe(data)
    expect(findByID).not.toHaveBeenCalled()
  })

  it('leaves data alone when no plan was chosen', async () => {
    const findByID = vi.fn()
    const data = { customerName: 'Asha' }

    const result = await copyPlanSnapshot({
      data,
      operation: 'create',
      req: { payload: { findByID } },
    } as any)

    expect(result).toBe(data)
    expect(findByID).not.toHaveBeenCalled()
  })
})

describe('computeSubscriptionEndDate', () => {
  it('refuses to activate a subscription without a start date', () => {
    let caught: unknown

    try {
      computeSubscriptionEndDate({ data: { status: 'active' } } as any)
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(APIError)
    expect((caught as APIError).status).toBe(400)
    expect((caught as APIError).message).toMatch(/start date/i)
  })

  it('adds seven days for a weekly plan', () => {
    const result: any = computeSubscriptionEndDate({
      data: {
        status: 'active',
        startDate: '2026-03-01T00:00:00.000Z',
        billingPeriod: 'weekly',
      },
    } as any)

    expect(result.endDate).toBe('2026-03-08T00:00:00.000Z')
  })

  it('adds one month and clamps the day for a monthly plan', () => {
    const result: any = computeSubscriptionEndDate({
      data: {
        status: 'active',
        startDate: '2026-01-31T00:00:00.000Z',
        billingPeriod: 'monthly',
      },
    } as any)

    expect(result.endDate).toBe('2026-02-28T00:00:00.000Z')
  })

  it('falls back to the stored start date and billing period on a later update', () => {
    const result: any = computeSubscriptionEndDate({
      data: { status: 'active' },
      originalDoc: {
        status: 'new',
        startDate: '2026-05-10T00:00:00.000Z',
        billingPeriod: 'weekly',
      },
    } as any)

    expect(result.endDate).toBe('2026-05-17T00:00:00.000Z')
  })

  it('recomputes the end date when staff move the start date', () => {
    const result: any = computeSubscriptionEndDate({
      data: { startDate: '2026-04-10T00:00:00.000Z' },
      originalDoc: {
        status: 'active',
        startDate: '2026-04-01T00:00:00.000Z',
        billingPeriod: 'weekly',
      },
    } as any)

    expect(result.endDate).toBe('2026-04-17T00:00:00.000Z')
  })

  it('leaves a draft subscription without dates untouched', () => {
    const data = { status: 'new' }

    const result = computeSubscriptionEndDate({ data } as any)

    expect(result).toBe(data)
    expect(result).not.toHaveProperty('endDate')
  })
})
