import type { GlobalAfterReadHook, GlobalConfig } from 'payload'

import { hasAdminRole, isAdmin } from '../../access/isAdmin'
import { isStaff } from '../../access/isStaff'

const mergeDefaults: GlobalAfterReadHook = ({ doc }) => ({
  ...doc,
  fromAddressDisplay: process.env.MAIL_FROM_ADDRESS ?? '',
  replyToDisplay: process.env.MAIL_REPLY_TO ?? '',
})

export const EmailSettings: GlobalConfig = {
  slug: 'email-settings',
  access: {
    read: isStaff,
    update: isAdmin,
  },
  admin: {
    description:
      'Sender details for account mail, and the copy for order mail. The sender address and reply address come from the server environment.',
    group: 'Email',
  },
  fields: [
    {
      name: 'orderCopy',
      type: 'group',
      label: 'Order emails',
      admin: {
        description:
          'What the kitchen and the customer are told about a paid order. Leave a field blank to use the built in copy.',
      },
      fields: [
        {
          name: 'confirmationSubject',
          label: 'Customer confirmation subject',
          type: 'text',
        },
        {
          name: 'confirmationIntro',
          label: 'Customer confirmation opening line',
          type: 'textarea',
        },
        {
          name: 'confirmationOutro',
          label: 'Customer confirmation closing line',
          type: 'textarea',
        },
        {
          name: 'kitchenSubject',
          label: 'Kitchen notice subject',
          type: 'text',
        },
        {
          name: 'kitchenIntro',
          label: 'Kitchen notice opening line',
          type: 'textarea',
        },
      ],
    },
    {
      name: 'senderName',
      type: 'text',
      admin: {
        description: 'Overrides MAIL_FROM_NAME when set. Leave blank to use the environment name.',
      },
    },
    {
      name: 'fromAddressDisplay',
      type: 'text',
      access: {
        update: () => false,
      },
      admin: {
        description: 'Read only. Set by MAIL_FROM_ADDRESS.',
        readOnly: true,
      },
      defaultValue: process.env.MAIL_FROM_ADDRESS ?? '',
    },
    {
      name: 'replyToDisplay',
      type: 'text',
      access: {
        update: () => false,
      },
      admin: {
        description: 'Read only. Set by MAIL_REPLY_TO.',
        readOnly: true,
      },
      defaultValue: process.env.MAIL_REPLY_TO ?? '',
    },
    {
      name: 'testPanel',
      type: 'ui',
      admin: {
        components: {
          Field: '@/components/EmailTestPanel#EmailTestPanel',
        },
        condition: (_data, _siblingData, { user }) => hasAdminRole(user),
      },
      label: 'Send a test email',
    },
  ],
  hooks: {
    afterRead: [mergeDefaults],
  },
}
