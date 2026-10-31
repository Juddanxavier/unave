import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import { Button } from '@/components/ui/button'
import { getSignedInCustomer } from '@/utilities/customerSessionServer'
import {
  ORDER_PLACED_ACCOUNT,
  ORDER_PLACED_BODY,
  ORDER_PLACED_BROWSE,
  ORDER_PLACED_HEADING,
  ORDER_PLACED_TITLE,
} from '@/utilities/planShopCopy'

export const metadata: Metadata = {
  robots: { follow: false, index: false, nocache: true },
  title: ORDER_PLACED_TITLE,
}

const OrderPlacedPage = async () => {
  const customer = await getSignedInCustomer()

  return (
    <main className="container max-w-3xl py-16 sm:py-20">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{ORDER_PLACED_HEADING}</h1>
      <p className="mt-6 max-w-prose text-base leading-7">{ORDER_PLACED_BODY}</p>
      <div className="mt-8 flex flex-wrap gap-4">
        {customer ? (
          <Button asChild size="lg">
            <Link href="/account">{ORDER_PLACED_ACCOUNT}</Link>
          </Button>
        ) : null}
        <Button asChild size="lg" variant="outline">
          <Link href="/plans">{ORDER_PLACED_BROWSE}</Link>
        </Button>
      </div>
    </main>
  )
}

export default OrderPlacedPage
