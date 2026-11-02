/**
 * Copy for the blog index and the search page, and the placeholder photographs
 * standing in behind their bands (design.md §8).
 *
 * The blog is stored in Payload's `posts` collection but served at `/blog`. The
 * words here follow the voice rules in design.md §11.
 */

/** The blog index at /blog. */
export const POSTS_HERO_EYEBROW = 'Blog'
export const POSTS_HERO_HEADLINE = 'Notes from'
export const POSTS_HERO_HEADLINE_ACCENT = 'the kitchen'
export const POSTS_HERO_SUB =
  'What we cook, what we learn, and the small decisions that shape a week of meals.'

/** The search page at /search. */
export const SEARCH_HERO_EYEBROW = 'Search'
export const SEARCH_HERO_HEADLINE = 'Find'
export const SEARCH_HERO_HEADLINE_ACCENT = 'what you need'
export const SEARCH_HERO_SUB =
  'Look through the blog for a dish, an ingredient, or a question we have already answered.'

/** Placeholder band photographs, swapped in place when the real shoot lands. */
export const ARCHIVE_IMAGES = {
  posts: '/images/gallery-2.jpg',
  search: '/images/gallery-3.jpg',
} as const
