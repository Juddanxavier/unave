import type { Access, CollectionConfig } from 'payload'

import { isAdmin } from '../../access/isAdmin'
import { hasStaffRole } from '../../access/isStaff'

type RequestReader = { id?: number | string } & Record<string, unknown>

/**
 * A request is read by the kitchen and by the customer who made it, the same rule
 * the orders themselves use: `req.user` is a customer only when the
 * `unave-customer` session verified, so an anonymous caller falls through to
 * `false`.
 */
const staffOrRequestOwner: Access = ({ req: { user } }) => {
  if (hasStaffRole(user)) return true

  const reader = user as unknown as RequestReader | undefined

  if (!reader || typeof reader.id === 'undefined') return false

  return {
    customer: {
      equals: reader.id,
    },
  }
}

/**
 * A customer's ask about a paid order: stop it, or skip a few days (design.md
 * §6.15).
 *
 * Nothing is changed by this row. It is a message from the customer to the
 * kitchen, kept as a record with its own status, because a paid order is the
 * receipt and its amounts are never rewritten. The kitchen answers it outside the
 * site and marks it handled here.
 *
 * Public REST create stays off. The only write is the account's server action,
 * which reads the customer from the session and proves the order is theirs, so no
 * browser can file a request against somebody else's order.
 */
export const OrderRequests: CollectionConfig = {
  slug: 'order-requests',
  access: {
    create: () => false,
    delete: isAdmin,
    read: staffOrRequestOwner,
    update: isAdmin,
  },
  admin: {
    defaultColumns: ['order', 'type', 'status', 'customer', 'createdAt'],
    description:
      'Pause and cancellation requests from customers. One row per ask; mark it handled once the kitchen has replied.',
    group: 'Store',
    useAsTitle: 'id',
  },
  fields: [
    {
      name: 'customer',
      type: 'relationship',
      admin: {
        position: 'sidebar',
      },
      index: true,
      maxDepth: 0,
      relationTo: 'customers',
      required: true,
    },
    {
      name: 'order',
      type: 'relationship',
      admin: {
        position: 'sidebar',
      },
      index: true,
      maxDepth: 0,
      relationTo: 'orders',
      required: true,
    },
    {
      name: 'type',
      type: 'select',
      options: [
        { label: 'Cancellation', value: 'cancel' },
        { label: 'Pause', value: 'pause' },
      ],
      required: true,
    },
    {
      name: 'pauseFrom',
      type: 'date',
      admin: {
        condition: (data) => data?.type === 'pause',
        date: {
          pickerAppearance: 'dayOnly',
        },
      },
      label: 'Pause from',
    },
    {
      name: 'pauseTo',
      type: 'date',
      admin: {
        condition: (data) => data?.type === 'pause',
        date: {
          pickerAppearance: 'dayOnly',
        },
      },
      label: 'Resume on',
    },
    {
      name: 'reason',
      type: 'textarea',
      maxLength: 1000,
    },
    {
      name: 'status',
      type: 'select',
      admin: {
        position: 'sidebar',
      },
      defaultValue: 'new',
      index: true,
      options: [
        { label: 'New', value: 'new' },
        { label: 'Handled', value: 'handled' },
      ],
    },
    {
      name: 'staffNote',
      type: 'textarea',
      admin: {
        description: 'What the kitchen did about it. Never shown to the customer.',
        position: 'sidebar',
      },
      label: 'Kitchen note',
    },
  ],
  labels: {
    plural: 'Order requests',
    singular: 'Order request',
  },
  timestamps: true,
}
