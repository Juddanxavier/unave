import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { PlanAudienceFilter, type PlanFilterCard } from '@/components/Store/PlanAudienceFilter'

/**
 * The audience filter on a category page (spec 0008, AC-2 and AC-3).
 *
 * These run against the real component in jsdom. They pin the contract the
 * spec cares about: All is the default, a pill click filters the visible cards
 * with no server round trip, the pressed state follows the choice, the live
 * region tells a screen reader how many plans match, and the two empty states
 * say different, honest things.
 */

afterEach(cleanup)

const card = (id: number, audience: string, label: string): PlanFilterCard => ({
  audience: audience as PlanFilterCard['audience'],
  id,
  node: <p>{label}</p>,
})

const cards = [
  card(1, 'kids', 'the kids card'),
  card(2, 'adults', 'the adults card'),
]

const renderFilter = (overrides: Partial<{ cards: PlanFilterCard[]; whatsapp: null | string }> = {}) =>
  render(
    <PlanAudienceFilter
      cards={overrides.cards ?? cards}
      whatsapp={overrides.whatsapp !== undefined ? overrides.whatsapp : '+919000000000'}
    />,
  )

describe('the pills', () => {
  it('offer All, Kids, Adults and Special, with All pressed first', () => {
    renderFilter()

    for (const name of ['All', 'Kids', 'Adults', 'Special']) {
      expect(screen.getByRole('button', { name })).toBeTruthy()
    }

    expect(screen.getByRole('button', { name: 'All' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Kids' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('sit in a labelled group a screen reader can find', () => {
    renderFilter()

    expect(screen.getByRole('group', { name: 'Filter the plans by audience' })).toBeTruthy()
  })

  it('show every card under All, the default', () => {
    renderFilter()

    expect(screen.getByText('the kids card')).toBeTruthy()
    expect(screen.getByText('the adults card')).toBeTruthy()
    expect(screen.getByText('2 plans shown.')).toBeTruthy()
  })
})

describe('choosing a pill', () => {
  it('keeps only the cards of the chosen audience, without a page load', () => {
    renderFilter()

    fireEvent.click(screen.getByRole('button', { name: 'Kids' }))

    expect(screen.getByText('the kids card')).toBeTruthy()
    expect(screen.queryByText('the adults card')).toBeNull()
    expect(screen.getByRole('button', { name: 'Kids' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'All' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('announces the new count politely', () => {
    renderFilter()

    fireEvent.click(screen.getByRole('button', { name: 'Kids' }))
    expect(screen.getByText('1 plan shown.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(screen.getByText('2 plans shown.')).toBeTruthy()
  })

  it('returns every card when All is chosen again', () => {
    renderFilter()

    fireEvent.click(screen.getByRole('button', { name: 'Adults' }))
    expect(screen.queryByText('the kids card')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(screen.getByText('the kids card')).toBeTruthy()
  })

  it('still shows a card with no audience under All only (legacy rows)', () => {
    renderFilter({ cards: [card(3, '', 'the legacy card')] })

    expect(screen.getByText('the legacy card')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Kids' }))
    expect(screen.queryByText('the legacy card')).toBeNull()
  })
})

describe('the filter empty state', () => {
  it('says the shelf is only filtered, and offers WhatsApp', () => {
    renderFilter()

    fireEvent.click(screen.getByRole('button', { name: 'Special' }))

    expect(screen.getByText('Nothing under this filter')).toBeTruthy()
    expect(screen.getByText(/No plan for that audience on this shelf right now/)).toBeTruthy()
    expect(document.querySelector('a[href*="wa.me"]')).toBeTruthy()
  })

  it('drops the WhatsApp button when the footer has no number', () => {
    renderFilter({ whatsapp: null })

    fireEvent.click(screen.getByRole('button', { name: 'Special' }))

    expect(screen.getByText('Nothing under this filter')).toBeTruthy()
    expect(document.querySelector('a[href*="wa.me"]')).toBeNull()
  })
})

describe('the empty category', () => {
  it('shows the plans page empty card instead of a shelf', () => {
    renderFilter({ cards: [] })

    expect(screen.getByText('No plans are open right now')).toBeTruthy()
    expect(document.querySelector('a[href*="wa.me"]')).toBeTruthy()
  })
})
