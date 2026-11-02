'use client'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import type { Post } from '@/payload-types'

import { collectionHref } from '@/utilities/collectionPath'
import { getMediaUrl } from '@/utilities/getMediaUrl'
import { cn } from '@/utilities/ui'
import useClickableCard from '@/utilities/useClickableCard'

export type CardPostData = Pick<Post, 'slug' | 'categories' | 'meta' | 'title' | 'publishedAt'>

/**
 * The blog card. One style covers the index, the search results, an archive block
 * and the related posts under an article. The whole card is the target, with the
 * title as the real link so the card is keyboard operable (design.md §6.4).
 */
export const Card: React.FC<{
  alignItems?: 'center'
  className?: string
  doc?: CardPostData
  relationTo?: 'posts'
  showCategories?: boolean
  title?: string
}> = (props) => {
  const { card, link } = useClickableCard({})
  const { className, doc, relationTo, showCategories, title: titleFromProps } = props

  const { slug, categories, meta, title } = doc || {}
  const { description, image: metaImage } = meta || {}

  const hasCategories = categories && Array.isArray(categories) && categories.length > 0
  const titleToUse = titleFromProps || title
  const sanitizedDescription = description?.replace(/\s/g, ' ') // replace non-breaking space with white space
  const href = collectionHref(relationTo ?? 'posts', slug ?? '')
  const image = metaImage && typeof metaImage === 'object' ? metaImage : null

  return (
    <article
      className={cn(
        'bg-card border-line group hover:shadow-md flex h-full flex-col overflow-hidden rounded-md border transition-[transform,box-shadow] duration-200 hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        className,
      )}
      ref={card.ref}
    >
      {image?.url ? (
        <div className="bg-green-50 relative aspect-[4/3]">
          <Image
            alt={image.alt ?? ''}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:group-hover:scale-100"
            fill
            quality={75}
            sizes="(min-width: 64rem) 33vw, (min-width: 40rem) 50vw, 100vw"
            src={getMediaUrl(image.url, image.updatedAt)}
          />
        </div>
      ) : null}

      <div className="flex flex-1 flex-col p-6">
        {showCategories && hasCategories ? (
          <ul className="mb-3 flex flex-wrap gap-2">
            {categories.map((category, index) => {
              if (typeof category !== 'object' || category === null) return null

              return (
                <li
                  className="bg-green-100 text-green-700 text-caption rounded-pill px-3 py-1 font-semibold"
                  key={category.id ?? index}
                >
                  {category.title || 'Untitled category'}
                </li>
              )
            })}
          </ul>
        ) : null}

        {titleToUse ? (
          <h3 className="text-h3">
            <Link
              className="focus-visible:ring-green-500 rounded-sm focus-visible:ring-[3px] focus-visible:outline-none"
              href={href}
              ref={link.ref}
            >
              {titleToUse}
            </Link>
          </h3>
        ) : null}

        {sanitizedDescription ? (
          <p className="text-body text-ink-600 mt-3">{sanitizedDescription}</p>
        ) : null}
      </div>
    </article>
  )
}
