import type { Access } from 'payload'

type RoleHolder = { role?: string | null }

export const hasStaffRole = (user: unknown): boolean => {
  const role = (user as RoleHolder | null)?.role
  return role === 'admin' || role === 'staff'
}

export const isStaff: Access = ({ req: { user } }) => hasStaffRole(user)
