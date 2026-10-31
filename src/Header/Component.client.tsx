'use client'

import { Menu, MessageCircle, Search } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect, useRef, useState } from 'react'

import type { Header as HeaderType } from '@/payload-types'

import { CTA_BASE, CTA_VARIANTS } from '@/components/Cta'
import { Logo } from '@/components/Logo/Logo'
import { useHeaderTheme } from '@/providers/HeaderTheme'
import { cn } from '@/utilities/ui'
import { AccountLinks } from './AccountLinks'
import { MobileMenu } from './MobileMenu'
import { HeaderNav } from './Nav'
import { AnnouncementBar } from './AnnouncementBar'

interface HeaderClientProps {
  data: HeaderType
}

export const HeaderClient: React.FC<HeaderClientProps> = ({ data }) => {
  /* Storing the value in a useState to avoid hydration errors */
  const [theme, setTheme] = useState<string | null>(null)
  /* Past the top of the page the bar turns green and the logo gold (design.md §6.2) */
  const [scrolled, setScrolled] = useState(false)
  /* The announcement strip tucks away on the way down and returns on the way up */
  const [stripHidden, setStripHidden] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  /* `null` until the session check answers, so nothing is guessed and nothing flickers. */
  const [session, setSession] = useState<{ name: string | null; signedIn: boolean } | null>(null)
  const signedIn = session?.signedIn ?? null
  const lastScrollY = useRef(0)
  const { headerTheme, setHeaderTheme } = useHeaderTheme()
  const pathname = usePathname()
  const drawerRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const navItems = data?.navItems || []
  const announcement = data?.announcement
  const cta = data?.cta
  const whatsappNumber = data?.whatsapp?.number
  const whatsappMessage = data?.whatsapp?.message

  useEffect(() => {
    setHeaderTheme(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  useEffect(() => {
    if (headerTheme && headerTheme !== theme) setTheme(headerTheme)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headerTheme])

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 8)
      /* Hide only once past the top and moving down, so a small scroll back up
         brings the strip straight back. */
      setStripHidden(y > 8 && y > lastScrollY.current)
      lastScrollY.current = y
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* One session check for the whole header, shared by the bar and the drawer.
     Doing it in the root layout instead would read a cookie during layout
     rendering and opt every marketing page out of static rendering. */
  useEffect(() => {
    const controller = new AbortController()
    let active = true

    fetch('/api/customers/oauth/session', {
      credentials: 'same-origin',
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : { signedIn: false }))
      .then((data: { name?: string | null; signedIn?: boolean }) => {
        if (!active) return
        setSession({
          name: typeof data?.name === 'string' ? data.name : null,
          signedIn: Boolean(data?.signedIn),
        })
      })
      .catch(() => {
        if (active) setSession({ name: null, signedIn: false })
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [])

  /* Following a link closes the drawer. Same-page links do not change the pathname,
     so the click itself is the signal. */
  const closeMenu = () => {
    setMenuOpen(false)
    triggerRef.current?.focus()
  }

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  /* While the drawer is open: lock the page behind it, focus the close button,
     keep Tab inside the drawer, and close on Escape. */
  useEffect(() => {
    if (!menuOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        triggerRef.current?.focus()
        return
      }

      if (event.key !== 'Tab' || !drawerRef.current) return

      const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      )
      if (!focusable.length) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)
    closeRef.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  const ctaNewTabProps = cta?.newTab
    ? { rel: 'noopener noreferrer', target: '_blank' as const }
    : {}

  return (
    <>
      {/* The announcement strip and the bar pin together, strip on top (design.md §6.2).
          The strip stays put at the top of the page but tucks away while scrolling
          down, so the navbar gets the whole screen; scrolling up brings it back. */}
      <div className="sticky top-0 z-20">
        <div
          className={cn(
            'grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none',
            stripHidden ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]',
          )}
          inert={stripHidden}
        >
          <div className="min-h-0 overflow-hidden">
            <AnnouncementBar announcement={announcement} />
          </div>
        </div>

        <header
          className="site-header border-b border-border bg-background transition-colors duration-200 motion-reduce:transition-none"
          data-scrolled={scrolled ? 'true' : 'false'}
          {...(theme ? { 'data-theme': theme } : {})}
        >
          <div className="container flex items-center justify-between gap-6 py-3">
            <Link aria-label="UNAVE home" className="text-primary shrink-0" href="/">
              <Logo />
            </Link>

            <nav aria-label="Main" className="hidden lg:block">
              <HeaderNav items={navItems} />
            </nav>

            <div className="flex items-center gap-2">
              <AccountLinks name={session?.name ?? null} signedIn={signedIn} />

              <Link
                aria-label="Search"
                className="text-primary hover:opacity-75 inline-flex size-11 items-center justify-center rounded-pill transition-opacity focus-visible:ring-[3px] focus-visible:ring-current focus-visible:outline-none motion-reduce:transition-none"
                href="/search"
              >
                <Search aria-hidden="true" className="size-5" strokeWidth={2} />
              </Link>

              {cta?.label && cta?.url ? (
                <Link
                  className={cn(
                    CTA_BASE,
                    CTA_VARIANTS.primary,
                    'hidden h-11 px-5 text-sm sm:inline-flex',
                  )}
                  href={cta.url}
                  {...ctaNewTabProps}
                >
                  {cta.label}
                </Link>
              ) : null}

              <button
                aria-controls="mobile-menu"
                aria-expanded={menuOpen}
                aria-label="Open menu"
                className="border-line hover:bg-green-50 inline-flex size-11 items-center justify-center rounded-pill border transition-colors focus-visible:ring-[3px] focus-visible:ring-current focus-visible:outline-none lg:hidden motion-reduce:transition-none"
                onClick={() => setMenuOpen(true)}
                ref={triggerRef}
                type="button"
              >
                <Menu aria-hidden="true" className="size-5" strokeWidth={2} />
              </button>
            </div>
          </div>
        </header>
      </div>

      {menuOpen ? (
        <MobileMenu
          closeRef={closeRef}
          cta={cta}
          drawerRef={drawerRef}
          items={navItems}
          onClose={closeMenu}
          signedIn={signedIn}
        />
      ) : null}

      {whatsappNumber ? (
        <a
          aria-label="Message UNAVE on WhatsApp"
          className="bg-green-600 text-cream hover:bg-green-700 fixed right-4 bottom-4 z-30 inline-flex size-13 items-center justify-center rounded-pill shadow-md transition-colors focus-visible:ring-[3px] focus-visible:ring-offset-2 focus-visible:ring-gold-400 focus-visible:outline-none motion-reduce:transition-none"
          href={`https://wa.me/${whatsappNumber}${
            whatsappMessage ? `?text=${encodeURIComponent(whatsappMessage)}` : ''
          }`}
          rel="noopener noreferrer"
          target="_blank"
        >
          <MessageCircle aria-hidden="true" className="size-6" strokeWidth={2} />
        </a>
      ) : null}
    </>
  )
}
