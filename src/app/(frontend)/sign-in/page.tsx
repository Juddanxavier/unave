import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import React from 'react'

import { CustomerAuth } from '@/components/CustomerAuth'
import { CUSTOMER_AUTH_COPY } from '@/components/CustomerAuth/copy'
import { getSignedInCustomer } from '@/utilities/customerSessionServer'

const copy = CUSTOMER_AUTH_COPY['sign-in']

export const metadata: Metadata = {
  description: copy.intro,
  robots: { follow: false, index: false, nocache: true },
  title: copy.title,
}

// The page reflects a query parameter and closes over no shared state.
export const dynamic = 'force-dynamic'

type Args = {
  searchParams: Promise<{
    error?: string
    registered?: string
    resent?: string
    verified?: string
  }>
}

export default async function SignInPage({ searchParams }: Args) {
  // A signed in customer has no use for a second sign in form.
  if (await getSignedInCustomer()) redirect('/account')

  const { error, registered, resent, verified } = await searchParams
  // The endpoint sets at most one of these, but a hand edited URL can set several,
  // so the first one wins in the order a visitor could actually have got here.
  const notice = verified ? 'verified' : resent ? 'resent' : registered ? 'registered' : undefined

  return <CustomerAuth error={error} mode="sign-in" notice={notice} />
}
