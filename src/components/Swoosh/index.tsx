import React from 'react'

import { cn } from '@/utilities/ui'

/**
 * The logo swoosh used large, cropped and faint behind the hero and CTA bands
 * (design.md §7). Decorative, so it stays out of the accessibility tree.
 */
export const Swoosh: React.FC<{ className?: string }> = ({ className }) => (
  <span aria-hidden="true" className={cn('swoosh pointer-events-none absolute', className)} />
)
