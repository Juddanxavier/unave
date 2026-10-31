import configPromise from '@payload-config'
import { cookies } from 'next/headers'
import { getPayload } from 'payload'

import { authenticateCustomerToken } from '@/auth/customerSession'

import { CUSTOMER_SESSION_COOKIE } from './customerSession'

export type SignedInCustomer = {
  email: string
  id: number | string
  name: string | null
}

/**
 * The signed in customer for a server component, or null.
 *
 * This is the only way the account pages learn who is asking. Nothing downstream
 * accepts a customer id from the client, so a forged value has nowhere to land.
 *
 * The cookie is a Payload JWT, and verification is delegated to Payload's own JWT
 * strategy, so the same signature, expiry, `_verified` and session checks apply here
 * as to any other authenticated Payload request.
 */
export const getSignedInCustomer = async (): Promise<SignedInCustomer | null> => {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value

    if (!token) return null

    const payload = await getPayload({ config: configPromise })
    const customer = await authenticateCustomerToken(payload, token)

    if (!customer) return null

    return {
      email: typeof customer.email === 'string' ? customer.email : '',
      id: customer.id,
      name: typeof customer.name === 'string' ? customer.name : null,
    }
  } catch {
    // A missing secret, a deleted customer or an unreadable cookie all mean the
    // same thing here: nobody is signed in.
    return null
  }
}
