import type { CollectionConfig } from 'payload'

import { isStaff } from '../../access/isStaff'
import { computeSubscriptionEndDate } from './hooks/computeSubscriptionEndDate'
import { copyPlanSnapshot } from './hooks/copyPlanSnapshot'
import { issueAccessToken } from './hooks/issueAccessToken'

export const Subscriptions: CollectionConfig = {
  slug: 'subscriptions',
  access: {
    create: isStaff,
    delete: isStaff,
    read: isStaff,
    update: isStaff,
  },
  admin: {
    defaultColumns: ['customerName', 'email', 'plan', 'status', 'startDate', 'endDate'],
    group: 'Plans and subscriptions',
    useAsTitle: 'customerName',
  },
  defaultPopulate: {
    plan: true,
  },
  fields: [
    {
      name: 'customerName',
      type: 'text',
      required: true,
    },
    {
      name: 'email',
      type: 'email',
      index: true,
      required: true,
    },
    {
      name: 'phone',
      type: 'text',
      required: true,
      validate: (value: string | null | undefined) => {
        if (!value) return 'Enter a phone number.'
        return /^[0-9+\s-]{7,15}$/.test(value) || 'Enter a valid phone number.'
      },
    },
    {
      name: 'address',
      type: 'group',
      fields: [
        {
          name: 'line1',
          label: 'Address line 1',
          type: 'text',
          required: true,
        },
        {
          name: 'line2',
          label: 'Address line 2',
          type: 'text',
        },
        {
          name: 'city',
          type: 'text',
          required: true,
        },
        {
          name: 'state',
          type: 'text',
          required: true,
        },
        {
          name: 'pincode',
          type: 'text',
          required: true,
          validate: (value: string | null | undefined) => {
            if (!value) return 'Enter a pincode.'
            return /^\d{6}$/.test(value) || 'Enter a 6 digit pincode.'
          },
        },
      ],
    },
    {
      name: 'plan',
      type: 'relationship',
      index: true,
      relationTo: 'plans',
      required: true,
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
        {
          label: 'New',
          value: 'new',
        },
        {
          label: 'Active',
          value: 'active',
        },
        {
          label: 'Cancel requested',
          value: 'cancel_requested',
        },
        {
          label: 'Cancelled',
          value: 'cancelled',
        },
        {
          label: 'Expired',
          value: 'expired',
        },
      ],
      required: true,
    },
    {
      name: 'billingPeriod',
      type: 'select',
      access: {
        update: () => false,
      },
      admin: {
        description: 'Copied from the plan when the subscription is created.',
        position: 'sidebar',
        readOnly: true,
      },
      options: [
        {
          label: 'Weekly',
          value: 'weekly',
        },
        {
          label: 'Monthly',
          value: 'monthly',
        },
      ],
    },
    {
      name: 'mealsPerWeek',
      type: 'number',
      access: {
        update: () => false,
      },
      admin: {
        description: 'Copied from the plan when the subscription is created.',
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'price',
      label: 'Price in rupees',
      type: 'number',
      access: {
        update: () => false,
      },
      admin: {
        description: 'Copied from the plan when the subscription is created.',
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'startDate',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayOnly',
          displayFormat: 'd MMM yyyy',
        },
        description: 'Set by staff when the subscription is activated.',
        position: 'sidebar',
      },
    },
    {
      name: 'endDate',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayOnly',
          displayFormat: 'd MMM yyyy',
        },
        description: 'Calculated from the start date and the billing period.',
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'paymentReference',
      type: 'text',
      admin: {
        description: 'UPI reference or bank note for the payment taken outside the app.',
        position: 'sidebar',
      },
    },
    {
      name: 'paymentReceivedAt',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayOnly',
        },
        position: 'sidebar',
      },
    },
    {
      name: 'adminNotes',
      type: 'textarea',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'cancelRequestedAt',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'cancelledAt',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'accessTokenHash',
      type: 'text',
      access: {
        create: () => false,
        read: () => false,
        update: () => false,
      },
      admin: {
        hidden: true,
      },
      unique: true,
    },
    {
      name: 'accessTokenExpiresAt',
      type: 'date',
      access: {
        create: () => false,
        update: () => false,
      },
      admin: {
        hidden: true,
        readOnly: true,
      },
    },
    {
      name: 'linkSentAt',
      type: 'date',
      admin: {
        hidden: true,
        readOnly: true,
      },
    },
  ],
  hooks: {
    beforeValidate: [copyPlanSnapshot],
    beforeChange: [computeSubscriptionEndDate, issueAccessToken],
  },
  timestamps: true,
}
