import { Link2 } from 'lucide-react'
import React from 'react'

import {
  PLAN_ACCESS_ACCOUNT,
  PLAN_ACCESS_BODY,
  PLAN_ACCESS_HEADING,
  PLAN_ACCESS_REASSURANCE,
} from '@/utilities/homeCopy'

import { Section } from './Section'

/**
 * design.md §6.8. Two ways into a plan: the private link every order comes with,
 * and the optional Google sign in. The account line is deliberately quiet, so the
 * section never reads as a gate.
 */
export const PlanAccessBand: React.FC = () => (
  <Section tone="highlight">
    <div className="grid items-start gap-6 md:grid-cols-[auto_1fr] md:gap-10">
      <span
        aria-hidden="true"
        className="bg-green-700 text-gold-400 flex size-12 items-center justify-center rounded-pill"
      >
        <Link2 className="size-6" strokeWidth={2} />
      </span>

      <div>
        <h2 className="text-h2">{PLAN_ACCESS_HEADING}</h2>
        <p className="text-body text-ink-600 mt-4 max-w-[65ch]">{PLAN_ACCESS_BODY}</p>
        <p className="text-body text-ink-600 mt-3 max-w-[65ch]">{PLAN_ACCESS_ACCOUNT}</p>
        <p className="text-body text-green-700 mt-3 max-w-[65ch] font-semibold">
          {PLAN_ACCESS_REASSURANCE}
        </p>
      </div>
    </div>
  </Section>
)
