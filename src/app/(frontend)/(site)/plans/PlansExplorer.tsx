import { LayoutGrid, List } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

import { Section } from '@/components/home/Section'
import { Pagination } from '@/components/Pagination'
import { Button } from '@/components/ui/button'
import {
  filterAndSortPlans,
  hasActiveFilters,
  paginatePlans,
  PLAN_MEALS,
  PLAN_PERIODS,
  PLAN_SORTS,
  PLAN_VIEWS,
  planQueryHref,
  PLANS_PAGE_SIZE,
  type PlanQuery,
} from '@/utilities/planCatalog'
import {
  PLANS_APPLY,
  PLANS_CLEAR,
  PLANS_EMPTY,
  PLANS_EMPTY_ACTION,
  PLANS_MEALS_LABEL,
  PLANS_NO_MATCH,
  PLANS_PERIOD_LABEL,
  PLANS_PRICE_NOTE,
  PLANS_SEARCH_LABEL,
  PLANS_SEARCH_PLACEHOLDER,
  PLANS_SORT_LABEL,
  PLANS_VIEW_LABEL,
  plansCountLine,
} from '@/utilities/planShopCopy'
import { cn } from '@/utilities/ui'

import type { Plan } from '@/payload-types'

import { PlanCard } from './PlanCard'
import { PlanListRow } from './PlanListRow'

/** One toolbar control: a visible label over a native control, so the form posts with no JavaScript. */
const Field: React.FC<{
  id: string
  label: string
  width: string
  children: React.ReactNode
}> = ({ children, id, label, width }) => (
  <div className={cn('flex flex-col gap-2', width)}>
    <label className="text-ink-900 text-sm font-semibold" htmlFor={id}>
      {label}
    </label>
    {children}
  </div>
)

const CONTROL =
  'border-line text-ink-900 focus:border-green-700 focus-visible:ring-green-500 h-11 w-full rounded-md border bg-white px-3 text-sm transition-colors focus-visible:ring-[3px] focus-visible:outline-none motion-reduce:transition-none'

interface Props {
  plans: Plan[]
  query: PlanQuery
}

/**
 * The explorer: one GET form for search, the two filters and the sort, the grid or
 * list toggle, and the results.
 *
 * Every control is a plain form control or a link that carries the full query, so
 * the whole toolbar works without JavaScript — the same rule the cart follows. The
 * results count and the toggle read from the URL, so back and forward and a shared
 * link all land on the same view.
 */
export const PlansExplorer: React.FC<Props> = ({ plans, query }) => {
  const shown = filterAndSortPlans(plans, query)
  const page = paginatePlans(shown, query)
  const clearHref = planQueryHref(query, {
    meals: 'all',
    page: 1,
    period: 'all',
    q: '',
    sort: 'featured',
  })

  return (
    <Section id="plans" tone="cream">
      {/* The toolbar is here. There is no visible heading: the hero above is the page's one h1, and the
          count line and the form lead the section instead. */}
      {/* The hidden view keeps the grid/list choice while the form applies the filters. */}
      <form action="/plans" className="flex flex-wrap items-end gap-3" method="get">
        <input name="view" type="hidden" value={query.view} />

        <Field id="plans-search" label={PLANS_SEARCH_LABEL} width="min-w-56 flex-1">
          <input
            className={CONTROL}
            defaultValue={query.q}
            id="plans-search"
            name="q"
            placeholder={PLANS_SEARCH_PLACEHOLDER}
            type="search"
          />
        </Field>

        <Field id="plans-period" label={PLANS_PERIOD_LABEL} width="w-40">
          <select className={CONTROL} defaultValue={query.period} id="plans-period" name="period">
            {PLAN_PERIODS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field id="plans-meals" label={PLANS_MEALS_LABEL} width="w-40">
          <select className={CONTROL} defaultValue={query.meals} id="plans-meals" name="meals">
            {PLAN_MEALS.map((bucket) => (
              <option key={bucket.value} value={bucket.value}>
                {bucket.label}
              </option>
            ))}
          </select>
        </Field>

        <Field id="plans-sort" label={PLANS_SORT_LABEL} width="w-48">
          <select className={CONTROL} defaultValue={query.sort} id="plans-sort" name="sort">
            {PLAN_SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Button size="lg" type="submit">
          {PLANS_APPLY}
        </Button>
      </form>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-ink-600 text-sm">
          {plansCountLine(
            page.items.length,
            shown.length,
            page.totalPages > 1
              ? {
                  from: (page.page - 1) * PLANS_PAGE_SIZE + 1,
                  to: (page.page - 1) * PLANS_PAGE_SIZE + page.items.length,
                }
              : undefined,
          )}
        </p>

        <div className="flex items-center gap-3">
          {hasActiveFilters(query) ? (
            <Link
              className="text-green-700 hover:text-green-600 focus-visible:ring-green-500 rounded-md text-sm font-semibold underline underline-offset-4 focus-visible:ring-[3px] focus-visible:outline-none"
              href={clearHref}
            >
              {PLANS_CLEAR}
            </Link>
          ) : null}

          <div
            aria-label={PLANS_VIEW_LABEL}
            className="border-line flex overflow-hidden rounded-md border"
            role="group"
          >
            {PLAN_VIEWS.map((option) => {
              const active = query.view === option.value
              const Icon = option.value === 'grid' ? LayoutGrid : List

              return (
                <Link
                  aria-current={active ? 'true' : undefined}
                  aria-label={option.label}
                  className={cn(
                    'focus-visible:ring-green-500 px-4 py-3 transition-colors focus-visible:ring-[3px] focus-visible:outline-none motion-reduce:transition-none',
                    active ? 'bg-green-700 text-cream' : 'bg-white text-ink-900 hover:bg-green-50',
                  )}
                  href={planQueryHref(query, { view: option.value })}
                  key={option.value}
                  title={option.label}
                >
                  <Icon aria-hidden="true" className="size-5" strokeWidth={2} />
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {plans.length === 0 ? (
        <div className="border-line mt-8 flex max-w-xl flex-col gap-4 rounded-lg border p-8">
          <p className="text-base">{PLANS_EMPTY}</p>
          <div>
            <Button asChild variant="outline">
              <Link href="/contact">{PLANS_EMPTY_ACTION}</Link>
            </Button>
          </div>
        </div>
      ) : shown.length === 0 ? (
        <div className="border-line mt-8 flex max-w-xl flex-col gap-4 rounded-xl border bg-white p-8">
          <p className="text-base">{PLANS_NO_MATCH}</p>
          <div>
            <Link
              className="text-green-700 hover:text-green-600 focus-visible:ring-green-500 rounded-md text-sm font-semibold underline underline-offset-4 focus-visible:ring-[3px] focus-visible:outline-none"
              href={clearHref}
            >
              {PLANS_CLEAR}
            </Link>
          </div>
        </div>
      ) : query.view === 'list' ? (
        <ul className="mt-8 flex flex-col gap-4">
          {page.items.map((plan) => (
            <li key={plan.id}>
              <PlanListRow plan={plan} />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {page.items.map((plan) => (
            <li key={plan.id}>
              <PlanCard plan={plan} />
            </li>
          ))}
        </ul>
      )}

      <p className="text-ink-600 mt-6 text-sm">{PLANS_PRICE_NOTE}</p>

      {page.totalPages > 1 ? (
        <Pagination
          hrefFor={(target) => planQueryHref(query, { page: target })}
          page={page.page}
          totalPages={page.totalPages}
        />
      ) : null}
    </Section>
  )
}
