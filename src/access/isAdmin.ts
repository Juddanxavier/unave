import type { Access, FieldAccess } from 'payload'

type RoleHolder = { role?: string | null }

const isAdminRole = (user: unknown): boolean => (user as RoleHolder | null)?.role === 'admin'

export const isAdmin: Access = ({ req: { user } }) => isAdminRole(user)

export const isAdminField: FieldAccess = ({ req: { user } }) => isAdminRole(user)
