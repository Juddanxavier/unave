import Link from 'next/link'
import React from 'react'

import type { Order } from '@/payload-types'
import { formatPaise } from '@/utilities/money'
import { ORDER_REQUEST_TYPES, type OrderRequestType } from '@/utilities/orderRequest'
import { cn } from '@/utilities/ui'

import { OrderRequestDialog } from './OrderRequestDialog'
import { ProfileForm, type ProfileDefaults } from './ProfileForm'
import {
  ACCOUNT_DELIVERY_HEADING,
  ACCOUNT_DELIVERY_INTRO,
  ACCOUNT_DETAILS_HEADING,
  ACCOUNT_DETAILS_INTRO,
  ACCOUNT_EMAIL_LABEL,
  ACCOUNT_MEMBER_SINCE_LABEL,
  ACCOUNT_NAME_LABEL,
  ACCOUNT_NOT_GIVEN,
  ACCOUNT_SET_PASSWORD_HINT,
  ACCOUNT_SIGN_IN_GOOGLE,
  ACCOUNT_SIGN_IN_LABEL,
  ACCOUNT_SIGN_IN_PASSWORD,
} from './copy'
import {
  ACCOUNT_ORDERS_EMPTY,
  ACCOUNT_ORDERS_HEADING,
  ACCOUNT_ORDERS_INTRO,
  ACCOUNT_ORDER_STATUS_PAID,
  ORDER_PAYMENT_ID_LABEL,
} from '../order-placed/copy'

/**
 * The three views of the account page (design.md §6.13).
 *
 * Each one is a card with its own heading, and only the chosen one is on the page,
 * so the account never reads as a stack of unrelated boxes. They share the card
 * shell and the read-only detail rows, which is why they live together.
 */

/** A plain date, in the same shape the rest of the site uses. */
export const formatDate = (value: string | null | undefined): string | null => {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export const Card: React.FC<React.ComponentPropsWithoutRef<'section'>> = ({
  children,
  className,
  ...rest
}) => (
  <section className={cn('border-line rounded-xl border bg-white p-6 sm:p-8', className)} {...rest}>
    {children}
  </section>
)

const Detail: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex flex-col gap-1">
    <dt className="text-ink-600 text-xs font-medium tracking-wide uppercase">{label}</dt>
    <dd className="text-sm font-medium break-words">{value}</dd>
  </div>
)

/** What the account holds, and how the customer signs in. Read only by design. */
export const DetailsPanel: React.FC<{
  canSignInWithPassword: boolean
  email: string
  memberSince: string
  name?: null | string
}> = ({ canSignInWithPassword, email, memberSince, name }) => (
  <Card aria-labelledby="account-details-heading">
    <h2 className="text-h3" id="account-details-heading">
      {ACCOUNT_DETAILS_HEADING}
    </h2>
    <p className="text-ink-600 mt-2 text-sm leading-6">{ACCOUNT_DETAILS_INTRO}</p>

    <dl className="mt-6 flex flex-col gap-6">
      <Detail label={ACCOUNT_NAME_LABEL} value={name?.trim() || ACCOUNT_NOT_GIVEN} />
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
)

/** Every paid order, newest first, each one linking to its own receipt. */
export const OrdersPanel: React.FC<{
  /** The asks waiting on the kitchen, keyed by order id. */
  openRequests: Record<string, OrderRequestType[]>
  orders: Order[]
}> = ({ openRequests, orders }) => (
  <Card aria-labelledby="account-orders-heading">
    <h2 className="text-h3" id="account-orders-heading">
      {ACCOUNT_ORDERS_HEADING}
    </h2>
    <p className="text-ink-600 mt-2 text-sm leading-6">{ACCOUNT_ORDERS_INTRO}</p>

    {orders.length === 0 ? (
      <p className="text-ink-600 mt-6 text-sm leading-6">{ACCOUNT_ORDERS_EMPTY}</p>
    ) : (
      <ul className="border-line divide-line mt-6 divide-y border-t">
        {orders.map((order) => {
          const open = openRequests[String(order.id)] ?? []

          return (
            <li className="py-5 first:pt-5" key={String(order.id)}>
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <Link
                  className="hover:opacity-75 font-bold transition-opacity focus-visible:ring-[3px] focus-visible:ring-current focus-visible:outline-none motion-reduce:transition-none"
                  href={`/order-placed/${order.id}`}
                >
                  {formatPaise(Number(order.total))}
                </Link>

                <span className="bg-green-100 text-green-700 rounded-pill px-3 py-1 text-xs font-bold tracking-wide uppercase">
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
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                {ORDER_REQUEST_TYPES.map((type) => (
                  <OrderRequestDialog
                    key={type}
                    open={open.includes(type)}
                    orderId={order.id}
                    type={type}
                  />
                ))}
              </div>
            </li>
          )
        })}
      </ul>
    )}
  </Card>
)

/** The one editable view: address, phone and the food preference. */
export const DeliveryPanel: React.FC<{ defaults: ProfileDefaults }> = ({ defaults }) => (
  <Card aria-labelledby="account-delivery-heading">
    <h2 className="text-h3" id="account-delivery-heading">
      {ACCOUNT_DELIVERY_HEADING}
    </h2>
    <p className="text-ink-600 mt-2 text-sm leading-6">{ACCOUNT_DELIVERY_INTRO}</p>

    <div className="mt-6">
      <ProfileForm defaults={defaults} />
    </div>
  </Card>
)
