import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { getPayload } from 'payload'

import config from '../../src/payload.config.js'

/**
 * The store, in a real browser (spec 0007).
 *
 * These tests run against the dev server and the dev database. They create one
 * verified customer with a password and clean up after themselves. The
 * Razorpay keys are deliberately absent, so the pay step is exercised right up
 * to the gateway and answers with the plain configuration sentence AC-12 asks
 * for, which is exactly what an unconfigured deployment shows.
 *
 * Buying is one plan at a time: a card sends the chosen plan and duration to
 * checkout, and there is no cart page or cart cookie to visit.
 */

const BASE = 'http://localhost:3000'
const PASSWORD = 'correct-horse-battery'

let customerEmail: string
let customerId: number | string

const EMAIL_PREFIX = `e2e-store-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const signIn = async (page: Page) => {
  await page.fill('#signin-email', customerEmail)
  await page.fill('#signin-password', PASSWORD)
  await page.getByRole('button', { name: /Sign in/i }).click()
}

test.beforeAll(async () => {
  const payload = await getPayload({ config })

  customerEmail = `${EMAIL_PREFIX}@unave.test`

  const existing = await payload.find({
    collection: 'customers',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { email: { equals: customerEmail } },
  })

  if (existing.docs.length > 0) {
    await payload.delete({ collection: 'customers', id: existing.docs[0].id, overrideAccess: true })
  }

  const created = await payload.create({
    collection: 'customers',
    data: {
      email: customerEmail,
      name: 'E2E Customer',
      password: PASSWORD,
    },
    depth: 0,
    disableVerificationEmail: true,
    overrideAccess: true,
  })

  customerId = created.id

  await payload.db.updateOne({
    collection: 'customers',
    data: { _verificationToken: null, _verified: true },
    id: created.id as number,
  })
})

test.afterAll(async () => {
  const payload = await getPayload({ config })

  try {
    await payload.delete({ collection: 'customers', id: customerId, overrideAccess: true })
  } catch {
    // Best effort cleanup.
  }
})

test.describe('the plans shelf', () => {
  test('a signed out visitor can browse plans and start a purchase', async ({ page }) => {
    await page.goto(`${BASE}/plans`)

    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Plan your week/i)

    // The seeded plans render with durations and prices.
    await expect(page.getByRole('heading', { name: 'Lunch plan' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Kids plan' })).toBeVisible()

    // Browsing needs no account anywhere on the page.
    await expect(page.getByText(/No account needed to look around/i)).toBeVisible()

    // Each card buys its own plan; there is no cart control.
    const card = page.locator('article', { has: page.getByRole('heading', { name: 'Lunch plan' }) })
    await expect(card.getByRole('button', { name: 'Buy now' })).toBeVisible()
    await expect(card.getByRole('button', { name: /Add to cart/i })).toHaveCount(0)
  })
})

test.describe('the buy path', () => {
  test('choosing a duration and pressing Buy now carries it through sign in', async ({ page }) => {
    await page.goto(`${BASE}/plans`)

    const card = page.locator('article', { has: page.getByRole('heading', { name: 'Lunch plan' }) })

    // The chips are native radios; the second duration is One month on the seed.
    await card.getByText(/^One month/).click()
    await card.getByRole('button', { name: 'Buy now' }).click()

    // The link goes to checkout with only the plan and duration, then the guard
    // sends a signed out buyer to sign in with the whole link as its return.
    await expect(page).toHaveURL(/\/sign-in\?.*return=.*checkout/)
    await expect(page).toHaveURL(/return=.*plan%3D/)

    await signIn(page)

    await expect(page).toHaveURL(/\/checkout\?plan=[^&]+&duration=One(\+|%20)month/)
    await expect(page.getByRole('heading', { level: 1, name: 'Check out' })).toBeVisible()
    await expect(page.getByText('Lunch plan')).toBeVisible()
    await expect(page.getByText(/One month, 22 days/)).toBeVisible()
    await expect(page.getByText('To pay')).toBeVisible()
  })

  test('a plan that is not on the menu is refused in words, not shown as a form', async ({
    page,
  }) => {
    await page.goto(`${BASE}/sign-in`)
    await signIn(page)
    await expect(page).toHaveURL(/\/account$/)

    await page.goto(`${BASE}/checkout?plan=not-a-plan&duration=One+week`)

    await expect(page.getByRole('heading', { name: 'That plan is not on the menu' })).toBeVisible()
    await expect(page.getByText(/could not find that plan/i)).toBeVisible()
    await expect(page.getByRole('link', { name: 'Browse the plans' })).toBeVisible()
  })

  test('a checkout link with no plan is refused', async ({ page }) => {
    await page.goto(`${BASE}/sign-in`)
    await signIn(page)
    await expect(page).toHaveURL(/\/account$/)

    await page.goto(`${BASE}/checkout`)

    await expect(page.getByRole('heading', { name: 'That plan is not on the menu' })).toBeVisible()
  })

  test('paying without a configured gateway answers one plain sentence', async ({ page }) => {
    await page.goto(`${BASE}/plans`)

    const card = page.locator('article', { has: page.getByRole('heading', { name: 'Lunch plan' }) })
    await card.getByRole('button', { name: 'Buy now' }).click()

    // Sign in through the guard's own redirect, which carries the plan back.
    await signIn(page)
    await expect(page).toHaveURL(/\/checkout\?plan=/)

    // The profile is empty for this fresh customer, so fill the form.
    await page.fill('#checkout-name', 'E2E Customer')
    await page.fill('#checkout-phone', '9876543210')
    await page.fill('#checkout-line1', '12 Test Road')
    await page.fill('#checkout-city', 'Pune')
    await page.fill('#checkout-state', 'Maharashtra')
    await page.fill('#checkout-pincode', '411001')

    await page.getByRole('button', { name: 'Pay for the order' }).click()

    await expect(page.getByText(/Online payment is not set up yet/i)).toBeVisible({
      timeout: 20_000,
    })
  })
})

test.describe('the account order list', () => {
  test('an account with no orders says so plainly', async ({ page }) => {
    await page.goto(`${BASE}/sign-in`)
    await signIn(page)

    await expect(page).toHaveURL(/\/account$/)

    await expect(page.getByRole('heading', { name: 'Your orders' })).toBeVisible()
    await expect(page.getByText(/No orders yet/i)).toBeVisible()
  })
})
