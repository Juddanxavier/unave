import { User } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

import { cn } from '@/utilities/ui'
import { UserMenu } from './UserMenu'

const BAR_LINK =
  'text-primary rounded-sm text-sm font-semibold hover:opacity-75 inline-flex min-h-11 items-center gap-2 px-3 transition-opacity focus-visible:ring-[3px] focus-visible:ring-current focus-visible:outline-none motion-reduce:transition-none'

const DRAWER_LINK =
  'text-gold-400 hover:text-cream focus-visible:ring-gold-400 rounded-sm flex min-h-14 items-center px-1 font-semibold transition-colors focus-visible:ring-[3px] focus-visible:outline-none motion-reduce:transition-none'

interface Props {
  /** The signed in customer's name, for the bar's account menu. */
  name?: string | null
  /** `null` while the session check is still in flight. */
  signedIn: boolean | null
  /** Closes the mobile drawer when a link is followed. */
  onNavigate?: () => void
  variant?: 'bar' | 'drawer'
}

/**
 * design.md §6.2 and §6.16. The account links are code, not CMS copy: they reflect
 * session state, so an editor must not be able to point them somewhere else.
 *
 * Signed out, the bar carries a quiet `Sign in` (icon only on the narrowest
 * screens, so it fits beside the search control) and a `Sign up` beside it from
 * the `sm` breakpoint up. Two links would crowd the smallest bar, so both live in
 * the drawer as well, where they get a full 56px row each.
 *
 * Signed in, the bar swaps the plain `Your account` link for the account menu, and
 * the drawer lists `Your account` and `Sign out` as two 56px rows.
 *
 * `null` — the check is still in flight — renders the signed out state rather
 * than nothing. Nearly every visitor is signed out, so the server HTML is already
 * right for them, the links are in it, and the bar never shifts. A signed in
 * customer sees the label swap once, after hydration. The root layout still reads
 * no cookie, which is what keeps the marketing pages statically rendered.
 */
export const AccountLinks: React.FC<Props> = ({
  name,
  onNavigate,
  signedIn,
  variant = 'bar',
}) => {
  const showAccount = signedIn === true

  if (variant === 'drawer') {
    if (showAccount) {
      return (
        <ul className="flex flex-col gap-1">
          <li className="text-h3" onClick={onNavigate}>
            <Link className={DRAWER_LINK} href="/account">
              Your account
            </Link>
          </li>
          <li className="text-h3">
            <form action="/api/customers/logout" method="post">
              <button className={cn(DRAWER_LINK, 'w-full text-left')} type="submit">
                Sign out
              </button>
            </form>
          </li>
        </ul>
      )
    }

    const links = [
      { href: '/sign-in', label: 'Sign in' },
      { href: '/sign-up', label: 'Sign up' },
    ]

    return (
      <ul className="flex flex-col gap-1">
        {links.map(({ href, label }) => (
          <li className="text-h3" key={href} onClick={onNavigate}>
            <Link className={DRAWER_LINK} href={href}>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    )
  }

  if (showAccount) return <UserMenu name={name} />

  return (
    <>
      <Link className={BAR_LINK} href="/sign-in" onClick={onNavigate}>
        <User aria-hidden="true" className="size-5" strokeWidth={2} />
        <span className="sr-only sm:not-sr-only">Sign in</span>
      </Link>

      <Link className={cn(BAR_LINK, 'hidden sm:inline-flex')} href="/sign-up" onClick={onNavigate}>
        Sign up
      </Link>
    </>
  )
}
