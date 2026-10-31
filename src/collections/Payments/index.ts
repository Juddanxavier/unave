import type { CollectionConfig } from 'payload'

import { isStaff } from '../../access/isStaff'

/**
 * One gateway payment, beside its subscription (spec 0001's promise: a payment
 * record beside the subscription, never inside its status).
 *
 * Rows are written only by the checkout confirm step and the Razorpay webhook,
 * so REST create, update and delete are closed and the writes go through the
 * local API with `overrideAccess`. The Razorpay payment id is unique, which is
 * what makes every webhook retry and double confirm idempotent.
 */
export const Payments: CollectionConfig = {
  slug: 'payments',
  access: {
    create: () => false,
    delete: () => false,
    read: isStaff,
    update: () => false,
  },
  admin: {
    defaultColumns: ['createdAt', 'subscription', 'amount', 'status', 'method', 'source'],
    description:
      'Every Razorpay payment for a plan: the first charge at checkout and one row per renewal. Written by the app, read only here.',
    group: 'Plans and subscriptions',
    useAsTitle: 'razorpayPaymentId',
  },
  fields: [
    {
      name: 'razorpayPaymentId',
      type: 'text',
      admin: {
        description: 'Razorpay payment id, for example pay_1234. One row per payment.',
      },
      index: true,
      required: true,
      unique: true,
    },
    {
      name: 'razorpayOrderId',
      type: 'text',
      admin: {
        description: 'The one-time Razorpay order the payment belongs to.',
      },
      index: true,
    },
    {
      name: 'subscription',
      type: 'relationship',
      index: true,
      maxDepth: 0,
      relationTo: 'subscriptions',
    },
    {
      name: 'plan',
      type: 'relationship',
      maxDepth: 0,
      relationTo: 'plans',
    },
    {
      name: 'amount',
      type: 'number',
      admin: {
        description: 'In paise, exactly as Razorpay charged it.',
      },
      required: true,
    },
    {
      name: 'currency',
      type: 'text',
      defaultValue: 'INR',
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Paid', value: 'paid' },
        { label: 'Failed', value: 'failed' },
      ],
      required: true,
    },
    {
      name: 'method',
      type: 'text',
      admin: {
        description: 'How it was paid, for example upi, card or netbanking. Reported by Razorpay.',
      },
    },
    {
      name: 'email',
      type: 'email',
      admin: {
        description: 'The address the payment was made with, for the audit trail.',
      },
    },
    {
      name: 'contact',
      type: 'text',
    },
    {
      name: 'source',
      type: 'select',
      options: [
        { label: 'Checkout', value: 'checkout' },
        { label: 'Webhook', value: 'webhook' },
      ],
      required: true,
    },
    {
      name: 'eventAt',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        description: 'When Razorpay reported the payment.',
        position: 'sidebar',
      },
    },
  ],
  indexes: [{ fields: ['subscription', 'status'] }],
  timestamps: true,
}
