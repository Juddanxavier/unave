export type BillingPeriod = 'weekly' | 'monthly'

/**
 * Adds one billing period to a date and returns an ISO string at UTC midnight.
 * Monthly clamps to the last valid day, so 31 January becomes 28 or 29 February.
 */
export const computeEndDate = (startDate: string, billingPeriod: BillingPeriod): string => {
  const start = new Date(startDate)
  const end = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), 0, 0, 0, 0),
  )

  if (billingPeriod === 'weekly') {
    end.setUTCDate(end.getUTCDate() + 7)
  } else {
    const day = end.getUTCDate()
    end.setUTCDate(1)
    end.setUTCMonth(end.getUTCMonth() + 1)
    const lastDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate()
    end.setUTCDate(Math.min(day, lastDay))
  }

  return end.toISOString()
}
