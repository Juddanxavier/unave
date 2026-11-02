import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidateTag } from 'next/cache'

import type { Plan } from '@/payload-types'

/**
 * Clearing the homepage shelf when a plan changes.
 *
 * `getHomePlans` caches the three plans under the `plans` tag, so a price or a
 * pause edited in the admin has to knock that cache over or the front page would
 * keep advertising the old one until the next rebuild.
 */
export const revalidatePlans: CollectionAfterChangeHook<Plan> = ({
  doc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) {
    payload.logger.info(`Revalidating plans`)

    revalidateTag('plans', 'max')
  }

  return doc
}

export const revalidatePlansDelete: CollectionAfterDeleteHook<Plan> = ({
  doc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) {
    payload.logger.info(`Revalidating plans after delete`)

    revalidateTag('plans', 'max')
  }

  return doc
}
