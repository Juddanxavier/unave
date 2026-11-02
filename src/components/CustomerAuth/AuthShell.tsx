import { Check } from 'lucide-react'
import Image from 'next/image'
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
 * The frame every account screen sits in (design.md §6.13).
 *
 * Two halves meet edge to edge: the kitchen photograph in green on the left, the
 * cream form half on the right, with no card, no page margin and no border, so the
 * seam itself is the only thing dividing them. That is deliberate. A password form
 * is a short piece of work, and a floating card around it on a 1440 screen leaves
 * two thirds of the viewport empty; a full bleed half fills the width with the
 * kitchen instead, and the form sits in a narrow column at its centre where the eye
 * already is.
 *
 * The account screens drop the site header and footer: signing in is a task, and a
 * nav bar full of menu links next to a password field competes with it. What the
 * header did that matters, a way back to the shop, survives as the logo and one
 * quiet link at the top of the form half.
 *
 * The screen is exactly one viewport tall (`h-dvh`) and the page itself never
 * scrolls. The photograph half is desktop only (`lg` and up): on a phone the form
 * needs the whole height, and a panel above it would push the submit button below
 * the fold. The form column still scrolls on its own if a short screen cannot fit
 * every line, and it centres itself only while there is room, so a scroll never
 * hides the top of the heading.
 *
 * The panel's words sit along its bottom edge rather than floating in the middle:
 * the food does the welcoming, and the copy explains what an account holds. The
 * panel headline is a `p`, not a heading: each screen's real `h1` lives in the form
 * half, and putting a heading before it would read out of order.
 */
export const AuthShell: React.FC<Props> = ({ children }) => (
  <div className="bg-cream flex h-dvh flex-col overflow-hidden lg:flex-row">
    <aside className="bg-green-900 text-cream relative isolate hidden overflow-hidden lg:block lg:w-1/2 lg:shrink-0">
      <Image
        alt=""
        className="object-cover object-center"
        fill
        quality={75}
        sizes="50vw"
        src="/images/gallery-3.jpg"
      />
      <div
        aria-hidden="true"
        className="from-green-900 via-green-900/88 to-green-900/55 absolute inset-0 bg-linear-to-t"
      />
      <span
        aria-hidden="true"
        className="swoosh text-gold-400 pointer-events-none absolute -top-24 -right-24 w-80 opacity-[0.12]"
      />

      <div className="absolute inset-0 flex flex-col justify-end p-12 pb-14 short:p-8 short:pb-10">
        <p className="text-eyebrow text-gold-400 uppercase">{AUTH_BRAND.eyebrow}</p>
        <p className="text-h2 text-cream mt-3 max-w-[20ch] text-balance">{AUTH_BRAND.title}</p>
        <p className="text-body text-cream/85 mt-4 max-w-[42ch] short:mt-3">{AUTH_BRAND.intro}</p>

        <ul className="border-cream/15 mt-8 max-w-[34rem] border-y short:mt-6">
          {AUTH_BRAND.points.map((point, index) => (
            <li
              className={cn('flex items-start gap-3 py-3', index > 0 && 'border-cream/15 border-t')}
              key={point}
            >
              <Check aria-hidden="true" className="text-gold-400 mt-0.5 size-5 shrink-0" />
              <span className="text-body text-cream/90">{point}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>

    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-4 px-6 py-5 sm:px-10 lg:px-14 short:py-3">
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

      <div className="flex min-h-0 flex-1 overflow-y-auto px-6 pb-8 sm:px-10 lg:px-14 short:pb-3">
        <div className="m-auto w-full max-w-[26rem]">{children}</div>
      </div>
    </div>
  </div>
)
