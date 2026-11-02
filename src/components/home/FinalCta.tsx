import React from 'react'

import {
  FINAL_BODY,
  FINAL_HEADING,
  FINAL_PRIMARY,
  FINAL_SECONDARY,
  HOME_HREF_CONTACT,
  HOME_HREF_FAQ,
  IMAGES,
} from '@/utilities/homeCopy'
import { WHATSAPP_FALLBACK_LABEL, whatsappHref } from '@/utilities/whatsapp'

import { Cta } from '@/components/Cta'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import { Section } from './Section'
import { Swoosh } from '@/components/Swoosh'

/** The closing band. Its primary action opens WhatsApp, like the hero's. */
export const FinalCta: React.FC<{ whatsapp?: null | string }> = ({ whatsapp }) => (
  <Section
    className="relative overflow-hidden text-center"
    image={{ src: IMAGES.ctaBg }}
    overlay="bg-green-900/85"
    tone="green"
  >
    <Swoosh className="-top-32 left-1/2 w-[40rem] -translate-x-1/2 text-gold-400/[0.08]" />

    <div className="relative mx-auto max-w-[46rem]">
      <h2 className="text-h2">{FINAL_HEADING}</h2>
      <p className="text-lead text-cream/85 mt-4">{FINAL_BODY}</p>

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        {whatsapp ? (
          <Cta
            href={whatsappHref(whatsapp)}
            rel="noopener noreferrer"
            target="_blank"
            variant="onDark"
          >
            <WhatsAppIcon className="size-4" />
            {FINAL_PRIMARY}
          </Cta>
        ) : (
          <Cta href={HOME_HREF_CONTACT} variant="onDark">
            {WHATSAPP_FALLBACK_LABEL}
          </Cta>
        )}
        <Cta href={HOME_HREF_FAQ} variant="onDarkSecondary">
          {FINAL_SECONDARY}
        </Cta>
      </div>
    </div>
  </Section>
)
