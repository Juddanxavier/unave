import { ChevronLeft, ChevronRight } from 'lucide-react'
import React from 'react'

import { cn } from '@/utilities/ui'

/**
 * The page numbers to show: the first page, the last page, the current page and
 * one either side of it, with a gap standing in wherever numbers are skipped.
 */
const pageItems = (page: number, totalPages: number): (number | 'gap')[] => {
  const wanted = new Set([1, totalPages, page - 1, page, page + 1])
  const numbers = [...wanted].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b)

  const items: (number | 'gap')[] = []
  let previous = 0

  for (const n of numbers) {
    if (previous && n - previous > 1) items.push('gap')
    items.push(n)
    previous = n
  }

  return items
}

const item =
  'text-caption rounded-pill focus-visible:ring-green-500 inline-flex size-11 items-center justify-center font-semibold transition-colors focus-visible:ring-[3px] focus-visible:outline-none motion-reduce:transition-none'

const move = cn(item, 'text-ink-600 hover:bg-green-50')

/**
 * The pager under an archive. Every page is a real link, so it works without
 * JavaScript and each page is an ordinary URL. The current page is not a link to
 * itself, and each control is a 44px target (design.md §6.2).
 */
export const Pagination: React.FC<{
  className?: string
  hrefFor: (page: number) => string
  page: number
  totalPages: number
}> = ({ className, hrefFor, page, totalPages }) => {
  if (totalPages <= 1) return null

  return (
    <nav aria-label="Pages" className={cn('mt-12', className)}>
      <ul className="flex flex-row flex-wrap items-center justify-center gap-1">
        <li>
          {page > 1 ? (
            <a aria-label="Previous page" className={move} href={hrefFor(page - 1)}>
              <ChevronLeft aria-hidden className="size-4" />
            </a>
          ) : (
            <span aria-hidden className={cn(item, 'text-ink-400')}>
              <ChevronLeft className="size-4" />
            </span>
          )}
        </li>

        {pageItems(page, totalPages).map((itemOrGap, index) => {
          if (itemOrGap === 'gap') {
            return (
              <li aria-hidden className={cn(item, 'text-ink-400')} key={`gap-${index}`}>
                …
              </li>
            )
          }

          return (
            <li key={itemOrGap}>
              {itemOrGap === page ? (
                <span aria-current="page" className={cn(item, 'bg-green-900 text-cream')}>
                  {itemOrGap}
                </span>
              ) : (
                <a className={move} href={hrefFor(itemOrGap)}>
                  {itemOrGap}
                </a>
              )}
            </li>
          )
        })}

        <li>
          {page < totalPages ? (
            <a aria-label="Next page" className={move} href={hrefFor(page + 1)}>
              <ChevronRight aria-hidden className="size-4" />
            </a>
          ) : (
            <span aria-hidden className={cn(item, 'text-ink-400')}>
              <ChevronRight className="size-4" />
            </span>
          )}
        </li>
      </ul>
    </nav>
  )
}
