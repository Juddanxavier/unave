import type { GlobalConfig } from 'payload'

import { link } from '@/fields/link'
import { revalidateFooter } from './hooks/revalidateFooter'

/**
 * The footer (design.md §6.15): a short tagline, the Explore and Policies columns,
 * the contact details, the disclaimer and the copyright line. The contact block is
 * a fixed group rather than a column so every detail gets the right field type and
 * the right link (tel:, mailto:, wa.me).
 */
export const Footer: GlobalConfig = {
  slug: 'footer',
  access: {
    read: () => true,
  },
  admin: {
    description: 'The closing band on every page: tagline, link columns, contact, disclaimer.',
    group: 'Site chrome',
  },
  fields: [
    {
      name: 'tagline',
      type: 'text',
      label: 'Tagline',
      defaultValue:
        'Healthy, nutrition-conscious and diabetes-conscious meals, cooked in our kitchen and delivered on schedule.',
    },
    {
      name: 'columns',
      type: 'array',
      label: 'Link columns',
      maxRows: 4,
      admin: {
        description:
          'Two to three columns works best. The contact column is built from the group below.',
        initCollapsed: true,
        components: {
          RowLabel: '@/Footer/RowLabel#RowLabel',
        },
      },
      defaultValue: [
        {
          title: 'Explore',
          links: [
            { link: { type: 'custom', url: '/plans', label: 'Plans' } },
            { link: { type: 'custom', url: '/#how-it-works', label: 'How it works' } },
            { link: { type: 'custom', url: '/#faq', label: 'Common questions' } },
          ],
        },
        {
          title: 'Policies',
          links: [
            { link: { type: 'custom', url: '/delivery', label: 'Delivery' } },
            { link: { type: 'custom', url: '/refunds', label: 'Refunds' } },
            { link: { type: 'custom', url: '/cancellation', label: 'Cancellation' } },
            { link: { type: 'custom', url: '/terms', label: 'Terms' } },
            { link: { type: 'custom', url: '/privacy', label: 'Privacy' } },
          ],
        },
      ],
      fields: [
        {
          name: 'title',
          type: 'text',
          label: 'Column title',
          required: true,
        },
        {
          name: 'links',
          type: 'array',
          label: 'Links',
          minRows: 1,
          fields: [
            link({
              appearances: false,
            }),
          ],
        },
      ],
    },
    {
      name: 'contact',
      type: 'group',
      label: 'Contact details',
      admin: {
        description:
          'Only the fields you fill in are shown. Leave all of them empty to hide the column.',
      },
      fields: [
        {
          name: 'phone',
          type: 'text',
          label: 'Phone',
        },
        {
          name: 'email',
          type: 'email',
          label: 'Email',
        },
        {
          name: 'whatsapp',
          type: 'text',
          label: 'WhatsApp number',
          admin: {
            description: 'Digits only, with the country code. For example: 919840821526',
          },
        },
        {
          name: 'address',
          type: 'textarea',
          label: 'Address',
        },
      ],
    },
    {
      name: 'notice',
      type: 'textarea',
      label: 'Disclaimer',
      defaultValue:
        'Our meals are food options and are not a substitute for medical or nutritional advice.',
      admin: {
        description: 'The small line at the very bottom of the footer (design.md §6.15).',
      },
    },
    {
      name: 'copyright',
      type: 'text',
      label: 'Copyright line',
      defaultValue: '© UNAVE',
    },
  ],
  hooks: {
    afterChange: [revalidateFooter],
  },
}
