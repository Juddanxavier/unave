const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
  year: 'numeric',
})

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  hour: '2-digit',
  hour12: false,
  minute: '2-digit',
  month: 'short',
  timeZone: 'UTC',
  year: 'numeric',
})

/**
 * Midnight at the start of the current UTC day. One shared helper so the page
 * display state, the resend query and the cancel guard cannot drift apart.
 */
export const startOfUtcDay = (now: Date = new Date()): Date =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0))

/** Formats a date as `d MMM yyyy` in UTC. Returns null for a missing value. */
export const formatPlanDate = (value: string | Date | null | undefined): string | null => {
  if (!value) return null

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return DATE_FORMAT.format(date)
}

/** Formats a moment as `d MMM yyyy, HH:mm` in UTC, used by the rate limit notice. */
export const formatPlanDateTime = (value: string | Date | null | undefined): string | null => {
  if (!value) return null

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return DATE_TIME_FORMAT.format(date)
}
