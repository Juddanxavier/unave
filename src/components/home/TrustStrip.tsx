import {
  BadgeCheck,
  CalendarDays,
  Leaf,
  PauseCircle,
  ShieldCheck,
  Truck,
  UtensilsCrossed,
} from 'lucide-react'
import React from 'react'

import { TRUST } from '@/utilities/homeCopy'

const TRUST_ICONS = {
  badge: BadgeCheck,
  calendar: CalendarDays,
  leaf: Leaf,
  pause: PauseCircle,
  shield: ShieldCheck,
  truck: Truck,
  utensils: UtensilsCrossed,
} as const

/**
 * The trust strip, in the place a competitor would put their badge row. Every
 * label here is either something the product really does or a marked placeholder
 * in `homeCopy`, so nothing on this row is aspirational.
 */
export const TrustStrip: React.FC = () => (
  <section className="bg-green-50 border-line border-y">
    <ul className="container grid grid-cols-2 gap-x-6 gap-y-6 py-10 sm:grid-cols-3 xl:grid-cols-5">
      {TRUST.map((item) => {
        const Icon = TRUST_ICONS[item.icon]

        return (
          <li className="flex items-start gap-3" key={item.label}>
            <span
              aria-hidden="true"
              className="bg-green-100 text-green-700 flex size-9 shrink-0 items-center justify-center rounded-pill"
            >
              <Icon className="size-4.5" strokeWidth={2} />
            </span>
            <span>
              <span className="text-caption text-ink-900 block font-bold">{item.label}</span>
              <span className="text-caption text-ink-600 block">{item.note}</span>
            </span>
          </li>
        )
      })}
    </ul>
  </section>
)
