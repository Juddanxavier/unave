import type { Metadata, Viewport } from 'next'
import React from 'react'

/**
 * The maintenance screen (design.md §1, §2, §4).
 *
 * Served by the proxy in `src/proxy.ts` for every public page while
 * MAINTENANCE_MODE is on. It sits outside the `(site)` group on purpose: it
 * draws no header, no footer and no CMS data, so it also holds the site up
 * while the database or Payload itself is the thing being worked on. The
 * lockup is the real artwork through `.logo-lockup`, gold on deep green.
 */
export const metadata: Metadata = {
  title: "We'll be right back | Unave",
  description: 'The Unave kitchen is doing a little maintenance and will be back shortly.',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: '#0F2E21',
}

export default function Maintenance() {
  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-green-900 px-6 text-center">
      {/* The swoosh as a quiet motif, the way the hero uses it (design.md §6.3) */}
      <div
        aria-hidden
        className="swoosh pointer-events-none absolute -top-20 -right-24 w-[26rem] max-w-full opacity-[0.08] text-gold-400"
      />

      <div className="logo-lockup text-gold-400" style={{ '--logo-height': '44px' } as React.CSSProperties} />

      <h1 className="mt-10 font-heading text-4xl leading-tight font-bold text-cream sm:text-5xl">
        The kitchen is having a <em className="text-gold-400 italic">short break</em>
      </h1>

      <p className="mt-4 max-w-[46ch] text-base leading-relaxed text-cream/85 sm:text-lg">
        We&rsquo;re tidying up behind the counter and will be back shortly. Your plans and orders
        are safe.
      </p>

      <p className="mt-10 text-sm font-medium text-cream/70">
        Anything urgent? Write to us — we&rsquo;ll reply the moment we&rsquo;re back.
      </p>
    </main>
  )
}
