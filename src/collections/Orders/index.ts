import type { Access, CollectionConfig } from 'payload'

import { hasStaffRole } from '../../access/isStaff'

import { createOrderEndpoint, verifyOrderEndpoint } from './endpoints'

type OrderUser = { id?: number | string } & Record<string, unknown>

/**
 * Orders are read by the kitchen and by the one customer who owns the row.
 *
 * `req.user` is a customer only when the `unave-customer` session verified, so
 * an anonymous caller and a caller with somebody else's id both fall through to
 * `false`. Staff see every row.
 */
const staffOrOrderOwner: Access = ({ req: { user } }) => {
  if (hasStaffRole(user)) return true

  const reader = user as unknown as OrderUser | undefined

  if (!reader || typeof reader.id === 'undefined') return false

  return {
    customer: {
      equals: reader.id,
    },
  }
}

/**
 * The record of a purchase (spec 0007).
 *
 * A row is written exactly once, by the payment confirmation with
 * `overrideAccess` — public REST create stays off, so no browser can mint one
 * or choose its amounts, and it is written only when a payment has been
 * captured, so a row always means one completed order. Every money and delivery
 * value is snapshotted at creation and never edited again: editing a plan's
 * title or price afterwards must never rewrite history, so the snapshot fields
 * below refuse updates at the field level, for staff too. The one staff writable
 * field is `startsOn`, the day deliveries actually begin.
 *
 * GraphQL is off outright. The collection's read rule already limits rows to
 * staff and the owning customer, but turning the generated API off removes the
 * second door entirely.
 */
export const Orders: CollectionConfig = {
  slug: 'orders',
  access: {
    create: () => false,
    delete: () => false,
    read: staffOrOrderOwner,
    update: hasStaffRole as Access,
  },
  admin: {
    defaultColumns: ['customer', 'total', 'createdAt'],
    description:
      'One row per paid order. A row is written only once the payment is captured, so an abandoned checkout leaves nothing behind. Amounts are shown in rupees.',
    group: 'Store',
    useAsTitle: 'id',
  },
  fields: [
    {
      name: 'customer',
      type: 'relationship',
      access: {
        update: () => false,
      },
      admin: {
        position: 'sidebar',
      },
      index: true,
      maxDepth: 0,
      relationTo: 'customers',
      required: true,
    },
    {
      name: 'items',
      type: 'array',
      access: {
        update: () => false,
      },
      admin: {
        description: 'What was bought, copied from the plan at purchase time. Plan edits never change these rows.',
      },
      fields: [
        {
          name: 'plan',
          type: 'relationship',
          maxDepth: 0,
          relationTo: 'plans',
        },
        {
          name: 'planTitle',
          type: 'text',
        },
        {
          name: 'durationLabel',
          type: 'text',
        },
        {
          name: 'days',
          type: 'number',
        },
        {
          name: 'unitPrice',
          type: 'number',
          admin: {
            components: {
              Field: '@/components/Admin/RupeeField#RupeeField',
            },
            readOnly: true,
          },
          label: 'Unit price (₹)',
        },
      ],
      required: true,
    },
    {
      name: 'delivery',
      type: 'group',
      access: {
        update: () => false,
      },
      admin: {
        description: 'Where to deliver, as the customer entered it at checkout.',
      },
      fields: [
        {
          name: 'name',
          type: 'text',
        },
        {
          name: 'phone',
          type: 'text',
        },
        {
          name: 'addressLine1',
          type: 'text',
        },
        {
          name: 'addressLine2',
          type: 'text',
        },
        {
          name: 'city',
          type: 'text',
        },
        {
          name: 'state',
          type: 'text',
        },
        {
          name: 'pincode',
          type: 'text',
        },
        {
          name: 'foodPreference',
          type: 'text',
        },
        {
          name: 'note',
          type: 'textarea',
        },
      ],
    },
    {
      name: 'subtotal',
      type: 'number',
      access: {
        update: () => false,
      },
      admin: {
        components: {
          Field: '@/components/Admin/RupeeField#RupeeField',
        },
        readOnly: true,
      },
      label: 'Subtotal (₹)',
    },
    {
      name: 'total',
      type: 'number',
      access: {
        update: () => false,
      },
      admin: {
        components: {
          Cell: '@/components/Admin/RupeeCell#RupeeCell',
          Field: '@/components/Admin/RupeeField#RupeeField',
        },
        readOnly: true,
      },
      label: 'Total (₹)',
    },
    {
      name: 'gatewayOrderId',
      type: 'text',
      access: {
        update: () => false,
      },
      admin: {
        position: 'sidebar',
      },
      index: true,
      unique: true,
      label: 'Razorpay order id',
    },
    {
      name: 'gatewayPaymentId',
      type: 'text',
      access: {
        update: () => false,
      },
      admin: {
        position: 'sidebar',
      },
      label: 'Razorpay payment id',
    },
    {
      name: 'gatewaySignature',
      type: 'text',
      access: {
        update: () => false,
      },
      admin: {
        hidden: true,
      },
      label: 'Razorpay signature',
    },
    {
      name: 'paidAt',
      type: 'date',
      access: {
        update: () => false,
      },
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
      label: 'Paid at',
    },
    {
      name: 'startsOn',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayOnly',
        },
        description: 'When deliveries begin. The kitchen sets this, nobody else.',
        position: 'sidebar',
      },
      label: 'Deliveries start on',
    },
  ],
  endpoints: [createOrderEndpoint, verifyOrderEndpoint],
  graphQL: false,
  labels: {
    plural: 'Orders',
    singular: 'Order',
  },
  timestamps: true,
}
