import { Check } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

import RichText from '@/components/RichText'
import type { Plan } from '@/payload-types'
import { formatPaise } from '@/utilities/money'
import { AUDIENCE_LABEL, CATEGORY_LABEL, categoryBadgeAriaLabel, planCategoryHref } from '@/utilities/plansCategoryCopy'

import { PlanPurchase, type PlanDuration } from './PlanPurchase'

/**
 * One plan on the shelf (spec 0007, AC-1).
 *
 * A pricing card, not a photo tile: the plan's category and name lead, then up to
 * five short points, then the panel where the chosen duration's per day price
 * sits above the duration chips and the action. The plan record's photo stays
 * in the admin for the kitchen's use; the shelf keeps its height on the price,
 * which is what a customer is comparing (design.md §6.15).
 *
 * A paused plan still renders — the kitchen can pause a plan without hiding it —
 * with a gold label, its durations and prices readable, and nothing to buy.
 *
 * Prices come straight from the plan record, never from the browser, and they
 * are formatted in the one place money is ever formatted. The category badge is
 * a link to that category's page (spec 0008, AC-5); the audience badge stays a
 * plain label. Both label maps come from plansCategoryCopy, the one shared
 * source, so a badge and its category page can never disagree.
 */
export const PlanCard: React.FC<{ plan: Plan; whatsapp?: null | string }> = ({
  plan,
  whatsapp,
}) => {
  const durations: PlanDuration[] = (plan.durations ?? []).map((duration) => ({
    days: Number(duration.days),
    label: duration.label,
    price: Number(duration.price),
  }))

  const points = (plan.points ?? [])
    .map((entry) => entry.point?.trim() ?? '')
    .filter((point) => point.length > 0)
    .slice(0, 5)

  return (
    <article className="border-line bg-card relative flex flex-col rounded-lg border p-7 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none sm:p-8">
      <div className="flex flex-wrap items-center gap-2">
        {plan.category ? (
          <Link
            aria-label={categoryBadgeAriaLabel(plan.category)}
            className="bg-green-100 text-green-700 rounded-pill inline-flex px-3 py-1 text-xs font-bold tracking-wide uppercase transition-colors hover:bg-green-200 focus-visible:ring-[3px] focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none"
            href={planCategoryHref(plan.category)}
          >
            {CATEGORY_LABEL[plan.category]}
          </Link>
        ) : null}

        {plan.audience ? (
          <span className="bg-gold-100 text-gold-600 rounded-pill inline-flex px-3 py-1 text-xs font-bold tracking-wide uppercase">
            {AUDIENCE_LABEL[plan.audience]}
          </span>
        ) : null}

        {!plan.available ? (
          <span className="bg-gold-400 text-green-900 rounded-pill inline-flex px-3 py-1 text-xs font-bold tracking-wide uppercase">
            Paused
          </span>
        ) : null}
      </div>

      <h3 className="text-h3 mt-3">{plan.title}</h3>

      {plan.description ? (
        <RichText
          className="text-ink-600 mt-2 text-sm leading-6"
          data={plan.description}
          enableGutter={false}
        />
      ) : null}

      {points.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-2">
          {points.map((point, index) => (
            <li
              className="text-ink-600 flex items-start gap-2 text-sm leading-6"
              key={`${point}-${index}`}
            >
              <Check
                aria-hidden="true"
                className="text-green-700 mt-1 size-4 shrink-0"
                strokeWidth={2.5}
              />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-auto pt-6">
        {plan.available && durations.length > 0 ? (
          <PlanPurchase
            durations={durations}
            planSlug={plan.slug}
            planTitle={plan.title}
            whatsapp={whatsapp}
          />
        ) : (
          <div className="bg-green-50 rounded-md p-4">
            <ul className="divide-line flex flex-col divide-y">
              {durations.map((duration, index) => (
                <li
                  className="flex items-center justify-between gap-4 py-3"
                  key={`${duration.label}-${index}`}
                >
                  <div>
                    <p className="text-sm leading-tight font-bold">{duration.label}</p>
                    <p className="text-caption text-ink-600 mt-0.5">
                      {duration.days} {duration.days === 1 ? 'day' : 'days'} of meals
                    </p>
                  </div>

                  <p className="text-green-700 text-sm font-bold">{formatPaise(duration.price)}</p>
                </li>
              ))}
            </ul>

            <p className="text-ink-600 text-caption mt-3 leading-6">
              This plan is paused right now. Message the kitchen if you were counting on it.
            </p>
          </div>
        )}
      </div>
    </article>
  )
}
