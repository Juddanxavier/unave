import { Footer } from '@/Footer/Component'
import { Header } from '@/Header/Component'
import Link from 'next/link'
import React from 'react'

import { Button } from '@/components/ui/button'

/**
 * The 404.
 *
 * It sits outside the `(site)` group, so it draws the header and footer itself —
 * without that, one mistyped URL would land on a page with no way back to the shop.
 */
export default function NotFound() {
  return (
    <>
      <Header />
      <div className="container py-28">
        <div className="prose max-w-none">
          <h1 style={{ marginBottom: 0 }}>404</h1>
          <p className="mb-4">This page could not be found.</p>
        </div>
        <Button asChild variant="default">
          <Link href="/">Go home</Link>
        </Button>
      </div>
      <Footer />
    </>
  )
}
