import { APIError } from 'payload'
import type { CollectionBeforeChangeHook } from 'payload'

import type { BillingPeriod } from '@/utilities/computeEndDate'
import { computeEndDate } from '@/utilities/computeEndDate'

export const computeSubscriptionEndDate: CollectionBeforeChangeHook = ({
  data,
  originalDoc,
}) => {
  const startDate = data.startDate ?? originalDoc?.startDate
  const billingPeriod = (data.billingPeriod ?? originalDoc?.billingPeriod) as
    | BillingPeriod
    | undefined
  const status = data.status ?? originalDoc?.status

  if (status === 'active' && !startDate) {
    throw new APIError('An active subscription needs a start date.', 400)
  }

  if (startDate && billingPeriod) {
    return {
      ...data,
      endDate: computeEndDate(startDate, billingPeriod),
    }
  }

  return data
}
