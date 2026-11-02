import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'

import { Cta } from '@/components/Cta'
import { resolveCheckoutPlan, type CheckoutRefusalReason } from '@/utilities/checkoutPlan'
import { getSignedInCustomer } from '@/utilities/customerSessionServer'
import { formatPaise } from '@/utilities/money'

import { CheckoutForm } from './CheckoutForm'
import {
  CHECKOUT_PAGE_HEADING,
  CHECKOUT_PAGE_INTRO,
  CHECKOUT_PAGE_TITLE,
  CHECKOUT_REFUSED_CTA,
  CHECKOUT_REFUSED_DURATION,
  CHECKOUT_REFUSED_HEADING,
  CHECKOUT_REFUSED_PAUSED,
  CHECKOUT_REFUSED_UNKNOWN,
  CHECKOUT_SUMMARY_HEADING,
  CHECKOUT_SUMMARY_TOTAL,
} from './copy'

/**
 * The checkout page (spec 0007, AC-2 and AC-3). Signed in customers only,
 * reached from one plan card's Buy now control. The link names a plan slug and
 * a duration label; this page resolves both live, so every price shown is the
 * plan record's price, and a paused or missing plan is refused in words rather
 * than shown as an empty form. The sign in guard carries the whole link through.
 */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  robots: { follow: false, index: false, nocache: true },
  title: CHECKOUT_PAGE_TITLE,
}

type CheckoutProfile = {
  address?: {
    city?: string | null
    line1?: string | null
    line2?: string | null
    pincode?: string | null
    state?: string | null
  } | null
  foodPreference?: string | null
  name?: string | null
  phone?: string | null
}

type CheckoutSearchParams = {
  duration?: string | string[]
  plan?: string | string[]
}

const firstValue = (value?: string | string[]): string =>
  Array.isArray(value) ? (value[0] ?? '') : (value ?? '')

const checkoutPath = (planSlug: string, durationLabel: string): string => {
  const params = new URLSearchParams()

  if (planSlug) params.set('plan', planSlug)
  if (durationLabel) params.set('duration', durationLabel)

  const query = params.toString()

  return query ? `/checkout?${query}` : '/checkout'
}

const refusalBody = (reason: CheckoutRefusalReason): string => {
  if (reason === 'paused') return CHECKOUT_REFUSED_PAUSED
  if (reason === 'missing-duration') return CHECKOUT_REFUSED_DURATION

  return CHECKOUT_REFUSED_UNKNOWN
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<CheckoutSearchParams>
}) {
  const params = await searchParams
  const planSlug = firstValue(params.plan).trim()
  const durationLabel = firstValue(params.duration).trim()
  const here = checkoutPath(planSlug, durationLabel)

  const customer = await getSignedInCustomer()

  if (!customer) redirect(`/sign-in?return=${encodeURIComponent(here)}`)

  const payload = await getPayload({ config: configPromise })
  const selection = await resolveCheckoutPlan({ durationLabel, payload, planSlug })

  if (!selection.ok) {
    return (
      <div className="container max-w-3xl py-16 sm:py-20">
        <h1 className="text-h2">{CHECKOUT_REFUSED_HEADING}</h1>
        <p className="text-body text-ink-600 mt-3">{refusalBody(selection.reason)}</p>

        <div className="mt-6">
          <Cta href="/plans" variant="primary">
            {CHECKOUT_REFUSED_CTA}
          </Cta>
        </div>
      </div>
    )
  }

  const profile = (await payload.findByID({
    collection: 'customers',
    depth: 0,
    id: customer.id,
    overrideAccess: true,
    select: {
      address: { city: true, line1: true, line2: true, pincode: true, state: true },
      foodPreference: true,
      name: true,
      phone: true,
    },
  })) as CheckoutProfile | null

  return (
    <div className="container max-w-5xl py-16 sm:py-20">
      <header className="flex flex-col gap-2">
        <h1 className="text-h2">{CHECKOUT_PAGE_HEADING}</h1>
        <p className="text-body text-ink-600">{CHECKOUT_PAGE_INTRO}</p>
      </header>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <CheckoutForm
          defaults={{
            city: profile?.address?.city ?? '',
            foodPreference: profile?.foodPreference ?? 'none',
            line1: profile?.address?.line1 ?? '',
            line2: profile?.address?.line2 ?? '',
            name: profile?.name?.trim() || customer.name || '',
            phone: profile?.phone ?? '',
            pincode: profile?.address?.pincode ?? '',
            state: profile?.address?.state ?? '',
          }}
          email={customer.email}
          selection={{
            durationLabel: selection.duration.label,
            planSlug: selection.plan.slug,
          }}
        />

        <aside aria-label={CHECKOUT_SUMMARY_HEADING} className="flex min-w-0 flex-col gap-6">
          <section className="border-line rounded-2xl border bg-white p-6 sm:p-8">
            <h2 className="text-h3">{CHECKOUT_SUMMARY_HEADING}</h2>

            <ul className="border-line mt-4 divide-y divide-line border-t">
              <li className="flex items-start justify-between gap-4 py-4">
                <div className="min-w-0">
                  <p className="text-sm font-bold">{selection.plan.title}</p>
                  <p className="text-ink-600 mt-0.5 text-sm">
                    {selection.duration.label}, {selection.duration.days}{' '}
                    {selection.duration.days === 1 ? 'day' : 'days'}
                  </p>
                </div>

                <p className="shrink-0 text-sm font-bold">
                  {formatPaise(selection.duration.price)}
                </p>
              </li>
            </ul>

            <div className="border-line mt-2 flex items-center justify-between border-t pt-4">
              <p className="font-bold">{CHECKOUT_SUMMARY_TOTAL}</p>
              <p className="text-green-700 text-lg font-bold">{formatPaise(selection.total)}</p>
            </div>

            <p className="text-ink-600 mt-4 text-sm leading-6">
              One payment for the plan. Paid orders show on your{' '}
              <Link
                className="text-green-700 hover:opacity-75 font-semibold transition-opacity focus-visible:ring-[3px] focus-visible:ring-current focus-visible:outline-none motion-reduce:transition-none"
                href="/account"
              >
                account page
              </Link>
              .
            </p>
          </section>
        </aside>
      </div>
    </div>
  )
}
