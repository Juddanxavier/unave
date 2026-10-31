import { ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'

import configPromise from '@payload-config'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { Cta } from '@/components/Cta'
import { cn } from '@/utilities/ui'
import { getSignedInCustomer } from '@/utilities/customerSessionServer'
import { formatPlanDate } from '@/utilities/planDates'
import {
  BILLING_PERIOD_LABELS,
  DISPLAY_STATE_LABELS,
  deriveDisplayState,
  formatPlanPrice,
  offersCancel,
} from '@/utilities/planDisplay'
import { planTitleOf } from '@/utilities/planSubscription'

import { PlanStatusBadge } from './StatusBadge'
import { CancelCustomerPlan } from './CancelCustomerPlan'
import { ProfileForm } from './ProfileForm'
import {
  ACCOUNT_ACTIVE_LABEL,
  ACCOUNT_ADD_PLAN,
  ACCOUNT_DELIVERY_HEADING,
  ACCOUNT_DELIVERY_INTRO,
  ACCOUNT_DETAILS_HEADING,
  ACCOUNT_DETAILS_INTRO,
  ACCOUNT_EMAIL_LABEL,
  ACCOUNT_EMPTY,
  ACCOUNT_EMPTY_ACTION,
  ACCOUNT_END_LABEL,
  ACCOUNT_HELP_CONTACT,
  ACCOUNT_HELP_HEADING,
  ACCOUNT_HELP_INTRO,
  ACCOUNT_HELP_MENU,
  ACCOUNT_HELP_PLANS,
  ACCOUNT_INTRO,
  ACCOUNT_MEMBER_SINCE_LABEL,
  ACCOUNT_NAME_LABEL,
  ACCOUNT_NOT_GIVEN,
  ACCOUNT_NOT_SCHEDULED,
  ACCOUNT_PLANS_HEADING,
  ACCOUNT_PLANS_LABEL,
  ACCOUNT_PRICE_LABEL,
  ACCOUNT_SET_PASSWORD_HINT,
  ACCOUNT_SIGN_IN_GOOGLE,
  ACCOUNT_SIGN_IN_LABEL,
  ACCOUNT_SIGN_IN_PASSWORD,
  ACCOUNT_SIGN_OUT_HINT,
  ACCOUNT_START_LABEL,
  ACCOUNT_SUMMARY_HEADING,
  ACCOUNT_SUMMARY_HINT,
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

/** Only the fields the account page is allowed to show. Nothing private is read. */
const SUBSCRIPTION_SELECT = {
  billingPeriod: true,
  cancelledAt: true,
  endDate: true,
  mealsPerWeek: true,
  plan: true,
  price: true,
  startDate: true,
  status: true,
} as const

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
  { href: '/plans', label: ACCOUNT_HELP_PLANS },
  { href: '/menu', label: ACCOUNT_HELP_MENU },
  { href: '/contact', label: ACCOUNT_HELP_CONTACT },
]

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

  const result = await payload.find({
    collection: 'subscriptions',
    depth: 1,
    limit: 50,
    overrideAccess: true,
    select: SUBSCRIPTION_SELECT,
    sort: '-createdAt',
    where: { customer: { equals: customer.id } },
  })

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

  const now = new Date()
  const email = customer.email
  const memberSince = formatPlanDate(profile?.createdAt) ?? ACCOUNT_NOT_GIVEN
  const canSignInWithPassword = Boolean(profile?.hasPassword)

  /* Counted from the rows already on the page, so the summary never disagrees
     with the list beside it and needs no second query. */
  const activeCount = result.docs.filter(
    (doc) => deriveDisplayState(doc.status, doc.endDate, now) === 'active',
  ).length

  return (
    <div className="container max-w-5xl py-16 sm:py-20">
      <header className="flex flex-col gap-2">
        <h1 className="text-h2">{accountGreeting(customer.name, email)}</h1>
        <p className="text-body text-ink-600">{ACCOUNT_INTRO}</p>
      </header>

      {/* Two columns from `lg`: the plans they came for on the left, the account
          that carries them on the right. On a phone the plans come first. */}
      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-8">
          {result.docs.length === 0 ? (
            <Card className="bg-white">
              <p className="text-body text-ink-600">{ACCOUNT_EMPTY}</p>
              <div className="mt-6">
                <Cta href="/plans">{ACCOUNT_EMPTY_ACTION}</Cta>
              </div>
            </Card>
          ) : (
            <section aria-labelledby="account-plans-heading" className="flex flex-col gap-6">
              <h2 className="text-h3" id="account-plans-heading">
                {ACCOUNT_PLANS_HEADING}
              </h2>

              <ul className="flex flex-col gap-6">
                {result.docs.map((doc) => {
                  const state = deriveDisplayState(doc.status, doc.endDate, now)
                  const period =
                    doc.billingPeriod === 'weekly' || doc.billingPeriod === 'monthly'
                      ? BILLING_PERIOD_LABELS[doc.billingPeriod]
                      : null
                  const price = formatPlanPrice(doc.price)
                  const start = formatPlanDate(doc.startDate) ?? ACCOUNT_NOT_SCHEDULED
                  const end = formatPlanDate(doc.endDate) ?? ACCOUNT_NOT_SCHEDULED
                  const title = planTitleOf(doc.plan)

                  return (
                    <li
                      className="border-line rounded-xl border bg-white p-6 sm:p-8"
                      key={String(doc.id)}
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <PlanStatusBadge state={state} />
                        {period ? <span className="text-ink-600 text-sm">{period}</span> : null}
                      </div>

                      <h3 className="text-h3 mt-4">{title ?? ACCOUNT_TITLE}</h3>

                      <dl className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
                        <Detail label={ACCOUNT_START_LABEL} value={start} />
                        <Detail label={ACCOUNT_END_LABEL} value={end} />
                        <Detail
                          label={ACCOUNT_PRICE_LABEL}
                          value={price ?? ACCOUNT_NOT_SCHEDULED}
                        />
                      </dl>

                      {state !== 'active' ? (
                        <p className="text-ink-600 mt-6 text-sm leading-6">
                          {DISPLAY_STATE_LABELS[state]}
                        </p>
                      ) : null}

                      {offersCancel(state) ? (
                        <div className="mt-6">
                          <CancelCustomerPlan subscriptionId={doc.id} />
                        </div>
                      ) : null}
                    </li>
                  )
                })}
              </ul>

              <div>
                <Cta href="/plans" variant="secondary">
                  {ACCOUNT_ADD_PLAN}
                </Cta>
              </div>
            </section>
          )}
        </div>

        <aside className="flex min-w-0 flex-col gap-8" aria-label="Account">
          {result.docs.length > 0 ? (
            <Card className="bg-green-50">
              <h2 className="text-h3" id="account-summary-heading">
                {ACCOUNT_SUMMARY_HEADING}
              </h2>

              <dl className="mt-6 grid grid-cols-2 gap-6">
                <Detail label={ACCOUNT_PLANS_LABEL} value={result.docs.length} />
                <Detail label={ACCOUNT_ACTIVE_LABEL} value={activeCount} />
              </dl>

              <p className="text-ink-600 mt-6 text-sm leading-6">{ACCOUNT_SUMMARY_HINT}</p>
            </Card>
          ) : null}

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

      {/* Full width, because a delivery address wants the room the 20rem sidebar
          does not have. Saving here also feeds guest checkout later, which
          prefills from the profile rather than asking again. */}
      <section aria-labelledby="account-delivery-heading" className="mt-8">
        <Card aria-labelledby="account-delivery-heading" className="bg-white">
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
  )
}
