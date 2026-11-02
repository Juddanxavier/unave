import type { Metadata } from 'next/types'
import { notFound } from 'next/navigation'

import { BlogArchive } from '@/components/BlogArchive'
import { PageHero } from '@/components/PageHero'
import {
  ARCHIVE_IMAGES,
  POSTS_HERO_EYEBROW,
  POSTS_HERO_HEADLINE,
  POSTS_HERO_HEADLINE_ACCENT,
  POSTS_HERO_SUB,
} from '@/utilities/archiveCopy'
import { viewFromParam } from '@/utilities/blogView'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import PageClient from './page.client'

type Args = {
  params: Promise<{
    pageNumber: string
  }>
  searchParams: Promise<{
    view?: string
  }>
}

export default async function Page({ params, searchParams }: Args) {
  const { pageNumber } = await params
  const { view: viewParam } = await searchParams
  const view = viewFromParam(viewParam)
  const payload = await getPayload({ config: configPromise })

  const sanitizedPageNumber = Number(pageNumber)

  if (!Number.isInteger(sanitizedPageNumber) || sanitizedPageNumber < 1) notFound()

  const posts = await payload.find({
    collection: 'posts',
    depth: 1,
    limit: 12,
    page: sanitizedPageNumber,
    overrideAccess: false,
    select: {
      categories: true,
      meta: true,
      publishedAt: true,
      slug: true,
      title: true,
    },
  })

  return (
    <main>
      <PageHero
        accent={POSTS_HERO_HEADLINE_ACCENT}
        eyebrow={POSTS_HERO_EYEBROW}
        headline={POSTS_HERO_HEADLINE}
        image={ARCHIVE_IMAGES.posts}
        sub={POSTS_HERO_SUB}
      />

      <PageClient />

      <div className="container py-14 md:py-24">
        {posts.totalDocs > 0 ? (
          <BlogArchive
            page={posts.page ?? sanitizedPageNumber}
            posts={posts.docs}
            totalDocs={posts.totalDocs}
            totalPages={posts.totalPages}
            view={view}
          />
        ) : (
          <p className="text-body text-ink-600 max-w-[52ch]">
            Nothing here on this page. Please try the first page of the blog.
          </p>
        )}
      </div>
    </main>
  )
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { pageNumber } = await params

  return {
    title: `Blog, page ${pageNumber || ''}`.trim(),
  }
}
