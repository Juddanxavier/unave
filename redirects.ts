import type { NextConfig } from 'next'

export const redirects: NextConfig['redirects'] = async () => {
  const internetExplorerRedirect = {
    destination: '/ie-incompatible.html',
    has: [
      {
        type: 'header' as const,
        key: 'user-agent',
        value: '(.*Trident.*)', // all ie browsers
      },
    ],
    permanent: false,
    source: '/:path((?!ie-incompatible.html$).*)', // all pages except the incompatibility page
  }

  /* The blog moved from /posts to /blog. Keep the old URLs working, pager rule
     first so `/posts/page/2` is not read as a post with the slug "page". */
  const blogRedirects = [
    { destination: '/blog', permanent: true, source: '/posts' },
    { destination: '/blog/page/:pageNumber', permanent: true, source: '/posts/page/:pageNumber' },
    { destination: '/blog/:slug', permanent: true, source: '/posts/:slug' },
  ]

  return [...blogRedirects, internetExplorerRedirect]
}
