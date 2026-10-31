import { CalendarDays, Leaf, PauseCircle } from 'lucide-react'
import React from 'react'

import { Cta } from '@/components/Cta'
import { Section } from '@/components/home/Section'
import { Swoosh } from '@/components/Swoosh'
import {
  PLANS_HERO_CTA,
  PLANS_HERO_EYEBROW,
  PLANS_HERO_HEADLINE,
  PLANS_HERO_HEADLINE_ACCENT,
  PLANS_HERO_SUB,
} from '@/utilities/planShopCopy'

/**
 * The plans page hero (design.md §6.3 and §6.17): the same deep green, swoosh and
 * gold-accented headline as the home hero, without the photograph — the plans
 * themselves, right below, are the picture.
 */
export const PlansHero: React.FC = () => (
  <Section className="overflow-hidden bg-green-900 md:py-20" tone="green">
    <Swoosh className="-top-40 -right-32 w-[42rem] text-gold-400/[0.08]" />

    <div className="relative max-w-[46rem]">
      <p className="text-eyebrow text-gold-400 uppercase">{PLANS_HERO_EYEBROW}</p>

      <h1 className="text-display mt-4 text-balance">
        {PLANS_HERO_HEADLINE}{' '}
        <span className="text-gold-400 whitespace-nowrap italic">{PLANS_HERO_HEADLINE_ACCENT}</span>
      </h1>

      <p className="text-lead text-cream/85 mt-6 max-w-[52ch]">{PLANS_HERO_SUB}</p>

      <div className="mt-8">
        <Cta href="#plans" variant="onDark">
          {PLANS_HERO_CTA}
        </Cta>
      </div>

      <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2">
        {[
          { Icon: CalendarDays, label: 'Fresh daily' },
          { Icon: Leaf, label: 'Flexible plans' },
          { Icon: PauseCircle, label: 'Cancel any time' },
        ].map(({ Icon, label }) => (
          <li className="text-caption text-cream/80 flex items-center gap-2" key={label}>
            <Icon aria-hidden="true" className="text-gold-400 size-4" strokeWidth={2} />
            {label}
          </li>
        ))}
      </ul>
    </div>
  </Section>
)
