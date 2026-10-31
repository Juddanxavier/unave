'use client'

import { X } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

import type { Header as HeaderType } from '@/payload-types'

import { CTA_BASE, CTA_VARIANTS } from '@/components/Cta'
import { Logo } from '@/components/Logo/Logo'
import { cn } from '@/utilities/ui'
import { AccountLinks } from './AccountLinks'
import { HeaderNav } from './Nav'

interface Props {
  items: NonNullable<HeaderType['navItems']>
  cta?: HeaderType['cta']
  onClose: () => void
  drawerRef?: React.RefObject<HTMLDivElement | null>
  closeRef?: React.RefObject<HTMLButtonElement | null>
  signedIn?: boolean | null
}

/**
 * The full-height green drawer behind the hamburger (design.md §6.2): gold links
 * at 56px, the primary button pinned at the bottom, and the logo in gold.
 */
export const MobileMenu: React.FC<Props> = ({
  closeRef,
  cta,
  drawerRef,
  items,
  onClose,
  signedIn = null,
}) => {
  const ctaNewTabProps = cta?.newTab
    ? { rel: 'noopener noreferrer', target: '_blank' as const }
    : {}

  return (
    <div
      aria-label="Menu"
      aria-modal="true"
      className="bg-green-900 fixed inset-0 z-50 flex flex-col lg:hidden"
      id="mobile-menu"
      ref={drawerRef}
      role="dialog"
    >
      <div className="container flex items-center justify-between gap-6 py-3">
        <Link aria-label="UNAVE home" className="text-gold-400 shrink-0" href="/" onClick={onClose}>
          <Logo />
        </Link>
        <button
          aria-label="Close menu"
          className="text-cream hover:bg-cream/10 inline-flex size-11 items-center justify-center rounded-pill transition-colors focus-visible:ring-[3px] focus-visible:ring-gold-400 focus-visible:outline-none motion-reduce:transition-none"
          onClick={onClose}
          ref={closeRef}
          type="button"
        >
          <X aria-hidden="true" className="size-6" strokeWidth={2} />
        </button>
      </div>

      <nav aria-label="Main menu" className="container flex-1 overflow-y-auto py-6">
        <HeaderNav items={items} onNavigate={onClose} variant="drawer" />

        <div
          className={cn(
            'border-cream/15 mt-4 border-t pt-2',
            !items.length && 'mt-0 border-t-0 pt-0',
          )}
        >
          <AccountLinks onNavigate={onClose} signedIn={signedIn} variant="drawer" />
        </div>
      </nav>

      {cta?.label && cta?.url ? (
        <div className="border-cream/15 container border-t py-6">
          <Link
            className={cn(CTA_BASE, CTA_VARIANTS.onDark, 'w-full')}
            href={cta.url}
            onClick={onClose}
            {...ctaNewTabProps}
          >
            {cta.label}
          </Link>
        </div>
      ) : null}
    </div>
  )
}
