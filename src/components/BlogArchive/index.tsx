import React from 'react'

import type { ArchiveView } from '@/utilities/blogView'
import type { CardPostData } from '@/components/Card'

import { CollectionArchive } from '@/components/CollectionArchive'
import { PageRange } from '@/components/PageRange'
import { Pagination } from '@/components/Pagination'
import { PostList } from '@/components/PostList'
import { ViewSwitch } from '@/components/ViewSwitch'
import { blogHref } from '@/utilities/blogView'

/**
 * The body of a blog index page, shared by `/blog` and `/blog/page/<n>` so the
 * grid, the list, the switch and the pager only exist once.
 */
export const BlogArchive: React.FC<{
  page: number
  posts: CardPostData[]
  totalDocs: number
  totalPages: number
  view: ArchiveView
}> = ({ page, posts, totalDocs, totalPages, view }) => (
  <>
    <div className="flex flex-wrap items-center justify-between gap-4">
      <PageRange collection="posts" currentPage={page} limit={12} totalDocs={totalDocs} />

      <ViewSwitch hrefFor={(next) => blogHref(next, page)} value={view} />
    </div>

    <div className="mt-8">
      {view === 'list' ? <PostList posts={posts} /> : <CollectionArchive posts={posts} />}
    </div>

    <Pagination hrefFor={(next) => blogHref(view, next)} page={page} totalPages={totalPages} />
  </>
)
