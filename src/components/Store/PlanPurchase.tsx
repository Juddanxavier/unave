'use client'

import { ShoppingBag } from 'lucide-react'
import React, { useState } from 'react'

import { CTA_BASE, CTA_VARIANTS } from '@/components/Cta'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import { formatPaise } from '@/utilities/money'
import { cn } from '@/utilities/ui'
import { WHATSAPP_CTA_LABEL, whatsappHref } from '@/utilities/whatsapp'

/**
 * The price panel on one plan card (spec 0007, AC-1 and AC-2).
 *
 * Laid out like a pricing card: the chosen duration's per day price leads, the
 * duration chips carry every total at once, and one full width control buys the
 * chosen one. The chips are native radios inside a GET form, so every duration
 * and price renders without JavaScript, and the chosen duration travels in the
 * submitted link, not in a cookie. The kitchen's WhatsApp action sits under it
 * as the secondary path, and is absent when the footer has no number.
 */

export type PlanDuration = {
  days: number
  label: string
  price: number
}

export type PlanPurchaseProps = {
  durations: PlanDuration[]
  planSlug: string
  planTitle: string
  whatsapp?: null | string
}

export const PlanPurchase: React.FC<PlanPurchaseProps> = ({
  durations,
  planSlug,
  planTitle,
  whatsapp,
}) => {
  const [selected, setSelected] = useState(0)

  const duration = durations[selected] ?? durations[0]

  if (!duration) return null

  const perDay = duration.days > 0 ? Math.round(duration.price / duration.days) : null

  return (
    <div>
      <div aria-live="polite">
        <p className="flex items-baseline gap-1.5">
          <span className="text-green-700 text-4xl leading-none font-bold tracking-tight sm:text-5xl">
            {formatPaise(perDay ?? duration.price)}
          </span>
          {perDay !== null ? <span className="text-ink-600 text-sm">a day</span> : null}
        </p>

        <p className="text-ink-600 mt-2 text-sm">
          {duration.days} {duration.days === 1 ? 'day' : 'days'} of meals,{' '}
          {formatPaise(duration.price)} in all
        </p>
      </div>

      <form action="/checkout" className="mt-6" method="get">
        <input name="plan" type="hidden" value={planSlug} />

        <fieldset>
          <legend className="sr-only">Choose a duration for {planTitle}</legend>

          <div className="flex flex-wrap gap-2">
            {durations.map((option, index) => (
              <label className="cursor-pointer" key={`${option.label}-${index}`}>
                <input
                  checked={selected === index}
                  className="peer sr-only"
                  name="duration"
                  onChange={() => setSelected(index)}
                  type="radio"
                  value={option.label}
                />

                <span
                  className={cn(
                    'rounded-pill border-line text-green-700 hover:border-green-700 flex min-h-11 items-center gap-2 border bg-white px-4 text-sm font-semibold transition-colors',
                    'peer-checked:border-gold-400 peer-checked:bg-gold-400 peer-checked:text-green-900',
                    'peer-focus-visible:ring-green-500 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-[3px]',
                    'motion-reduce:transition-none',
                  )}
                >
                  {option.label}

                  <span className="opacity-80">{formatPaise(option.price)}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-6 flex flex-col gap-2">
          <button className={cn(CTA_BASE, CTA_VARIANTS.primary, 'w-full')} type="submit">
            <ShoppingBag aria-hidden="true" className="size-4" strokeWidth={2} />
            Buy now
          </button>

          {whatsapp ? (
            <a
              className={cn(CTA_BASE, CTA_VARIANTS.secondary, 'w-full')}
              href={whatsappHref(whatsapp)}
              rel="noopener noreferrer"
              target="_blank"
            >
              <WhatsAppIcon className="size-4" />
              {WHATSAPP_CTA_LABEL}
            </a>
          ) : null}
        </div>
      </form>
    </div>
  )
}
