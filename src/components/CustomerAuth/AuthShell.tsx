import { Check } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

import { Logo } from '@/components/Logo/Logo'
import { cn } from '@/utilities/ui'

import { AUTH_BRAND } from './copy'
import { AUTH_INLINE_LINK } from './styles'

interface Props {
  children: React.ReactNode
}

/**
 * The frame every account screen sits in (design.md §6.16).
 *
 * The account screens deliberately drop the site header and footer: signing in is a
 * task, and a nav bar full of menu links next to a password field competes with it.
 * What the header did that matters — a way back to the shop — survives as the two
 * controls in the slim bar at the top.
 *
 * The screen is exactly one viewport tall (`h-dvh`) and the page itself never
 * scrolls. That is why the brand half is desktop only: on a phone the form needs the
 * whole height, and a panel above it would push the submit button below the fold.
 * The form column still scrolls on its own if a short screen cannot fit every line,
 * so nothing becomes unreachable.
 *
 * The panel headline is a `p`, not a heading: each screen's real `h1` lives in the
 * form half, and putting a heading before it would read out of order.
 */
export const AuthShell: React.FC<Props> = ({ children }) => (
  <div className="bg-cream flex h-dvh flex-col overflow-hidden">
    <div className="container flex shrink-0 items-center justify-between gap-4 py-4 short:py-3 shorter:py-2">
      <Link
        aria-label="UNAVE home"
        className="text-green-900 focus-visible:ring-green-500 transition-opacity hover:opacity-80 focus-visible:ring-[3px] focus-visible:outline-none motion-reduce:transition-none"
        href="/"
      >
        <Logo />
      </Link>
      <Link className={cn(AUTH_INLINE_LINK, 'text-sm')} href="/">
        {AUTH_BRAND.backLink}
      </Link>
    </div>

    <div className="container flex min-h-0 flex-1 items-stretch pb-6 sm:pb-8 lg:pb-10 short:pb-3 shorter:pb-2">
      <div className="border-line shadow-md mx-auto flex w-full max-w-5xl overflow-hidden rounded-xl border bg-white lg:grid lg:grid-cols-[1.02fr_1fr]">
        <aside className="bg-green-900 text-cream relative isolate hidden flex-col justify-between gap-8 short:gap-6 overflow-hidden p-10 short:p-8 lg:flex lg:p-12">
          <span
            aria-hidden="true"
            className="swoosh text-gold-400 pointer-events-none absolute -right-14 -bottom-24 -z-10 w-72 opacity-[0.14]"
          />

          <div>
            <p className="text-eyebrow text-gold-400 uppercase">{AUTH_BRAND.eyebrow}</p>
            <p className="text-h2 text-cream mt-3">{AUTH_BRAND.title}</p>
            <p className="text-body text-cream/85 mt-4 short:mt-3">{AUTH_BRAND.intro}</p>
          </div>

          <ul className="flex flex-col gap-4 short:gap-3">
            {AUTH_BRAND.points.map((point) => (
              <li className="flex items-start gap-3" key={point}>
                <Check aria-hidden="true" className="text-gold-400 mt-0.5 size-5 shrink-0" />
                <span className="text-body text-cream/90">{point}</span>
              </li>
            ))}
          </ul>
        </aside>

        <div className="flex min-h-0 flex-1 items-center overflow-y-auto p-6 sm:p-8 lg:p-12 short:p-4 short:sm:p-6 short:lg:p-8">
          <div className="mx-auto w-full max-w-[26rem]">{children}</div>
        </div>
      </div>
    </div>
  </div>
)
