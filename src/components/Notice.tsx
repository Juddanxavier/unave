import { Info } from 'lucide-react'
import React from 'react'

import { cn } from '@/utilities/ui'

/**
 * The notice block (design.md §6.11): the gold band that must sit next to any
 * medical, allergy, diabetes or child-nutrition claim. The icon is decorative;
 * the words carry the meaning.
 */
export const Notice: React.FC<{
  children: React.ReactNode
  className?: string
  title: string
}> = ({ children, className, title }) => (
  <aside className={cn('rounded-2xl border-l-4 border-gold-500 bg-gold-100 p-6', className)}>
    <div className="flex items-start gap-3">
      <Info aria-hidden="true" className="mt-1 size-5 shrink-0 text-gold-600" strokeWidth={2} />
      <div>
        <h2 className="text-ink-900 text-lg font-bold">{title}</h2>
        <p className="text-ink-900/90 mt-2 max-w-[70ch] text-base leading-7">{children}</p>
      </div>
    </div>
  </aside>
)
