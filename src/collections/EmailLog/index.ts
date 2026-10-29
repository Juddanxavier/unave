import type { CollectionBeforeValidateHook, CollectionConfig } from 'payload'

import { isAdminField } from '../../access/isAdmin'
import { isStaff } from '../../access/isStaff'
import { maskRecipient, normalizeRecipientText } from '../../email/recipient'

const prepareEmailLog: CollectionBeforeValidateHook = ({ data }) => {
  if (!data) return data

  const recipient = normalizeRecipientText(data.recipient)

  return {
    ...data,
    recipient,
    recipientMasked: maskRecipient(recipient),
  }
}

export const EmailLog: CollectionConfig = {
  slug: 'email-log',
  access: {
    // Rows are written by the mail module with overrideAccess. Nobody can
    // create, change or delete through REST or GraphQL.
    create: () => false,
    delete: () => false,
    read: isStaff,
    update: () => false,
  },
  admin: {
    defaultColumns: [
      'createdAt',
      'recipientMasked',
      'templateKey',
      'status',
      'transport',
      'fallbackUsed',
    ],
    description:
      'Every mail attempt, written by the mail module and read only. Rows are pruned after 90 days.',
    group: 'Email',
    useAsTitle: 'subject',
  },
  fields: [
    {
      name: 'recipient',
      type: 'text',
      access: {
        read: isAdminField,
      },
      admin: {
        description: 'The full address. Admins only, staff see the masked version.',
      },
      index: true,
      required: true,
    },
    {
      name: 'recipientMasked',
      type: 'text',
      admin: {
        description: 'First character, three asterisks, then the domain.',
        readOnly: true,
      },
      required: true,
    },
    {
      name: 'recipientName',
      type: 'text',
    },
    {
      name: 'templateKey',
      type: 'select',
      options: [
        { label: 'Access link', value: 'accessLink' },
        { label: 'Test', value: 'test' },
        { label: 'System', value: 'system' },
      ],
      required: true,
    },
    {
      name: 'subject',
      type: 'text',
      required: true,
    },
    {
      name: 'subscription',
      type: 'relationship',
      admin: {
        description: 'The subscription the message belongs to, when there is one.',
      },
      index: true,
      maxDepth: 0,
      relationTo: 'subscriptions',
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Sent', value: 'sent' },
        { label: 'Failed', value: 'failed' },
        { label: 'Skipped', value: 'skipped' },
      ],
      required: true,
    },
    {
      name: 'transport',
      type: 'select',
      options: [
        { label: 'ZeptoMail', value: 'zeptomail' },
        { label: 'SMTP', value: 'smtp' },
        { label: 'None', value: 'none' },
      ],
      required: true,
    },
    {
      name: 'fallbackUsed',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'providerMessageId',
      type: 'text',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'errorCode',
      type: 'text',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'errorMessage',
      type: 'textarea',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'triggeredBy',
      type: 'relationship',
      admin: {
        description: 'Set for a test send from the admin panel.',
      },
      maxDepth: 0,
      relationTo: 'users',
    },
    {
      name: 'sentAt',
      type: 'date',
      admin: {
        readOnly: true,
      },
    },
  ],
  hooks: {
    beforeValidate: [prepareEmailLog],
  },
  indexes: [
    { fields: ['createdAt'] },
    { fields: ['triggeredBy', 'templateKey', 'createdAt'] },
  ],
  timestamps: true,
}
