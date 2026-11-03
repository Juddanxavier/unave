import type { Metadata } from 'next'

import Image from 'next/image'
import { RelatedPosts } from '@/blocks/RelatedPosts/Component'
import { BlogPostHeader } from '@/components/BlogPostHeader'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { PayloadRedirects } from '@/components/PayloadRedirects'
import RichText from '@/components/RichText'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { draftMode } from 'next/headers'
import React, { cache } from 'react'

import { generateMeta } from '@/utilities/generateMeta'
import { getMediaUrl } from '@/utilities/getMediaUrl'
import { cn } from '@/utilities/ui'
import PageClient from './page.client'

export async function generateStaticParams() {
  try {
    const payload = await getPayload({ config: configPromise })
    const posts = await payload.find({
      collection: 'posts',
      draft: false,
      limit: 1000,
      overrideAccess: false,
      pagination: false,
      select: {
        slug: true,
      },
    })

    const params = posts.docs.map(({ slug }) => {
      return { slug }
    })

    return params
  } catch {
    // A Docker image build runs without a database. Returning nothing here
    // lets the build finish; every article then renders on demand instead.
    return []
  }
}

type Args = {
  params: Promise<{
    slug?: string
  }>
}

export default async function Post({ params: paramsPromise }: Args) {
  const { isEnabled: draft } = await draftMode()
  const { slug = '' } = await paramsPromise
  // Decode to support slugs with special characters
  const decodedSlug = decodeURIComponent(slug)
  const url = '/blog/' + decodedSlug
  const post = await queryPostBySlug({ slug: decodedSlug })

  if (!post) return <PayloadRedirects url={url} />

  /* The post's own photograph again, this time as the article's picture: the band
     above carries it behind the title under a scrim, so the reader sees it clearly
     here before the words start (design.md §10.4). */
  const media = post.heroImage && typeof post.heroImage === 'object' ? post.heroImage : null
  const image = media?.url ? getMediaUrl(media.url, media.updatedAt) : null

  return (
    <article>
      <PageClient />

      {/* Allows redirects for valid pages too */}
      <PayloadRedirects disableNotFound url={url} />

      {draft && <LivePreviewListener />}

      <BlogPostHeader post={post} />

      <div className="container py-14 md:py-24">
        {image ? (
          <figure className="mx-auto max-w-[48rem]">
            <div className="relative aspect-[3/2] overflow-hidden rounded-md">
              <Image
                alt={media?.alt ?? ''}
                className="object-cover"
                fill
                quality={75}
                sizes="(min-width: 48rem) 48rem, 100vw"
                src={image}
              />
            </div>
          </figure>
        ) : null}

        <RichText
          className={cn('mx-auto max-w-[48rem]', image && 'mt-10')}
          data={post.content}
          enableGutter={false}
        />

        {post.relatedPosts && post.relatedPosts.length > 0 && (
          <RelatedPosts
            className="mt-16"
            docs={post.relatedPosts.filter((post) => typeof post === 'object')}
          />
        )}
      </div>
    </article>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug = '' } = await paramsPromise
  // Decode to support slugs with special characters
  const decodedSlug = decodeURIComponent(slug)
  const post = await queryPostBySlug({ slug: decodedSlug })

  return generateMeta({ doc: post })
}

const queryPostBySlug = cache(async ({ slug }: { slug: string }) => {
  const { isEnabled: draft } = await draftMode()

  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'posts',
    draft,
    limit: 1,
    overrideAccess: draft,
    pagination: false,
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  return result.docs?.[0] || null
})
