'use client'

import { CalendarCheck, ChevronDown, LogOut, User } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect, useId, useRef, useState } from 'react'

import { cn } from '@/utilities/ui'

const TRIGGER =
  'text-primary rounded-sm text-sm font-semibold hover:opacity-75 inline-flex min-h-11 items-center gap-2 px-3 transition-opacity focus-visible:ring-[3px] focus-visible:ring-current focus-visible:outline-none motion-reduce:transition-none'

const ITEM =
  'text-foreground hover:bg-accent focus-visible:bg-accent rounded-sm flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm font-semibold transition-colors focus-visible:outline-none motion-reduce:transition-none'

/** The part of a name a bar has room for. Empty input falls back to the menu's own label. */
const firstNameOf = (name?: string | null): string | null => {
  const first = name?.trim().split(/\s+/)[0]
  return first ? first : null
}

interface Props {
  /** The signed in customer's name, when Payload returns one. */
  name?: string | null
}

/**
 * design.md §6.2. Once a customer holds a session the bar's `Your account` link
 * becomes this small menu: who is signed in, the way to their account, and the way
 * out. Signing out is a plain form post to `/api/customers/logout`, so it works
 * without JavaScript exactly like the sign in form, and it revokes the Payload
 * session row instead of only clearing the cookie.
 *
 * The menu is keyboard complete: ArrowDown/ArrowUp move between items, Home and
 * End jump, Escape closes and returns focus to the trigger, and Tab leaves. A
 * pointer down anywhere outside closes it.
 */
export const UserMenu: React.FC<Props> = ({ name }) => {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  /* Set just before opening from the keyboard, so focus lands once the menu renders. */
  const pendingFocus = useRef<'first' | 'last' | null>(null)
  const menuId = useId()
  const label = firstNameOf(name) ?? 'Your account'
  const pathname = usePathname()

  const close = (returnFocus = false) => {
    setOpen(false)
    if (returnFocus) triggerRef.current?.focus()
  }

  const menuItems = () =>
    Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])

  /* Move focus into the menu only when it was opened with an arrow key. A click
     leaves focus on the trigger, which is what a pointer user expects. */
  useEffect(() => {
    if (!open || !pendingFocus.current) return
    const items = menuItems()
    const target = pendingFocus.current === 'first' ? items[0] : items[items.length - 1]
    pendingFocus.current = null
    target?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  /* The header survives a client navigation, so a menu left open would otherwise
     follow the visitor onto the page it just took them to. */
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  const onMenuKeyDown = (event: React.KeyboardEvent) => {
    const items = menuItems()
    if (!items.length) return

    const index = items.indexOf(document.activeElement as HTMLElement)

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        items[(index + 1) % items.length].focus()
        break
      case 'ArrowUp':
        event.preventDefault()
        items[(index - 1 + items.length) % items.length].focus()
        break
      case 'Home':
        event.preventDefault()
        items[0].focus()
        break
      case 'End':
        event.preventDefault()
        items[items.length - 1].focus()
        break
      case 'Escape':
        event.preventDefault()
        close(true)
        break
      case 'Tab':
        /* Focus is leaving; close rather than leave an orphaned panel behind. */
        close()
        break
    }
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="menu"
        className={TRIGGER}
        onClick={() => (open ? close() : setOpen(true))}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            pendingFocus.current = 'first'
            setOpen(true)
          } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            pendingFocus.current = 'last'
            setOpen(true)
          } else if (event.key === 'Escape' && open) {
            event.preventDefault()
            close()
          }
        }}
        ref={triggerRef}
        type="button"
      >
        <User aria-hidden="true" className="size-5 shrink-0" strokeWidth={2} />
        <span className="max-w-28 truncate sm:max-w-40">
          <span className="sr-only sm:not-sr-only">{label}</span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            'size-4 shrink-0 transition-transform motion-reduce:transition-none',
            open && 'rotate-180',
          )}
          strokeWidth={2}
        />
      </button>

      {open ? (
        <div
          aria-label="Account"
          className="border-border bg-popover text-popover-foreground shadow-md absolute top-full right-0 z-30 mt-2 w-60 rounded-md border p-1"
          id={menuId}
          onKeyDown={onMenuKeyDown}
          ref={menuRef}
          role="menu"
        >
          <div className="border-border border-b px-3 py-2" role="presentation">
            <p className="text-foreground truncate text-sm font-semibold">
              {name?.trim() || 'Your account'}
            </p>
            <p className="text-caption text-ink-600">Signed in</p>
          </div>

          <Link className={`${ITEM} mt-1`} href="/account" role="menuitem">
            <CalendarCheck aria-hidden="true" className="size-4 shrink-0" strokeWidth={2} />
            Your account
          </Link>

          <form action="/api/customers/logout" method="post">
            <button className={ITEM} role="menuitem" type="submit">
              <LogOut aria-hidden="true" className="size-4 shrink-0" strokeWidth={2} />
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  )
}
