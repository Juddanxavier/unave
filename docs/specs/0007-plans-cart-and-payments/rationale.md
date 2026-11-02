# 0007 rationale: plans and payments

## Context

> ⚠️ Premise note: requiring sign in to buy trades conversion for accountability. The design contract until today promised that an account only saves details, and guest checkout would have honored it. The engineer chose sign in required knowingly, so the kitchen always knows who ordered and can reach them; the cost is that a ready to buy visitor without an account must stop and create one first, and some of them will not. The contract change is recorded in the spec and `design.md` must be amended, not quietly ignored.

The kitchen previously sold plans through the site: that build (plans, subscriptions, payments, cart, checkout) was removed on 2026-10-31 after being completed, its tables dropped and its specs deleted, because the kitchen went back to taking orders by message. The same day the decision reversed again: the kitchen wants to sell through the site. The old code exists in git history but the site has moved on since it was written (customer accounts rebuilt under spec 0005, the mail system reworked under spec 0002), so this design starts fresh and borrows patterns, not code.

Forces at play:

- Real money changes hands, so every amount, every state change and every identity claim must be verifiable on the server, and the paid signal must survive the customer closing the browser.
- The team is small and the site is one Next.js and Payload codebase with Postgres; an operations light design (no queues, no new services, no new dependencies) is worth more than an extensible one.
- The design contract (`docs/design/design.md`) governs every surface, and until today promised accounts never gate anything; this feature changes that one promise deliberately.
- India is the market: Razorpay is the named gateway, INR the currency, paise the unit.

Not deciding means the site keeps promising orders by message while the kitchen wants online sales, and every order stays manual.

## Options considered

These options were weighed on 2026-10-31, when a cart still held several plans. The revision at the end of this file records why the cart was later removed.

### Option 1: Keep taking orders by message

No build. The site keeps its current promise and the kitchen keeps doing manual order taking over WhatsApp, phone and email.

**Pros**:

- Zero cost, zero risk, and the staff already run the kitchen this way.

**Cons**:

- The kitchen asked to sell online; declining the feature is not a design.

### Option 2: Payload collections plus Razorpay Standard Checkout, direct REST (recommended)

A `plans` catalogue and an `orders` collection in Payload, a browser cookie cart, a checkout endpoint that recomputes prices and calls `POST /v1/orders` over REST, the Standard Checkout popup in the browser, a verified return plus a signed idempotent webhook, and both emails through the existing transport.

**Pros**:

- The standard integration for a custom site: the buying experience stays inside the brand, and the server stays the only authority on money.
- No new dependency (two REST calls and two HMAC checks with Node's crypto), matching how the mail module talks to ZeptoMail.
- Reuses the session model (spec 0005), the mail transport and settings (spec 0002), the endpoint and rate limit pattern (spec 0006), and the guarded migration habit.

**Cons**:

- Hand written gateway plumbing must itself be correct: raw body HMAC for the webhook, idempotency, and the popup lifecycle are the builder's job, not a library's.

### Option 3: Hosted Razorpay Payment Pages

Razorpay hosts the whole buying page; the site links out to it per plan.

**Pros**:

- The least code that can take money; no checkout page, no cart, no popup integration to build.

**Cons**:

- The buying experience leaves the site and the design contract does not travel; the cart (a core ask) cannot exist; linking out per duration fights the catalogue.

### Option 4: Restore the removed build from git history

Pull the deleted plans, cart, checkout and Razorpay code back and adapt it.

**Pros**:

- The fastest path to working code, and it once passed through this same pipeline.

**Cons**:

- It was written against a site that no longer exists: an older account model, an older mail system, and a plans model (with subscriptions) the kitchen no longer sells. Adapting it means reviewing every line against today's contracts anyway, and the engineer explicitly chose to build fresh.

## Rationale

Option 2 wins on the forces that matter here. Money correctness comes from the server being the only authority on amounts and the webhook plus return check covering the closed browser case; both live naturally in this design. Operational weight stays near zero: no new dependency, no new service, one migration, and admin surfaces that arrive free with Payload. The alternatives fail on the stated requirements rather than on taste: Option 1 declines the ask, Option 3 cannot host a cart inside the brand, and Option 4 drags a superseded architecture back onto a changed site.

The engineer's choices that shaped this: a plan is one catalogue entry with duration options priced in paise; the first build held several plans in a cart, and a 2026-11-01 revision removed it in favour of one plan per order; deliveries start when the kitchen decides, so the order carries no customer promised date, only an optional staff filled `startsOn`; cancellations and refunds stay manual (fulfilment states are deferred in scope); the confirmation email doubles as the receipt, so no invoice machinery exists; and the gateway is Razorpay by name, kept out of the scope row but confirmed here.

The runner up is Option 4, and it is a real runner up: if this build stalls, reviving the old code remains cheaper than this spec. What tips the balance today is that the old build's centre of gravity (subscriptions, guest links) was exactly what got removed, while the parts of today's site it would collide with (the rebuilt `customers` collection, the reworked mail keys, the amended design contract) are the parts that changed most.

The cross check pass hardened the mechanics the first draft left to the builder, and the spec now owns them: the webhook is a plain route handler because the signature needs the raw request bytes; the paid order is written once, guarded by the unique gateway order id, so the return path and the webhook cannot both write it or both send the mails; every gateway signal must match the intent on the gateway order's amount, currency and order id before it counts; and the checkout link carries only a plan slug and duration label, so every amount is read from the record.

## Revision, 2026-11-01: the cart was removed

The engineer decided the shelf should sell one plan at a time: a customer presses Buy now on a card and lands on checkout with that plan and duration. The cart, its cookie, the 20 line cap, the duplicate rule and the `/cart` page all go.

Why:

- The cart existed to let one payment cover several plans. In practice a plan is bought on its own, and the cart bought real complexity for no revenue: a cookie format, duplicate refusals, a cart page with empty and unknown line states, merge rules, and a second place where totals were computed.
- A checkout link carries identifiers only, so the server reads the live price at checkout. The cart's label, days and price matching rule existed only because the cookie carried a price. That whole class of tampering disappears.
- One plan per order makes the order, its two emails and the admin view simpler to read. A customer who wants two plans buys twice.

The cost: no mixed basket, two payments where one used to do, and the loss of the cart's keep browsing convenience. The `orders.items` array stays, holding exactly one item, so a basket can return later without a schema change. This is recorded as a spec decision, not treated as an implementation detail.

## Revision, 2026-11-01 (later): only completed payments are recorded

The engineer's rule: an unpaid checkout must never leave a row behind. Many people reach checkout and leave without paying, and a table of pending rows is upkeep with no revenue.

What changed:

- `orders.status` and the pending and confirming states are gone. A row is written only when a captured payment is confirmed, so a row always means one completed payment.
- The create endpoint writes no row. The plan, its duration, its price and the delivery details ride on the Razorpay order's own notes, so the intent survives a closed browser without a local table to prune.
- The verify return and the signed webhook both write the one paid row, guarded by the unique `gatewayOrderId`: two signals race, one insert wins, one set of mails.
- A migration deletes rows that were never paid and drops the status column.

Why: the pending row existed only to be flipped later, and it carried the cost of abandoned checkouts. Putting the intent on the gateway order removes the local state entirely while still letting the webhook record a payment whose browser never came back. The tradeoff is that a long kitchen note is capped on the gateway order, and an abandoned checkout leaves no local trace, which is the point.
