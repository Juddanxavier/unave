'use client'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import type { CardPostData } from '@/components/Card'

import { categoryLabel } from '@/utilities/categoryLabel'
import { collectionHref } from '@/utilities/collectionPath'
import { formatDateTime } from '@/utilities/formatDateTime'
import { getMediaUrl } from '@/utilities/getMediaUrl'
import useClickableCard from '@/utilities/useClickableCard'

const Row: React.FC<{ doc: CardPostData }> = ({ doc }) => {
  const { card, link } = useClickableCard({})
  const { categories, meta, publishedAt, slug, title } = doc

  const image = meta?.image && typeof meta.image === 'object' ? meta.image : null
  const description = meta?.description?.replace(/\s/g, ' ')
  const labels = categoryLabel(categories)
  const href = collectionHref('posts', slug ?? '')

  return (
    <article className="group flex gap-5 py-6 sm:gap-8" ref={card.ref}>
      {image?.url ? (
        <div className="bg-green-50 relative aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-md sm:w-44">
          <Image
            alt={image.alt ?? ''}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:group-hover:scale-100"
            fill
            quality={75}
            sizes="(min-width: 40rem) 176px, 112px"
            src={getMediaUrl(image.url, image.updatedAt)}
          />
        </div>
      ) : null}

      <div className="min-w-0 max-w-[62ch]">
        <h3 className="text-h3">
          <Link
            className="focus-visible:ring-green-500 rounded-sm focus-visible:ring-[3px] focus-visible:outline-none"
            href={href}
            ref={link.ref}
          >
            {title}
          </Link>
        </h3>

        {description ? (
          <p className="text-body text-ink-600 mt-2 line-clamp-2">{description}</p>
        ) : null}

        {labels || publishedAt ? (
          <p className="text-caption text-ink-600 mt-3">
            {labels}
            {labels && publishedAt ? ' · ' : null}
            {publishedAt ? <time dateTime={publishedAt}>{formatDateTime(publishedAt)}</time> : null}
          </p>
        ) : null}
      </div>
    </article>
  )
}

/**
 * The list rendition of the blog: one row per post, its photograph on the left.
 * Built on the same card behaviour as the grid, so a whole row is clickable
 * while the title stays the real link.
 */
export const PostList: React.FC<{ posts: CardPostData[] }> = ({ posts }) => (
  <ul className="divide-line divide-y">
    {posts.map((doc, index) => (
      <li key={doc.slug ?? index}>
        <Row doc={doc} />
      </li>
    ))}
  </ul>
)
