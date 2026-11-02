import { FlaskConical, Leaf, Lock, UtensilsCrossed } from 'lucide-react'
import React from 'react'

import {
  HERO_CHIPS,
  HERO_EYEBROW,
  HERO_HEADLINE,
  HERO_HEADLINE_ACCENT,
  HERO_PRIMARY,
  HERO_SECONDARY,
  HERO_SUB,
  HOME_HREF_CONTACT,
  HOME_HREF_HOW_IT_WORKS,
  IMAGES,
} from '@/utilities/homeCopy'
import { WHATSAPP_FALLBACK_LABEL, whatsappHref } from '@/utilities/whatsapp'

import { Cta } from '@/components/Cta'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import { Section } from './Section'
import { Swoosh } from '@/components/Swoosh'

const CHIP_ICONS = {
  flask: FlaskConical,
  leaf: Leaf,
  lock: Lock,
  utensils: UtensilsCrossed,
} as const

/**
 * The photograph runs full-bleed behind the copy, fading from nearly solid green on
 * the left to let the food show on the right, so the headline keeps its contrast
 * without a hard card edge.
 *
 * The primary action opens WhatsApp with the opening line already written. If the
 * footer has no number yet, it falls back to the contact page rather than leaving
 * the hero without its one primary action.
 */
export const Hero: React.FC<{ whatsapp?: null | string }> = ({ whatsapp }) => (
  <Section
    className="opening-band opening-band-tall relative overflow-hidden md:py-28"
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

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {whatsapp ? (
          <Cta
            href={whatsappHref(whatsapp)}
            rel="noopener noreferrer"
            target="_blank"
            variant="onDark"
          >
            <WhatsAppIcon className="size-4" />
            {HERO_PRIMARY}
          </Cta>
        ) : (
          <Cta href={HOME_HREF_CONTACT} variant="onDark">
            {WHATSAPP_FALLBACK_LABEL}
          </Cta>
        )}
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
