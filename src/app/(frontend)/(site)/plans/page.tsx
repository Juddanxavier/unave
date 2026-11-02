import type { Metadata } from 'next'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'

import { Cta } from '@/components/Cta'
import { Notice } from '@/components/Notice'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import { Section } from '@/components/home/Section'
import { PlanCard } from '@/components/Store/PlanCard'
import { Swoosh } from '@/components/Swoosh'
import type { Plan } from '@/payload-types'
import { getCachedGlobal } from '@/utilities/getGlobals'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { whatsappHref } from '@/utilities/whatsapp'
import {
  PLANS_CTA_BROWSE,
  PLANS_CTA_MESSAGE,
  PLANS_EMPTY_BODY,
  PLANS_EMPTY_HEADING,
  PLANS_FINAL_BODY,
  PLANS_FINAL_HEADING,
  PLANS_GRID_HEADING,
  PLANS_GRID_INTRO,
  PLANS_HERO_EYEBROW,
  PLANS_HERO_HEADLINE,
  PLANS_HERO_HEADLINE_ACCENT,
  PLANS_HERO_SUB,
  PLANS_HOW_HEADING,
  PLANS_HOW_STEPS,
  PLANS_PAGE_DESCRIPTION,
  PLANS_PAGE_TITLE,
  PLANS_PAUSED_NOTE_BODY,
  PLANS_PAUSED_NOTE_TITLE,
} from '@/utilities/plansCopy'
import type { Footer } from '@/payload-types'

/**
 * The plans shelf (spec 0007, AC-1 and AC-2). Anyone can look, no account
 * asked for, and every plan that is not hidden renders, paused ones included.
 * The list reads live plan rows, so a price or a duration the kitchen edits is
 * on this page the moment it saves.
 */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  alternates: { canonical: '/plans' },
  description: PLANS_PAGE_DESCRIPTION,
  openGraph: mergeOpenGraph({
    description: PLANS_PAGE_DESCRIPTION,
    title: PLANS_PAGE_TITLE,
    url: '/plans',
  }),
  title: PLANS_PAGE_TITLE,
}

const STEP_NUMBER =
  'bg-green-100 text-green-700 grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold'

export default async function PlansPage() {
  const payload = await getPayload({ config: configPromise })

  const plans = await payload.find({
    collection: 'plans',
    depth: 1,
    limit: 100,
  })

  const openPlans = plans.docs.filter((plan: Plan) => plan.available)
  const pausedPlans = plans.docs.filter((plan: Plan) => !plan.available)
  const hasAnyPlan = plans.docs.length > 0

  const footer = (await getCachedGlobal('footer', 1)()) as Footer | null
  const whatsapp = footer?.contact?.whatsapp ?? null

  return (
    <main>
      <Section
        className="opening-band relative overflow-hidden bg-green-900 md:py-20"
        tone="green"
      >
        <Swoosh className="-top-40 -right-32 w-[42rem] text-gold-400/[0.08]" />

        <div className="relative max-w-[46rem]">
          <p className="text-eyebrow text-gold-400 uppercase">{PLANS_HERO_EYEBROW}</p>

          <h1 className="text-display mt-4 text-balance">
            {PLANS_HERO_HEADLINE}{' '}
            <span className="text-gold-400 whitespace-nowrap italic">
              {PLANS_HERO_HEADLINE_ACCENT}
            </span>
          </h1>

          <p className="text-lead text-cream/85 mt-6 max-w-[52ch]">{PLANS_HERO_SUB}</p>

          <div className="mt-8">
            <Cta href="#plans" variant="onDark">
              {PLANS_CTA_BROWSE}
            </Cta>
          </div>
        </div>
      </Section>

      <Section id="plans" tone="white">
        <h2 className="text-h2">{PLANS_GRID_HEADING}</h2>
        <p className="text-body text-ink-600 mt-3 max-w-[60ch]">{PLANS_GRID_INTRO}</p>

        {hasAnyPlan ? (
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...openPlans, ...pausedPlans].map((plan) => (
              <PlanCard key={plan.id} plan={plan} whatsapp={whatsapp} />
            ))}
          </div>
        ) : (
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
        )}

        {pausedPlans.length > 0 ? (
          <Notice className="mt-10 max-w-[70ch]" title={PLANS_PAUSED_NOTE_TITLE}>
            {PLANS_PAUSED_NOTE_BODY}
          </Notice>
        ) : null}
      </Section>

      <Section tone="tint">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
          <div>
            <h2 className="text-h2">{PLANS_HOW_HEADING}</h2>
            <p className="text-body text-ink-600 mt-3 max-w-[45ch]">
              Three steps, and none of them ask you to remember a thing.
            </p>
          </div>

          <ol className="flex flex-col gap-8">
            {PLANS_HOW_STEPS.map((step, index) => (
              <li className="flex gap-4" key={step.title}>
                <span aria-hidden="true" className={STEP_NUMBER}>
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-h3">{step.title}</h3>
                  <p className="text-body text-ink-600 mt-2 max-w-[55ch]">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      <Section tone="white">
        <div className="max-w-[52ch]">
          <h2 className="text-h2">{PLANS_FINAL_HEADING}</h2>
          <p className="text-body text-ink-600 mt-3">{PLANS_FINAL_BODY}</p>

          <div className="mt-8">
            <Cta href="#plans" variant="primary">
              {PLANS_CTA_BROWSE}
            </Cta>
          </div>
        </div>
      </Section>
    </main>
  )
}
