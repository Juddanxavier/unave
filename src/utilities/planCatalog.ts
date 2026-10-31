import type { Plan } from '@/payload-types'

/**
 * The catalog query behind /plans (design.md §6.17): a search term, a billing
 * period filter, a meals-a-week filter, a sort and the grid-or-list view.
 *
 * Everything is parsed on the server from the URL's search params and applied to
 * plans that were read in one pass, because a GET form is the one kind of form that
 * never needs JavaScript — the same reason the cart is a server-read cookie. The
 * unknown or missing value always falls back to the default, so a hand edited URL
 * narrows nothing and breaks nothing.
 *
 * The option labels live beside their values here rather than in `planShopCopy`,
 * because the label and the value that `parsePlanQuery` accepts are one fact; the
 * copy module keeps the sentences around them.
 */

export type PlanSort = 'featured' | 'price-asc' | 'price-desc' | 'meals-desc'
export type PlanPeriodFilter = 'all' | 'weekly' | 'monthly'
export type PlanMealsFilter = 'all' | 'up-to-7' | '8-to-14' | '15-plus'
export type PlanView = 'grid' | 'list'

export interface PlanQuery {
  meals: PlanMealsFilter
  /** 1-based page over the filtered results, clamped to the pages that exist. */
  page: number
  period: PlanPeriodFilter
  q: string
  sort: PlanSort
  view: PlanView
}

export const DEFAULT_PLAN_QUERY: PlanQuery = {
  meals: 'all',
  page: 1,
  period: 'all',
  q: '',
  sort: 'featured',
  view: 'grid',
}

export const PLAN_SORTS = [
  { label: 'Featured first', value: 'featured' },
  { label: 'Price: low to high', value: 'price-asc' },
  { label: 'Price: high to low', value: 'price-desc' },
  { label: 'Most meals a week', value: 'meals-desc' },
] as const satisfies ReadonlyArray<{ label: string; value: PlanSort }>

export const PLAN_PERIODS = [
  { label: 'Any length', value: 'all' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
] as const satisfies ReadonlyArray<{ label: string; value: PlanPeriodFilter }>

export interface PlanMealsBucket {
  label: string
  /** `null` means the bucket runs to the top of the range. */
  max: number | null
  min: number
  value: PlanMealsFilter
}

export const PLAN_MEALS: readonly PlanMealsBucket[] = [
  { label: 'Any number', max: null, min: 0, value: 'all' },
  { label: 'Up to 7', max: 7, min: 1, value: 'up-to-7' },
  { label: '8 to 14', max: 14, min: 8, value: '8-to-14' },
  { label: '15 or more', max: null, min: 15, value: '15-plus' },
]

/** The labels are the accessible names and tooltips; the marks themselves are icons on the page. */
export const PLAN_VIEWS = [
  { label: 'Grid view', value: 'grid' },
  { label: 'List view', value: 'list' },
] as const satisfies ReadonlyArray<{ label: string; value: PlanView }>

const firstValue = (value: string | string[] | undefined): string =>
  (Array.isArray(value) ? value[0] : value) ?? ''

const pick = <T extends string>(raw: string, allowed: readonly T[], fallback: T): T =>
  (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback

/** Reads the five controls out of the URL, falling back to the default for anything missing or unknown. */
export const parsePlanQuery = (
  params: Record<string, string | string[] | undefined>,
): PlanQuery => ({
  meals: pick(
    firstValue(params.meals),
    PLAN_MEALS.map((bucket) => bucket.value),
    'all',
  ),
  page: pageFromParam(firstValue(params.page)),
  period: pick(
    firstValue(params.period),
    PLAN_PERIODS.map((option) => option.value),
    'all',
  ),
  q: firstValue(params.q).trim().slice(0, 80),
  sort: pick(
    firstValue(params.sort),
    PLAN_SORTS.map((option) => option.value),
    'featured',
  ),
  view: pick(
    firstValue(params.view),
    PLAN_VIEWS.map((option) => option.value),
    'grid',
  ),
})

/** Nine per page: three full rows of the three-column grid. */
export const PLANS_PAGE_SIZE = 9

const MAX_PAGE = 1000

const pageFromParam = (raw: string): number => {
  const parsed = Number.parseInt(raw, 10)

  if (!Number.isInteger(parsed) || parsed < 1) return 1

  return Math.min(parsed, MAX_PAGE)
}

export interface PlanPage {
  items: Plan[]
  /** The page actually shown, which is the requested one clamped into range. */
  page: number
  totalItems: number
  totalPages: number
}

/**
 * One page out of the already filtered and sorted list. Clamping, not erroring, is
 * the rule: a page number past the end shows the last page, because a stale or hand
 * edited URL should land somewhere honest rather than on a dead end.
 */
export const paginatePlans = (plans: Plan[], query: PlanQuery): PlanPage => {
  const totalItems = plans.length
  const totalPages = Math.max(1, Math.ceil(totalItems / PLANS_PAGE_SIZE))
  const page = Math.min(query.page, totalPages)
  const start = (page - 1) * PLANS_PAGE_SIZE

  return {
    items: plans.slice(start, start + PLANS_PAGE_SIZE),
    page,
    totalItems,
    totalPages,
  }
}

/**
 * The filters and the order, applied to the already-fetched active plans. The
 * catalog is staff curated and fetched whole (spec 0004, limit 100), so one pass in
 * memory is simpler and one code path serves search, both filters and every sort.
 */
export const filterAndSortPlans = (plans: Plan[], query: PlanQuery): Plan[] => {
  const needle = query.q.toLowerCase()
  const bucket = PLAN_MEALS.find((entry) => entry.value === query.meals)

  const filtered = plans.filter((plan) => {
    if (query.period !== 'all' && plan.billingPeriod !== query.period) return false

    if (bucket && bucket.value !== 'all') {
      if (typeof plan.mealsPerWeek !== 'number') return false
      if (plan.mealsPerWeek < bucket.min) return false
      if (bucket.max !== null && plan.mealsPerWeek > bucket.max) return false
    }

    if (needle) {
      const haystack = `${plan.title ?? ''} ${plan.summary ?? ''}`.toLowerCase()
      if (!haystack.includes(needle)) return false
    }

    return true
  })

  const byOrder = (a: Plan, b: Plan): number => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  const byPrice = (a: Plan, b: Plan): number => (a.price ?? 0) - (b.price ?? 0)
  const byMeals = (a: Plan, b: Plan): number => (a.mealsPerWeek ?? 0) - (b.mealsPerWeek ?? 0)

  switch (query.sort) {
    // Array.prototype.sort is stable, so ties keep the featured order.
    case 'price-asc':
      return [...filtered].sort((a, b) => byPrice(a, b) || byOrder(a, b))
    case 'price-desc':
      return [...filtered].sort((a, b) => byPrice(b, a) || byOrder(a, b))
    case 'meals-desc':
      return [...filtered].sort((a, b) => byMeals(b, a) || byOrder(a, b))
    // Featured is the read's own `sortOrder` order, so nothing to do.
    default:
      return filtered
  }
}

/**
 * The URL for the query, omitting everything at its default so `/plans` stays the
 * canonical, unfiltered address. One override at a time is how the view toggle and
 * the clear link carry the rest of the state.
 */
export const planQueryHref = (query: PlanQuery, overrides: Partial<PlanQuery> = {}): string => {
  const next = { ...query, ...overrides }
  const params = new URLSearchParams()

  if (next.q) params.set('q', next.q)
  if (next.period !== 'all') params.set('period', next.period)
  if (next.meals !== 'all') params.set('meals', next.meals)
  if (next.sort !== 'featured') params.set('sort', next.sort)
  if (next.page > 1) params.set('page', String(next.page))
  if (next.view !== 'grid') params.set('view', next.view)

  const qs = params.toString()

  return qs ? `/plans?${qs}` : '/plans'
}

/** Whether the clear link should show. The view is a display choice, not a filter. */
export const hasActiveFilters = (query: PlanQuery): boolean =>
  query.q !== '' || query.period !== 'all' || query.meals !== 'all' || query.sort !== 'featured'
