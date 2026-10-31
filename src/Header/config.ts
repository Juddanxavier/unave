import type { FieldHook, GlobalConfig } from 'payload'

import { link } from '@/fields/link'
import { revalidateHeader } from './hooks/revalidateHeader'

/**
 * What the announcement bar says before it is edited for the first time. The read
 * hook below falls back to these, so moving the bar into the CMS did not blank it
 * out on the global document that already existed (design.md §1: no countdown and
 * no invented scarcity).
 */
const ANNOUNCEMENT_DEFAULTS = {
  enabled: true,
  text: "This week's menu is live",
  note: 'Weekly and monthly plans are open',
  linkLabel: 'See plans',
  linkUrl: '/plans',
} as const

/** Fill a field with its default when the stored document has no value yet. */
const fillDefault =
  (fallback: string | boolean): FieldHook =>
  ({ value }) =>
    value ?? fallback

/**
 * The sticky bar at the top of every page (design.md §6.2).
 *
 * Everything here is editorial: the announcement strip above the bar, the links,
 * the primary button and the floating WhatsApp button all come from the CMS, so
 * nothing in the chrome has to be touched in code to change it.
 */
export const Header: GlobalConfig = {
  slug: 'header',
  access: {
    read: () => true,
  },
  admin: {
    description:
      'The top of every page: the announcement strip, menu links, the primary button, WhatsApp.',
    group: 'Site chrome',
  },
  fields: [
    {
      name: 'announcement',
      type: 'group',
      label: 'Announcement bar',
      admin: {
        description:
          'The strip above the navbar on every page. Untick it and it disappears everywhere (design.md §6.2).',
      },
      fields: [
        {
          name: 'enabled',
          type: 'checkbox',
          defaultValue: ANNOUNCEMENT_DEFAULTS.enabled,
          hooks: { afterRead: [fillDefault(ANNOUNCEMENT_DEFAULTS.enabled)] },
          label: 'Show the announcement bar',
        },
        {
          name: 'text',
          type: 'text',
          label: 'Headline',
          defaultValue: ANNOUNCEMENT_DEFAULTS.text,
          hooks: { afterRead: [fillDefault(ANNOUNCEMENT_DEFAULTS.text)] },
          admin: {
            description: 'The gold line on the left.',
          },
        },
        {
          name: 'note',
          type: 'text',
          label: 'Supporting line',
          defaultValue: ANNOUNCEMENT_DEFAULTS.note,
          hooks: { afterRead: [fillDefault(ANNOUNCEMENT_DEFAULTS.note)] },
          admin: {
            description: 'The quieter line beside the headline.',
          },
        },
        {
          name: 'linkLabel',
          type: 'text',
          label: 'Link label',
          defaultValue: ANNOUNCEMENT_DEFAULTS.linkLabel,
          hooks: { afterRead: [fillDefault(ANNOUNCEMENT_DEFAULTS.linkLabel)] },
          admin: {
            description: 'The underlined words on the right, for example "See plans".',
          },
        },
        {
          name: 'linkUrl',
          type: 'text',
          label: 'Link',
          defaultValue: ANNOUNCEMENT_DEFAULTS.linkUrl,
          hooks: { afterRead: [fillDefault(ANNOUNCEMENT_DEFAULTS.linkUrl)] },
          admin: {
            description: 'The whole bar links here. A path such as /plans, or a full URL.',
          },
        },
        {
          name: 'newTab',
          type: 'checkbox',
          defaultValue: false,
          label: 'Open in a new tab',
        },
      ],
    },
    {
      name: 'navItems',
      type: 'array',
      label: 'Menu links',
      maxRows: 6,
      admin: {
        description: 'Shown in the desktop bar and in the mobile drawer. Six at most.',
        initCollapsed: true,
        components: {
          RowLabel: '@/Header/RowLabel#RowLabel',
        },
      },
      fields: [
        link({
          appearances: false,
        }),
      ],
    },
    {
      name: 'cta',
      type: 'group',
      label: 'Primary button',
      admin: {
        description: 'The pill on the right of the bar, repeated at the foot of the mobile menu.',
      },
      defaultValue: {
        label: 'Start My Subscription',
        url: '/plans',
      },
      fields: [
        {
          name: 'label',
          type: 'text',
          label: 'Label',
          required: true,
        },
        {
          name: 'url',
          type: 'text',
          label: 'Link',
          required: true,
          admin: {
            description: 'A path such as /plans, or a full URL.',
          },
        },
        {
          name: 'newTab',
          type: 'checkbox',
          defaultValue: false,
          label: 'Open in a new tab',
        },
      ],
    },
    {
      name: 'whatsapp',
      type: 'group',
      label: 'WhatsApp button',
      admin: {
        description:
          'The floating button at the bottom right. Leave the number empty and it stays hidden.',
      },
      fields: [
        {
          name: 'number',
          type: 'text',
          label: 'Number',
          admin: {
            description: 'Digits only, with the country code. For example: 919840821526',
          },
        },
        {
          name: 'message',
          type: 'text',
          label: 'Pre-filled message',
          admin: {
            description: 'Optional. Appears in the chat box when the customer taps the button.',
          },
        },
      ],
    },
  ],
  hooks: {
    afterChange: [revalidateHeader],
  },
}
