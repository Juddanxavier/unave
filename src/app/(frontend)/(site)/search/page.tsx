import type { Metadata } from 'next/types'

import { CollectionArchive } from '@/components/CollectionArchive'
import { PageHero } from '@/components/PageHero'
import {
  ARCHIVE_IMAGES,
  SEARCH_HERO_EYEBROW,
  SEARCH_HERO_HEADLINE,
  SEARCH_HERO_HEADLINE_ACCENT,
  SEARCH_HERO_SUB,
} from '@/utilities/archiveCopy'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import { Search } from '@/search/Component'
import PageClient from './page.client'
import { CardPostData } from '@/components/Card'

type Args = {
  searchParams: Promise<{
    q: string
  }>
}
export default async function Page({ searchParams: searchParamsPromise }: Args) {
  const { q: query } = await searchParamsPromise
  const payload = await getPayload({ config: configPromise })

  const posts = await payload.find({
    collection: 'search',
    depth: 1,
    limit: 12,
    select: {
      title: true,
      slug: true,
      categories: true,
      meta: true,
    },
    // pagination: false reduces overhead if you don't need totalDocs
    pagination: false,
    ...(query
      ? {
          where: {
            or: [
              {
                title: {
                  like: query,
                },
              },
              {
                'meta.description': {
                  like: query,
                },
              },
              {
                'meta.title': {
                  like: query,
                },
              },
              {
                slug: {
                  like: query,
                },
              },
            ],
          },
        }
      : {}),
  })

  return (
    <main>
      <PageHero
        accent={SEARCH_HERO_HEADLINE_ACCENT}
        eyebrow={SEARCH_HERO_EYEBROW}
        headline={SEARCH_HERO_HEADLINE}
        image={ARCHIVE_IMAGES.search}
        sub={SEARCH_HERO_SUB}
      />

      <PageClient />

      <div className="container pt-14 md:pt-24">
        <div className="max-w-[36rem]">
          <Search />
        </div>
      </div>

      <div className="container pt-12">
        {posts.totalDocs > 0 ? (
          <CollectionArchive posts={posts.docs as CardPostData[]} />
        ) : (
          <p className="text-body text-ink-600">No results found.</p>
        )}
      </div>
    </main>
  )
}

export function generateMetadata(): Metadata {
  return {
    title: 'Search',
  }
}
