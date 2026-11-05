import type { CollectionConfig } from 'payload'

import { anyone } from '../../access/anyone'
import { isStaff } from '../../access/isStaff'

import { revalidatePlans, revalidatePlansDelete } from './hooks/revalidatePlans'

/**
 * A meal plan the kitchen sells on the site (spec 0007).
 *
 * A plan is a duration of meals — a week, a month — paid once, upfront. Staff
 * own the catalogue: titles, prices and availability are all edited in the
 * admin, never in code. Anyone can read a plan, because browsing is open to
 * everybody; only staff can change one.
 *
 * Prices are stored as integers in paise, the same unit the order rows and the
 * gateway speak, so no conversion ever happens on the way to a payment. The
 * admin shows and accepts rupees through the shared money field, which is the
 * only place the two units meet. Turning `available` off pauses a plan: it
 * still renders on `/plans` with a paused label, but it cannot enter a new
 * order.
 */
export const Plans: CollectionConfig = {
  slug: 'plans',
  access: {
    create: isStaff,
    delete: isStaff,
    read: anyone,
    update: isStaff,
  },
  admin: {
    defaultColumns: ['title', 'category', 'available', 'updatedAt'],
    description:
      'The meal plans sold on the site. Turn `available` off to pause a plan without deleting it; prices are entered and shown in rupees.',
    group: 'Store',
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Lowercase, with dashes instead of spaces. Anchors the plan on /plans and travels in checkout links.',
      },
    },
    {
      name: 'description',
      type: 'richText',
      label: 'Description',
    },
    {
      name: 'points',
      type: 'array',
      label: 'Points',
      maxRows: 5,
      admin: {
        description: 'Up to five short lines shown on the plan card, under the description. For example "Delivered in an insulated tiffin".',
      },
      fields: [
        {
          name: 'point',
          label: 'Point',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'image',
      type: 'upload',
      label: 'Photo',
      relationTo: 'media',
    },
    {
      name: 'durations',
      type: 'array',
      label: 'Durations',
      required: true,
      admin: {
        description: 'What a customer chooses: a label, how many days of meals it covers, and the price in rupees.',
      },
      fields: [
        {
          name: 'label',
          label: 'Label',
          type: 'text',
          required: true,
          admin: {
            description: 'Shown on the plan card and at checkout, for example "One week".',
          },
        },
        {
          name: 'days',
          label: 'Days',
          type: 'number',
          required: true,
          min: 1,
        },
        {
          name: 'price',
          label: 'Price (₹)',
          type: 'number',
          required: true,
          min: 1,
          admin: {
            components: {
              Field: '@/components/Admin/RupeeField#RupeeField',
            },
            description: 'What the customer pays for this duration, in rupees. 499 means ₹499.',
          },
        },
      ],
    },
    {
      name: 'category',
      type: 'select',
      label: 'Category',
      required: true,
      admin: {
        description: 'How the meal reaches the customer. Shown as a label on the plan card.',
      },
      options: [
        { label: 'Ready to cook', value: 'ready-to-cook' },
        { label: 'Ready to eat', value: 'ready-to-eat' },
        { label: 'Fresh from produce', value: 'fresh-from-produce' },
      ],
    },
    {
      name: 'audience',
      type: 'select',
      label: 'Audience',
      required: true,
      admin: {
        description: 'Who the plan is for. Shown as a label on the plan card, next to the category.',
      },
      options: [
        { label: 'Kids', value: 'kids' },
        { label: 'Adults', value: 'adults' },
        { label: 'Special', value: 'special' },
      ],
    },
    {
      name: 'available',
      label: 'Available',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Off means the plan shows a paused label and cannot be bought.',
        position: 'sidebar',
      },
    },
  ],
  hooks: {
    afterChange: [revalidatePlans],
    afterDelete: [revalidatePlansDelete],
  },
  labels: {
    plural: 'Plans',
    singular: 'Plan',
  },
  timestamps: true,
}
