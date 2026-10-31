'use client'
import {
  Pagination as PaginationComponent,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { cn } from '@/utilities/ui'
import { useRouter } from 'next/navigation'
import React from 'react'

export const Pagination: React.FC<{
  className?: string
  /**
   * When given, every page renders as a real `<a>` built by it, so the pager works
   * without JavaScript and the pages are ordinary URLs. When omitted, the component
   * keeps its router.push behavior for the posts pages, whose routes are
   * `/posts/page/<n>`.
   */
  hrefFor?: (page: number) => string
  page: number
  totalPages: number
}> = (props) => {
  const router = useRouter()

  const { className, hrefFor, page, totalPages } = props
  const hasNextPage = page < totalPages
  const hasPrevPage = page > 1

  const hasExtraPrevPages = page - 1 > 1
  const hasExtraNextPages = page + 1 < totalPages

  return (
    <div className={cn('my-12', className)}>
      <PaginationComponent>
        <PaginationContent>
          {hrefFor ? (
            hasPrevPage && (
              <PaginationItem>
                <PaginationPrevious href={hrefFor(page - 1)} />
              </PaginationItem>
            )
          ) : (
            <PaginationItem>
              <PaginationPrevious
                disabled={!hasPrevPage}
                onClick={() => {
                  router.push(`/posts/page/${page - 1}`)
                }}
              />
            </PaginationItem>
          )}

          {hasExtraPrevPages && (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          )}

          {hrefFor
            ? hasPrevPage && (
                <PaginationItem>
                  <PaginationLink href={hrefFor(page - 1)}>{page - 1}</PaginationLink>
                </PaginationItem>
              )
            : hasPrevPage && (
                <PaginationItem>
                  <PaginationLink
                    onClick={() => {
                      router.push(`/posts/page/${page - 1}`)
                    }}
                  >
                    {page - 1}
                  </PaginationLink>
                </PaginationItem>
              )}

          <PaginationItem>
            <PaginationLink href={hrefFor?.(page)} isActive>
              {page}
            </PaginationLink>
          </PaginationItem>

          {hrefFor
            ? hasNextPage && (
                <PaginationItem>
                  <PaginationLink href={hrefFor(page + 1)}>{page + 1}</PaginationLink>
                </PaginationItem>
              )
            : hasNextPage && (
                <PaginationItem>
                  <PaginationLink
                    onClick={() => {
                      router.push(`/posts/page/${page + 1}`)
                    }}
                  >
                    {page + 1}
                  </PaginationLink>
                </PaginationItem>
              )}

          {hasExtraNextPages && (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          )}

          {hrefFor ? (
            hasNextPage && (
              <PaginationItem>
                <PaginationNext href={hrefFor(page + 1)} />
              </PaginationItem>
            )
          ) : (
            <PaginationItem>
              <PaginationNext
                disabled={!hasNextPage}
                onClick={() => {
                  router.push(`/posts/page/${page + 1}`)
                }}
              />
            </PaginationItem>
          )}
        </PaginationContent>
      </PaginationComponent>
    </div>
  )
}