import type { CollectionConfig } from 'payload'

import { isStaff, hasStaffRole } from '../../access/isStaff'
import { preventPlanDelete } from './hooks/preventPlanDelete'
import { slugField } from 'payload'

export const Plans: CollectionConfig = {
  slug: 'plans',
  access: {
    create: isStaff,
    delete: isStaff,
    read: ({ req: { user } }) => {
      if (hasStaffRole(user)) return true

      return {
        isActive: {
          equals: true,
        },
      }
    },
    update: isStaff,
  },
  admin: {
    defaultColumns: ['title', 'billingPeriod', 'mealsPerWeek', 'price', 'isActive', 'updatedAt'],
    group: 'Plans and subscriptions',
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'summary',
      type: 'textarea',
      admin: {
        description: 'Short text for the plan card.',
      },
    },
    {
      name: 'description',
      type: 'richText',
      admin: {
        description: 'Long text for the plan detail page.',
      },
    },
    {
      name: 'billingPeriod',
      type: 'select',
      admin: {
        description: 'How long one paid period runs.',
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
      required: true,
    },
    {
      name: 'mealsPerWeek',
      type: 'number',
      admin: {
        description: 'How many meals the customer gets each week.',
        step: 1,
      },
      min: 1,
      required: true,
    },
    {
      name: 'price',
      label: 'Price in rupees',
      type: 'number',
      admin: {
        description: 'Whole rupees, tax included.',
        step: 1,
      },
      min: 1,
      required: true,
    },
    {
      name: 'highlights',
      type: 'array',
      admin: {
        description: 'Short lines shown on the plan page, for example what is included.',
      },
      fields: [
        {
          name: 'text',
          type: 'text',
          required: true,
        },
      ],
      maxRows: 8,
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'isActive',
      label: 'Available to buy',
      type: 'checkbox',
      admin: {
        description: 'Only active plans appear on the public site.',
        position: 'sidebar',
      },
      defaultValue: false,
      index: true,
    },
    {
      name: 'sortOrder',
      type: 'number',
      admin: {
        description: 'Lower numbers appear first.',
        position: 'sidebar',
      },
      defaultValue: 0,
    },
    slugField(),
  ],
  hooks: {
    beforeDelete: [preventPlanDelete],
  },
}
