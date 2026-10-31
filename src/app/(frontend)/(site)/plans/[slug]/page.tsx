import type { Metadata } from 'next'

import configPromise from '@payload-config'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import React, { cache } from 'react'

import { Media } from '@/components/Media'
import RichText from '@/components/RichText'
import { formatPlanPrice, planPeriodWord } from '@/utilities/planDisplay'
import { getServerSideURL } from '@/utilities/getURL'
import {
  mealsLine,
  PLAN_BACK,
  PLAN_DETAIL_FALLBACK_DESCRIPTION,
  PLAN_HIGHLIGHTS,
  priceLine,
} from '@/utilities/planShopCopy'

import { AddToCart } from './AddToCart'
import { PlanImagePlaceholder } from '../PlanImagePlaceholder'

type Args = {
  params: Promise<{
    slug?: string
  }>
}

export const dynamic = 'force-static'
export const revalidate = 600

const decodeSlug = (slug: string): string => {
  try {
    return decodeURIComponent(slug)
  } catch {
    return slug
  }
}

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })

  const plans = await payload.find({
    collection: 'plans',
    limit: 100,
    overrideAccess: false,
    pagination: false,
    select: {
      slug: true,
    },
  })

  return plans.docs
    .map((plan) => plan.slug)
    .filter((slug): slug is string => typeof slug === 'string' && slug.length > 0)
    .map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug = '' } = await params
  const plan = await queryPlanBySlug({ slug: decodeSlug(slug) })

  if (!plan) {
    return { title: PLAN_DETAIL_FALLBACK_DESCRIPTION }
  }

  const image = plan.image && typeof plan.image === 'object' ? plan.image : null
  const ogPath = image?.sizes?.og?.url ?? image?.url ?? null
  const description = plan.summary || PLAN_DETAIL_FALLBACK_DESCRIPTION

  return {
    alternates: { canonical: `/plans/${plan.slug}` },
    description,
    openGraph: {
      description,
      images: ogPath ? [{ url: `${getServerSideURL()}${ogPath}` }] : undefined,
      title: plan.title,
      type: 'website',
      url: `/plans/${plan.slug}`,
    },
    title: plan.title,
  }
}

export default async function PlanDetailPage({ params }: Args) {
  const { slug = '' } = await params
  const plan = await queryPlanBySlug({ slug: decodeSlug(slug) })

  if (!plan) notFound()

  const image = plan.image && typeof plan.image === 'object' ? plan.image : null
  const line = priceLine(formatPlanPrice(plan.price), planPeriodWord(plan.billingPeriod))
  const meals = mealsLine(plan.mealsPerWeek)
  const highlights = plan.highlights ?? []
  const description = plan.description ?? null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    description: plan.summary || PLAN_DETAIL_FALLBACK_DESCRIPTION,
    name: plan.title,
    offers: {
      '@type': 'Offer',
      availability: 'https://schema.org/InStock',
      price: String(plan.price),
      priceCurrency: 'INR',
      url: `${getServerSideURL()}/plans/${plan.slug}`,
    },
  }

  return (
    <main className="container max-w-4xl py-16 sm:py-20">
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd)
            .replace(/</g, '\\u003c')
            .replace(/>/g, '\\u003e')
            .replace(/&/g, '\\u0026'),
        }}
        type="application/ld+json"
      />

      <Link className="text-muted-foreground text-sm underline underline-offset-4" href="/plans">
        {PLAN_BACK}
      </Link>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div className="bg-muted relative aspect-[4/3] w-full overflow-hidden rounded-lg">
          {image ? (
            <Media
              fill
              imgClassName="object-cover"
              priority
              resource={image}
              size="(max-width: 1024px) 100vw, 50vw"
            />
          ) : (
            <PlanImagePlaceholder />
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{plan.title}</h1>
            {plan.summary ? <p className="text-muted-foreground text-base">{plan.summary}</p> : null}
          </div>

          <div className="flex flex-col gap-1">
            {line ? <p className="text-xl font-semibold">{line}</p> : null}
            {meals ? <p className="text-muted-foreground text-sm">{meals}</p> : null}
          </div>

          <AddToCart planId={plan.id} slug={plan.slug} />

          {highlights.length > 0 ? (
            <div className="flex flex-col gap-3 border-t pt-6">
              <h2 className="text-lg font-semibold">{PLAN_HIGHLIGHTS}</h2>
              <ul className="flex flex-col gap-2">
                {highlights.map((item, index) => (
                  <li className="text-sm leading-6" key={item.id ?? index}>
                    {item.text}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      {description ? (
        <div className="mt-12 border-t pt-10">
          <RichText data={description} enableGutter={false} />
        </div>
      ) : null}
    </main>
  )
}

const queryPlanBySlug = cache(async ({ slug }: { slug: string }) => {
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'plans',
    depth: 1,
    limit: 1,
    overrideAccess: false,
    pagination: false,
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  return result.docs[0] ?? null
})