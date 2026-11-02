import React from 'react'

import type { Post } from '@/payload-types'

import { Section } from '@/components/home/Section'
import { Swoosh } from '@/components/Swoosh'
import { categoryLabel } from '@/utilities/categoryLabel'
import { formatDateTime } from '@/utilities/formatDateTime'
import { getMediaUrl } from '@/utilities/getMediaUrl'

/**
 * The band that opens one blog post (design.md §10.4): the post's categories as
 * the eyebrow, the title in Playfair, then the byline, on the post's own
 * photograph under a green-900 scrim. The band is marked `.opening-band`, so it
 * runs up behind the transparent navbar. A post without a hero image still gets
 * the band, just without the photograph.
 */
export const BlogPostHeader: React.FC<{ post: Post }> = ({ post }) => {
  const { categories, heroImage, populatedAuthors, publishedAt, title } = post

  const labels = categoryLabel(categories)

  const authorLabel = (populatedAuthors ?? [])
    .map((author) => author?.name)
    .filter((name): name is string => Boolean(name))
    .join(', ')

  const image =
    heroImage && typeof heroImage === 'object' && heroImage.url
      ? getMediaUrl(heroImage.url, heroImage.updatedAt)
      : undefined

  return (
    <Section
      className="opening-band overflow-hidden bg-green-900 md:py-20"
      image={image ? { priority: true, src: image } : undefined}
      overlay="bg-green-900/85"
      tone="green"
    >
      <Swoosh className="-top-40 -right-32 w-[42rem] text-gold-400/[0.08]" />

      <div className="relative max-w-[46rem]">
        <p className="text-eyebrow text-gold-400 uppercase">{labels || 'Blog'}</p>

        <h1 className="text-display mt-4 text-balance">{title}</h1>

        {authorLabel || publishedAt ? (
          <p className="text-caption text-cream/80 mt-6">
            {authorLabel}
            {authorLabel && publishedAt ? ' · ' : null}
            {publishedAt ? <time dateTime={publishedAt}>{formatDateTime(publishedAt)}</time> : null}
          </p>
        ) : null}
      </div>
    </Section>
  )
}
