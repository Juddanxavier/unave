import type { CollectionConfig } from 'payload'

import { isAdmin } from '../../access/isAdmin'
import { enquiryEndpoint } from './endpoints'

/**
 * What the contact form on `/contact` collects (spec 0006).
 *
 * An enquiry is a message from somebody who is not a customer yet, so the
 * collection exists for two reasons: the kitchen can read and triage it in the
 * admin, and the row is the record of what was asked even when the notification
 * email fails. The public REST `create` is switched off on purpose — the only
 * public write is the form endpoint in `endpoints.ts`, which validates, rate
 * limits and can refuse, none of which a raw REST create should allow.
 */
export const Enquiries: CollectionConfig = {
  slug: 'enquiries',
  access: {
    // No public create anywhere; the contact form goes through /api/enquiries/send.
    create: () => false,
    delete: isAdmin,
    read: isAdmin,
    update: isAdmin,
  },
  admin: {
    defaultColumns: ['name', 'email', 'phone', 'handled', 'createdAt'],
    description: 'Messages from the contact form. One row per message, newest last.',
    group: 'Customers',
    useAsTitle: 'email',
  },
  endpoints: [enquiryEndpoint],
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'email',
      type: 'email',
      required: true,
    },
    {
      name: 'phone',
      type: 'text',
    },
    {
      name: 'message',
      type: 'textarea',
      maxLength: 2000,
      required: true,
    },
    {
      name: 'handled',
      label: 'Answered',
      type: 'checkbox',
      admin: {
        description: 'Tick when somebody has replied to this person.',
        position: 'sidebar',
      },
      defaultValue: false,
    },
  ],
  labels: {
    plural: 'Enquiries',
    singular: 'Enquiry',
  },
}
