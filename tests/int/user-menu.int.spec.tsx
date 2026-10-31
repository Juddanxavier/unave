import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { UserMenu } from '@/Header/UserMenu'

/**
 * The bar's account menu.
 *
 * These run against the real component in jsdom. The behaviour that is easy to
 * get wrong is the keyboard and pointer grammar around a popover: that it opens,
 * that Escape returns focus to the trigger, and that a click anywhere else puts
 * it away. The sign out is asserted as a plain form post, because that is what
 * makes it work without JavaScript.
 */

afterEach(cleanup)

const openMenu = () => screen.getByRole('button', { name: /priya|your account/i })

describe('the account menu', () => {
  it('names the signed in customer in the bar', () => {
    render(<UserMenu name="Priya Sharma" />)

    expect(screen.getByRole('button', { name: 'Priya' })).toBeTruthy()
  })

  it('falls back to the account label when Payload gave us no name', () => {
    render(<UserMenu name={null} />)

    expect(screen.getByRole('button', { name: 'Your account' })).toBeTruthy()
  })

  it('stays closed until it is asked for', () => {
    render(<UserMenu name="Priya Sharma" />)

    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('opens onto the account link and the sign out form', () => {
    render(<UserMenu name="Priya Sharma" />)

    fireEvent.click(openMenu())

    const account = screen.getByRole('menuitem', { name: /your account/i })
    expect(account.getAttribute('href')).toBe('/account')

    const signOut = screen.getByRole('menuitem', { name: /sign out/i })
    expect(signOut.getAttribute('type')).toBe('submit')
    expect(signOut.closest('form')?.getAttribute('action')).toBe('/api/customers/logout')
    expect(signOut.closest('form')?.getAttribute('method')).toBe('post')
  })

  it('closes on Escape and hands focus back to the trigger', () => {
    render(<UserMenu name="Priya Sharma" />)

    const button = openMenu()
    fireEvent.click(button)
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })

    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(button)
  })

  it('closes when the pointer goes down somewhere else', () => {
    render(<UserMenu name="Priya Sharma" />)

    fireEvent.click(openMenu())
    fireEvent.pointerDown(document.body)

    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('moves focus between items with the arrow keys', () => {
    render(<UserMenu name="Priya Sharma" />)

    const button = openMenu()
    fireEvent.keyDown(button, { key: 'ArrowDown' })

    const items = screen.getAllByRole('menuitem')
    expect(document.activeElement).toBe(items[0])

    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' })
    expect(document.activeElement).toBe(items[1])

    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Home' })
    expect(document.activeElement).toBe(items[0])
  })
})
