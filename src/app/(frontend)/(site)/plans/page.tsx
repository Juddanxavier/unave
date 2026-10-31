import type { Metadata } from 'next'
import React from 'react'

import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { Faq } from '@/components/home/Faq'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { parsePlanQuery } from '@/utilities/planCatalog'
import {
  PLANS_FAQ,
  PLANS_FAQ_HEADING,
  PLANS_PAGE_DESCRIPTION,
  PLANS_PAGE_TITLE,
} from '@/utilities/planShopCopy'

import { PlansExplorer } from './PlansExplorer'
import { PlansHero } from './PlansHero'

/** The listing reads the query string on every request (spec 0004, AC-1), so it is never static. */
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

/** The plans page's own questions (design.md §6.17), escaped like the home page's. */
const structuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: PLANS_FAQ.map((item) => ({
      '@type': 'Question',
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
      name: item.question,
    })),
  },
]

type SearchParams = Record<string, string | string[] | undefined>

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const payload = await getPayload({ config: configPromise })

  const plans = await payload.find({
    collection: 'plans',
    depth: 1,
    limit: 100,
    overrideAccess: false,
    sort: 'sortOrder',
  })

  const query = parsePlanQuery(await searchParams)

  return (
    <main>
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
        type="application/ld+json"
      />

      <PlansHero />
      <PlansExplorer plans={plans.docs} query={query} />
      <Faq heading={PLANS_FAQ_HEADING} items={PLANS_FAQ} />
    </main>
  )
}
