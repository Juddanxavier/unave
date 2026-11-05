'use client'

import React, { useState } from 'react'

import { Cta } from '@/components/Cta'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import type { Plan } from '@/payload-types'
import {
  AUDIENCE_FILTER_LABEL,
  AUDIENCE_FILTER_ORDER,
  PLANS_CATEGORY_FILTER_EMPTY_BODY,
  PLANS_CATEGORY_FILTER_EMPTY_HEADING,
  type PlanAudienceFilterValue,
} from '@/utilities/plansCategoryCopy'
import { PLANS_CTA_MESSAGE, PLANS_EMPTY_BODY, PLANS_EMPTY_HEADING } from '@/utilities/plansCopy'
import { whatsappHref } from '@/utilities/whatsapp'

/**
 * The audience filter on a category page (spec 0008, AC-2 and AC-3).
 *
 * The grid is server rendered and stays that way: the cards arrive here as
 * ready made nodes, and this component only decides which ones are visible, in
 * the browser, with no page reload and no change to the address. The pills
 * follow design.md's accessibility rules: a labelled group, a pressed state on
 * every choice, 44px targets, a polite live region that announces how many
 * plans match, and no motion.
 *
 * Two empty states, so the words never lie (spec 0008, AC-3): when the category
 * has no plans at all, the plans page empty state shows; when only the chosen
 * filter comes up empty, the filter specific one does.
 */
export interface PlanFilterCard {
  audience: null | Plan['audience']
  id: string | number
  node: React.ReactNode
}

const FILTER_BUTTON_BASE =
  'rounded-pill inline-flex h-11 items-center border-2 px-5 text-sm font-bold transition-colors focus-visible:ring-[3px] focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none'

const FILTER_BUTTON_ON = 'border-green-700 bg-green-700 text-cream focus-visible:ring-green-500'
const FILTER_BUTTON_OFF =
  'border-line bg-card text-green-700 hover:border-green-700 hover:bg-green-50 focus-visible:ring-green-500'

export const PlanAudienceFilter: React.FC<{
  cards: PlanFilterCard[]
  whatsapp?: null | string
}> = ({ cards, whatsapp }) => {
  const [filter, setFilter] = useState<PlanAudienceFilterValue>('all')

  const visible =
    filter === 'all' ? cards : cards.filter((card) => card.audience === filter)

  const countText =
    visible.length === 1 ? '1 plan shown' : `${visible.length} plans shown`

  return (
    <div>
      <div
        aria-label="Filter the plans by audience"
        className="mt-8 flex flex-wrap items-center gap-2"
        role="group"
      >
        {AUDIENCE_FILTER_ORDER.map((value) => {
          const pressed = filter === value

          return (
            <button
              aria-pressed={pressed}
              className={`${FILTER_BUTTON_BASE} ${pressed ? FILTER_BUTTON_ON : FILTER_BUTTON_OFF}`}
              key={value}
              onClick={() => setFilter(value)}
              type="button"
            >
              {AUDIENCE_FILTER_LABEL[value]}
            </button>
          )
        })}
      </div>

      <p aria-live="polite" className="sr-only">
        {countText}.
      </p>

      {visible.length > 0 ? (
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((card) => (
            <React.Fragment key={card.id}>{card.node}</React.Fragment>
          ))}
        </div>
      ) : cards.length === 0 ? (
        <div className="border-line mt-10 max-w-[52ch] rounded-2xl border p-8">
          <h3 className="text-h3">{PLANS_EMPTY_HEADING}</h3>
          <p className="text-body text-ink-600 mt-3">{PLANS_EMPTY_BODY}</p>

          {whatsapp ? (
            <div className="mt-6">
              <Cta
                href={whatsappHref(whatsapp)}
                rel="noopener noreferrer"
                target="_blank"
                variant="secondary"
              >
                <WhatsAppIcon className="size-4" />
                {PLANS_CTA_MESSAGE}
              </Cta>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="border-line mt-10 max-w-[52ch] rounded-2xl border p-8">
          <h3 className="text-h3">{PLANS_CATEGORY_FILTER_EMPTY_HEADING}</h3>
          <p className="text-body text-ink-600 mt-3">{PLANS_CATEGORY_FILTER_EMPTY_BODY}</p>

          {whatsapp ? (
            <div className="mt-6">
              <Cta
                href={whatsappHref(whatsapp)}
                rel="noopener noreferrer"
                target="_blank"
                variant="secondary"
              >
                <WhatsAppIcon className="size-4" />
                {PLANS_CTA_MESSAGE}
              </Cta>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}