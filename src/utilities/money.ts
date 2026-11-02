/**
 * Money display for the store.
 *
 * Every amount the site handles — a plan price, an order line, a total, a
 * gateway amount — is an integer in paise, the unit the database and Razorpay
 * both speak. Formatting is the only place rupees exist, so a rounding or a
 * conversion bug has exactly one home.
 *
 * Whole rupees print without paise (₹499, not ₹499.00); anything else keeps
 * two decimals. Indian digit grouping, since the kitchen and its customers
 * read amounts that way.
 */
export const formatPaise = (paise: number): string => {
  const rupees = paise / 100

  return new Intl.NumberFormat('en-IN', {
    currency: 'INR',
    maximumFractionDigits: Number.isInteger(rupees) ? 0 : 2,
    minimumFractionDigits: 0,
    style: 'currency',
  }).format(rupees)
}

/**
 * The admin reads and writes money in rupees while the database keeps paise.
 * These two are the only translation, so the field and the API never disagree.
 */
export const formatRupeeInput = (paise: unknown): string => {
  if (typeof paise !== 'number' || !Number.isFinite(paise)) return ''

  const rupees = paise / 100

  return Number.isInteger(rupees) ? String(rupees) : rupees.toFixed(2)
}

export const rupeesToPaise = (text: string): number | null => {
  const cleaned = text.replace(/[^0-9.]/g, '')

  if (cleaned.trim().length === 0) return null

  const rupees = Number(cleaned)

  if (!Number.isFinite(rupees)) return null

  return Math.round(rupees * 100)
}
