import React from 'react'

import { Cta } from '@/components/Cta'
import { PlanCard } from '@/components/Store/PlanCard'
import {
  PLANS_SECTION_CTA,
  PLANS_SECTION_HEADING,
  PLANS_SECTION_INTRO,
} from '@/utilities/homeCopy'
import { getHomePlans } from '@/utilities/plans'

import { Section } from './Section'

/**
 * The plans shelf, three at most (design.md §10.1).
 *
 * The cards are the ones `/plans` sells with, not a summary of them: the duration
 * chips, the per day price and the action all work here, so someone who already
 * knows what they want can buy from the front page. Prices come from the plan
 * records through the same card, so there is no second place to keep them right.
 *
 * A kitchen with nothing open shows no shelf at all rather than an empty heading.
 */
export const Plans: React.FC<{ whatsapp?: null | string }> = async ({ whatsapp }) => {
  const plans = await getHomePlans()()

  if (plans.length === 0) return null

  return (
    <Section id="plans">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-6">
        <div className="max-w-[58ch]">
          <h2 className="text-h2">{PLANS_SECTION_HEADING}</h2>
          <p className="text-body text-ink-600 mt-4">{PLANS_SECTION_INTRO}</p>
        </div>

        <Cta className="shrink-0" href="/plans" variant="secondary">
          {PLANS_SECTION_CTA}
        </Cta>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} whatsapp={whatsapp} />
        ))}
      </div>
    </Section>
  )
}
