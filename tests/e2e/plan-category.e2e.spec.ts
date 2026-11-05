import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'

/**
 * The category pages, in a real browser (spec 0008).
 *
 * These tests run against the dev server and the dev database, and they seed
 * their own two plans (one open, one paused) in the ready-to-cook category so
 * they never depend on what the kitchen has on the shelves today. The
 * fresh-from-produce category is assumed to have no e2e plans; the kitchen's
 * real plans live elsewhere. Everything cleans up after itself.
 *
 * The category slugs are reserved, so these fixture slugs are safe.
 */

const BASE = 'http://localhost:3000'

const OPEN_PLAN = {
  available: true,
  category: 'ready-to-cook',
  description: undefined,
  durations: [{ days: 7, label: 'One week', price: 49900 }],
  slug: 'e2e-ready-to-cook-plan',
  title: 'Category E2E cook',
}
const PAUSED_PLAN = {
  available: false,
  category: 'ready-to-cook',
  durations: [{ days: 7, label: 'One week', price: 29900 }],
  slug: 'e2e-ready-to-cook-paused',
  title: 'Category E2E paused',
}

let openId: number | string
let pausedId: number | string

const card = (page: Page, title: string) =>
  page.locator('article', { has: page.getByRole('heading', { name: title }) })

test.beforeAll(async () => {
  const payload = await getPayload({ config })

  for (const plan of [OPEN_PLAN, PAUSED_PLAN]) {
    const existing = await payload.find({
      collection: 'plans',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: { slug: { equals: plan.slug } },
    })
    if (existing.docs.length > 0) {
      await payload.delete({ collection: 'plans', id: existing.docs[0].id, overrideAccess: true })
    }
  }

  const open = await payload.create({
    collection: 'plans',
    // disableRevalidate: the revalidate hook needs the Next runtime, which the
    // test process is not; the fixtures are also deleted right after.
    context: { disableRevalidate: true },
    data: { ...OPEN_PLAN, audience: 'kids', points: [{ point: 'Prepped and ready' }] },
    overrideAccess: true,
  })
  const paused = await payload.create({
    collection: 'plans',
    context: { disableRevalidate: true },
    data: { ...PAUSED_PLAN, audience: 'adults', points: [{ point: 'Still on the list' }] },
    overrideAccess: true,
  })

  openId = open.id
  pausedId = paused.id
})

test.afterAll(async () => {
  const payload = await getPayload({ config })

  for (const id of [openId, pausedId]) {
    try {
      await payload.delete({ collection: 'plans', id, context: { disableRevalidate: true }, overrideAccess: true })
    } catch {
      // Best effort cleanup.
    }
  }
})

test.describe('a category page', () => {
  test('renders its own shelf, with paused plans shown but not buyable (AC-1)', async ({ page }) => {
    await page.goto(`${BASE}/plans/ready-to-cook`)

    await expect(page.getByRole('heading', { level: 1 })).toContainText(/The chopping is done/i)
    await expect(page.getByRole('heading', { name: 'Category E2E cook' })).toBeVisible()
    await expect(card(page, 'Category E2E cook').getByRole('button', { name: 'Buy now' })).toBeVisible()

    await expect(page.getByRole('heading', { name: 'Category E2E paused' })).toBeVisible()
    await expect(card(page, 'Category E2E paused').getByText('Paused', { exact: true })).toBeVisible()
    await expect(card(page, 'Category E2E paused').getByText('This plan is paused right now')).toBeVisible()
    await expect(card(page, 'Category E2E paused').getByRole('button', { name: 'Buy now' })).toHaveCount(0)

    await expect(page.getByText(/What "paused" means/i)).toBeVisible()
  })

  test('narrows by audience with pills, without leaving the page (AC-2)', async ({ page }) => {
    await page.goto(`${BASE}/plans/ready-to-cook`)

    const group = page.getByRole('group', { name: 'Filter the plans by audience' })
    await expect(group.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true')

    await group.getByRole('button', { name: 'Kids' }).click()
    await expect(card(page, 'Category E2E cook')).toBeVisible()
    await expect(card(page, 'Category E2E paused')).toHaveCount(0)
    await expect(page).toHaveURL(`${BASE}/plans/ready-to-cook`)

    await group.getByRole('button', { name: 'Adults' }).click()
    await expect(card(page, 'Category E2E paused')).toBeVisible()
    await expect(card(page, 'Category E2E cook')).toHaveCount(0)

    await group.getByRole('button', { name: 'All' }).click()
    await expect(card(page, 'Category E2E cook')).toBeVisible()
    await expect(card(page, 'Category E2E paused')).toBeVisible()
  })

  test('works the same on a phone (AC-2)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 720 })
    await page.goto(`${BASE}/plans/ready-to-cook`)

    const group = page.getByRole('group', { name: 'Filter the plans by audience' })
    await group.getByRole('button', { name: 'Kids' }).click()
    await expect(card(page, 'Category E2E cook')).toBeVisible()
    await expect(card(page, 'Category E2E paused')).toHaveCount(0)
  })

  test('answers an empty category and an empty filter with words and WhatsApp (AC-3)', async ({ page }) => {
    await page.goto(`${BASE}/plans/fresh-from-produce`)
    await expect(page.getByText('No plans are open right now')).toBeVisible()
    await expect(page.locator('a[href*="wa.me"]').first()).toBeVisible()

    await page.goto(`${BASE}/plans/ready-to-cook`)
    await page
      .getByRole('group', { name: 'Filter the plans by audience' })
      .getByRole('button', { name: 'Special' })
      .click()
    await expect(page.getByText('Nothing under this filter')).toBeVisible()
    await expect(page.locator('a[href*="wa.me"]').first()).toBeVisible()
  })

  test('refuses any slug that is not a category (AC-4)', async ({ page }) => {
    const planSlug = await page.goto(`${BASE}/plans/e2e-ready-to-cook-plan`)
    expect(planSlug?.status()).toBe(404)

    const nonsense = await page.goto(`${BASE}/plans/not-a-category`)
    expect(nonsense?.status()).toBe(404)
  })

  test('is reached from the plan card badges, and links to the other shelves (AC-5)', async ({ page }) => {
    await page.goto(`${BASE}/plans`)
    const badge = page.getByRole('link', { name: 'Browse Ready to cook plans' }).first()
    await expect(badge).toBeVisible()
    await expect(badge).toHaveAttribute('href', '/plans/ready-to-cook')

    await page.goto(`${BASE}/plans/ready-to-cook`)
    await expect(page.locator('a[href="/plans/ready-to-eat"]').first()).toBeVisible()
    await expect(page.locator('a[href="/plans/fresh-from-produce"]').first()).toBeVisible()
  })

  test('carries its own title, canonical address and sitemap entries (AC-6)', async ({ page }) => {
    await page.goto(`${BASE}/plans/ready-to-cook`)
    await expect(page).toHaveTitle(/Ready to cook plans/i)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/plans\/ready-to-cook$/)

    const sitemap = await page.request.get(`${BASE}/pages-sitemap.xml`)
    const xml = await sitemap.text()
    for (const category of ['ready-to-cook', 'ready-to-eat', 'fresh-from-produce']) {
      expect(xml).toContain(`/plans/${category}`)
    }
  })
})
