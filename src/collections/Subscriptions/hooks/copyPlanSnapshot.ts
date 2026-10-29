import type { CollectionBeforeValidateHook } from 'payload'

/**
 * Copies the sellable values from the chosen plan once, at creation only.
 * Later plan edits never rewrite an existing subscription.
 */
export const copyPlanSnapshot: CollectionBeforeValidateHook = async ({
  data,
  operation,
  req,
}) => {
  if (operation !== 'create' || !data?.plan) return data

  const planID = typeof data.plan === 'object' ? data.plan.id : data.plan
  if (!planID) return data

  const plan = await req.payload.findByID({
    collection: 'plans',
    id: planID,
    depth: 0,
    req,
  })

  if (!plan) return data

  return {
    ...data,
    billingPeriod: plan.billingPeriod,
    mealsPerWeek: plan.mealsPerWeek,
    price: plan.price,
  }
}
