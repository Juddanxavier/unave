import { APIError } from 'payload'
import type { CollectionBeforeChangeHook } from 'payload'

import type { BillingPeriod } from '@/utilities/computeEndDate'
import { computeEndDate } from '@/utilities/computeEndDate'

/**
 * Recomputes the end date from the start date and the billing period.
 *
 * The recompute runs only when the start date actually changes (or on create,
 * or when the end date is missing). A plain save of any other field keeps the
 * stored end date, because auto-debit renewals move the end date forward cycle
 * by cycle through the Razorpay webhook, and one staff note must not pull it
 * back to one period after the start date. A changed start date still wins:
 * that is a real reschedule, and the end date follows it.
 */
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

  const recompute =
    startDate !== undefined &&
    billingPeriod !== undefined &&
    (originalDoc === undefined ||
      originalDoc.endDate === undefined ||
      originalDoc.endDate === null ||
      (data.startDate !== undefined && data.startDate !== originalDoc.startDate))

  if (recompute) {
    return {
      ...data,
      endDate: computeEndDate(startDate, billingPeriod),
    }
  }

  return data
}
