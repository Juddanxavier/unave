import clsx from 'clsx'
import React from 'react'

interface Props {
  className?: string
}

/**
 * The UNAVE lockup: mark left, wordmark right (design.md §2).
 *
 * The asset is white on transparent and applied as a CSS mask, so the logo takes
 * its colour from `currentColor` — deep green on light surfaces, gold on dark.
 */
export const Logo = ({ className }: Props) => (
  <span className={clsx('logo-lockup', className)} role="img" aria-label="UNAVE" />
)
