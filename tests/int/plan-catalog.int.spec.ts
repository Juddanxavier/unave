import { describe, expect, it } from 'vitest'

import {
  filterAndSortPlans,
  parsePlanQuery,
  paginatePlans,
  planQueryHref,
  hasActiveFilters,
  PLANS_PAGE_SIZE,
} from '../../src/utilities/planCatalog'
import { plansCountLine } from '../../src/utilities/planShopCopy'

import type { Plan } from '../../src/payload-types'

/**
 * The catalog query is pure: it parses the URL, narrows and orders an already-read
 * plan list, and builds the URLs the toggle and clear links point at. No database,
 * because the listing reads every active plan in one pass anyway (spec 0004).
 */

const plan = (overrides: Partial<Plan> & Pick<Plan, 'id' | 'title'>): Plan =>
  ({
    billingPeriod: 'weekly',
    isActive: true,
    mealsPerWeek: 7,
    price: 1000,
    slug: `plan-${overrides.id}`,
    sortOrder: 0,
    ...overrides,
  }) as Plan

const PLANS = [
  plan({ id: 1, title: 'Full-day meals', mealsPerWeek: 21, price: 2400, sortOrder: 0, billingPeriod: 'monthly' }),
  plan({ id: 2, title: 'Breakfast only', mealsPerWeek: 7, price: 900, sortOrder: 1 }),
  plan({ id: 3, title: 'Lunch box', summary: 'A warm lunch for five days', mealsPerWeek: 5, price: 1200, sortOrder: 2 }),
  plan({ id: 4, title: 'Dinner plate', mealsPerWeek: 14, price: 1800, sortOrder: 3 }),
]

describe('parsing the query string', () => {
  it('falls back to the defaults for an empty URL', () => {
    expect(parsePlanQuery({})).toEqual({
      meals: 'all',
      page: 1,
      period: 'all',
      q: '',
      sort: 'featured',
      view: 'grid',
    })
  })

  it('accepts every known value', () => {
    const query = parsePlanQuery({
      meals: '8-to-14',
      period: 'monthly',
      q: '  lunch  ',
      sort: 'price-asc',
      view: 'list',
    })

    expect(query.meals).toBe('8-to-14')
    expect(query.period).toBe('monthly')
    expect(query.q).toBe('lunch')
    expect(query.sort).toBe('price-asc')
    expect(query.view).toBe('list')
  })

  it('coerces unknown and repeated values to the defaults', () => {
    const query = parsePlanQuery({
      meals: 'seventy',
      period: ['weekly', 'monthly'],
      q: 'x'.repeat(200),
      sort: 'cheapest',
      view: 'table',
    })

    expect(query.meals).toBe('all')
    expect(query.period).toBe('weekly')
    expect(query.q).toHaveLength(80)
    expect(query.sort).toBe('featured')
    expect(query.view).toBe('grid')
  })

  it('reads the page number and refuses nonsense ones', () => {
    expect(parsePlanQuery({}).page).toBe(1)
    expect(parsePlanQuery({ page: '3' }).page).toBe(3)
    expect(parsePlanQuery({ page: '0' }).page).toBe(1)
    expect(parsePlanQuery({ page: '-2' }).page).toBe(1)
    expect(parsePlanQuery({ page: 'not-a-number' }).page).toBe(1)
    expect(parsePlanQuery({ page: '999999' }).page).toBe(1000)
  })
})

describe('paginating the filtered results', () => {
  const many = Array.from({ length: PLANS_PAGE_SIZE + 3 }, (_, index) =>
    plan({ id: index + 1, title: `Plan ${index + 1}` }),
  )

  it('slices the second page from the sorted set', () => {
    const result = paginatePlans(many, parsePlanQuery({ page: '2' }))

    expect(result.page).toBe(2)
    expect(result.totalItems).toBe(many.length)
    expect(result.totalPages).toBe(2)
    expect(result.items).toHaveLength(3)
    expect(result.items[0]?.id).toBe(PLANS_PAGE_SIZE + 1)
  })

  it('clamps a page past the end to the last page instead of a dead end', () => {
    const result = paginatePlans(PLANS, parsePlanQuery({ page: '50' }))

    expect(result.page).toBe(1)
    expect(result.items).toHaveLength(PLANS.length)
  })

  it('never reports zero pages for an empty set', () => {
    const result = paginatePlans([], parsePlanQuery({}))

    expect(result.totalPages).toBe(1)
    expect(result.items).toEqual([])
  })
})

describe('filtering and sorting', () => {
  it('searches the title and the summary without case', () => {
    const shown = filterAndSortPlans(PLANS, parsePlanQuery({ q: 'LUNCH' }))

    expect(shown.map((plan) => plan.id)).toEqual([3])
  })

  it('filters by billing period', () => {
    const shown = filterAndSortPlans(PLANS, parsePlanQuery({ period: 'monthly' }))

    expect(shown.map((plan) => plan.id)).toEqual([1])
  })

  it('filters by the meals buckets with their edges inclusive', () => {
    expect(filterAndSortPlans(PLANS, parsePlanQuery({ meals: 'up-to-7' })).map((p) => p.id)).toEqual([2, 3])
    expect(filterAndSortPlans(PLANS, parsePlanQuery({ meals: '8-to-14' })).map((p) => p.id)).toEqual([4])
    expect(filterAndSortPlans(PLANS, parsePlanQuery({ meals: '15-plus' })).map((p) => p.id)).toEqual([1])
  })

  it('combines filters with the search', () => {
    const shown = filterAndSortPlans(PLANS, parsePlanQuery({ meals: 'up-to-7', q: 'lunch' }))

    expect(shown.map((plan) => plan.id)).toEqual([3])
  })

  it('sorts by price both ways and falls back to the featured order on ties', () => {
    expect(filterAndSortPlans(PLANS, parsePlanQuery({ sort: 'price-asc' })).map((p) => p.price)).toEqual([
      900, 1200, 1800, 2400,
    ])
    expect(filterAndSortPlans(PLANS, parsePlanQuery({ sort: 'price-desc' })).map((p) => p.price)).toEqual([
      2400, 1800, 1200, 900,
    ])
  })

  it('sorts by meals with the most first', () => {
    expect(filterAndSortPlans(PLANS, parsePlanQuery({ sort: 'meals-desc' })).map((p) => p.id)).toEqual([1, 4, 2, 3])
  })

  it('leaves the featured order untouched', () => {
    expect(filterAndSortPlans(PLANS, parsePlanQuery({})).map((p) => p.id)).toEqual([1, 2, 3, 4])
  })
})

describe('building the URLs', () => {
  it('keeps the canonical /plans when everything is at its default', () => {
    expect(planQueryHref(parsePlanQuery({}))).toBe('/plans')
  })

  it('carries only the non-default values', () => {
    const query = parsePlanQuery({ period: 'weekly', view: 'list' })

    expect(planQueryHref(query)).toBe('/plans?period=weekly&view=list')
    // The view toggle keeps the period and drops itself when going back to grid.
    expect(planQueryHref(query, { view: 'grid' })).toBe('/plans?period=weekly')
  })

  it('clears the filters and keeps the view', () => {
    const query = parsePlanQuery({ meals: '15-plus', q: 'thali', sort: 'price-desc', view: 'list' })

    expect(planQueryHref(query, { meals: 'all', page: 1, period: 'all', q: '', sort: 'featured' })).toBe(
      '/plans?view=list',
    )
  })

  it('carries the page number once it is past the first', () => {
    const query = parsePlanQuery({ page: '2', view: 'list' })

    expect(planQueryHref(query)).toBe('/plans?page=2&view=list')
    // Page 1 is the default, so going back to it drops the param entirely.
    expect(planQueryHref(query, { page: 1 })).toBe('/plans?view=list')
  })

  it('reports whether the clear link belongs in the toolbar', () => {
    expect(hasActiveFilters(parsePlanQuery({}))).toBe(false)
    expect(hasActiveFilters(parsePlanQuery({ q: 'thali' }))).toBe(true)
    expect(hasActiveFilters(parsePlanQuery({ sort: 'price-desc' }))).toBe(true)
    // The view alone is a display choice, not a filter.
    expect(hasActiveFilters(parsePlanQuery({ view: 'list' }))).toBe(false)
  })
})

describe('the count line', () => {
  it('reads as all when one page holds everything', () => {
    expect(plansCountLine(4, 4)).toBe('Showing all 4 plans')
    expect(plansCountLine(1, 1)).toBe('Showing all 1 plan')
  })

  it('names the share when filters bite', () => {
    expect(plansCountLine(1, 4)).toBe('Showing 1 of 4 plans')
  })

  it('names the window once the results span pages', () => {
    expect(plansCountLine(9, 23, { from: 1, to: 9 })).toBe('Showing 1–9 of 23 plans')
    expect(plansCountLine(5, 23, { from: 19, to: 23 })).toBe('Showing 19–23 of 23 plans')
  })
})
