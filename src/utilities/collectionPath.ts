/**
 * Where each collection's documents live on the public site.
 *
 * The blog is stored in Payload's `posts` collection but served at `/blog`, so
 * the collection key and the public URL are deliberately different. Every place
 * that turns a relation into a link goes through here, so the URL is written
 * once and a future collection is one line away.
 */
const PREFIXES: Record<string, string> = {
  pages: '',
  posts: '/blog',
}

/** The URL prefix for a collection, such as `/blog` for `posts`. */
export const collectionPath = (relationTo: string): string =>
  PREFIXES[relationTo] ?? `/${relationTo}`

/** The full public path to one document. */
export const collectionHref = (relationTo: string, slug: string): string =>
  `${collectionPath(relationTo)}/${slug}`
