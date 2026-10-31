import type { Metadata } from 'next'
import React from 'react'

import { ForgotPassword } from '@/components/CustomerAuth/ForgotPassword'
import { FORGOT_COPY } from '@/components/CustomerAuth/copy'

export const metadata: Metadata = {
  description: FORGOT_COPY.intro,
  robots: { follow: false, index: false, nocache: true },
  title: FORGOT_COPY.title,
}

// The page reflects a query parameter and closes over no shared state.
export const dynamic = 'force-dynamic'

type Args = {
  searchParams: Promise<{ error?: string; sent?: string }>
}

export default async function ForgotPasswordPage({ searchParams }: Args) {
  const { error, sent } = await searchParams

  return <ForgotPassword error={error} sent={sent} />
}
