import { startOfUtcDay } from './planDates'

export type PlanBillingPeriod = 'weekly' | 'monthly'

export type PlanDisplayState =
  | 'awaiting_confirmation'
  | 'active'
  | 'ended'
  | 'cancellation_requested'
  | 'cancelled'

export const DISPLAY_STATE_LABELS: Record<PlanDisplayState, string> = {
  awaiting_confirmation: 'Awaiting confirmation',
  active: 'Active',
  cancellation_requested: 'Cancellation requested',
  cancelled: 'Cancelled',
  ended: 'Ended',
}

export const BILLING_PERIOD_LABELS: Record<PlanBillingPeriod, string> = {
  monthly: 'Monthly',
  weekly: 'Weekly',
}

const PRICE_FORMAT = new Intl.NumberFormat('en-IN', {
  currency: 'INR',
  maximumFractionDigits: 0,
  style: 'currency',
})

/** Formats a rupee amount with no decimals, for example `₹1,299`. */
export const formatPlanPrice = (value: number | null | undefined): string | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null

  return PRICE_FORMAT.format(value)
}

/**
 * The guest facing state. It is derived, never stored: an `active` subscription
 * whose end date has passed shows as Ended before the scheduled job flips the
 * stored status. A null end date never counts as ended.
 */
export const deriveDisplayState = (
  status: string | null | undefined,
  endDate: string | Date | null | undefined,
  now: Date = new Date(),
): PlanDisplayState => {
  if (status === 'new') return 'awaiting_confirmation'
  if (status === 'cancel_requested') return 'cancellation_requested'
  if (status === 'cancelled') return 'cancelled'
  if (status === 'expired') return 'ended'

  if (endDate) {
    const end = endDate instanceof Date ? endDate : new Date(endDate)
    if (!Number.isNaN(end.getTime()) && end.getTime() < startOfUtcDay(now).getTime()) {
      return 'ended'
    }
  }

  return 'active'
}

export const offersCancel = (state: PlanDisplayState): boolean => state === 'active'

/** The price line period word. It is a word on a price line, not a badge. */
export const planPeriodWord = (period: PlanBillingPeriod | null | undefined): string | null => {
  if (period === 'weekly') return 'week'
  if (period === 'monthly') return 'month'
  return null
}
