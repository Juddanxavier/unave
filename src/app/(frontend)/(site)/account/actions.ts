'use server'

import configPromise from '@payload-config'
import { refresh } from 'next/cache'
import { getPayload } from 'payload'

import { customerProfileSchema } from '@/utilities/customerProfile'
import { orderRequestSchema } from '@/utilities/orderRequest'
import { getSignedInCustomer } from '@/utilities/customerSessionServer'
import type { FieldErrors } from '@/utilities/fieldErrors'
import { toFieldErrors } from '@/utilities/fieldErrors'

import {
  ACCOUNT_PROFILE_INVALID,
  ACCOUNT_PROFILE_SAVE_FAILED,
  ACCOUNT_REQUEST_DUPLICATE,
  ACCOUNT_REQUEST_FAILED,
  ACCOUNT_REQUEST_INVALID,
  ACCOUNT_REQUEST_ORDER_MISSING,
} from './copy'

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

export type SendOrderRequestState =
  | { status: 'idle' }
  | { status: 'error'; fieldErrors?: FieldErrors; message: string }
  | { status: 'signed-out' }
  | { status: 'done' }

/**
 * File a pause or cancellation request against one of the customer's own orders
 * (design.md §6.15).
 *
 * The row is a message, not a change: a paid order is the receipt and is never
 * rewritten, so the kitchen answers this by hand. Access is `create: () => false`
 * on the collection, which makes this the only door, and it never trusts the
 * browser about whose order it is — the id in the form has to match the customer
 * the session names.
 */
export const sendOrderRequest = async (
  _previous: SendOrderRequestState,
  formData: FormData,
): Promise<SendOrderRequestState> => {
  const customer = await getSignedInCustomer()
  if (!customer) return { status: 'signed-out' }

  const read = (field: string): string => String(formData.get(field) ?? '')

  const parsed = orderRequestSchema.safeParse({
    from: read('from'),
    orderId: read('orderId'),
    reason: read('reason'),
    to: read('to'),
    type: read('type'),
  })

  if (!parsed.success) {
    return {
      status: 'error',
      fieldErrors: toFieldErrors(parsed.error),
      message: ACCOUNT_REQUEST_INVALID,
    }
  }

  const payload = await getPayload({ config: configPromise })

  let orderId: null | number = null

  try {
    const order = await payload.findByID({
      collection: 'orders',
      depth: 0,
      id: parsed.data.orderId,
      overrideAccess: true,
    })

    if (order && String(order.customer) === String(customer.id)) orderId = Number(order.id)
  } catch {
    orderId = null
  }

  if (orderId === null) return { status: 'error', message: ACCOUNT_REQUEST_ORDER_MISSING }

  // One open ask per order and kind, so a double press cannot queue two of them.
  const open = await payload.find({
    collection: 'order-requests',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: {
      and: [
        { order: { equals: orderId } },
        { status: { equals: 'new' } },
        { type: { equals: parsed.data.type } },
      ],
    },
  })

  if (open.docs.length > 0) return { status: 'error', message: ACCOUNT_REQUEST_DUPLICATE }

  try {
    await payload.create({
      collection: 'order-requests',
      data: {
        customer: Number(customer.id),
        order: orderId,
        reason: parsed.data.reason,
        status: 'new',
        type: parsed.data.type,
        ...(parsed.data.type === 'pause'
          ? {
              pauseFrom: `${parsed.data.from}T00:00:00.000Z`,
              pauseTo: `${parsed.data.to}T00:00:00.000Z`,
            }
          : {}),
      },
      depth: 0,
      overrideAccess: true,
    })
  } catch {
    payload.logger.error({ msg: 'order_request_write_failed', order: orderId })
    return { status: 'error', message: ACCOUNT_REQUEST_FAILED }
  }

  refresh()

  return { status: 'done' }
}
