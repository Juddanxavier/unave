/**
 * The blog's grid or list choice, carried in the URL rather than in component
 * state: `?view=list`. That keeps the choice shareable, keeps the back button
 * honest, and lets the pager carry the same view to the next page.
 */
export type ArchiveView = 'grid' | 'list'

/** Read the view from the query string, falling back to the grid. */
export const viewFromParam = (value?: string | string[]): ArchiveView =>
  value === 'list' ? 'list' : 'grid'

/** The URL for one page of the blog in a given view. Page one is the bare `/blog`. */
export const blogHref = (view: ArchiveView, page: number): string => {
  const path = page <= 1 ? '/blog' : `/blog/page/${page}`

  return view === 'list' ? `${path}?view=list` : path
}
