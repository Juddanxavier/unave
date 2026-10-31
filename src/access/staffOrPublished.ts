import type { Access } from 'payload'

import { hasStaffRole } from './isStaff'

/**
 * Read access for the content collections.
 *
 * Staff see everything, including drafts. Everyone else, signed in customer or
 * anonymous visitor, only sees published documents. This is the read half of the
 * staff role split; the write half is `isStaff`.
 */
export const staffOrPublished: Access = ({ req: { user } }) => {
  if (hasStaffRole(user)) return true

  return {
    _status: {
      equals: 'published',
    },
  }
}
