import type { Metadata } from 'next'
import configPromise from '@payload-config'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { Cta } from '@/components/Cta'
import { Notice } from '@/components/Notice'
import { WhatsAppIcon } from '@/components/WhatsAppIcon'
import { Section } from '@/components/home/Section'
import { PlanAudienceFilter, type PlanFilterCard } from '@/components/Store/PlanAudienceFilter'
import { PlanCard } from '@/components/Store/PlanCard'
import { Swoosh } from '@/components/Swoosh'
import type { Footer } from '@/payload-types'
import { getCachedGlobal } from '@/utilities/getGlobals'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import {
  CATEGORY_LABEL,
  PLANS_CATEGORY_CTA_BROWSE,
  PLANS_CATEGORY_FINAL_BODY,
  PLANS_CATEGORY_FINAL_HEADING,
  PLAN_CATEGORY_COPY,
  isPlanCategory,
  planCategoryHref,
} from '@/utilities/plansCategoryCopy'
import { PLANS_CTA_MESSAGE, PLANS_PAUSED_NOTE_BODY, PLANS_PAUSED_NOTE_TITLE } from '@/utilities/plansCopy'
import { whatsappHref } from '@/utilities/whatsapp'

/**
 * A page per plan category (spec 0008): /plans/ready-to-cook, /plans/ready-to-eat
 * and /plans/fresh-from-produce, served by this one dynamic route.
 *
 * Anyone can look, no account asked for, and the shelf reads live plan rows of
 * exactly one category, paused ones included with nothing to buy, so a price
 * the kitchen edits is here the moment it saves. The words come from
 * plansCategoryCopy, the plan cards from the Plans collection, and any slug
 * that is not one of the three categories lands on the not found page.
 */
export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: PageProps<'/plans/[category]'>): Promise<Metadata> {
  const { category } = await params

  if (!isPlanCategory(category)) notFound()

  const copy = PLAN_CATEGORY_COPY[category]

  return {
    alternates: { canonical: planCategoryHref(category) },
    description: copy.metaDescription,
    openGraph: mergeOpenGraph({
      description: copy.metaDescription,
      title: copy.metaTitle,
      url: planCategoryHref(category),
    }),
    title: copy.metaTitle,
  }
}

export default async function PlanCategoryPage(props: PageProps<'/plans/[category]'>) {
  const { category } = await props.params

  if (!isPlanCategory(category)) notFound()

  const payload = await getPayload({ config: configPromise })

  const plans = await payload.find({
    collection: 'plans',
    depth: 1,
    limit: 100,
    where: {
      category: {
        equals: category,
      },
    },
  })

  const copy = PLAN_CATEGORY_COPY[category]
  const otherCategories = (Object.keys(CATEGORY_LABEL) as Array<keyof typeof CATEGORY_LABEL>).filter(
    (value) => value !== category,
  )

  const footer = (await getCachedGlobal('footer', 1)()) as Footer | null
  const whatsapp = footer?.contact?.whatsapp ?? null

  const cards: PlanFilterCard[] = plans.docs.map((plan) => ({
    audience: plan.audience,
    id: plan.id,
    node: <PlanCard plan={plan} whatsapp={whatsapp} />,
  }))

  const pausedCount = plans.docs.filter((plan) => !plan.available).length

  return (
    <main>
      <Section className="opening-band relative overflow-hidden bg-green-900 md:py-20" tone="green">
        <Swoosh className="-top-40 -right-32 w-[42rem] text-gold-400/[0.08]" />

        <div className="relative max-w-[46rem]">
          <p className="text-eyebrow text-gold-400 uppercase">{copy.eyebrow}</p>

          <h1 className="text-display mt-4 text-balance">
            {copy.headline}{' '}
            <span className="text-gold-400 whitespace-nowrap italic">{copy.headlineAccent}</span>
          </h1>

          <p className="text-lead text-cream/85 mt-6 max-w-[52ch]">{copy.intro}</p>

          <div className="mt-8">
            <Cta href="#plans" variant="onDark">
              {PLANS_CATEGORY_CTA_BROWSE}
            </Cta>
          </div>
        </div>
      </Section>

      <Section id="plans" tone="white">
        <h2 className="text-h2">{copy.gridHeading}</h2>
        <p className="text-body text-ink-600 mt-3 max-w-[60ch]">{copy.gridIntro}</p>

        <PlanAudienceFilter cards={cards} whatsapp={whatsapp} />

        {pausedCount > 0 ? (
          <Notice className="mt-10 max-w-[70ch]" title={PLANS_PAUSED_NOTE_TITLE}>
            {PLANS_PAUSED_NOTE_BODY}
          </Notice>
        ) : null}

        <div className="border-line mt-10 border-t pt-6">
          <p className="text-body text-ink-600">
            Not quite what you need? The other shelves:{' '}
            {otherCategories.map((value, index) => (
              <React.Fragment key={value}>
                <Link
                  className="text-green-700 font-bold underline hover:text-green-600 focus-visible:ring-[3px] focus-visible:ring-green-500 focus-visible:outline-none"
                  href={planCategoryHref(value)}
                >
                  {CATEGORY_LABEL[value]}
                </Link>
                {index < otherCategories.length - 1 ? ' · ' : ''}
              </React.Fragment>
            ))}
          </p>
        </div>
      </Section>

      <Section tone="tint">
        <div className="max-w-[52ch]">
          <h2 className="text-h2">{PLANS_CATEGORY_FINAL_HEADING}</h2>
          <p className="text-body text-ink-600 mt-3">{PLANS_CATEGORY_FINAL_BODY}</p>

          <div className="mt-8">
            {whatsapp ? (
              <Cta
                href={whatsappHref(whatsapp)}
                rel="noopener noreferrer"
                target="_blank"
                variant="primary"
              >
                <WhatsAppIcon className="size-4" />
                {PLANS_CTA_MESSAGE}
              </Cta>
            ) : (
              <Cta href="/plans" variant="primary">
                {PLANS_CATEGORY_CTA_BROWSE}
              </Cta>
            )}
          </div>
        </div>
      </Section>
    </main>
  )
}