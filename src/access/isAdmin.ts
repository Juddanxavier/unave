import type { Access, FieldAccess } from 'payload'

type RoleHolder = { role?: string | null }

/**
 * The one place that knows what "admin" means. `req.user` is a union once customer
 * accounts exist, so reading `.role` off it directly is a type error and, worse, a
 * silent assumption. Every check goes through here instead.
 */
export const hasAdminRole = (user: unknown): boolean =>
  (user as RoleHolder | null)?.role === 'admin'

export const isAdmin: Access = ({ req: { user } }) => hasAdminRole(user)

export const isAdminField: FieldAccess = ({ req: { user } }) => hasAdminRole(user)
