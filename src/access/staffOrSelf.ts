import type { Access } from 'payload'

import { hasStaffRole } from './isStaff'

type RoleHolder = { role?: string | null }

export const staffOrSelf: Access = ({ req: { user } }) => {
  if (!user) return false
  if (hasStaffRole(user)) return true

  return {
    id: {
      equals: (user as RoleHolder & { id: number | string }).id,
    },
  }
}
