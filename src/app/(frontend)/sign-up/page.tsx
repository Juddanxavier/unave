import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import React from 'react'

import { CustomerAuth } from '@/components/CustomerAuth'
import { CUSTOMER_AUTH_COPY } from '@/components/CustomerAuth/copy'
import { getSignedInCustomer } from '@/utilities/customerSessionServer'

const copy = CUSTOMER_AUTH_COPY['sign-up']

export const metadata: Metadata = {
  description: copy.intro,
  robots: { follow: false, index: false, nocache: true },
  title: copy.title,
}

// The page reflects a query parameter and closes over no shared state.
export const dynamic = 'force-dynamic'

type Args = {
  searchParams: Promise<{ error?: string }>
}

export default async function SignUpPage({ searchParams }: Args) {
  // A signed in customer has no use for a second sign up form.
  if (await getSignedInCustomer()) redirect('/account')

  const { error } = await searchParams

  return <CustomerAuth error={error} mode="sign-up" />
}
