import { ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'

import configPromise from '@payload-config'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { getSignedInCustomer } from '@/utilities/customerSessionServer'
import type { OrderRequestType } from '@/utilities/orderRequest'
import type { Order } from '@/payload-types'

import { AccountTabs, readAccountTab } from './AccountTabs'
import { Card, DeliveryPanel, DetailsPanel, OrdersPanel, formatDate } from './AccountPanels'
import {
  ACCOUNT_HELP_ABOUT,
  ACCOUNT_HELP_CONTACT,
  ACCOUNT_HELP_HEADING,
  ACCOUNT_HELP_INTRO,
  ACCOUNT_INTRO,
  ACCOUNT_NOT_GIVEN,
  ACCOUNT_SIGN_OUT_HINT,
  ACCOUNT_TITLE,
  accountGreeting,
} from './copy'

export const metadata: Metadata = {
  description: ACCOUNT_INTRO,
  robots: { follow: false, index: false, nocache: true },
  title: ACCOUNT_TITLE,
}

// Reads the session cookie and the database, so it is never cached.
export const dynamic = 'force-dynamic'

/** The profile fields the account page needs. All of them are on the customer row. */
type AccountProfile = {
  address?: {
    city?: string | null
    line1?: string | null
    line2?: string | null
    pincode?: string | null
    state?: string | null
  } | null
  createdAt?: string | null
  foodPreference?: string | null
  hasPassword?: boolean | null
  phone?: string | null
}

const HELP_LINKS = [
  { href: '/about', label: ACCOUNT_HELP_ABOUT },
  { href: '/contact', label: ACCOUNT_HELP_CONTACT },
]

type Args = {
  searchParams: Promise<{ tab?: string | string[] }>
}

/**
 * The account page: three views behind one tab row (design.md §6.13).
 *
 * The tabs are links carrying `?tab=` rather than local state, so a view can be
 * shared, it stays put when the delivery form saves, and the page keeps working
 * without JavaScript. Only the chosen panel is rendered, so the customer sees one
 * piece of work at a time instead of three stacked cards.
 *
 * The orders are read only when that view is open, and always for the customer the
 * session names, never an id from the browser.
 */
export default async function AccountPage({ searchParams }: Args) {
  const customer = await getSignedInCustomer()

  if (!customer) redirect('/sign-in')

  const { tab: tabParam } = await searchParams
  const tab = readAccountTab(tabParam)

  const payload = await getPayload({ config: configPromise })

  /* The session helper carries only name, email and id. Member since and the
     sign-in method live on the row, and `hasPassword` is a hidden field, so it is
     read with `showHiddenFields` rather than by widening the shared helper. */
  const profile = (await payload.findByID({
    collection: 'customers',
    depth: 0,
    id: customer.id,
    overrideAccess: true,
    select: {
      address: { city: true, line1: true, line2: true, pincode: true, state: true },
      createdAt: true,
      foodPreference: true,
      hasPassword: true,
      phone: true,
    },
    showHiddenFields: true,
  })) as AccountProfile | null

  const email = customer.email
  const memberSince = formatDate(profile?.createdAt) ?? ACCOUNT_NOT_GIVEN
  const canSignInWithPassword = Boolean(profile?.hasPassword)

  // The customer's own orders, newest first (spec 0007, AC-8), fetched only when
  // that view is open.
  const orders: Order[] =
    tab === 'orders'
      ? (
          await payload.find({
            collection: 'orders',
            depth: 0,
            limit: 20,
            overrideAccess: true,
            sort: '-createdAt',
            where: { customer: { equals: customer.id } },
          })
        ).docs
      : []

  // Which asks are still waiting on the kitchen, so the row can say so instead of
  // offering the same request twice (design.md §6.15).
  const openRequests: Record<string, OrderRequestType[]> = {}

  if (tab === 'orders') {
    const requests = await payload.find({
      collection: 'order-requests',
      depth: 0,
      limit: 100,
      overrideAccess: true,
      select: { order: true, type: true },
      where: {
        and: [{ customer: { equals: customer.id } }, { status: { equals: 'new' } }],
      },
    })

    for (const request of requests.docs) {
      const related = request.order
      const orderId = typeof related === 'object' && related !== null ? related.id : related

      if (orderId === undefined || orderId === null) continue

      const key = String(orderId)
      openRequests[key] = [...(openRequests[key] ?? []), request.type]
    }
  }

  return (
    <div className="container max-w-5xl py-16 sm:py-20">
      <header className="flex flex-col gap-2">
        <h1 className="text-h2">{accountGreeting(customer.name, email)}</h1>
        <p className="text-body text-ink-600">{ACCOUNT_INTRO}</p>
      </header>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <AccountTabs value={tab} />

          {tab === 'details' ? (
            <DetailsPanel
              canSignInWithPassword={canSignInWithPassword}
              email={email}
              memberSince={memberSince}
              name={customer.name}
            />
          ) : null}

          {tab === 'delivery' ? (
            <DeliveryPanel
              defaults={{
                city: profile?.address?.city ?? '',
                foodPreference: profile?.foodPreference ?? 'none',
                line1: profile?.address?.line1 ?? '',
                line2: profile?.address?.line2 ?? '',
                phone: profile?.phone ?? '',
                pincode: profile?.address?.pincode ?? '',
                state: profile?.address?.state ?? '',
              }}
            />
          ) : null}

          {tab === 'orders' ? (
            <OrdersPanel openRequests={openRequests} orders={orders} />
          ) : null}
        </div>

        <aside className="flex min-w-0 flex-col gap-8" aria-label="Account">
          <Card aria-labelledby="account-help-heading">
            <h2 className="text-h3" id="account-help-heading">
              {ACCOUNT_HELP_HEADING}
            </h2>
            <p className="text-ink-600 mt-2 text-sm leading-6">{ACCOUNT_HELP_INTRO}</p>

            <ul className="mt-6 flex flex-col gap-2">
              {HELP_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    className="text-primary hover:opacity-75 inline-flex min-h-11 items-center gap-2 rounded-sm text-sm font-semibold transition-opacity focus-visible:ring-[3px] focus-visible:ring-current focus-visible:outline-none motion-reduce:transition-none"
                    href={href}
                  >
                    {label}
                    <ArrowRight aria-hidden="true" className="size-4" strokeWidth={2} />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          <p className="text-ink-600 text-sm leading-6">{ACCOUNT_SIGN_OUT_HINT}</p>
        </aside>
      </div>
    </div>
  )
}
