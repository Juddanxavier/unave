# Verify: Plans listing, plan detail and cart · spec 0004 · created 2026-10-29

_Steps derived from spec 0004 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

The three pages are real routes and the cart is a real cookie, so almost every step runs in a browser against `pnpm dev`. Have a staff session ready at `/admin` to seed plans and to switch one off mid flow. Run the app with `pnpm dev`.

## Commands

- [ ] C1 `pnpm exec tsc --noEmit` → no output and exit code 0 → AC-14
- [ ] C2 `pnpm test:int` → all suites pass, including the new plans read and cart cookie suites → AC-1, AC-3, AC-7, AC-14
- [ ] C3 `pnpm exec playwright test tests/e2e/frontend.e2e.spec.ts tests/e2e/plan.e2e.spec.ts tests/e2e/plans.e2e.spec.ts` → the browse, detail, add to cart, cart and remove flows pass. The full `pnpm test:e2e` cannot collect `tests/e2e/admin.e2e.spec.ts`, which fails to load with `Cannot find module 'next/cache'` through `tests/helpers/seedUser.ts` and `src/collections/Pages/hooks/revalidatePage.ts`; this is pre-existing and unrelated to spec 0004 → AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-14
- [ ] C4 `curl -s http://localhost:3000/plans` and `curl -s http://localhost:3000/plans/<slug>` → both render, and the detail source contains exactly one `application/ld+json` block with `"@type":"Product"` and an `Offer` with `priceCurrency` `INR` → AC-1, AC-2, AC-10
- [ ] C5 `curl -s http://localhost:3000/plans-sitemap.xml` → it lists `/plans` and each active plan's `/plans/<slug>` with a `lastmod`, and it contains no `/cart` → AC-13
- [ ] C6 `curl -s http://localhost:3000/cart -D - -o /dev/null` and inspect the cookie after one add → the cookie is `unave_cart`, `HttpOnly`, `SameSite=Lax`, `Path=/` → AC-3, AC-7
- [ ] C7 Compare `.env.example` and the deployment settings with the pre change list → no new environment variable is required → AC-14

## Browser flows

- [ ] U1 Open `/plans` with two active plans → both appear as cards with image, title, summary, price line and meals line, lowest `sortOrder` first → AC-1, AC-11
- [ ] U2 Switch one plan off in the admin panel, reload `/plans` after the 600 second window → the inactive plan is gone, the active one stays → AC-1
- [ ] U3 Deactivate every plan, reload `/plans` → the empty listing copy and the `/contact` link show, with no cards → AC-1
- [ ] U4 Open a plan card → the detail page shows the image, title, summary, price line, highlights, rich description, the `Add to cart` form and `Back to all plans` → AC-2, AC-11
- [ ] U5 Open a plan with no image on the listing and the detail → a neutral block shows in place of the image, no broken image icon, and the block is hidden from assistive technology → AC-11
- [ ] U6 Open `/plans/not-a-real-plan` and an inactive plan's own slug → both show the not found page with HTTP 404 → AC-2
- [ ] U7 Press `Add to cart` on a plan → the browser lands on `/cart` and shows the same plan, its live price and the meals line → AC-3, AC-5
- [ ] U8 Inspect the `unave_cart` cookie value in the browser → it is URI encoded JSON with only `planId`, `slug` and `addedAt`, and no name, email, phone, address or payment value → AC-3, AC-7
- [ ] U9 Add one plan, then open another plan and add it → the cart holds only the second, because adding replaces → AC-3
- [ ] U10 Deactivate the plan while it is in the cart, then reload `/cart` → the `That plan is no longer available.` notice shows with `Browse plans`, no price shows, and the next add replaces the stale entry → AC-5, AC-8
- [ ] U11 Edit a plan's price and meals after adding it, then reload `/cart` → the cart shows the new live price and meals, not a stored copy → AC-8
- [ ] U12 Press `Remove` on the cart → the empty cart state shows, and pressing remove again leaves it empty with no error → AC-4, AC-6
- [ ] U13 Delete the `unave_cart` cookie, then open `/cart` → the `Your cart is empty` state and the `Browse plans` link, with no plan detail → AC-4
- [ ] U14 Set the cookie by hand to a truncated string and to a valid shape with a nonexistent plan id → both render the empty cart state and neither throws → AC-4, AC-7
- [ ] U15 Submit the add action directly for an inactive plan and for an unknown id → no cookie is written and the browser lands on `/plans` → AC-3
- [ ] U16 Look at the `Proceed to checkout` control on a full cart → it is disabled, the `Checkout is coming soon.` note is beside it, and the control is not reachable by keyboard → AC-5, AC-11
- [ ] U17 Open the three pages at 320px width and tab through each control → no horizontal scroll, labels are visible, `Add to cart` and `Remove` are real submit buttons, and focus order is logical → AC-11
- [ ] U18 Open any page on a database with no header `navItems` content → the `Plans` link appears in the header menu → AC-12
- [ ] U19 Click the header `Plans` link from the home page → it opens `/plans` → AC-12

## Value sourcing, one step per important row

- [ ] V1 Inspect the page source of `/plans` and the rendered cards → the titles and links match the active plans in the admin panel, and no inactive plan appears → AC-1
- [ ] V2 Read the `payload.find` call for `/plans` → it passes `overrideAccess: false` and `sort: 'sortOrder'` → AC-1
- [ ] V3 Open the detail page for a plan with a summary and one without → the summary line shows when set and is omitted when blank → AC-2
- [ ] V4 Compare the price line on the card, the detail page and the cart for one plan → all three format the same value as whole rupees through the shared formatter, with `per week` or `per month` and `{n} meals a week` → AC-11
- [ ] V5 Open a plan with no highlights and no description → the highlights list and the description are omitted, with no empty heading → AC-2
- [ ] V6 Inspect the detail `generateMetadata` output and the tags → the title and description come from the plan, the canonical is `/plans/<slug>`, and the open graph image is the media `og` size, else the original URL, else the default asset → AC-9
- [ ] V7 Open a plan whose title contains a `<` character → the `Product` JSON-LD escapes it and the script tag does not break → AC-10
- [ ] V8 Check `/plans` and `/plans/<slug>` in the browser → both are indexable, while `/cart` carries `noindex, nofollow` in its metadata and its response is not cached → AC-9
- [ ] V9 Read the sitemap route → it queries `plans` with `overrideAccess: false`, so the active only access rule limits the result to active plans, and the last modified date is the plan `updatedAt` → AC-13
- [ ] V10 Rename a plan and change its slug, then reload → the listing and detail follow the new slug, and the old `/plans/<old-slug>` returns 404 → AC-1, AC-2
- [ ] V11 Inspect the `Add to cart` action inputs and the cookie write → the action re-reads the plan by id with `overrideAccess: false` before writing, and the cookie carries no field beyond `planId`, `slug` and `addedAt` → AC-3, AC-7
- [ ] V12 Open two tabs, add one plan in the first and a different plan in the second → the cart ends with one entry, the last write winning, and no error → AC-3

## Acceptance criteria coverage

- AC-1 ... C2, C4, U1, U2, U3, V1, V2, V10
- AC-2 ... C3, C4, U4, U6, V3, V5, V10
- AC-3 ... C2, C3, C6, U7, U8, U9, U15, V11, V12
- AC-4 ... C3, U12, U13, U14
- AC-5 ... C3, U7, U10, U16
- AC-6 ... C3, U12
- AC-7 ... C2, C6, U8, U14, V11
- AC-8 ... U10, U11
- AC-9 ... V6, V8
- AC-10 ... C4, V7
- AC-11 ... U1, U4, U5, U16, U17, V4
- AC-12 ... U18, U19
- AC-13 ... C5, V9
- AC-14 ... C1, C2, C3, C7

## Build notes · 2026-10-29

Built as spec 0004. All five `## Build plan` slices landed and are ticked.

Files added: `src/utilities/planCart.ts` (cookie name, pack, parse, cookie options), `src/utilities/planShopCopy.ts` (every string from the Page copy table, plus `priceLine` and `mealsLine`), `src/app/(frontend)/plans/{page.tsx,PlanCard.tsx,PlanImagePlaceholder.tsx,actions.ts}`, `src/app/(frontend)/plans/[slug]/{page.tsx,AddToCart.tsx}`, `src/app/(frontend)/cart/{page.tsx,RemoveFromCart.tsx}`, `src/app/(frontend)/(sitemaps)/plans-sitemap.xml/route.ts`, `tests/int/plan-cart.int.spec.ts`, `tests/int/plan-shop.int.spec.ts`, `tests/e2e/plans.e2e.spec.ts`.

Files edited: `src/utilities/planDisplay.ts` (added `planPeriodWord` beside `formatPlanPrice`), `src/Header/Nav/index.tsx` (a code `Plans` link before the content managed items), `next-sitemap.config.cjs` (added the plans sitemap).

Three spec corrections were made before coding, each recorded here:

- AC-5 said the cart page clears the cookie during render. Next only allows a cookie write in a server action or a route handler, so the page now treats the entry as absent and shows the notice, and the stale entry is replaced by the next add or cleared by `Remove`.
- The formatter. The spec named a new `src/utilities/planPrice.ts`. `formatPlanPrice` already existed in `src/utilities/planDisplay.ts`, so the build reuses it and adds only `planPeriodWord` there rather than a second formatter.
- AC-12 said the link goes in both the desktop and the mobile menu. This template has a single `HeaderNav`, so the link lands in that one nav.

Verification run: `pnpm exec tsc --noEmit` exit 0; the two new integration suites pass; the new end to end file passes (listing, detail, add to cart, cart, remove, unknown slug 404, cart noindex, plans sitemap).

Self check: rendered `/plans`, a plan detail and `/cart` in Chromium at 320px and 1280px. No horizontal overflow at 320px. The checkout control is disabled in the rendered page. Both seeded plans have no image, so the neutral placeholder is what a visitor sees; the first render was a plain grey block that read as a failed image, so the placeholder now carries a faint plate icon (decorative, hidden from assistive technology) and the block reads as deliberate. Staff should add plan images in the admin for the real look.
