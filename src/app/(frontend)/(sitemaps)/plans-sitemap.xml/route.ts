import { unstable_cache } from 'next/cache'
import { getServerSideSitemap } from 'next-sitemap'
import { getPayload } from 'payload'
import config from '@payload-config'

const getPlansSitemap = unstable_cache(
  async () => {
    const payload = await getPayload({ config })

    const SITE_URL =
      process.env.NEXT_PUBLIC_SERVER_URL ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL ||
      'https://example.com'

    const results = await payload.find({
      collection: 'plans',
      depth: 0,
      limit: 100,
      overrideAccess: false,
      pagination: false,
      select: {
        slug: true,
        updatedAt: true,
      },
    })

    const dateFallback = new Date().toISOString()

    const plans = results.docs
      .filter((plan) => Boolean(plan?.slug))
      .map((plan) => ({
        lastmod: plan.updatedAt || dateFallback,
        loc: `${SITE_URL}/plans/${plan.slug}`,
      }))

    return [{ lastmod: dateFallback, loc: `${SITE_URL}/plans` }, ...plans]
  },
  ['plans-sitemap'],
  {
    tags: ['plans-sitemap'],
  },
)

export async function GET() {
  const sitemap = await getPlansSitemap()

  return getServerSideSitemap(sitemap)
}