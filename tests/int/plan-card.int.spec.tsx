import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PlanCard } from '@/components/Store/PlanCard'
import type { Plan } from '@/payload-types'

// RichText drags Payload's admin styles (.scss) into the test; the card's own
// behavior is what these tests hold, so the renderer is stubbed at that line.
vi.mock('@/components/RichText', () => ({
  default: () => React.createElement('div'),
}))

/**
 * The plan card, as the category pages changed it (spec 0008, AC-5 and AC-1).
 *
 * The category badge is now a link to the category's page, the audience badge
 * stays a plain label, and a paused plan still shows its prices with nothing to
 * buy. The card is the one surface where the shared label maps meet a visitor,
 * so these tests pin what the user perceives, not the class names.
 */

afterEach(cleanup)

const openPlan = {
  available: true,
  audience: 'kids',
  category: 'ready-to-cook',
  durations: [{ days: 7, id: 'd1', label: 'One week', price: 49900 }],
  id: 1,
  slug: 'category-e2e-cook',
  title: 'Category cook',
} as unknown as Plan

const pausedPlan = {
  ...openPlan,
  available: false,
  audience: 'adults',
  category: 'ready-to-eat',
  durations: [{ days: 7, id: 'd2', label: 'One week', price: 29900 }],
  id: 2,
  slug: 'category-e2e-paused',
  title: 'Category paused',
} as unknown as Plan

describe('the category badge', () => {
  it('is a link to that category page, named for where it leads', () => {
    render(<PlanCard plan={openPlan} whatsapp="+919000000000" />)

    const badge = screen.getByRole('link', { name: 'Browse Ready to cook plans' })
    expect(badge.getAttribute('href')).toBe('/plans/ready-to-cook')
    expect(badge.textContent).toContain('Ready to cook')
  })

  it('renders for every category value', () => {
    for (const category of ['ready-to-eat', 'fresh-from-produce'] as const) {
      render(<PlanCard plan={{ ...openPlan, category } as unknown as Plan} />)
      expect(screen.getByRole('link', { name: `Browse ${category === 'ready-to-eat' ? 'Ready to eat' : 'Fresh from produce'} plans` })).toBeTruthy()
      cleanup()
    }
  })

  it('stays off the card when the plan has no category (legacy rows)', () => {
    render(<PlanCard plan={{ ...openPlan, category: null } as unknown as Plan} />)

    expect(screen.queryByRole('link', { name: /Browse/ })).toBeNull()
  })
})

describe('the audience badge', () => {
  it('stays a plain label, never a link', () => {
    render(<PlanCard plan={openPlan} />)

    expect(screen.getByText('Kids')).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Kids' })).toBeNull()
  })
})

describe('an open plan', () => {
  it('offers the buy panel with its duration and price', () => {
    render(<PlanCard plan={openPlan} whatsapp="+919000000000" />)

    expect(screen.getByRole('button', { name: 'Buy now' })).toBeTruthy()
    expect(screen.getByText('One week')).toBeTruthy()
    expect(screen.getByText('₹499')).toBeTruthy()
  })
})

describe('a paused plan', () => {
  it('shows the paused label and its prices, with nothing to buy', () => {
    render(<PlanCard plan={pausedPlan} whatsapp="+919000000000" />)

    expect(screen.getByText('Paused')).toBeTruthy()
    expect(screen.getByText(/This plan is paused right now/)).toBeTruthy()
    expect(screen.getByText('One week')).toBeTruthy()
    expect(screen.getByText('₹299')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Buy now' })).toBeNull()
  })
})
