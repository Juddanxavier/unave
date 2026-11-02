import configPromise from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'

import type { Plan } from '@/payload-types'

/**
 * The plans the homepage advertises (design.md §10.1).
 *
 * The shelf is a window onto the same collection `/plans` reads, so a price can
 * never be typed twice. It takes the newest open plans, in the order `/plans`
 * lists them, and stops at three because a homepage is a shelf, not a catalogue.
 * A paused plan is never advertised: its label belongs on `/plans`, where the
 * customer is already comparing them, not on the front page.
 *
 * The query is cached under the `plans` tag, which the Plans collection's own
 * hooks clear (src/collections/Plans/hooks/revalidatePlans.ts), so a price edited
 * in the admin shows on the homepage without a rebuild.
 */

/** How many plans the homepage shows. */
export const HOME_PLAN_COUNT = 3

const findOpenPlans = async (limit: number): Promise<Plan[]> => {
  const payload = await getPayload({ config: configPromise })

  const found = await payload.find({
    collection: 'plans',
    depth: 0,
    limit,
    where: { available: { equals: true } },
  })

  return found.docs
}

export const getHomePlans = (limit = HOME_PLAN_COUNT) =>
  unstable_cache(() => findOpenPlans(limit), ['home-plans', String(limit)], { tags: ['plans'] })
