import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * The maintenance switch (docs/deploy.md).
 *
 * Set MAINTENANCE_MODE=on in the environment and every public page rewrites to
 * /maintenance — a standalone brand page that needs neither the database nor
 * the CMS chrome, so it also holds the site up while Payload itself is down.
 * The admin panel and every /api route stay reachable, so staff keep working
 * and the compose healthcheck keeps the stack reporting itself healthy.
 *
 * Unset, blank or anything else leaves the site open. Changing the value takes
 * a redeploy, because the container only reads its environment at start-up.
 * The flag is read through a dynamic lookup so the value is evaluated per
 * request at runtime, never inlined into the bundle at build time.
 */
const MAINTENANCE_FLAG = 'MAINTENANCE_MODE'
const ON = new Set(['1', 'true', 'on', 'yes'])

export function proxy(request: NextRequest): NextResponse {
  const raw = (process.env[MAINTENANCE_FLAG] ?? '').trim().toLowerCase()

  if (!ON.has(raw)) {
    return NextResponse.next()
  }

  return NextResponse.rewrite(new URL('/maintenance', request.url), {
    // Tell crawlers and caches the outage is temporary and not worth indexing.
    headers: { 'Retry-After': '3600' },
  })
}

export const config = {
  // Everything except: the admin panel and its API, every /api route
  // (healthcheck, webhooks, the cron knock, customer sessions), the
  // maintenance page itself, and static assets the screen needs (the brand
  // lockup, favicons, robots and sitemaps).
  matcher: [
    '/((?!api|admin|_next|maintenance|media|brand|favicon|apple-touch-icon|robots\\.txt|sitemap).*)',
  ],
}
