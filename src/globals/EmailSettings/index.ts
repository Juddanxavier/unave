import type { GlobalAfterReadHook, GlobalConfig, TextareaField } from 'payload'

import { hasAdminRole, isAdmin } from '../../access/isAdmin'
import { isStaff } from '../../access/isStaff'
import { mergeCancellationCopy } from '../../email/copy'

const mergeDefaults: GlobalAfterReadHook = ({ doc }) => ({
  ...doc,
  fromAddressDisplay: process.env.MAIL_FROM_ADDRESS ?? '',
  replyToDisplay: process.env.MAIL_REPLY_TO ?? '',
  cancellation: mergeCancellationCopy(doc?.cancellation),
})

const copyField = (name: string, label: string): TextareaField => ({
  name,
  type: 'textarea',
  label,
  admin: {
    description: 'Leave blank to use the default.',
    rows: 3,
  },
})

export const EmailSettings: GlobalConfig = {
  slug: 'email-settings',
  access: {
    read: isStaff,
    update: isAdmin,
  },
  admin: {
    description:
      'Copy for the plan emails. The sender address and reply address come from the server environment.',
    group: 'Email',
  },
  fields: [
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
      name: 'cancellation',
      type: 'group',
      admin: {
        description: 'The message a customer receives after cancelling their plan.',
      },
      fields: [
        copyField('subject', 'Subject'),
        copyField('heading', 'Heading'),
        copyField('intro', 'Intro'),
        copyField('footerNote', 'Footer note'),
        copyField('signature', 'Signature'),
      ],
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
