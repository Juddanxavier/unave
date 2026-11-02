import { LayoutGrid, List, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

import type { ArchiveView } from '@/utilities/blogView'

import { cn } from '@/utilities/ui'

const GROUPS: { Icon: LucideIcon; label: string; value: ArchiveView }[] = [
  { Icon: LayoutGrid, label: 'Grid', value: 'grid' },
  { Icon: List, label: 'List', value: 'list' },
]

/**
 * The grid and list switch on the blog. Two real links rather than a script, so
 * the choice stays a plain URL: it can be shared, it keeps working without
 * JavaScript, and the pager carries it along to the next page.
 *
 * Each option is a 44px target and the current one is marked with
 * `aria-current`, so the control reads correctly to a screen reader.
 */
export const ViewSwitch: React.FC<{
  className?: string
  hrefFor: (view: ArchiveView) => string
  value: ArchiveView
}> = ({ className, hrefFor, value }) => (
  <div
    aria-label="Blog layout"
    className={cn(
      'border-line bg-card inline-flex items-center gap-1 rounded-pill border p-1',
      className,
    )}
    role="group"
  >
    {GROUPS.map(({ Icon, label, value: option }) => {
      const current = option === value

      return (
        <Link
          aria-current={current ? 'true' : undefined}
          className={cn(
            'text-caption rounded-pill focus-visible:ring-green-500 inline-flex h-11 items-center gap-2 px-4 font-semibold transition-colors focus-visible:ring-[3px] focus-visible:outline-none motion-reduce:transition-none',
            current ? 'bg-green-900 text-cream' : 'text-ink-600 hover:bg-green-50',
          )}
          href={hrefFor(option)}
          key={option}
        >
          <Icon aria-hidden className="size-4" />
          {label}
        </Link>
      )
    })}
  </div>
)
