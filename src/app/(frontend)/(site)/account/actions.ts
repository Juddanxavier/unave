'use server'

import configPromise from '@payload-config'
import { refresh } from 'next/cache'
import { after } from 'next/server'
import { getPayload } from 'payload'

import { sendTemplateMail } from '@/email/send'
import { customerProfileSchema } from '@/utilities/customerProfile'
import { getSignedInCustomer } from '@/utilities/customerSessionServer'
import type { FieldErrors } from '@/utilities/fieldErrors'
import { toFieldErrors } from '@/utilities/fieldErrors'
import { startOfUtcDay } from '@/utilities/planDates'
import { planTitleOf } from '@/utilities/planSubscription'

import {
  ACCOUNT_ALREADY_CHANGED,
  ACCOUNT_EMPTY_REASON,
  ACCOUNT_LONG_REASON,
  ACCOUNT_PROFILE_INVALID,
  ACCOUNT_PROFILE_SAVE_FAILED,
} from './copy'

const REASON_MAX = 500

export type CancelCustomerPlanState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'signed-out' }
  | { status: 'done' }

export type SaveCustomerProfileState =
  | { status: 'idle' }
  | { status: 'error'; fieldErrors?: FieldErrors; message: string }
  | { status: 'signed-out' }
  | { status: 'done' }

/**
 * Save the signed in customer's delivery details and food preference.
 *
 * The collection refuses REST writes from a customer (`update: isAdmin`), so the
 * save goes through here with `overrideAccess` — and only ever targets the row the
 * session names, writing the four profile fields and nothing else. Email, name,
 * password and `hasPassword` have no path from this form.
 */
export const saveCustomerProfile = async (
  _previous: SaveCustomerProfileState,
  formData: FormData,
): Promise<SaveCustomerProfileState> => {
  const customer = await getSignedInCustomer()
  if (!customer) return { status: 'signed-out' }

  const read = (field: string): string => String(formData.get(field) ?? '')

  const parsed = customerProfileSchema.safeParse({
    city: read('city'),
    foodPreference: read('foodPreference'),
    line1: read('line1'),
    line2: read('line2'),
    phone: read('phone'),
    pincode: read('pincode'),
    state: read('state'),
  })

  if (!parsed.success) {
    return {
      status: 'error',
      fieldErrors: toFieldErrors(parsed.error),
      message: ACCOUNT_PROFILE_INVALID,
    }
  }

  const payload = await getPayload({ config: configPromise })

  try {
    await payload.update({
      collection: 'customers',
      data: {
        address: {
          city: parsed.data.city,
          line1: parsed.data.line1,
          line2: parsed.data.line2 || null,
          pincode: parsed.data.pincode,
          state: parsed.data.state,
        },
        foodPreference: parsed.data.foodPreference ?? 'none',
        phone: parsed.data.phone,
      },
      depth: 0,
      id: customer.id,
      overrideAccess: true,
    })
  } catch {
    payload.logger.error({ msg: 'customer_profile_write_failed' })
    return { status: 'error', message: ACCOUNT_PROFILE_SAVE_FAILED }
  }

  refresh()

  return { status: 'done' }
}

/**
 * Cancel one of the signed in customer's plans.
 *
 * Two guards, both needed. The read filters on the session `customer` id, so a
 * tampered `subscriptionId` belonging to someone else is simply not found. The
 * atomic `UPDATE` repeats that same `customer_id` predicate, so a plan that changed
 * hands between the read and the write still cannot be touched.
 */
export const cancelCustomerPlan = async (
  _previous: CancelCustomerPlanState,
  formData: FormData,
): Promise<CancelCustomerPlanState> => {
  const customer = await getSignedInCustomer()
  if (!customer) return { status: 'signed-out' }

  const subscriptionId = Number(formData.get('subscriptionId'))
  const reason = String(formData.get('reason') ?? '').trim()

  if (!Number.isInteger(subscriptionId) || subscriptionId <= 0) {
    return { status: 'error', message: ACCOUNT_ALREADY_CHANGED }
  }

  if (reason.length === 0) return { status: 'error', message: ACCOUNT_EMPTY_REASON }
  if (reason.length > REASON_MAX) return { status: 'error', message: ACCOUNT_LONG_REASON }

  const payload = await getPayload({ config: configPromise })

  const found = await payload.find({
    collection: 'subscriptions',
    depth: 1,
    limit: 1,
    overrideAccess: true,
    select: {
      customerName: true,
      email: true,
      plan: true,
    },
    where: {
      and: [{ id: { equals: subscriptionId } }, { customer: { equals: customer.id } }],
    },
  })

  const doc = found.docs[0] as Record<string, unknown> | undefined
  if (!doc) return { status: 'error', message: ACCOUNT_ALREADY_CHANGED }

  const now = new Date()
  const cancelledAt = now.toISOString()

  // The atomic guard. A second submit, a staff change or a hand-off to another
  // customer returns no row.
  const result = await payload.db.pool.query(
    `UPDATE subscriptions
        SET status = 'cancelled',
            cancelled_at = $3,
            cancelled_by = 'customer',
            cancellation_reason = $4
      WHERE id = $1
        AND customer_id = $5
        AND status = 'active'
        AND (end_date IS NULL OR end_date >= $2)
      RETURNING id`,
    [doc.id, startOfUtcDay(now), cancelledAt, reason, customer.id],
  )

  if ((result.rowCount ?? 0) === 0) {
    return { status: 'error', message: ACCOUNT_ALREADY_CHANGED }
  }

  const planTitle = planTitleOf(doc.plan) ?? ''
  const to = typeof doc.email === 'string' ? doc.email : customer.email
  const recipientName = typeof doc.customerName === 'string' ? doc.customerName : undefined

  // Scheduled so it does not delay the response. A failed send leaves the cancel in
  // place and is recorded by the mail module.
  after(async () => {
    try {
      await sendTemplateMail(payload, {
        cancelledAt,
        planTitle,
        recipientName,
        subscriptionId,
        templateKey: 'cancellation',
        to,
      })
    } catch {
      payload.logger.error({ msg: 'cancellation_email_dispatch_failed' })
    }
  })

  refresh()

  return { status: 'done' }
}
