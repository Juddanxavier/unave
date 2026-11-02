import type { Metadata } from 'next'
import Image from 'next/image'
import {
  CalendarClock,
  ClipboardList,
  CookingPot,
  Leaf,
  MessageCircle,
  Sun,
  UtensilsCrossed,
} from 'lucide-react'
import React from 'react'

import { Cta } from '@/components/Cta'
import { Notice } from '@/components/Notice'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import { Section } from '@/components/home/Section'
import { Swoosh } from '@/components/Swoosh'
import { getCachedGlobal } from '@/utilities/getGlobals'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { WHATSAPP_FALLBACK_LABEL, whatsappHref } from '@/utilities/whatsapp'
import {
  ABOUT_FINAL_BODY,
  ABOUT_FINAL_HEADING,
  ABOUT_FINAL_PRIMARY,
  ABOUT_FINAL_SECONDARY,
  ABOUT_HERO_CTA,
  ABOUT_HERO_EYEBROW,
  ABOUT_HERO_HEADLINE,
  ABOUT_HERO_HEADLINE_ACCENT,
  ABOUT_HERO_SUB,
  ABOUT_IMAGES,
  ABOUT_NOTICE_BODY,
  ABOUT_NOTICE_TITLE,
  ABOUT_PAGE_DESCRIPTION,
  ABOUT_PAGE_TITLE,
  ABOUT_STORY_HEADING,
  ABOUT_STORY_IMAGE_ALT,
  ABOUT_STORY_PARAGRAPHS,
  ABOUT_VALUES,
  ABOUT_VALUES_HEADING,
  ABOUT_VALUES_INTRO,
  ABOUT_WORK,
  ABOUT_WORK_HEADING,
} from '@/utilities/aboutCopy'
import type { Footer } from '@/payload-types'

export const metadata: Metadata = {
  alternates: { canonical: '/about' },
  description: ABOUT_PAGE_DESCRIPTION,
  openGraph: mergeOpenGraph({
    description: ABOUT_PAGE_DESCRIPTION,
    title: ABOUT_PAGE_TITLE,
    url: '/about',
  }),
  title: ABOUT_PAGE_TITLE,
}

/** The story mentions cooking around diabetes, so the gold notice sits beside it. */
const VALUE_ICONS = [Sun, ClipboardList, CookingPot, CalendarClock]
const WORK_ICONS = [UtensilsCrossed, Leaf, MessageCircle]

/**
 * The about page (spec 0006): who cooks the meals and how the kitchen works.
 * Static content, so it stays a server component end to end.
 */
export default async function AboutPage() {
  const footer = (await getCachedGlobal('footer', 1)()) as Footer | null
  const whatsapp = footer?.contact?.whatsapp ?? null

  return (
    <main>
      <Section
        className="opening-band overflow-hidden bg-green-900 md:py-20"
        image={{ priority: true, src: ABOUT_IMAGES.hero }}
        overlay="bg-green-900/85"
        tone="green"
      >
        <Swoosh className="-top-40 -right-32 w-[42rem] text-gold-400/[0.08]" />

        <div className="relative max-w-[46rem]">
          <p className="text-eyebrow text-gold-400 uppercase">{ABOUT_HERO_EYEBROW}</p>

          <h1 className="text-display mt-4 text-balance">
            {ABOUT_HERO_HEADLINE}{' '}
            <span className="text-gold-400 whitespace-nowrap italic">
              {ABOUT_HERO_HEADLINE_ACCENT}
            </span>
          </h1>

          <p className="text-lead text-cream/85 mt-6 max-w-[52ch]">{ABOUT_HERO_SUB}</p>

          <div className="mt-8">
            {whatsapp ? (
              <Cta
                href={whatsappHref(whatsapp)}
                rel="noopener noreferrer"
                target="_blank"
                variant="onDark"
              >
                <WhatsAppIcon className="size-4" />
                {ABOUT_HERO_CTA}
              </Cta>
            ) : (
              <Cta href="/contact" variant="onDark">
                {WHATSAPP_FALLBACK_LABEL}
              </Cta>
            )}
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2">
            {[
              { Icon: Sun, label: 'Fresh every morning' },
              { Icon: CookingPot, label: 'Cooked in small batches' },
              { Icon: CalendarClock, label: 'Delivered on schedule' },
            ].map(({ Icon, label }) => (
              <li className="text-caption text-cream/80 flex items-center gap-2" key={label}>
                <Icon aria-hidden="true" className="text-gold-400 size-4" strokeWidth={2} />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section tone="cream">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start lg:gap-16">
          <div className="max-w-[64ch]">
            <h2 className="text-h2">{ABOUT_STORY_HEADING}</h2>

            <div className="mt-6 flex flex-col gap-5">
              {ABOUT_STORY_PARAGRAPHS.map((paragraph, index) => (
                <p className="text-body text-ink-600" key={index}>
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          <figure className="relative aspect-[4/3] overflow-hidden rounded-2xl lg:mt-2">
            <Image
              alt={ABOUT_STORY_IMAGE_ALT}
              className="object-cover"
              fill
              sizes="(min-width: 1024px) 33vw, 100vw"
              src={ABOUT_IMAGES.story}
            />
          </figure>
        </div>

        <Notice className="mt-10" title={ABOUT_NOTICE_TITLE}>
          {ABOUT_NOTICE_BODY}
        </Notice>
      </Section>

      <Section tone="tint">
        <h2 className="text-h2">{ABOUT_VALUES_HEADING}</h2>
        <p className="text-body text-ink-600 mt-3 max-w-[60ch]">{ABOUT_VALUES_INTRO}</p>

        <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {ABOUT_VALUES.map((value, index) => {
            const Icon = VALUE_ICONS[index] ?? Sun

            return (
              <div key={value.title}>
                <span className="bg-green-100 text-green-700 grid size-11 place-items-center rounded-full">
                  <Icon aria-hidden="true" className="size-5" strokeWidth={2} />
                </span>
                <h3 className="text-h3 mt-4">{value.title}</h3>
                <p className="text-body text-ink-600 mt-2 max-w-[38ch]">{value.text}</p>
              </div>
            )
          })}
        </div>
      </Section>

      <Section tone="white">
        <h2 className="text-h2">{ABOUT_WORK_HEADING}</h2>

        <ol className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-3">
          {ABOUT_WORK.map((step, index) => {
            const Icon = WORK_ICONS[index] ?? UtensilsCrossed

            return (
              <li key={step.title}>
                <span className="bg-green-100 text-green-700 grid size-11 place-items-center rounded-full">
                  <Icon aria-hidden="true" className="size-5" strokeWidth={2} />
                </span>
                <h3 className="text-h3 mt-4">
                  <span aria-hidden="true" className="text-gold-600 mr-2 font-bold">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  {step.title}
                </h3>
                <p className="text-body text-ink-600 mt-2 max-w-[42ch]">{step.text}</p>
              </li>
            )
          })}
        </ol>
      </Section>

      <Section className="relative overflow-hidden text-center" tone="green">
        <Swoosh className="-top-32 left-1/2 w-[40rem] -translate-x-1/2 text-gold-400/[0.08]" />

        <div className="relative mx-auto max-w-[46rem]">
          <h2 className="text-h2">{ABOUT_FINAL_HEADING}</h2>
          <p className="text-lead text-cream/85 mt-4">{ABOUT_FINAL_BODY}</p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            {whatsapp ? (
              <Cta
                href={whatsappHref(whatsapp)}
                rel="noopener noreferrer"
                target="_blank"
                variant="onDark"
              >
                <WhatsAppIcon className="size-4" />
                {ABOUT_FINAL_PRIMARY}
              </Cta>
            ) : (
              <Cta href="/contact" variant="onDark">
                {WHATSAPP_FALLBACK_LABEL}
              </Cta>
            )}
            <Cta href="/contact" variant="onDarkSecondary">
              {ABOUT_FINAL_SECONDARY}
            </Cta>
          </div>
        </div>
      </Section>
    </main>
  )
}
