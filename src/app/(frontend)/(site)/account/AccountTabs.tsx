import { MapPin, ReceiptText, UserRound, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

import { cn } from '@/utilities/ui'

import {
  ACCOUNT_TAB_DELIVERY,
  ACCOUNT_TAB_DETAILS,
  ACCOUNT_TAB_ORDERS,
  ACCOUNT_TABS_LABEL,
} from './copy'

/**
 * The account page's three views (design.md §6.13).
 *
 * They are real links carrying `?tab=`, not a script: the view can be shared, it
 * survives a save without JavaScript, and a customer who lands on a delivery
 * problem keeps the delivery view in the address bar. The default view is the
 * plain `/account`, so the common case keeps a clean URL.
 *
 * A tab is a 44px target and the current one is marked with `aria-current`, the
 * same shape as the blog's grid and list switch.
 */
export type AccountTab = 'delivery' | 'details' | 'orders'

const TAB_ORDER: AccountTab[] = ['details', 'delivery', 'orders']

const TABS: Record<AccountTab, { Icon: LucideIcon; label: string }> = {
  delivery: { Icon: MapPin, label: ACCOUNT_TAB_DELIVERY },
  details: { Icon: UserRound, label: ACCOUNT_TAB_DETAILS },
  orders: { Icon: ReceiptText, label: ACCOUNT_TAB_ORDERS },
}

/** Anything unknown, missing or repeated reads as the first view. */
export const readAccountTab = (value: string | string[] | undefined): AccountTab => {
  const wanted = Array.isArray(value) ? value[0] : value

  return wanted === 'delivery' || wanted === 'orders' ? wanted : 'details'
}

export const accountTabHref = (tab: AccountTab): string =>
  tab === 'details' ? '/account' : `/account?tab=${tab}`

export const AccountTabs: React.FC<{ value: AccountTab }> = ({ value }) => (
  <nav
    aria-label={ACCOUNT_TABS_LABEL}
    className="border-line bg-card inline-flex max-w-full items-center gap-1 self-start overflow-x-auto rounded-pill border p-1"
  >
    {TAB_ORDER.map((tab) => {
      const { Icon, label } = TABS[tab]
      const current = tab === value

      return (
        <Link
          aria-current={current ? 'true' : undefined}
          className={cn(
            'text-caption rounded-pill focus-visible:ring-green-500 inline-flex h-11 items-center gap-2 px-3 font-semibold whitespace-nowrap transition-colors focus-visible:ring-[3px] focus-visible:outline-none sm:px-4 motion-reduce:transition-none',
            current ? 'bg-green-900 text-cream' : 'text-ink-600 hover:bg-green-50',
          )}
          href={accountTabHref(tab)}
          key={tab}
        >
          <Icon aria-hidden="true" className="size-4" />
          {label}
        </Link>
      )
    })}
  </nav>
)
