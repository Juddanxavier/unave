import type { MetadataRoute } from 'next'

import { getServerSideURL } from '@/utilities/getURL'

/**
 * Generated in code so the rules exist in development too. next-sitemap no
 * longer writes robots.txt, so this file is the single source of truth.
 */
export default function robots(): MetadataRoute.Robots {
  const base = getServerSideURL()

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // The admin must never be indexed or followed.
      disallow: ['/admin/'],
    },
    sitemap: [`${base}/sitemap.xml`, `${base}/pages-sitemap.xml`, `${base}/posts-sitemap.xml`],
  }
}
