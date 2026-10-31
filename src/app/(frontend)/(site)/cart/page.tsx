import type { Metadata } from 'next'

import configPromise from '@payload-config'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { getPayload } from 'payload'
import React from 'react'

import { Media } from '@/components/Media'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatPlanPrice, planPeriodWord } from '@/utilities/planDisplay'
import { CART_COOKIE, parseCart } from '@/utilities/planCart'
import { isRazorpayConfigured } from '@/utilities/razorpay'
import { getSignedInCustomer } from '@/utilities/customerSessionServer'
import {
  CART_BROWSE,
  CART_EMPTY,
  CART_EMPTY_ACTION,
  CART_HEADING,
  CART_TITLE,
  CART_UNAVAILABLE,
  mealsLine,
  priceLine,
} from '@/utilities/planShopCopy'

import { RemoveFromCart } from './RemoveFromCart'
import { CheckoutForm } from './CheckoutForm'
import { PlanImagePlaceholder } from '../plans/PlanImagePlaceholder'

export const metadata: Metadata = {
  robots: { follow: false, index: false, nocache: true },
  title: CART_TITLE,
}

const CartShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <main className="container max-w-3xl py-16 sm:py-20">
    <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{CART_HEADING}</h1>
    <div className="mt-8">{children}</div>
  </main>
)

const CartNotice: React.FC<{ message: string }> = ({ message }) => (
  <CartShell>
    <div className="flex flex-col gap-4 rounded-lg border p-8">
      <p className="text-base">{message}</p>
      <div>
        <Button asChild variant="outline">
          <Link href="/plans">{CART_EMPTY_ACTION}</Link>
        </Button>
      </div>
    </div>
  </CartShell>
)

export default async function CartPage() {
  const jar = await cookies()
  const entry = parseCart(jar.get(CART_COOKIE)?.value)

  if (!entry) {
    return <CartNotice message={CART_EMPTY} />
  }

  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'plans',
    depth: 1,
    limit: 1,
    overrideAccess: false,
    pagination: false,
    where: {
      id: {
        equals: entry.planId,
      },
    },
  })

  const plan = result.docs[0] ?? null

  // A page render cannot change a cookie, so the stale entry stays until the
  // next add or remove. It can never show a plan, because this read is live.
  if (!plan) {
    return <CartNotice message={CART_UNAVAILABLE} />
  }

  // Prefill from the signed in customer's profile. A guest just types into an
  // empty form; an account is never a requirement to order.
  const customer = await getSignedInCustomer()
  const profile = customer
    ? await payload.findByID({
        collection: 'customers',
        depth: 0,
        id: customer.id,
        overrideAccess: true,
        select: {
          address: { city: true, line1: true, line2: true, pincode: true, state: true },
          name: true,
          phone: true,
        },
      })
    : null

  const defaults = {
    city: profile?.address?.city ?? '',
    customerName: profile?.name ?? customer?.name ?? '',
    email: customer?.email ?? '',
    line1: profile?.address?.line1 ?? '',
    line2: profile?.address?.line2 ?? '',
    phone: profile?.phone ?? '',
    pincode: profile?.address?.pincode ?? '',
    state: profile?.address?.state ?? '',
  }

  const image = plan.image && typeof plan.image === 'object' ? plan.image : null
  const line = priceLine(formatPlanPrice(plan.price), planPeriodWord(plan.billingPeriod))
  const meals = mealsLine(plan.mealsPerWeek)

  return (
    <CartShell>
      <Card>
        <CardHeader>
          <CardTitle>{plan.title}</CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-muted relative aspect-square w-24 shrink-0 overflow-hidden rounded-md">
              {image ? (
                <Media fill imgClassName="object-cover" resource={image} size="96px" />
              ) : (
                <PlanImagePlaceholder />
              )}
            </div>

            <div className="flex flex-col gap-1">
              {line ? <p className="text-base font-semibold">{line}</p> : null}
              {meals ? <p className="text-muted-foreground text-sm">{meals}</p> : null}
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t pt-6">
            <CheckoutForm
              available={isRazorpayConfigured()}
              defaults={defaults}
              emailLocked={Boolean(customer)}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <RemoveFromCart />
            <Link className="text-sm underline underline-offset-4" href="/plans">
              {CART_BROWSE}
            </Link>
          </div>
        </CardContent>
      </Card>
    </CartShell>
  )
}