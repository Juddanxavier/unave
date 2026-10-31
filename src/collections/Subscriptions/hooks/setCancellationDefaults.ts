import type { CollectionBeforeChangeHook } from 'payload'

/**
 * Runs only on the move into `cancelled`. It fills `cancelledAt` with the
 * server time and defaults `cancelledBy` to `staff`, but it never rewrites an
 * existing cancelled row, so a later admin edit cannot relabel history.
 */
export const setCancellationDefaults: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  const enteringCancelled = data.status === 'cancelled' && originalDoc?.status !== 'cancelled'

  if (!enteringCancelled) return data

  return {
    ...data,
    cancelledAt: data.cancelledAt ?? new Date().toISOString(),
    cancelledBy: data.cancelledBy ?? 'staff',
  }
}
