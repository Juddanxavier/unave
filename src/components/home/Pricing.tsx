import { Check, Moon, Soup, Sunrise } from 'lucide-react'
import React from 'react'

import {
  HOME_HREF_PLANS,
  PRICING_HEADING,
  PRICING_INTRO,
  PRICING_MEALS,
  PRICING_MEALS_HEADING,
  PRICING_MEALS_NOTE,
  PRICING_NOTE,
  PRICING_PLACEHOLDER,
  PRICING_TIERS,
} from '@/utilities/homeCopy'
import { cn } from '@/utilities/ui'

import { Cta } from '@/components/Cta'
import { Section } from './Section'

/** Meal-slot icons from design.md §7: sunrise, bowl and moon. */
const SLOT_ICONS = {
  all: [Sunrise, Soup, Moon],
  breakfast: [Sunrise],
  lunch: [Soup],
  dinner: [Moon],
} as const

/**
 * Two axes in one band: how long the plan runs (the three tiers a competitor
 * prices in a grid) and which meals it covers (a compact row underneath). The
 * numbers are placeholders from `homeCopy` until the business confirms them.
 */
export const Pricing: React.FC = () => (
  <Section id="plans" tone="tint">
    <h2 className="text-h2">{PRICING_HEADING}</h2>
    <p className="text-body text-ink-600 mt-4 max-w-[65ch]">{PRICING_INTRO}</p>

    <div className="mt-10 grid gap-6 lg:grid-cols-3">
      {PRICING_TIERS.map((tier) => {
        const featured = tier.highlight

        return (
          <article
            className={cn(
              'flex flex-col rounded-md p-6',
              featured ? 'bg-green-700 text-cream shadow-md' : 'bg-card border-line border',
            )}
            key={tier.name}
          >
            {'ribbon' in tier && tier.ribbon ? (
              <p className="text-caption text-green-700 bg-gold-400 mb-4 self-start rounded-pill px-3 py-1 font-bold">
                {tier.ribbon}
              </p>
            ) : null}

            <h3 className="text-h3">{tier.name}</h3>
            <p className={cn('text-caption mt-1', featured ? 'text-cream/75' : 'text-ink-600')}>
              {tier.tagline}
            </p>

            <p className="mt-5 flex items-baseline gap-2">
              <span className="text-h2 font-bold">{tier.price}</span>
              <span className={cn('text-caption', featured ? 'text-cream/75' : 'text-ink-600')}>
                {tier.unit}
              </span>
            </p>
            <p className={cn('text-caption mt-1', featured ? 'text-cream/75' : 'text-ink-600')}>
              {tier.meals}
            </p>

            <ul className="mt-6 space-y-2">
              {tier.perks.map((perk) => (
                <li className="flex items-start gap-2" key={perk}>
                  <Check
                    aria-hidden="true"
                    className={cn(
                      'mt-0.5 size-4 shrink-0',
                      featured ? 'text-gold-400' : 'text-green-600',
                    )}
                    strokeWidth={3}
                  />
                  <span className="text-body">{perk}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-1 items-end">
              <Cta
                className="w-full"
                href={HOME_HREF_PLANS}
                variant={featured ? 'onDark' : 'primary'}
              >
                {tier.cta}
              </Cta>
            </div>
          </article>
        )
      })}
    </div>

    <div className="border-line mt-12 border-t pt-8">
      <h3 className="text-h3">{PRICING_MEALS_HEADING}</h3>
      <p className="text-caption text-ink-600 mt-2">{PRICING_MEALS_NOTE}</p>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PRICING_MEALS.map((meal) => (
          <li
            className="bg-card border-line flex items-center gap-3 rounded-md border px-4 py-3"
            key={meal.name}
          >
            <span aria-hidden="true" className="text-green-600 flex items-center gap-1">
              {SLOT_ICONS[meal.icon].map((Icon, index) => (
                <Icon className="size-4" key={index} strokeWidth={2} />
              ))}
            </span>
            <span>
              <span className="text-body text-ink-900 block font-bold">{meal.name}</span>
              <span className="text-caption text-ink-600 block">{meal.slots}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>

    <p className="text-caption text-ink-600 mt-8">{PRICING_NOTE}</p>
    <p className="text-caption text-gold-600 mt-2 font-bold">{PRICING_PLACEHOLDER}</p>
  </Section>
)
