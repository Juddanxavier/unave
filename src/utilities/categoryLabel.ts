import type { Category } from '@/payload-types'

/**
 * A post's categories as one readable line: `Planning · Everyday cooking`.
 *
 * A category that has been deleted leaves its id behind, so anything that is not
 * a populated document is skipped rather than printed as a number.
 */
export const categoryLabel = (
  categories: (number | Category)[] | null | undefined,
): string =>
  (categories ?? [])
    .map((category) => (typeof category === 'object' && category ? category.title : null))
    .filter((label): label is string => Boolean(label))
    .join(' · ')
