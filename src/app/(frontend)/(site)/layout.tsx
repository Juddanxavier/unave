import { AdminBar } from '@/components/AdminBar'
import { Footer } from '@/Footer/Component'
import { Header } from '@/Header/Component'
import { draftMode } from 'next/headers'
import React from 'react'

/**
 * The chrome for every public content page.
 *
 * Header and footer live here rather than in the root layout so the account screens
 * can opt out of them. Route groups do not change a URL, so `/about` and `/sign-in`
 * keep the paths they had: the only difference is which layout wraps them.
 *
 * The site chrome is a Payload global (see AGENTS.md), so this file stays a thin
 * renderer and changing copy never means touching a component here.
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { isEnabled } = await draftMode()

  return (
    <>
      <AdminBar
        adminBarProps={{
          preview: isEnabled,
        }}
      />
      <Header />
      {children}
      <Footer />
    </>
  )
}
