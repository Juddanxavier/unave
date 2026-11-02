/**
 * A date written for a reader rather than a database: `1 November 2026`.
 *
 * The old `MM/DD/YYYY` shape was ambiguous, since `11/01/2026` reads as both a
 * November date and a January one depending on where the reader lives. The
 * byline on a blog post is the only caller, so the date alone is the whole
 * output.
 */
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export const formatDateTime = (timestamp: string): string => {
  const date = timestamp ? new Date(timestamp) : new Date()

  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}
