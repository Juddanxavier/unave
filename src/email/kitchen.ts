import type { Payload } from 'payload'

import type { Footer } from '@/payload-types'

/**
 * The inbox the kitchen reads.
 *
 * Every notice that knocks on the kitchen's shoulder goes to the contact email
 * the footer global already owns (Site chrome > Footer), so changing the inbox
 * is one admin edit and never a code change. When none is set, the notice is
 * skipped: the row in the admin is the record, and the admin is the backup
 * inbox.
 */
export const kitchenInbox = async (payload: Payload): Promise<string> => {
  try {
    const footer = (await payload.findGlobal({ slug: 'footer', depth: 0 })) as Footer | null
    return footer?.contact?.email?.trim() ?? ''
  } catch {
    return ''
  }
}
