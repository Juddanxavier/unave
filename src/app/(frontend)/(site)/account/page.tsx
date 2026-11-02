import { ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'

import configPromise from '@payload-config'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { cn } from '@/utilities/ui'
import { formatPaise } from '@/utilities/money'
import { getSignedInCustomer } from '@/utilities/customerSessionServer'
import type { Order } from '@/payload-types'

import { ProfileForm } from './ProfileForm'
import {
  ACCOUNT_DELIVERY_HEADING,
  ACCOUNT_DELIVERY_INTRO,
  ACCOUNT_DETAILS_HEADING,
  ACCOUNT_DETAILS_INTRO,
  ACCOUNT_EMAIL_LABEL,
  ACCOUNT_HELP_ABOUT,
  ACCOUNT_HELP_CONTACT,
  ACCOUNT_HELP_HEADING,
  ACCOUNT_HELP_INTRO,
  ACCOUNT_INTRO,
  ACCOUNT_MEMBER_SINCE_LABEL,
  ACCOUNT_NAME_LABEL,
  ACCOUNT_NOT_GIVEN,
  ACCOUNT_SET_PASSWORD_HINT,
  ACCOUNT_SIGN_IN_GOOGLE,
  ACCOUNT_SIGN_IN_LABEL,
  ACCOUNT_SIGN_IN_PASSWORD,
  ACCOUNT_SIGN_OUT_HINT,
  ACCOUNT_TITLE,
  accountGreeting,
} from './copy'
import {
  ACCOUNT_ORDERS_EMPTY,
  ACCOUNT_ORDERS_HEADING,
  ACCOUNT_ORDERS_INTRO,
  ACCOUNT_ORDER_STATUS_PAID,
  ORDER_PAYMENT_ID_LABEL,
} from '../order-placed/copy'

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

/** A plain date, in the same shape the rest of the site uses. */
const formatDate = (value: string | null | undefined): string | null => {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

const Detail: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex flex-col gap-1">
    <dt className="text-ink-600 text-xs font-medium tracking-wide uppercase">{label}</dt>
    <dd className="text-sm font-medium break-words">{value}</dd>
  </div>
)

const Card: React.FC<React.ComponentPropsWithoutRef<'section'>> = ({
  children,
  className,
  ...rest
}) => (
  <section className={cn('border-line rounded-xl border p-6 sm:p-8', className)} {...rest}>
    {children}
  </section>
)

export default async function AccountPage() {
  const customer = await getSignedInCustomer()

  if (!customer) redirect('/sign-in')

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

  // The customer's own orders, newest first (spec 0007, AC-8). Read with the
  // session's id, never a client supplied one.
  const orders = await payload.find({
    collection: 'orders',
    depth: 0,
    limit: 20,
    overrideAccess: true,
    sort: '-createdAt',
    where: { customer: { equals: customer.id } },
  })

  return (
    <div className="container max-w-5xl py-16 sm:py-20">
      <header className="flex flex-col gap-2">
        <h1 className="text-h2">{accountGreeting(customer.name, email)}</h1>
        <p className="text-body text-ink-600">{ACCOUNT_INTRO}</p>
      </header>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-8">
          <Card aria-labelledby="account-details-heading" className="bg-white">
            <h2 className="text-h3" id="account-details-heading">
              {ACCOUNT_DETAILS_HEADING}
            </h2>
            <p className="text-ink-600 mt-2 text-sm leading-6">{ACCOUNT_DETAILS_INTRO}</p>

            <dl className="mt-6 flex flex-col gap-6">
              <Detail
                label={ACCOUNT_NAME_LABEL}
                value={customer.name?.trim() || ACCOUNT_NOT_GIVEN}
              />
              <Detail label={ACCOUNT_EMAIL_LABEL} value={email} />
              <Detail
                label={ACCOUNT_SIGN_IN_LABEL}
                value={canSignInWithPassword ? ACCOUNT_SIGN_IN_PASSWORD : ACCOUNT_SIGN_IN_GOOGLE}
              />
              <Detail label={ACCOUNT_MEMBER_SINCE_LABEL} value={memberSince} />
            </dl>

            {!canSignInWithPassword ? (
              <p className="text-ink-600 mt-6 text-sm leading-6">{ACCOUNT_SET_PASSWORD_HINT}</p>
            ) : null}
          </Card>

          <section aria-labelledby="account-orders-heading">
            <Card className="bg-white">
              <h2 className="text-h3" id="account-orders-heading">
                {ACCOUNT_ORDERS_HEADING}
              </h2>
              <p className="text-ink-600 mt-2 text-sm leading-6">{ACCOUNT_ORDERS_INTRO}</p>

              {orders.docs.length === 0 ? (
                <p className="text-ink-600 mt-6 text-sm leading-6">{ACCOUNT_ORDERS_EMPTY}</p>
              ) : (
                <ul className="border-line mt-6 divide-y divide-line border-t">
                  {orders.docs.map((order: Order) => {
                    const startsOn = formatDate(
                      typeof order.startsOn === 'string' ? order.startsOn : null,
                    )

                    return (
                      <li className="py-5 first:pt-5" key={String(order.id)}>
                        <div className="flex flex-wrap items-baseline justify-between gap-3">
                          <Link
                            className="hover:opacity-75 font-bold transition-opacity focus-visible:ring-[3px] focus-visible:ring-current focus-visible:outline-none motion-reduce:transition-none"
                            href={`/order-placed/${order.id}`}
                          >
                            {formatPaise(Number(order.total))}
                          </Link>

                          <span
                            className={cn(
                              'rounded-pill px-3 py-1 text-xs font-bold tracking-wide uppercase',
                              'bg-green-100 text-green-700',
                            )}
                          >
                            {ACCOUNT_ORDER_STATUS_PAID}
                          </span>
                        </div>

                        <p className="text-ink-600 mt-1 text-sm">
                          {(order.items ?? [])
                            .map(
                              (item) =>
                                `${item.planTitle}, ${item.durationLabel} (${Number(item.days)} days)`,
                            )
                            .join(' + ')}
                        </p>

                        <p className="text-ink-600 mt-1 text-sm">
                          {ORDER_PAYMENT_ID_LABEL}: {order.gatewayPaymentId ?? ACCOUNT_NOT_GIVEN}
                          {startsOn ? ` · Deliveries begin ${startsOn}` : ''}
                        </p>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Card>
          </section>

          <section aria-labelledby="account-delivery-heading">
            <Card className="bg-white">
              <h2 className="text-h3" id="account-delivery-heading">
                {ACCOUNT_DELIVERY_HEADING}
              </h2>
              <p className="text-ink-600 mt-2 text-sm leading-6">{ACCOUNT_DELIVERY_INTRO}</p>

              <div className="mt-6">
                <ProfileForm
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
              </div>
            </Card>
          </section>
        </div>

        <aside className="flex min-w-0 flex-col gap-8" aria-label="Account">
          <Card aria-labelledby="account-help-heading" className="bg-white">
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
