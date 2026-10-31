# 0004. Plans listing, plan detail and cart

**Date**: 2026-10-29
**Status**: In Progress

## Summary

The public site gets three pages: a listing of the plans on sale, a detail page for one plan, and a cart that holds the chosen plan. A visitor browses, opens a plan and adds it to the cart, which is kept in one small cookie the server reads. There is no payment and no account, so the cart parks at a disabled checkout step that feature 4 will replace. The listing and detail are a plain read of the existing Plans collection, so the cart is the only new state and no database table is added.

## Requirements

**User stories**:

- As a visitor, I want to see the plans on sale with their price and what is included, so that I can choose one.
- As a visitor, I want to open one plan and read the detail, so that I know exactly what I am buying.
- As a visitor, I want to keep my chosen plan in a cart while I decide, so that I do not lose my place.
- As a visitor whose plan is no longer on sale, I want to be told clearly, so that I am not stuck on a dead end.
- As the site owner, I want the plan pages found by search engines and the cart kept out, so that the plans attract visitors and no per visitor page is indexed.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

- **AC-1**: `/plans` lists every active plan and no inactive plan, read with `payload.find({ collection: 'plans', overrideAccess: false, sort: 'sortOrder', limit: 100, depth: 1 })`. Each plan renders one card with the plan image or the neutral placeholder, the title, the summary when set, and the price line, and links to `/plans/<slug>`. The page opens with a hero section (AC-15), then an explorer: a search field, a billing period filter, a meals-a-week filter and a sort control in one GET form targeting `/plans`, plus a grid/list view toggle, with the results count, a `Clear filters` link when anything is active, and the per-plan-page price note beneath the results. The query lives in the URL's search params and is parsed by `src/utilities/planCatalog.ts`, which falls back to the default for any missing or unknown value, so an edited URL can never hide plans or fail; the default view is the grid with every plan in featured order, which is exactly the unfiltered catalog. A filtered read that matches nothing shows the no-match copy and a `Clear filters` action. The filtered set paginates at nine plans per page through a `page` search param: the pager is real `<a>` links (*Previous*, the neighbouring page numbers, *Next*, current page marked `aria-current="page"`), a page number past the end clamps to the last page, and applying filters or clearing them returns to page 1. When no plan is active the page shows the empty listing copy and a link to `/contact`. Because the page reads search params on every request it is `export const dynamic = 'force-dynamic'` and never cached statically.
- **AC-2**: `/plans/<slug>` renders one active plan with the image or the placeholder, the title, the summary when set, the price line, the highlights list when set, the rich description when set, an `Add to cart` form and a `Back to all plans` link. A slug that matches no active plan renders the Next not found page with HTTP 404. The detail page is `force-static` with `revalidate = 600` and a `generateStaticParams` over the active plan slugs.
- **AC-3**: `Add to cart` is a form that posts a Next server action with the plan id and the slug. The action reads the plan with `overrideAccess: false` and refuses anything that is not an active plan, then writes the cart cookie and redirects to `/cart`. The cookie is named `unave_cart` and holds one URI encoded JSON entry, `{ planId, slug, addedAt }`, with `httpOnly: true`, `sameSite: 'lax'`, `path: '/'`, `secure` in production and a 30 day maximum age. Adding a plan replaces any existing entry, so the cart holds at most one plan. A missing or inactive plan writes no cookie and redirects to `/plans`.
- **AC-4**: `/cart` reads the cart cookie. With no cookie, or a cookie whose value cannot be parsed as JSON or whose `planId` is not a positive integer, the page shows the empty cart copy, a `Browse plans` link to `/plans`, and no plan detail.
- **AC-5**: `/cart` with a valid cookie reads the plan live with `overrideAccess: false`. When the plan is active, the page shows the image or the placeholder, the title, the price line, a `Remove` form and a `Proceed to checkout` button that is disabled, with the `Checkout is coming soon.` note beside it, and a `Browse all plans` link. When the plan is missing or no longer active, the page treats the entry as absent and shows the `That plan is no longer available.` notice with the `Browse plans` link, and no price. A page render cannot change a cookie, so the stale entry stays until the next add replaces it or the visitor removes it, and it can never show a plan because every render re-reads the plan. The cart route is never cached and is not static, because it reads the cookie on every request.
- **AC-6**: the `Remove` action clears the cart cookie and re-renders `/cart` in its empty state. Removing is one server action and is idempotent, so removing an already empty cart leaves it empty and returns no error.
- **AC-7**: the cart cookie holds only the plan id, the slug and the added time, all public plan data. No name, email, phone, address or payment value is ever written to it, and it is `httpOnly` so no client script can read it. The value is read behind a `try` and `catch`, so a hand edited or truncated cookie is treated as an empty cart and never throws.
- **AC-8**: the cart read is live, so a plan switched off or deleted after it was added is dropped the next time `/cart` renders, without waiting for the listing cache window. The price and the meals line on the cart always come from the live plan, never from a stored copy.
- **AC-9**: `/plans` and `/plans/<slug>` are indexable and appear in the sitemap. `/cart` is `noindex, nofollow`, is absent from the sitemap and is never cached. `/plans` carries a static `metadata` export with a fixed title, description and canonical `/plans`. `/plans/<slug>` builds its metadata from the plan title and summary with a canonical `/plans/<slug>` and, when the plan has an image, an open graph image from the media `og` size, else the original media URL, else the site default asset, resolved with `getServerSideURL()`. Neither page metadata nor the open graph tags ever contain anything private.
- **AC-10**: `/plans/<slug>` emits one `Product` JSON-LD object with an `Offer` carrying `price` as the whole rupee number, `priceCurrency` `INR`, `availability` `https://schema.org/InStock` and `url` the canonical plan URL, plus `name` and `description` from the plan. The serialized JSON escapes `<`, `>` and `&`, so a plan field can never break out of the script tag.
- **AC-11**: the three pages use the site header and footer and the existing Card, Button and Media primitives. Prices render through `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })`. The price line reads `{price} per week` or `{price} per month` from the billing period, with the meals line `{mealsPerWeek} meals a week`. A plan with no image shows a neutral block that is hidden from assistive technology, never a broken image. The pages work at 320px width, `Add to cart` and `Remove` are real submit buttons with visible labels, and the disabled checkout control is not reachable by keyboard focus.
- **AC-12**: the site header renders a `Plans` link to `/plans` for every visitor in the header menu, added in the Header component code rather than through the content managed `navItems`, so the link exists on a fresh database with no header content.
- **AC-13**: a `plans-sitemap.xml` route follows the existing sitemap pattern, lists `/plans` and every active plan's `/plans/<slug>` with the plan `updatedAt` as the last modified date, and is added to `additionalSitemaps` in `next-sitemap.config.cjs`. `/cart` is excluded. The new route is cached with `unstable_cache` like the existing sitemap routes.
- **AC-14**: no new environment variables are required. `pnpm exec tsc --noEmit` passes, and the new integration and end to end tests pass.

- **AC-15**: the listing opens with a hero in the §6.3 language: a deep green band with the faint gold swoosh, a gold eyebrow, a Playfair `h1` whose key phrase is in gold, one sub-line, one gold **Compare plans** pill linking to the `#plans` explorer anchor, and the trust row (*Fresh daily · Flexible plans · Cancel any time*) as icon chips. The hero adds no second `h1` and no link that competes with the plan cards; the photograph the home hero carries is deliberately absent.

- **AC-16**: the listing closes with a FAQ section of the plans page's own questions in the §6.10 native `<details>` accordion (first answer open, chevron rotating, no JavaScript needed), rendered by the shared `Faq` component with the plans questions passed as props, and one `FAQPage` JSON-LD object serializing exactly those questions with `<` escaped, the same way the home page emits its own. The answers never imply an account is needed to browse or order, and carry no medical or health claim.

## Decision

**Chosen option**: Option 1: a public listing, a plan detail page, and a cart held in one cookie the server reads.

A visitor browses the active plans, opens one, and adds it to a cart kept in a single `httpOnly` cookie with one entry. The cart page renders on the server from a live plan read, so it needs no table, no session and no JavaScript, and a plan that is no longer on sale is dropped with a clear notice.

## Feature design

**Data model sketch**:

`plans` (existing collection, unchanged)

| Field | Type | Rules |
|---|---|---|
| title | text | existing, required, used as the card and detail heading |
| summary | textarea | existing, optional, the card and detail short text |
| description | richText | existing, optional, rendered on the detail page through the RichText component |
| billingPeriod | select | existing, `weekly` or `monthly`, required |
| mealsPerWeek | number | existing, required, minimum 1 |
| price | number | existing, whole rupees, required, minimum 1 |
| highlights | array of text | existing, optional, maximum 8 rows |
| image | upload to media | existing, optional |
| isActive | checkbox | existing, indexed, default false, the only public read filter |
| sortOrder | number | existing, default 0, lower first |
| slug | text | existing, unique, the public URL key |

`cart` (new, a cookie, no table)

| Field | Type | Rules |
|---|---|---|
| cookie name | literal | `unave_cart` |
| value | string | URI encoded JSON of one entry, `{ planId, slug, addedAt }` |
| planId | number | the plan id, the key used for the live read |
| slug | string | the plan slug, kept so a redirect can be built without a second read |
| addedAt | string | ISO time, written for observability and a future stale cart rule, never displayed |
| attributes | literal | `httpOnly: true`, `sameSite: 'lax'`, `path: '/'`, `secure` in production, `maxAge` 30 days |

The plan is never copied into the cart. Every displayed plan value is read live from `plans` at render time, so the cart cannot show a stale price.

**Page copy**:

Every new user facing string is listed here, and the build writes no other. The price amount inside a copy line comes from the shared formatter, and the period word and meals count come from the plan.

| Place | Copy |
|---|---|
| Listing metadata title | `Plans` |
| Listing metadata description | `Weekly and monthly food plans from Unave. Pick a plan and see what is included.` |
| Listing heading | `Plans` |
| Listing intro | `Pick the plan that fits your week.` |
| Listing empty | `No plans are available right now.` |
| Listing empty action | `Contact us` |
| Price line, weekly | `{price} per week` |
| Price line, monthly | `{price} per month` |
| Meals line, plural | `{mealsPerWeek} meals a week` |
| Meals line, one meal | `1 meal a week` |
| Detail metadata fallback description | `A food plan from Unave.` |
| Detail back link | `Back to all plans` |
| Detail highlights heading | `What you get` |
| Detail add button | `Add to cart` |
| Cart metadata title | `Your cart` |
| Cart heading | `Your cart` |
| Cart empty | `Your cart is empty` |
| Cart empty action | `Browse plans` |
| Cart unavailable notice | `That plan is no longer available.` |
| Cart remove button | `Remove` |
| Cart checkout button | `Proceed to checkout` |
| Cart checkout note | `Checkout is coming soon.` |
| Cart browse link | `Browse all plans` |
| Header link label | `Plans` |
| Hero eyebrow | `Meal plans` |
| Hero headline | `Plans that fit` + accent `your week` |
| Hero sub-line | `A few simple ways to eat from our kitchen all week. Compare them here, open one for the details, and change your mind whenever you like.` |
| Hero call to action | `Compare plans` |
| Search label / placeholder | `Search plans` / `Try “breakfast”` |
| Period filter label | `Billing period` (options in `planCatalog`: `Any length`, `Weekly`, `Monthly`) |
| Meals filter label | `Meals a week` (buckets in `planCatalog`: `Any number`, `Up to 7`, `8 to 14`, `15 or more`) |
| Sort label | `Sort by` (options in `planCatalog`: `Featured first`, `Price: low to high`, `Price: high to low`, `Most meals a week`) |
| Apply button | `Apply filters` |
| Clear link | `Clear filters` |
| View toggle label | `View`; the two choices are icon-only links with the accessible names `Grid view` and `List view` |
| Results count, all shown | `Showing all {n} plans` (singular `plan` when one) |
| Results count, filtered | `Showing {shown} of {total} plans` |
| Results count, paginated | `Showing {from}–{to} of {total} plans` |
| Pager | `Previous`, page numbers, `Next`; nine plans per page |
| No match | `No plans match that search or those filters.` |
| Price note | `Prices and delivery details are shown on each plan page before you pay.` |
| FAQ heading | `Plan questions` |
| FAQ items | the four questions in `PLANS_FAQ`, ending with `Do I need an account to browse or order?` answered `No.` |

**State transitions**:

```
plan: isActive true <-> false (staff, existing). Delete is blocked while a subscription references the plan.
cart: empty -> holds one plan  (add, or replace an existing entry)
      holds one plan -> empty   (remove)
      holds one plan -> empty   (the plan read returns nothing; the entry stays until the next add or remove)
cart: empty -> empty            (remove on an empty cart, idempotent)
```

The cart has no stored state beyond the cookie, and no state is written to the database.

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/plans` | GET | none | one card per active plan | public | empty listing state when no plan is active |
| `/plans/[slug]` | GET | `slug` in the path | one plan detail, the add form | public | 404 for an unknown or inactive slug |
| `/cart` | GET | the `unave_cart` cookie | the chosen plan, or the empty or dropped state | public | drops an unavailable plan, treats a bad cookie as empty |
| add to cart | POST (server action) | `planId:number`, `slug:string` | sets the cookie, redirects to `/cart` | public | a missing or inactive plan redirects to `/plans` and writes no cookie |
| remove from cart | POST (server action) | none | clears the cookie, re-renders the cart | public | none, idempotent |

Both mutations are Next server actions, so they stay off the public REST surface and inherit the origin check Next applies to actions. There is no REST route for the cart.

**Value sourcing**:

| Action | Value produced or displayed | Source |
|---|---|---|
| listing | the plan set | `plans` read with `payload.find` and `overrideAccess: false`, so the collection's active only access rule is the filter, sorted `sortOrder`, limited to 100, depth 1 so the image resolves |
| listing query | search, filters, sort, view | the URL search params parsed by `parsePlanQuery` in `src/utilities/planCatalog.ts`; unknown or missing values fall back to the defaults |
| listing results | the shown set | `filterAndSortPlans` over the fetched plans: search across title and summary, the period equality, the meals buckets with inclusive edges, and a stable sort whose ties fall back to the featured order |
| listing view | grid or list | the `view` param; the toggle and the clear link are links built by `planQueryHref`, which omits every default so `/plans` stays canonical |
| listing pagination | one page of results | `paginatePlans` slices the filtered set at nine per page and clamps the requested `page` param into range; the pager links come from `planQueryHref`, and the shared `Pagination` component renders them as `<a>` when given an `hrefFor` builder, so the posts pages keep their script-driven pager and this one does not need a script |
| listing card | image | the plan `image` relationship through the Media component, else the neutral placeholder |
| listing card | title, summary | `plans.title`, `plans.summary` (the summary line is omitted when blank) |
| listing card | link | `/plans/` plus `plans.slug` |
| price line | amount | `plans.price` formatted by `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })` |
| price line | period word | `plans.billingPeriod`: `week` for `weekly`, `month` for `monthly` |
| meals line | meals count | `plans.mealsPerWeek` |
| detail | plan | `plans` where `slug` equals the decoded path slug, read with `overrideAccess: false` so the active only access rule applies, depth 1, wrapped in `React.cache` like the existing detail routes |
| detail | highlights | `plans.highlights[].text`, each row rendered in order, the list omitted when empty |
| detail | description | `plans.description` rendered through the existing `RichText` component, omitted when empty |
| detail | add form fields | `plans.id` and `plans.slug`, carried as hidden inputs |
| cart | plan | the cookie `planId`, then a live read of `plans` by id with `overrideAccess: false` and depth 1 |
| cart | plan values | the live plan, so a switched off plan reads as nothing and is dropped |
| cart | checkout control | a hardcoded disabled button with the `Checkout is coming soon.` note, until feature 4 supplies a target |
| detail metadata | title, description | `plans.title` and `plans.summary` (a fixed fallback description when the summary is blank) |
| detail metadata | canonical | `/plans/` plus `plans.slug`, resolved against `metadataBase` |
| detail metadata | open graph image | `plans.image.sizes.og.url`, else `plans.image.url`, else `/website-template-OG.webp`, each joined with `getServerSideURL()` |
| detail page | JSON-LD | `plans.title`, `plans.summary`, `plans.price` as a whole rupee string, `plans.slug`, and `getServerSideURL()` for the offer URL |
| sitemap | URLs and dates | `/plans` plus each active plan's slug, with `plans.updatedAt` as `lastmod`, read with `overrideAccess: false` |
| header | the Plans link | the literal `/plans` and the literal label `Plans`, rendered by the Header component |
| all pages | prices and the period word | the existing `formatPlanPrice` in `src/utilities/planDisplay.ts`, plus a `planPeriodWord` helper added there, so the card, the detail and the cart share one formatter and cannot drift |

**Key invariants**:

- The cart holds at most one plan. Adding replaces.
- The cart cookie holds only `planId`, `slug` and `addedAt`, all public plan data, and is `httpOnly`.
- A plan is shown on the listing, the detail page or the cart only when it is active at read time.
- Every public plan read passes `overrideAccess: false`, because the local API defaults to bypassing access and would otherwise show inactive plans.
- A displayed price, period or meals value always comes from the live plan, never from a stored copy.
- Removing is idempotent.
- The cart route reads a cookie, so it is never cached and never static.
- The `Add to cart` action never trusts the submitted id beyond reading the plan back with `overrideAccess: false`.
- No new environment variables.
- The existing Plans collection, its access rules, the admin panel and every existing public page are unchanged.

**Security model**:

All three pages are public, with no account and no session. The cart holds only public plan data, so a leaked or forged cookie reveals nothing private and grants no access. The cookie is `httpOnly` (no script can read it), `sameSite: 'lax'` (it is not sent on a cross site POST), `path: '/'`, and `secure` in production. Both mutations are Next server actions, which carry the same origin check Next applies to actions.

The add action reads the plan back with `overrideAccess: false` and refuses an inactive or unknown plan, so a caller cannot force an unavailable plan into the cart. The cart read is also `overrideAccess: false`, so a plan switched off after it was added drops out. No rate limit is added here: the only write target is the caller's own cookie and the only side effect is one plan read, so there is no shared resource, no email and no database write to protect. The checkout action in feature 4 does write a subscription and send mail, and it must reuse the existing `src/utilities/rateLimit.ts` limiter.

No card data and no payment credential is involved. This feature adds no personal data at all, so no regulated scope applies.

**Configuration required**:

None. The feature reuses `NEXT_PUBLIC_SERVER_URL` for canonical URLs and the sitemap, and the existing Payload connection. No new secret is added because the cart is deliberately unsigned: it holds public data only.

**Critical test scenarios** (each maps to an acceptance criterion in `## Requirements`):

- Happy path: open `/plans`, open a plan, add to cart, land on `/cart` and see the same plan with the live price, verifies **AC-1**, **AC-2**, **AC-3**, **AC-5**, **AC-11**
- Explorer: search a term that matches one plan and one that matches none, filter by period and meals bucket, sort by price, switch to the list view and back, apply filters from the list view and see the view survive, and prove the pager is absent while everything fits one page, verifies **AC-1**
- Hero and FAQ: the hero's `h1`, trust chips and `#plans` anchor, and the FAQ's four questions with their `FAQPage` JSON-LD, verifies **AC-15**, **AC-16**
- Empty cart: open `/cart` with no cookie, verifies **AC-4**
- Bad cookie: set the cookie to a truncated value and to a valid shape with a plan id that does not exist, verifies **AC-4**, **AC-7**
- Unavailable plan: add an active plan, switch it off in the admin panel, reload `/cart`, verifies **AC-5**, **AC-8**
- Replace: add one plan, then add a second, and prove the cart holds only the second, verifies **AC-3**
- Refused add: submit the add action for an inactive plan and for an unknown id, verifies **AC-3**
- Remove: remove from the cart, reload, and remove again, verifies **AC-6**
- Missing detail: open an unknown slug and an inactive plan's slug, verifies **AC-2**
- Access filter: prove an inactive plan is absent from `/plans`, from its own detail URL and from the sitemap, verifies **AC-1**, **AC-2**, **AC-13**
- Discovery: check both pages' metadata, the canonical, the open graph image, the `Product` JSON-LD with a plan title that contains a `<` character, `/cart` robots and the sitemap contents, verifies **AC-9**, **AC-10**, **AC-13**
- Privacy: inspect the cart cookie attributes and value, verifies **AC-7**
- Auth/permission: no access is denied, because every page is public; prove the cart cookie grants nothing and is `httpOnly`, verifies **AC-7**
- Header: load any page on a database with no header content and find the `Plans` link, verifies **AC-12**
- Responsive and accessibility: the three pages at 320px, the add and remove submit buttons, and the disabled control outside the tab order, verifies **AC-11**
- Gate: run `pnpm exec tsc --noEmit` and the tests, verifies **AC-14**

## Build plan

The project uses Tracer Bullet. This plan opens one real thread from the listing URL through a Payload read, the detail page and the add action to the cart page, so the whole pipe is proven before it is thickened. No schema change is needed, because the Plans collection already carries every field the pages show and already reads publicly when a plan is available.

- [x] 1. Open the thin thread: add `/plans` reading the active plans with `overrideAccess: false` and `sort: 'sortOrder'`, `/plans/[slug]` reading one plan with `notFound()` on a miss, the `Add to cart` server action that re-reads the plan and writes the `unave_cart` cookie, and a minimal `/cart` that reads the cookie and renders the plan title. Prove URL, database read, cookie write and cart render end to end before adding polish, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-7**
- [x] 2. Thicken the two read surfaces: the plan card with the image or the hidden placeholder, the title, the summary and the price line, the listing heading, intro and grid, the detail layout with the image, the price line, the highlights, the rich description, the add form and the `Back to all plans` link, plus the shared `formatPlanPrice` and the new `planPeriodWord` in `src/utilities/planDisplay.ts`, the responsive layout and the accessibility behavior, satisfies **AC-1**, **AC-2**, **AC-11**
- [x] 3. Thicken the cart: the empty state, the unavailable plan drop with the notice, the live read, the `Remove` action, the disabled `Proceed to checkout` with the coming soon note, and the browse links, satisfies **AC-4**, **AC-5**, **AC-6**, **AC-7**, **AC-8**
- [x] 4. Add discovery and wiring: the static metadata on `/plans`, `generateMetadata` with the canonical and the open graph image on the detail, the `Product` JSON-LD with escaping, the `/cart` robots exclusion and no cache, the `Plans` link in the Header component, and the `plans-sitemap.xml` route plus the `next-sitemap.config.cjs` entry, satisfies **AC-9**, **AC-10**, **AC-12**, **AC-13**
- [x] 5. Add the tests and run the gate: integration tests for the cookie parse and the price and period formatting, end to end tests for browse, detail, add, cart, remove, the disabled checkout, the unknown slug and the sitemap, then `pnpm exec tsc --noEmit`, satisfies **AC-14**
- [x] 6. Widen the listing into the full page: the hero (AC-15), the explorer toolbar with search, the period and meals filters, the sort and the grid/list toggle all driven by the URL's search params through the new `src/utilities/planCatalog.ts` (whose parse, filter, sort and href builders carry unit tests), the list row, the plans FAQ with the generalized `Faq` component and its `FAQPage` JSON-LD (AC-16), and the copy table additions, satisfies **AC-1**, **AC-15**, **AC-16**
- [x] 7. Paginate the filtered set at nine per page behind a `page` search param: `paginatePlans` and the page parsing in `planCatalog.ts`, a link mode in the shared `Pagination` component and the shadcn `PaginationLink` so the pager renders as real `<a>` links and works without JavaScript, the count line naming the page's window, and unit tests for slicing, clamping and the hrefs, satisfies **AC-1**

## Consequences

**Positive**:

- A visitor can finally see what is for sale on the public site, which today shows nothing but content pages.
- The listing and detail are a plain read of an existing collection, so the whole feature is roughly three pages and one cookie.
- The cart needs no table, no session and no JavaScript, because the server reads the cookie.
- A plan switched off after it was added is dropped with a clear message instead of a dead end or a wrong price.
- The pages reuse the site chrome and the shadcn primitives, so they look like the rest of the site for almost no code.
- The plan pages are indexable and carry structured data, so the plans can be found in search.

**Negative or tradeoffs**:

- The cart adds a step to a one plan order. The visitor opens a plan, adds it, then reviews it, where a single click could have reached checkout.
- Because the cart holds one plan, `Add to cart` really means `replace`, which can surprise a visitor who expects a second item to join the first.
- The checkout button is disabled until feature 4 exists, so the flow deliberately ends at a parked step with `Checkout is coming soon.`.
- The listing and detail were cached for 600 seconds; the listing gave that up when it started reading the query string (it is now `force-dynamic`, one Payload read per request against a catalog of at most 100 plans), and the detail page keeps its cache. The cart read is live and the add action re-reads the plan, so the worst case is one refused click, not a wrong charge.
- The listing has no pagination. A hard limit of 100 plans is honest for staff curated plans and wrong if plans ever become user generated.
- A plan cannot be deleted while it has subscriptions, so the dropped cart case is almost always a deactivation, not a real delete.
- The cart lives in one browser. A cleared browser or another device loses it, and two tabs that add different plans race, with the last write winning.
- An unsigned cookie can be edited by the visitor, but it holds only public data, so the only effect is choosing a different plan or none.
- The listing page adds a second public route at the same level as the catch all `/[slug]` content route. Next prefers the static segment, and `/search` already proves the pattern, but it is one more route to keep in mind.

**Neutral**:

- No migration and no schema change, because the Plans collection already has every field the pages need.
- Three new public routes, one new utility module, one new server action pair, one new sitemap route and one small Header edit.
- The sitemap gains a third route alongside the existing pages and posts sitemaps.
- The reconciliation with the scope is recorded in `## Follow-up`: the cart covers the first half of scope feature 4, and feature 4 will replace the disabled checkout step.

## Follow-up

- [ ] Replace the disabled checkout control with feature 4's checkout form, and give the checkout action a rate limit by reusing `src/utilities/rateLimit.ts`.
- [ ] Design guest checkout and confirmation (scope feature 4), which owns the form, the subscription write and the confirmation screen.
- [x] Add pagination to `/plans`: the filtered set paginates at nine per page behind the `page` search param, using the existing `Pagination` component, which now renders real `<a>` links when given an `hrefFor` builder (the posts pages keep their script-driven pager).
- [ ] Raise the `plans` fetch limit or push the search and filters into the Payload query if the catalog ever approaches 100 active plans; the pagination slices what was fetched, so today's `limit: 100` still bounds the whole catalog.
- [ ] Consider a quantity or a multi plan cart if the business ever sells combos, since a one plan cookie cannot express a bundle.
- [ ] Consider using the cart `addedAt` value to expire or flag a stale cart, or remove the field if it stays unused.
- [ ] Confirm the open graph fallback asset. The repository still ships `website-template-OG.webp` and the Payload template description strings, so a rebrand should replace them before launch.
- [ ] Validate the `Product` structured data with a rich results test once the plans are live, and switch to a `Service` or a subscription shape if product results are a poor fit for a food plan.
- [x] `/contact` exists as a code route (spec 0006), so the empty listing state's `Contact us` link resolves; no CMS page needs publishing for it.
- [ ] Decide whether the cart is worth keeping at all if the goal is the shortest path to checkout; feature 4 could link straight from the detail page instead.
- [ ] Run `/audit` to capture project conventions in `AGENTS.md`. It still holds only the Next.js block, so later specs lose the project context.
- [ ] Run `/check verify` and `/test` after the build.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).
