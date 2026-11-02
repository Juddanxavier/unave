import type { Metadata } from 'next'
import React from 'react'

import { Benefits } from '@/components/home/Benefits'
import { Categories } from '@/components/home/Categories'
import { Faq } from '@/components/home/Faq'
import { FinalCta } from '@/components/home/FinalCta'
import { Gallery } from '@/components/home/Gallery'
import { Hero } from '@/components/home/Hero'
import { HowItWorks } from '@/components/home/HowItWorks'
import { Testimonials } from '@/components/home/Testimonials'
import { TrustStrip } from '@/components/home/TrustStrip'
import { Welcome } from '@/components/home/Welcome'
import { FAQ, HOME_DESCRIPTION, HOME_TITLE } from '@/utilities/homeCopy'
import { getCachedGlobal } from '@/utilities/getGlobals'
import { getServerSideURL } from '@/utilities/getURL'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import type { Footer } from '@/payload-types'

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
  },
  description: HOME_DESCRIPTION,
  openGraph: mergeOpenGraph({
    description: HOME_DESCRIPTION,
    title: HOME_TITLE,
    url: '/',
  }),
  title: HOME_TITLE,
}

/** Structured data for the kitchen and the questions on this page (design.md §13). */
const structuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'FoodEstablishment',
    description: HOME_DESCRIPTION,
    name: 'UNAVE',
    servesCuisine: ['Indian', 'Healthy'],
    url: getServerSideURL(),
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((item) => ({
      '@type': 'Question',
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
      name: item.question,
    })),
  },
]

export default async function HomePage() {
  const footer = (await getCachedGlobal('footer', 1)()) as Footer | null
  const whatsapp = footer?.contact?.whatsapp ?? null

  return (
    <main>
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
        type="application/ld+json"
      />

      <Hero whatsapp={whatsapp} />
      <TrustStrip />
      <Welcome />
      <Benefits />
      <Categories />
      <HowItWorks />
      <Gallery />
      <Testimonials />
      <Faq />
      <FinalCta whatsapp={whatsapp} />
    </main>
  )
}
