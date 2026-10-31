'use server'

import configPromise from '@payload-config'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

import { CART_COOKIE, cartCookieOptions, packCart } from '@/utilities/planCart'

const findActivePlan = async (planId: number) => {
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'plans',
    depth: 0,
    limit: 1,
    overrideAccess: false,
    pagination: false,
    where: {
      id: {
        equals: planId,
      },
    },
  })

  return result.docs[0] ?? null
}

export async function addToCart(formData: FormData) {
  const planId = Number(formData.get('planId'))

  if (!Number.isInteger(planId) || planId <= 0) redirect('/plans')

  // Never trust the submitted id. Re-read the plan through the public access
  // rule, so an inactive or unknown plan can never enter the cart.
  const plan = await findActivePlan(planId)
  if (!plan) redirect('/plans')

  const jar = await cookies()
  jar.set(
    CART_COOKIE,
    packCart({
      addedAt: new Date().toISOString(),
      planId: plan.id,
      slug: plan.slug,
    }),
    cartCookieOptions,
  )

  redirect('/cart')
}

export async function removeFromCart() {
  const jar = await cookies()
  jar.delete(CART_COOKIE)

  redirect('/cart')
}