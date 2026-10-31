import { expect, test } from '@playwright/test'

const BASE = 'http://localhost:3000'

test.describe('public plan pages', () => {
  test('the listing opens a plan with its price and structured data', async ({ page }) => {
    await page.goto(`${BASE}/plans`)

    await expect(
      page.getByRole('heading', { level: 1, name: 'Plans that fit your week' }),
    ).toBeVisible()

    const firstPlan = page.locator('main a[href^="/plans/"]').first()
    await expect(firstPlan).toBeVisible()
    await firstPlan.click()

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add to cart' })).toBeVisible()
    await expect(page.getByText(/per (week|month)/)).toBeVisible()

    const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent()
    expect(jsonLd).toContain('"@type":"Product"')
    expect(jsonLd).toContain('"@type":"Offer"')
    expect(jsonLd).toContain('"priceCurrency":"INR"')
  })

  test('a plan is held in the cart and can be removed', async ({ page }) => {
    await page.goto(`${BASE}/plans`)
    await page.locator('main a[href^="/plans/"]').first().click()

    const planTitle = ((await page.getByRole('heading', { level: 1 }).textContent()) ?? '').trim()
    expect(planTitle.length).toBeGreaterThan(0)

    await page.getByRole('button', { name: 'Add to cart' }).click()
    await page.waitForURL('**/cart')

    await expect(page.getByRole('heading', { level: 1, name: 'Your cart' })).toBeVisible()
    await expect(page.getByText(planTitle, { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Proceed to checkout' })).toBeDisabled()
    await expect(page.getByText('Checkout is coming soon.')).toBeVisible()

    await page.getByRole('button', { name: 'Remove' }).click()
    await page.waitForURL('**/cart')

    await expect(page.getByText('Your cart is empty')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Browse plans' })).toBeVisible()
  })

  test('an unknown plan slug is a 404', async ({ page }) => {
    const response = await page.goto(`${BASE}/plans/not-a-real-plan-${Date.now()}`)

    expect(response?.status()).toBe(404)
  })

  test('the explorer searches, filters and switches views from the URL', async ({ page }) => {
    await page.goto(`${BASE}/plans`)

    await expect(page.getByText(/Showing all \d+ plans?/)).toBeVisible()

    // The pager stays out of the way while everything fits one page.
    await expect(page.locator('nav[aria-label="pagination"]')).toHaveCount(0)

    // A search that matches nothing gets its own state, never a blank area.
    await page.getByLabel('Search plans').fill('zzz-nothing-matches')
    await page.getByRole('button', { name: 'Apply filters' }).click()

    await expect(page).toHaveURL(/q=zzz-nothing-matches/)
    await expect(page.getByText('No plans match that search or those filters.')).toBeVisible()
    await expect(page.getByText('Showing 0 of', { exact: false })).toBeVisible()

    // Clearing brings the whole catalog back.
    await page.getByRole('link', { name: 'Clear filters' }).first().click()
    await expect(page).toHaveURL((url) => !url.searchParams.has('q'))
    await expect(page.getByText(/Showing all \d+ plans?/)).toBeVisible()

    // The toggle carries the filters with it, and the grid link drops only itself.
    await page.getByLabel('Search plans').fill('tiffin')
    await page.getByRole('button', { name: 'Apply filters' }).click()
    await page.getByRole('link', { name: 'List view' }).click()

    await expect(page).toHaveURL(/view=list/)
    await expect(page.locator('#plans ul li a[href^="/plans/"]').first()).toBeVisible()

    await page.getByRole('link', { name: 'Grid view' }).click()
    // The view drops, the search survives.
    await expect(page).toHaveURL((url) => url.searchParams.has('q') && !url.searchParams.has('view'))
  })

  test('the hero and the plans FAQ are on the listing', async ({ page }) => {
    await page.goto(`${BASE}/plans`)

    await expect(
      page.getByRole('heading', { level: 1, name: 'Plans that fit your week' }),
    ).toBeVisible()
    await expect(page.getByText('Flexible plans')).toBeVisible()

    await page.getByRole('link', { name: 'Compare plans' }).click()
    await expect(page).toHaveURL(/#plans/)

    await expect(page.getByRole('heading', { level: 2, name: 'Plan questions' })).toBeVisible()

    // Native details: the first answer starts open, the rest stay closed.
    const items = page.locator('#faq details')
    await expect(items).toHaveCount(4)
    expect(await items.nth(0).getAttribute('open')).not.toBeNull()
    expect(await items.nth(1).getAttribute('open')).toBeNull()

    const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent()
    expect(jsonLd).toContain('"@type":"FAQPage"')
    expect(jsonLd).toContain('How do weekly and monthly plans differ?')
  })

  test('the cart is not indexable', async ({ page }) => {
    const response = await page.goto(`${BASE}/cart`)

    expect(response?.status()).toBe(200)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  })

  test('the plans sitemap lists the shop and leaves the cart out', async ({ request }) => {
    const response = await request.get(`${BASE}/plans-sitemap.xml`)

    expect(response.status()).toBe(200)
    const body = await response.text()
    expect(body).toContain('/plans</loc>')
    expect(body).toContain('/plans/')
    expect(body).not.toContain('/cart')
  })
})