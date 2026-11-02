import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'

import { Cta } from '@/components/Cta'
import type { Order } from '@/payload-types'
import { formatPaise } from '@/utilities/money'
import { getSignedInCustomer } from '@/utilities/customerSessionServer'

import {
  ACCOUNT_ORDER_STATUS_PAID,
  ORDER_AMOUNT_LABEL,
  ORDER_BACK_TO_ACCOUNT,
  ORDER_BROWSE_CTA,
  ORDER_LINES_HEADING,
  ORDER_NOT_GIVEN,
  ORDER_PAID_BODY,
  ORDER_PAID_HEADING,
  ORDER_PAYMENT_ID_LABEL,
  ORDER_PLACED_TITLE,
  ORDER_STARTS_ON_LABEL,
  ORDER_STATUS_LABEL,
} from '../copy'

/**
 * The order page a customer lands on after paying (spec 0007, AC-5 and AC-7).
 *
 * Only the owner may read it: the row is fetched and then compared against the
 * session, and anything else is a plain not found, so the page never confirms
 * that somebody else's order exists. The page shows the snapshot the order
 * stores, never the live plan, because a past order must not follow later
 * price edits.
 *
 * Every row here is a completed payment. There is no pending state to show,
 * because an unpaid checkout never writes a row in the first place.
 */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  robots: { follow: false, index: false, nocache: true },
  title: ORDER_PLACED_TITLE,
}

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

export default async function OrderPlacedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const customer = await getSignedInCustomer()

  if (!customer) notFound()

  const payload = await getPayload({ config: configPromise })

  let order: Order | null = null

  try {
    order = (await payload.findByID({
      collection: 'orders',
      depth: 0,
      id,
      overrideAccess: true,
    })) as Order | null
  } catch {
    order = null
  }

  // Not found, or not yours: the same answer either way.
  if (!order || String(order.customer) !== String(customer.id)) notFound()

  const startsOn = formatDate(
    typeof order.startsOn === 'string' ? order.startsOn : null,
  )

  return (
    <div className="container max-w-3xl py-16 sm:py-20">
      <header className="flex items-start gap-4">
        <CheckCircle2
          aria-hidden="true"
          className="mt-1 size-10 shrink-0 text-green-700"
          strokeWidth={2}
        />

        <div>
          <h1 className="text-h2">{ORDER_PAID_HEADING}</h1>
          <p className="text-body text-ink-600 mt-2 max-w-[60ch]">{ORDER_PAID_BODY}</p>
        </div>
      </header>

      <section aria-labelledby="order-lines-heading" className="border-line mt-10 rounded-2xl border bg-white p-6 sm:p-8">
        <h2 className="text-h3" id="order-lines-heading">
          {ORDER_LINES_HEADING}
        </h2>

        <ul className="border-line mt-4 divide-y divide-line border-t">
          {(order.items ?? []).map((item, index) => (
            <li className="flex items-start justify-between gap-4 py-4" key={index}>
              <div className="min-w-0">
                <p className="text-sm font-bold">{item.planTitle}</p>
                <p className="text-ink-600 mt-0.5 text-sm">
                  {item.durationLabel}, {Number(item.days)}{' '}
                  {Number(item.days) === 1 ? 'day' : 'days'} of meals
                </p>
              </div>

              <p className="shrink-0 text-sm font-bold">{formatPaise(Number(item.unitPrice))}</p>
            </li>
          ))}
        </ul>

        <dl className="border-line mt-2 grid gap-6 border-t pt-6 sm:grid-cols-2">
          <Detail label={ORDER_AMOUNT_LABEL} value={formatPaise(Number(order.total))} />
          <Detail
            label={ORDER_STATUS_LABEL}
            value={<span className="text-green-700">{ACCOUNT_ORDER_STATUS_PAID}</span>}
          />
          <Detail label={ORDER_PAYMENT_ID_LABEL} value={order.gatewayPaymentId ?? ORDER_NOT_GIVEN} />
          <Detail
            label={ORDER_STARTS_ON_LABEL}
            value={startsOn ?? ORDER_NOT_GIVEN}
          />
        </dl>
      </section>

      <div className="mt-10 flex flex-wrap items-center gap-6">
        <Link
          className="text-green-700 hover:opacity-75 inline-flex min-h-11 items-center gap-2 rounded-sm text-sm font-semibold transition-opacity focus-visible:ring-[3px] focus-visible:ring-current focus-visible:outline-none motion-reduce:transition-none"
          href="/account"
        >
          <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={2} />
          {ORDER_BACK_TO_ACCOUNT}
        </Link>

        <Cta href="/plans" variant="primary">
          {ORDER_BROWSE_CTA}
        </Cta>
      </div>
    </div>
  )
}