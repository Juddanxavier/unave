import type { MigrateUpArgs } from '@payloadcms/db-postgres'

import type { Footer } from '@/payload-types'

/**
 * The chrome learns the store is open again (spec 0007, AC-11).
 *
 * This is a data migration: no tables change, only the CMS globals the header
 * and footer render from. Two things move:
 *
 * - the header gains a Plans menu link, so the shelf is one click from
 *   anywhere, and the primary button stops speaking for the removed
 *   subscription store;
 * - the footer's Explore column gains the same link on a database that has not
 *   been edited by hand yet.
 *
 * Every step is guarded because chrome data is editorial and staff owned. A
 * link is only added when it is missing, and the primary button is only
 * rewritten when it still carries the stale subscription wording, so anything
 * staff have already chosen by hand stays as they left it. On a database with
 * no header row yet, Payload's field defaults apply on read, and the upsert
 * below writes the store aware values in their place.
 */

type NavItem = {
  link?: { label?: string | null; type?: string | null; url?: string | null }
}

type FooterColumn = NonNullable<Footer['columns']>[number]

const PLANS_LINK = { newTab: false, type: 'custom', url: '/plans' } as const

const isPlansLink = (item: NavItem | undefined | null): boolean =>
  Boolean(item?.link && (item.link.url === '/plans' || item.link.label?.toLowerCase() === 'plans'))

export async function up({ payload }: MigrateUpArgs): Promise<void> {
  const header = await payload.findGlobal({ slug: 'header', depth: 0, overrideAccess: true })

  const navItems = (header.navItems ?? []) as NavItem[]
  const headerData: Record<string, unknown> = {}

  if (navItems.length === 0) {
    headerData.navItems = [{ link: { ...PLANS_LINK, label: 'Plans' } }]
  } else if (!navItems.some(isPlansLink) && navItems.length < 6) {
    headerData.navItems = [...navItems, { link: { ...PLANS_LINK, label: 'Plans' } }]
  }

  const cta = header.cta as { label?: string | null; url?: string | null } | null | undefined
  const staleCta =
    !cta?.label || cta.label === 'Start My Subscription' || cta.label === 'Message the kitchen'

  if (staleCta) {
    headerData.cta = { label: 'Order a plan', newTab: false, url: '/plans' }
  }

  if (Object.keys(headerData).length > 0) {
    await payload.updateGlobal({
      context: { disableRevalidate: true },
      data: headerData,
      depth: 0,
      overrideAccess: true,
      slug: 'header',
    })
  }

  const footer = await payload.findGlobal({ slug: 'footer', depth: 0, overrideAccess: true })

  const columns = (footer.columns ?? []) as FooterColumn[]
  const explore = columns.find((column) => column.title?.toLowerCase() === 'explore') ?? columns[0]

  if (explore && !columns.some((column) => (column.links ?? []).some(isPlansLink))) {
    await payload.updateGlobal({
      context: { disableRevalidate: true },
      data: {
        columns: columns.map((column) =>
          column === explore
            ? {
                ...column,
                links: [...(column.links ?? []), { link: { ...PLANS_LINK, label: 'Plans' } }],
              }
            : column,
        ),
      },
      depth: 0,
      overrideAccess: true,
      slug: 'footer',
    })
  }
}

export async function down(): Promise<void> {
  // Chrome copy is editorial, so a rollback cannot restore what staff may have
  // edited since. The links this migration added keep pointing at /plans, a
  // page the schema migration's down removes, so a full rollback of the store
  // expects a matching chrome edit in the admin afterwards.
}
