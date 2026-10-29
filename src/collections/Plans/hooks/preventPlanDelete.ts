import { APIError } from 'payload'
import type { CollectionBeforeDeleteHook } from 'payload'

export const preventPlanDelete: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const { totalDocs } = await req.payload.count({
    collection: 'subscriptions',
    where: {
      plan: {
        equals: id,
      },
    },
    req,
  })

  if (totalDocs > 0) {
    throw new APIError(
      'This plan has subscriptions attached and cannot be deleted. Switch it off instead.',
      400,
    )
  }
}
