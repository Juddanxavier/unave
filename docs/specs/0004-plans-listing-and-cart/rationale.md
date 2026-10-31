# 0004. Plans listing, plan detail and cart rationale

## Context

> ⚠️ Premise note: a cart is an extra hop for an order that is always one plan. The simplest flow is plan to checkout in one step, with no cart page at all, and the shop could keep that if the only goal is speed. A cart is worth its hop only because it gives the visitor a review step before a real order and a home for the checkout that feature 4 will add. It also ends today at a disabled button, because nothing can be bought yet. If the review step is not wanted, feature 4 should link straight from the detail page and this spec's cart should be dropped. The rest of the spec builds the listing and detail that feature 3 needs either way.
>
> ⚠️ Prerequisite note: this feature assumes guest checkout, which has no spec. Scope feature 4 owns the form, the subscription write and the confirmation screen, and none of it exists. This spec assumes only that a checkout begins at `/cart` and that the cart hands it the plan id. Every other checkout assumption is left to feature 4.

The site sells weekly and monthly food plans to guests with no account, but the public site has no page that shows a plan. The Plans collection and its admin panel have existed since spec 0001, and the collection already carries everything a shop page needs: a title, a short summary, a rich description, a highlights list, an image, a price, meals per week, a weekly or monthly period, a sort order, an availability switch and a unique slug. The public read rule already hides inactive plans. So the data is complete and the pages are simply missing. Today a visitor cannot see what is for sale at all.

Scope feature 3 covers the public listing and the plan detail, and scope feature 4 covers guest checkout. Neither has a spec. The engineer asked for the ecommerce shape: browse the plans, open one, and put it in a cart. That splits the work in a useful way. The two pages are a straight read of an existing collection with no state of their own. The cart is the only piece of state, and it is the one real design decision in the feature.

The forces are small and ordinary. The business is a food kitchen, not a store with a catalogue that changes hourly, so a handful of plans is the realistic count. Payments happen off the app, so the flow stops before money and there is no order, no invoice and no customer record yet. There are no accounts and no sessions, which is the same constraint spec 0003 worked under. The site runs as one Next application with Payload and Postgres behind it, and the repository already has the chrome and the shadcn primitives that any new page should reuse. The build approach is Tracer Bullet, so the plan proves the whole pipe with one real path before it thickens the surfaces.

## Options considered

### Option 1: A public listing, a plan detail page, and a cart in one cookie the server reads

Add `/plans` and `/plans/<slug>` as plain reads of the active plans, and a `/cart` that reads a single `httpOnly` cookie holding one plan id, slug and added time. Adding a plan replaces the entry, and the cart renders from a live plan read so a switched off plan drops out.

**Pros**:
- The cart page stays a server component, so it works without JavaScript, needs no table and needs no session.
- The live read removes the stale price and the dead plan problems for free.
- The whole feature reuses the existing collection, chrome and primitives, so it is small.

**Cons**:
- One cookie is a second source of truth next to the database, even if it is tiny.
- A cart that cannot reach a real checkout ends at a disabled button.
- The cookie is per browser, so a cleared browser or another device loses the cart.

### Option 2: The listing and detail only, and no cart

Build the two public pages and let the subscribe button point at the checkout path that feature 4 will build. Nothing is held between pages.

**Pros**:
- The shortest path from a plan to a purchase, with no extra step and no cookie at all.
- The smallest diff, and no new client state to reason about.

**Cons**:
- No review step before an order is placed.
- Feature 4 loses the natural place to show the chosen plan before the form.
- Adding a cart later means changing the detail page's primary action.

### Option 3: A cart in a cookie that holds several plans

Use the same cookie but store a list, so a visitor can hold more than one plan and remove a single line.

**Pros**:
- Supports a future bundle or a gift order without a redesign.
- The cart page looks like a familiar store cart.

**Cons**:
- The product is one plan per order, so the list, the quantities and the per line removal are machinery nothing uses.
- More cookie state, more parsing, and more empty and partial cart states to test.
- It invites a visitor to expect a combined order the business cannot fulfill.

### Option 4: A server side cart in Postgres keyed by a session id

Store the cart in a new table with a session identifier and a signed cookie that points at the row.

**Pros**:
- Survives a cleared cookie and works across devices once a session can be recognised.
- Becomes the natural home for an order when checkout arrives.

**Cons**:
- A new table, a session concept and a signing secret, all for a cart that holds one plan.
- More moving parts than the risk justifies at this size.
- The database becomes a hot write path for a step the visitor may abandon.

## Rationale

Option 1 wins because the two pages carry no state and the cart carries almost none. The listing and detail are a read of a collection that already exists and already filters inactive plans, so the only genuine choice is where the cart lives. A cookie the server reads keeps `/cart` a server component, which means no client state, no hydration mismatch, no JavaScript requirement and no table. The database row alternative (Option 4) is what checkout will eventually want, because an order is a real record, but a cart that holds one plan is not. That is operational weight with no payoff yet, and the engineering rule is not to add infrastructure before something needs it. Option 3, a multi plan cart, asks for list handling, quantities and per line removal to support an order the product never takes: one plan per order. Option 2 is the closest call, and it is deferred rather than rejected. It is the faster path to a purchase, but it leaves feature 4 with no review step and no place to show the chosen plan, and the engineer asked for the cart explicitly. The tradeoff to accept is the extra hop and the parked checkout, both recorded in Consequences.

Two smaller calls follow from the same reasoning. The cart drops an unavailable plan and says so, rather than keeping it and letting a later checkout fail, because the live read makes the drop free and a cart that shows a plan that can no longer be bought is a dead end. The price, period and meals on the card, the detail page and the cart all come from the live plan through one shared `src/utilities/planPrice.ts` module, so the three surfaces cannot drift and no price is ever copied into the cookie. The runner up was a price snapshot in the cookie, which is faster to render but risks showing a price the shop no longer charges.

The reads must pass `overrideAccess: false`. Payload's local API defaults to `true`, which bypasses the collection access function and would show inactive plans. The existing public routes in this repository already pass `false` for exactly this reason, so the plan pages follow that convention. The listing and detail also follow the repository's cache convention, `force-static` with `revalidate = 600`, while the cart opts out because it reads a cookie on every request.

No rate limit is added to the add action. The engineering rule is to rate limit any public endpoint, and the reason to break it here is concrete: the action's only write target is the caller's own cookie, and its only side effect is one plan read, so there is no shared resource, no mail and no row to protect. The checkout in feature 4 does write a subscription and send mail, and that action must reuse the existing in memory limiter from spec 0003.

The plan detail emits `Product` structured data with an `Offer`, because that is the shape search engines understand for one priced item, and the price is a whole rupee integer the shop already stores. A `Service` was the runner up; a food plan sits between a product and a service, and the product result is the more useful one for a page a buyer lands on.

## Cross check

A read only check against the acceptance criteria and the repository found the shape sound. The points below are the ones that shaped the spec.

- The plan pages read with `overrideAccess: false`, matching the existing public routes, so the collection's active only rule is the single filter for the listing, the detail and the sitemap.
- The cart is a cookie, so `/cart` reads it on every request and is never cached, while the listing and detail follow the repository's `revalidate = 600` pattern.
- Every displayed plan value is traced to the live plan or to the shared formatter, and the cookie carries only the id, the slug and the added time.
- The add action re-reads the plan, so a caller cannot force an inactive plan into the cart, and a plan switched off afterwards drops on the next cart render.
- The route at `/plans` sits beside the catch all `/[slug]` content route. Next prefers the static segment, and `/search` already proves the pattern, so no route change is needed.
- The checkout step has no target, so the disabled control with the coming soon note is the deliberate parked state, and feature 4 replaces it.
- No migration is written, because the collection this feature reads already carries every field and the cart adds no table.
