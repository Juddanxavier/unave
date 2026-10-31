import type { Metadata } from 'next'
import React from 'react'

import { ResetPassword } from '@/components/CustomerAuth/ResetPassword'
import { RESET_COPY } from '@/components/CustomerAuth/copy'

export const metadata: Metadata = {
  description: RESET_COPY.intro,
  robots: { follow: false, index: false, nocache: true },
  title: RESET_COPY.title,
}

// The token arrives in the query string, so this can never be a static page.
export const dynamic = 'force-dynamic'

type Args = {
  searchParams: Promise<{ error?: string; token?: string }>
}

export default async function ResetPasswordPage({ searchParams }: Args) {
  const { error, token } = await searchParams

  return <ResetPassword error={error} token={token} />
}
