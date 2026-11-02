import React from 'react'

import { Card, CardPostData } from '@/components/Card'

export type Props = {
  posts: CardPostData[]
}

/**
 * A grid of blog cards. The caller supplies the `container`, so the same grid sits
 * inside the blog index and the search results without inventing a second layout.
 */
export const CollectionArchive: React.FC<Props> = ({ posts }) => (
  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
    {posts?.map((result, index) => {
      if (typeof result === 'object' && result !== null) {
        return <Card className="h-full" doc={result} key={index} relationTo="posts" showCategories />
      }

      return null
    })}
  </div>
)
