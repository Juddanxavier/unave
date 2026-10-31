import Link from 'next/link'
import React from 'react'

import { Media } from '@/components/Media'
import { formatPlanPrice, planPeriodWord } from '@/utilities/planDisplay'
import { mealsLine, priceLine } from '@/utilities/planShopCopy'

import type { Plan } from '@/payload-types'

import { PlanImagePlaceholder } from './PlanImagePlaceholder'

/** The list view's one-row summary of a plan (design.md §6.17): photo, words, price. */
export const PlanListRow: React.FC<{ plan: Plan }> = ({ plan }) => {
  const price = formatPlanPrice(plan.price)
  const line = priceLine(price, planPeriodWord(plan.billingPeriod))
  const meals = mealsLine(plan.mealsPerWeek)

  return (
    <Link
      className="group border-line hover:border-green-700/40 focus-visible:ring-ring/40 flex flex-col gap-4 rounded-xl border bg-white p-4 outline-none transition-colors focus-visible:ring-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5"
      href={`/plans/${plan.slug}`}
    >
      <div className="bg-muted relative aspect-[16/10] w-full shrink-0 overflow-hidden rounded-lg sm:aspect-auto sm:h-28 sm:w-44">
        {plan.image && typeof plan.image === 'object' ? (
          <Media
            fill
            imgClassName="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            resource={plan.image}
            size="(max-width: 640px) 100vw, 176px"
          />
        ) : (
          <PlanImagePlaceholder />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-ink-900 text-lg font-semibold">{plan.title}</h3>
        {plan.summary ? (
          <p className="text-ink-600 mt-1 line-clamp-2 text-sm leading-6">{plan.summary}</p>
        ) : null}
      </div>

      <div className="shrink-0 sm:text-right">
        {line ? <p className="text-ink-900 font-semibold">{line}</p> : null}
        {meals ? <p className="text-ink-600 text-sm">{meals}</p> : null}
      </div>
    </Link>
  )
}
