'use client'

import React from 'react'

import type { Header as HeaderType } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { cn } from '@/utilities/ui'

type NavItem = NonNullable<HeaderType['navItems']>[number]

interface Props {
  items: NavItem[]
  /** Called when a link is followed, so the mobile drawer can close itself. */
  onNavigate?: () => void
  variant?: 'desktop' | 'drawer'
}

/**
 * The menu links. One list, rendered twice: inline on desktop and stacked in the
 * green mobile drawer, where every row is a 56px tap target (design.md §6.2).
 *
 * The colour comes from `--primary`, which the scrolled-header rule swaps to gold,
 * so the same markup stays legible on the cream bar and on the green one.
 */
export const HeaderNav: React.FC<Props> = ({ items, onNavigate, variant = 'desktop' }) => {
  if (!items.length) return null

  return (
    <ul className={cn(variant === 'desktop' ? 'flex items-center gap-1' : 'flex flex-col gap-1')}>
      {items.map(({ link }, index) => (
        <li
          className={cn(variant === 'drawer' && 'text-h3')}
          key={link?.label ?? index}
          onClick={onNavigate}
        >
          <CMSLink
            {...link}
            appearance="inline"
            className={cn(
              'rounded-sm font-semibold transition-opacity focus-visible:ring-[3px] focus-visible:ring-current focus-visible:outline-none',
              variant === 'desktop'
                ? 'text-primary hover:opacity-75 inline-flex min-h-11 items-center px-3 text-sm'
                : 'text-gold-400 hover:text-cream focus-visible:ring-gold-400 flex min-h-14 items-center px-1',
            )}
          />
        </li>
      ))}
    </ul>
  )
}
