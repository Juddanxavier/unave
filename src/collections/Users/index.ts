import type { CollectionConfig } from 'payload'

import { isAdmin, isAdminField } from '../../access/isAdmin'
import { hasStaffRole } from '../../access/isStaff'
import { staffOrSelf } from '../../access/staffOrSelf'

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    admin: ({ req: { user } }) => hasStaffRole(user),
    create: isAdmin,
    delete: isAdmin,
    read: staffOrSelf,
    update: staffOrSelf,
  },
  admin: {
    defaultColumns: ['name', 'email', 'role'],
    useAsTitle: 'name',
  },
  auth: true,
  fields: [
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'role',
      type: 'select',
      access: {
        create: isAdminField,
        update: isAdminField,
      },
      admin: {
        description: 'Admins manage users. Staff run plans and subscriptions.',
        position: 'sidebar',
      },
      defaultValue: 'admin',
      options: [
        {
          label: 'Admin',
          value: 'admin',
        },
        {
          label: 'Staff',
          value: 'staff',
        },
      ],
      required: true,
    },
  ],
  timestamps: true,
}
