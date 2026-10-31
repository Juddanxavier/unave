import configPromise from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import { getServerSideURL } from '@/utilities/getURL'

/**
 * The confirm-your-address link from a sign-up email.
 *
 * This is a route handler rather than a Payload endpoint so the link in the email
 * can be a clean `/verify-email?token=...` on the public site. It is a GET that
 * changes state, which is what an emailed link has to be, and it is safe to
 * repeat: Payload clears `_verificationToken` when it confirms, so a second click
 * finds nothing and lands on the same used-link message instead of confirming twice.
 */
export const dynamic = 'force-dynamic'

const backToSignIn = (params: Record<string, string>): NextResponse =>
  NextResponse.redirect(
    new URL(`/sign-in?${new URLSearchParams(params).toString()}`, getServerSideURL()),
    303,
  )

export async function GET(request: Request): Promise<NextResponse> {
  let token: string | null = null

  try {
    token = new URL(request.url).searchParams.get('token')
  } catch {
    token = null
  }

  if (!token) return backToSignIn({ error: 'verify' })

  try {
    const payload = await getPayload({ config: configPromise })

    // Payload finds the row by `_verificationToken`, sets `_verified` and spends
    // the token. There is no hash of our own to compare any more.
    await payload.verifyEmail({ collection: 'customers', token })

    return backToSignIn({ verified: '1' })
  } catch (error) {
    // A used or unknown token is a bad link. A database that will not answer is
    // not, and saying so would send people looking for an email they do not need.
    const name = error && typeof error === 'object' ? (error as { name?: string }).name : ''

    if (name === 'APIError' || name === 'Forbidden') {
      return backToSignIn({ error: 'verify' })
    }

    return backToSignIn({ error: 'session' })
  }
}
