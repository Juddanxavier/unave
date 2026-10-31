import { CalendarDays, Leaf, Lock, PauseCircle } from 'lucide-react'
import React from 'react'

import {
  HERO_CHIPS,
  HERO_EYEBROW,
  HERO_HEADLINE,
  HERO_HEADLINE_ACCENT,
  HERO_PRICE_LEAD,
  HERO_PRICE_UNIT,
  HERO_PRICE_VALUE,
  HERO_PRIMARY,
  HERO_SECONDARY,
  HERO_SUB,
  HOME_HREF_HOW_IT_WORKS,
  HOME_HREF_PLANS,
  IMAGES,
} from '@/utilities/homeCopy'

import { Cta } from '@/components/Cta'
import { Section } from './Section'
import { Swoosh } from '@/components/Swoosh'

const CHIP_ICONS = {
  calendar: CalendarDays,
  leaf: Leaf,
  lock: Lock,
  pause: PauseCircle,
} as const

/**
 * The photograph runs full-bleed behind the copy, fading from nearly solid green on
 * the left to let the food show on the right, so the headline keeps its contrast
 * without a hard card edge.
 */
export const Hero: React.FC = () => (
  <Section
    className="relative overflow-hidden md:py-28"
    image={{ priority: true, src: IMAGES.heroBg }}
    overlay="bg-green-900/85 lg:bg-transparent lg:bg-linear-to-r lg:from-green-900 lg:via-green-900/90 lg:to-green-900/45"
    tone="green"
  >
    <Swoosh className="-top-40 -right-32 w-[42rem] text-gold-400/[0.08]" />

    <div className="relative max-w-[46rem]">
      <p className="text-eyebrow text-gold-400 uppercase">{HERO_EYEBROW}</p>

      <h1 className="text-display mt-4 text-balance">
        {HERO_HEADLINE}{' '}
        <span className="text-gold-400 whitespace-nowrap italic">{HERO_HEADLINE_ACCENT}</span>
      </h1>

      <p className="text-lead text-cream/85 mt-6 max-w-[52ch]">{HERO_SUB}</p>

      {/* Entry price. The value is a placeholder until the business confirms it. */}
      <p className="bg-green-800/90 ring-cream/15 mt-6 inline-flex flex-wrap items-baseline gap-x-2 gap-y-0 rounded-pill px-4 py-2 ring-1">
        <span className="text-caption text-cream/70">{HERO_PRICE_LEAD}</span>
        <span className="text-h3 text-gold-400 font-bold">{HERO_PRICE_VALUE}</span>
        <span className="text-caption text-cream/70">{HERO_PRICE_UNIT}</span>
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Cta href={HOME_HREF_PLANS} variant="onDark">
          {HERO_PRIMARY}
        </Cta>
        <Cta href={HOME_HREF_HOW_IT_WORKS} variant="onDarkSecondary">
          {HERO_SECONDARY}
        </Cta>
      </div>

      <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2">
        {HERO_CHIPS.map((chip) => {
          const Icon = CHIP_ICONS[chip.icon]

          return (
            <li className="text-caption text-cream/80 flex items-center gap-2" key={chip.label}>
              <Icon aria-hidden="true" className="text-gold-400 size-4" strokeWidth={2} />
              {chip.label}
            </li>
          )
        })}
      </ul>
    </div>
  </Section>
)
