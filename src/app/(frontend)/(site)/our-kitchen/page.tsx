import type { Metadata } from 'next'
import Image from 'next/image'
import {
  BadgeCheck,
  CalendarDays,
  ClipboardList,
  ShieldCheck,
  Sparkles,
  Tag,
  UtensilsCrossed,
} from 'lucide-react'
import React from 'react'

import { Cta } from '@/components/Cta'
import { Notice } from '@/components/Notice'
import { PageHero } from '@/components/PageHero'
import { Swoosh } from '@/components/Swoosh'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import { Section } from '@/components/home/Section'
import { getCachedGlobal } from '@/utilities/getGlobals'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import {
  KITCHEN_FINAL_BODY,
  KITCHEN_FINAL_HEADING,
  KITCHEN_FINAL_PRIMARY,
  KITCHEN_FINAL_SECONDARY,
  KITCHEN_HERO_CTA,
  KITCHEN_HERO_EYEBROW,
  KITCHEN_HERO_HEADLINE,
  KITCHEN_HERO_HEADLINE_ACCENT,
  KITCHEN_HERO_POINTS,
  KITCHEN_HERO_SECONDARY,
  KITCHEN_HERO_SUB,
  KITCHEN_IMAGES,
  KITCHEN_NOTICE_BODY,
  KITCHEN_NOTICE_TITLE,
  KITCHEN_PAGE_DESCRIPTION,
  KITCHEN_PAGE_TITLE,
  KITCHEN_PLAN,
  KITCHEN_PLAN_HEADING,
  KITCHEN_PLAN_INTRO,
  KITCHEN_PREP_HEADING,
  KITCHEN_PREP_INTRO,
  KITCHEN_PREP_PHOTOS,
  KITCHEN_PROCESS,
  KITCHEN_PROCESS_HEADING,
  KITCHEN_PROCESS_INTRO,
  KITCHEN_STANDARDS,
  KITCHEN_STANDARDS_HEADING,
  KITCHEN_STANDARDS_INTRO,
} from '@/utilities/ourKitchenCopy'
import { WHATSAPP_FALLBACK_LABEL, whatsappHref } from '@/utilities/whatsapp'
import type { Footer } from '@/payload-types'

export const metadata: Metadata = {
  alternates: { canonical: '/our-kitchen' },
  description: KITCHEN_PAGE_DESCRIPTION,
  openGraph: mergeOpenGraph({
    description: KITCHEN_PAGE_DESCRIPTION,
    title: KITCHEN_PAGE_TITLE,
    url: '/our-kitchen',
  }),
  title: KITCHEN_PAGE_TITLE,
}

const HERO_ICONS = [CalendarDays, ClipboardList, BadgeCheck]
const STANDARD_ICONS = [Sparkles, ShieldCheck, Tag, CalendarDays]

/**
 * The kitchen page: what happens between the produce arriving and the box leaving,
 * told in the kitchen's own order (design.md §10.5). Static content, so it stays a
 * server component end to end, and the goals notice sits beside the planning band.
 */
export default async function OurKitchenPage() {
  const footer = (await getCachedGlobal('footer', 1)()) as Footer | null
  const whatsapp = footer?.contact?.whatsapp ?? null

  return (
    <main>
      <PageHero
        accent={KITCHEN_HERO_HEADLINE_ACCENT}
        eyebrow={KITCHEN_HERO_EYEBROW}
        headline={KITCHEN_HERO_HEADLINE}
        image={KITCHEN_IMAGES.hero}
        sub={KITCHEN_HERO_SUB}
      >
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {whatsapp ? (
            <Cta
              href={whatsappHref(whatsapp)}
              rel="noopener noreferrer"
              target="_blank"
              variant="onDark"
            >
              <WhatsAppIcon className="size-4" />
              {KITCHEN_HERO_CTA}
            </Cta>
          ) : (
            <Cta href="/contact" variant="onDark">
              {WHATSAPP_FALLBACK_LABEL}
            </Cta>
          )}

          <Cta href="/plans" variant="onDarkSecondary">
            {KITCHEN_HERO_SECONDARY}
          </Cta>
        </div>

        <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2">
          {KITCHEN_HERO_POINTS.map((label, index) => {
            const Icon = HERO_ICONS[index] ?? CalendarDays

            return (
              <li className="text-caption text-cream/80 flex items-center gap-2" key={label}>
                <Icon aria-hidden="true" className="text-gold-400 size-4" strokeWidth={2} />
                {label}
              </li>
            )
          })}
        </ul>
      </PageHero>

      <Section tone="cream">
        <h2 className="text-h2">{KITCHEN_PROCESS_HEADING}</h2>
        <p className="text-body text-ink-600 mt-4 max-w-[65ch]">{KITCHEN_PROCESS_INTRO}</p>

        <ol className="mt-10 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {KITCHEN_PROCESS.map((step, index) => (
            <li className="flex gap-4" key={step.title}>
              <span
                aria-hidden="true"
                className="text-h3 text-green-700 bg-gold-400 flex size-11 shrink-0 items-center justify-center rounded-pill font-bold"
              >
                {index + 1}
              </span>

              <div>
                <h3 className="text-h3">{step.title}</h3>
                <p className="text-body text-ink-600 mt-1">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="white">
        <h2 className="text-h2">{KITCHEN_PREP_HEADING}</h2>
        <p className="text-body text-ink-600 mt-4 max-w-[65ch]">{KITCHEN_PREP_INTRO}</p>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {KITCHEN_PREP_PHOTOS.map((photo) => (
            <figure key={photo.image}>
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
                <Image
                  alt={photo.alt}
                  className="object-cover"
                  fill
                  quality={75}
                  sizes="(min-width: 40rem) 33vw, 100vw"
                  src={photo.image}
                />
              </div>
              <figcaption className="text-caption text-ink-600 mt-3">{photo.caption}</figcaption>
            </figure>
          ))}
        </div>
      </Section>

      <Section tone="tint">
        <h2 className="text-h2">{KITCHEN_PLAN_HEADING}</h2>
        <p className="text-body text-ink-600 mt-4 max-w-[65ch]">{KITCHEN_PLAN_INTRO}</p>

        <div className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2">
          {KITCHEN_PLAN.map((point) => (
            <div className="border-line border-t pt-6" key={point.title}>
              <h3 className="text-h3">{point.title}</h3>
              <p className="text-body text-ink-600 mt-2 max-w-[46ch]">{point.body}</p>
            </div>
          ))}
        </div>

        <Notice className="mt-10" title={KITCHEN_NOTICE_TITLE}>
          {KITCHEN_NOTICE_BODY}
        </Notice>
      </Section>

      <Section tone="white">
        <h2 className="text-h2">{KITCHEN_STANDARDS_HEADING}</h2>
        <p className="text-body text-ink-600 mt-4 max-w-[65ch]">{KITCHEN_STANDARDS_INTRO}</p>

        <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {KITCHEN_STANDARDS.map((item, index) => {
            const Icon = STANDARD_ICONS[index] ?? ShieldCheck

            return (
              <div key={item.title}>
                <span className="bg-green-100 text-green-700 grid size-11 place-items-center rounded-full">
                  <Icon aria-hidden="true" className="size-5" strokeWidth={2} />
                </span>
                <h3 className="text-h3 mt-4">{item.title}</h3>
                <p className="text-body text-ink-600 mt-2 max-w-[38ch]">{item.body}</p>
              </div>
            )
          })}
        </div>
      </Section>

      <Section className="relative overflow-hidden text-center" tone="green">
        <Swoosh className="-top-32 left-1/2 w-[40rem] -translate-x-1/2 text-gold-400/[0.08]" />

        <div className="relative mx-auto max-w-[46rem]">
          <h2 className="text-h2">{KITCHEN_FINAL_HEADING}</h2>
          <p className="text-lead text-cream/85 mt-4">{KITCHEN_FINAL_BODY}</p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            {whatsapp ? (
              <Cta
                href={whatsappHref(whatsapp)}
                rel="noopener noreferrer"
                target="_blank"
                variant="onDark"
              >
                <WhatsAppIcon className="size-4" />
                {KITCHEN_FINAL_PRIMARY}
              </Cta>
            ) : (
              <Cta href="/contact" variant="onDark">
                {WHATSAPP_FALLBACK_LABEL}
              </Cta>
            )}

            <Cta href="/plans" variant="onDarkSecondary">
              {KITCHEN_FINAL_SECONDARY}
            </Cta>
          </div>
        </div>
      </Section>
    </main>
  )
}
