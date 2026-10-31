'use server'

import configPromise from '@payload-config'
import { refresh } from 'next/cache'
import { getPayload } from 'payload'

import { customerProfileSchema } from '@/utilities/customerProfile'
import { getSignedInCustomer } from '@/utilities/customerSessionServer'
import type { FieldErrors } from '@/utilities/fieldErrors'
import { toFieldErrors } from '@/utilities/fieldErrors'

import { ACCOUNT_PROFILE_INVALID, ACCOUNT_PROFILE_SAVE_FAILED } from './copy'

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
