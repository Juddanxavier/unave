/**
 * Shared helpers for reading a subscription.
 *
 * This used to hold the secret-link lookup as well. That went with the guest plan
 * page: a plan is now reached through the account that owns it, so there is no
 * token to resolve and nothing here needs to read a hash.
 */

/**
 * The title of the related plan, or null.
 *
 * A relationship can arrive as an id when a caller passes `depth: 0`, so this
 * checks the shape rather than trusting it, and returns null instead of throwing.
 */
export const planTitleOf = (plan: unknown): string | null => {
  if (plan && typeof plan === 'object') {
    const title = (plan as { title?: unknown }).title
    return typeof title === 'string' ? title : null
  }

  return null
}
