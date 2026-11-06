# 0007. Plans and payments

**Date**: 2026-10-31
**Revised**: 2026-11-01, the cart was removed; one plan per order. Later the same day, only completed payments are recorded: an order row is written when a payment is captured, so no pending rows exist.
**Revised**: 2026-11-06, the cart returns: Add to cart on every open plan card, a cart page, one payment for the whole basket, and the direct Buy now checkout link is retired. Acceptance criteria were renumbered in this revision; the mapping is recorded in the rationale.
**Status**: In Progress

## Summary

The kitchen sells meal plans on the site and now wants a basket: more products are coming, and customers should be able to take several plans in one order and pay once. A plan card carries a duration choice and one Add to cart control, the basket lives in a browser cookie as plain identifiers, a cart page lists the lines with live prices from the database, and checkout signs the customer in and pays the whole total through Razorpay's checkout popup. Payment is confirmed by a verified webhook plus a return check, and only a captured payment writes an order row, one row that may hold up to ten line snapshots. The order, its two emails and the admin view follow patterns the site already has.

## Requirements

**User stories**:

- As a hungry customer, I want to browse plans and prices without an account so that I can decide before committing to anything.
- As a customer, I want to add several plans and durations to a cart as I browse, so that one order and one payment can cover my household.
- As a customer, I want a cart page where I can see every line at its live price and remove what I changed my mind about, so that I trust what I am about to pay.
- As a customer, I want to sign in at checkout so that the kitchen knows who ordered and where to deliver.
- As a customer, I want to pay once through Razorpay for the whole basket so that my plans are booked without sending money by hand.
- As a customer, I want the order confirmed by email and visible in my account so that I can trust it went through.
- As staff, I want plans, prices and availability editable in the admin so that the menu stays current without a deploy.
- As staff, I want every paid order visible in the admin with every line it held, and announced by email, so that the kitchen can start deliveries.
- As the owner, I want every amount computed on the server so that nobody can pay a doctored price.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable; renumbered by the 2026-11-06 revision, see the rationale for the mapping from the previous set):

- **AC-1**: `/plans` renders every plan from Payload with its durations and prices, carries search metadata and a sitemap entry, and browsing it works without JavaScript. A plan with `available` off still renders, with a paused label, and offers no add to cart action.
- **AC-2**: Every open plan card carries a duration choice and one Add to cart control as its primary action. Adding writes one line (the plan's slug and the duration's label, nothing else) into a cart cookie; no account, no sign in and no price is involved in choosing. Adding a line is a plain form post that redirects back, so building the cart works without JavaScript; a small client enhancement makes the header count update instantly. A basket holds at most 10 lines. Adding the same plan and duration again is refused with a plain sentence; adding a paused plan is refused with a plain sentence. The header carries a cart control with the live line count that links to `/cart`. No card links directly to checkout.
- **AC-3**: `/cart` lists every line resolved from Payload at request time with its title, duration label, days, live price, and a total that is the sum of the live line prices computed on the server. A line whose plan is unknown or paused, or whose duration no longer exists on the plan, renders marked as stale with a remove control and is excluded from the total. Lines are removed with plain form posts, so managing the cart works without JavaScript. An empty cart shows a plain state with a way back to `/plans`. The page is excluded from search indexing and the sitemap.
- **AC-4**: `/checkout` requires a signed in customer: a signed out visitor is sent to sign in and returned afterwards with the cart intact (the cookie survives the round trip, so there is nothing to merge). A visitor who reaches checkout with an empty cart, including an old shared link, sees one plain sentence and a way to `/plans` instead of a form. Checkout shows every line with its title, duration label, days, live price and the server computed total, prefills the saved delivery details and food preference from the profile (spec 0005), lets the customer edit them for this order only, requires name, phone, address line 1, city, state and a six digit pincode (validated with the patterns spec 0005 already uses), and takes an optional note for the kitchen. A stale line blocks payment with a plain sentence naming the line and a way back to `/cart` to fix it.
- **AC-5**: Order creation happens on the server: the create endpoint reads the basket's line identifiers (plan slug, duration label) from the cart cookie on the server (the request carries only the delivery details and the note, never lines), resolves every line from the plan records, and reads each unit price in paise from the record; the total is the sum of the resolved prices, all inclusive, so no browser value can decide an amount. More than 10 lines, duplicate lines, an empty basket, an unknown or paused plan, or a duration that is not on the plan is refused with a plain sentence and no gateway order. The checkout intent (every resolved line with its price and days, the delivery details and note) rides on the Razorpay order's notes, kept small by keeping each note value short, and the gateway order is created over REST; no order row is written at checkout. Order creation is rate limited per IP like the enquiry form.
- **AC-6**: After the popup succeeds and the browser returns, the server checks the payment itself (fetched over REST) before writing anything: the signature `${orderId}|${paymentId}` verifies against the key secret, the payment is captured, its amount equals the gateway order amount and equals the sum of the intent's line prices, its currency is INR, its order id matches the gateway order, and the gateway order's notes name the signed in customer. Only then is the paid order written, holding every line as an immutable snapshot, and the cart cookie is cleared, so the customer lands on an order placed page showing the lines, the total and the payment id, with an empty basket that cannot be checked out twice. A failed check writes nothing, logs a warning, shows one plain sentence instead of an error, and leaves the cart untouched.
- **AC-7**: The webhook (a plain route handler reading the raw request bytes before any parsing) writes the paid order on a validly signed `payment.captured`, reading the multi line checkout intent from the gateway order's notes and checking the payment's order id, amount and currency against it. It is idempotent: a payment already recorded answers with success and writes nothing, an event with no readable intent logs and answers success (so Razorpay does not retry forever), and an invalid signature answers 400 with a logged warning and no write.
- **AC-8**: A successful payment sends the customer a confirmation and the kitchen a notice through the existing transport (spec 0002), under the `order` template key, and both emails list every line (plan, duration, days, price) and the total; a mail failure is logged and does not fail the order.
- **AC-9**: The account page lists the customer's own orders, newest first, with the order's lines, the total and the payment id. GraphQL is disabled on the `orders` collection outright, so a customer cannot read another customer's order over REST or GraphQL, and no customer can reach the CMS; a test proves each denial.
- **AC-10**: Staff create and edit plans, prices, durations and availability in the Payload admin and see every order with all of its items, the delivery snapshot, note, payment details and when deliveries begin (`startsOn`); every row is one completed payment that may hold up to ten line snapshots, and the admin description says so.
- **AC-11**: Every order's lines, prices and total shown anywhere match the server computed snapshot written when the payment was confirmed; editing a plan's title or price after a purchase never rewrites a past order, line by line.
- **AC-12**: The cart link in the header is added by staff in the admin (Site chrome, no code and no migration); the count on it is rendered by code, because it reflects each visitor's cookie. The chrome copy is updated so the site no longer implies one plan per order.
- **AC-13**: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` are documented in `.env.example`; without them the site still browses and messages normally, and the pay action reports a plain configuration error instead of breaking the page. The active mode (test or live, read from the key id's prefix) is logged at order creation and shown in the admin, so a test key pointed at a live dashboard is visible before it costs money.

## Decision

**Chosen option**: Option 2: a dedicated Payload commerce slice on Razorpay Standard Checkout.

The `plans` and `orders` collections live beside the existing collections, a browser cookie cart holds plain line identifiers, the cart page and checkout resolve every line from Payload at request time, the server talks to Razorpay over direct REST (no SDK dependency), and the paid signal is a verified return plus a signed webhook. The 2026-11-06 revision restores the cart part of this same option, which the 2026-11-01 revision had removed. Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch** (the target; no migration needed: the `orders.items` array already holds more than one item):

- `plans` (Payload collection, staff write, public read):
  - `title` text, required · `slug` text, required, unique · `description` rich text · `image` relation to media (optional)
  - `durations` array, required, each item { `label` text required · `days` integer required · `price` integer required (paise) }
  - `available` boolean, default true; off means the paused label shows and the plan cannot be added or bought
- `orders` (written only when a payment is captured, by the confirmation path, never by public REST):
  - `customer` relation to `customers`, required
  - `items` array holding one to ten items, each { `plan` relation · `planTitle` text · `durationLabel` text · `days` integer · `unitPrice` integer (paise) } — snapshots written once when the order is written
  - delivery snapshot { `name`, `phone`, `addressLine1`, `addressLine2`, `city`, `state`, `pincode`, `foodPreference`, `note` } matching the customer profile fields of spec 0005 (one delivery per order; the basket shares it)
  - `subtotal` and `total` integers in paise, read from the captured payment
  - gateway fields: `gatewayOrderId` (unique), `gatewayPaymentId`, `gatewaySignature`, `paidAt`
  - `startsOn` optional date, staff editable (the kitchen records when deliveries begin)
  - timestamps

**The cart and the buy path** (identifiers only, resolved at every hop):

- the cart lives in a browser cookie (`unave-cart`) holding at most 10 lines, each only a plan slug and a duration label; no prices, no days, no personal data in the cookie, so a tampered cookie can at worst carry junk that every later step refuses; the cookie lives 30 days and is same site lax
- the Add to cart control on an open plan card picks the duration the card already shows and writes the line into the cookie as a plain form post that redirects back, so it works with JavaScript off; duplicates are refused, the cap is refused, paused plans are refused, each with a plain sentence
- the header cart control renders the live line count from the same cookie; the cookie is readable by JavaScript on purpose so the count updates instantly (it carries nothing sensitive), and it is not httpOnly
- `/cart` resolves every line from Payload at request time and shows live titles, durations, days and prices, with the server computed total; stale lines (unknown or paused plan, or a duration that is gone) are marked and excluded from the total, with a remove control; removal is a plain form post so it works without JavaScript
- `/checkout` resolves every line again at request time and shows live prices and the server computed total; a stale line blocks payment with a plain sentence naming the line
- the sign in guard keeps the full checkout URL as its return path; the cart cookie survives sign in untouched, so there is no merge step anywhere: the cart never lives on the server
- the create endpoint reads the lines from the cart cookie on the server (the request body never carries lines), resolves every line from the database, computes the total as the sum, and carries the intent (lines with prices and days, delivery, note) on the gateway order's notes, each note value kept short (lines as indexed note keys) so the basket fits the gateway's note size limits; nothing is stored in the browser or in a local order row until a payment is captured
- the direct checkout link (`/checkout?plan=...&duration=...`) is gone; a visitor landing on `/checkout` with an empty cart gets a plain sentence and a way to the plans

**State transitions**:

- order: born `paid`. The row is written exactly once, when a captured payment is confirmed, and nowhere else; the verified return and the signed webhook can race, and the unique `gatewayOrderId` lets only one insert win, so only the winner writes the row and sends the mails. A checkout that is never paid writes no row at all. One row holds one to ten immutable line snapshots. No other states in this pass (no fulfilment states, no refunds).

**API surface** (Payload custom endpoints, following the enquiry endpoint pattern of spec 0006):

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/orders/create` | POST | delivery details, note (the lines come from the cart cookie read on the server) | gatewayOrderId, amount, key id, mode | customer session | 401 signed out, 422 empty basket, over the cap, duplicate lines, unknown or paused plan, duration not on the plan, 429 rate limited |
| `/api/orders/verify` | POST | razorpay_order_id, razorpay_payment_id, razorpay_signature | order id, status | customer session, order owner | 400 failed checks (nothing is written), 404 unknown or unowned gateway order |
| `/api/razorpay/webhook` (a Next route handler, not a Payload endpoint, because the HMAC needs the raw request bytes) | POST | Razorpay event body, `X-Razorpay-Signature` header | 200 | public, HMAC verified | 400 bad signature; an event with no readable intent answers 200 with a log |
| `/plans`, `/cart`, `/checkout`, `/order-placed/[id]` | GET | nothing on cart, order id on the last | rendered pages | public for `/plans` and `/cart`, sign in redirect on `/checkout`, owner session on the order page | 404, redirect to sign in |

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Browse `/plans` | plan cards, durations, prices, paused label | `plans` columns and `durations` array; metadata via the existing SEO plugin |
| Add to cart | one cart line (slug, duration label), the line count | the plan record's slug and the duration label the card shows; the cookie holds identifiers only |
| Header cart control | the live line count | the cart cookie, read per request and per client update |
| Render `/cart` | line titles, duration labels, days, prices, stale markers, total | lines resolved from `plans` at request time; a line with no live match renders stale and is excluded from the total |
| Render `/checkout` | line titles, duration labels, days, prices, total | the request (and cookie) carry only identifiers; prices read server side from `plans` at render time |
| Prefill checkout | name, phone, address, food preference | `customers` columns (spec 0005) |
| Create order | the lines being ordered | the cart cookie, read on the server at the create endpoint; the request body never carries lines |
| Create order | unit price per line | each `plans.durations` entry matched by label on the server; the request carries no amount |
| Create order | total | derived: the sum of the resolved line prices, all inclusive (no fees or taxes added) |
| Create order | customer | session JWT verified by Payload's strategy (spec 0005) |
| Create order | gatewayOrderId, amount | response of Razorpay `POST /v1/orders` (amount in paise, currency INR) |
| Create order | the checkout intent (lines with price and days, delivery, note) | carried on the Razorpay order's notes, lines as indexed note keys, each value short; nothing is written locally |
| Create order | active mode (test or live) | the key id's prefix |
| Verify and webhook | the payment's capture status, amount, currency and order id | fetched over REST (`GET /v1/payments/{id}`) on the return path; the webhook payload's `payment.entity` on the webhook path |
| Verify and webhook | the lines the order is written from | the gateway order's notes, read over REST or from the event, never from the browser |
| Verify and webhook | the check that the paid amount covers the basket | the sum of the intent's line prices must equal the gateway order amount and the captured amount |
| Verify and webhook | who sends the mails | the signal whose insert won the unique `gatewayOrderId`; only the winner mails |
| Verify return | the paid row, `paidAt` | HMAC SHA256 of `${orderId}|${paymentId}` with the key secret; server clock |
| Webhook | the paid row | HMAC SHA256 over the raw request body with `RAZORPAY_WEBHOOK_SECRET`; the intent from the gateway order's notes |
| Order placed page | the lines, the total, the payment id | `orders` columns (the payment id is the receipt; no separate money document, per the engineer's choice) |
| Account orders list | the customer's orders | orders filtered by the session customer (spec 0005 session) |
| Confirmation and notice mail | recipients, copy, per line details | customer email from the order; kitchen recipient from the same setting the enquiry notice already uses (spec 0006); copy from the `order` key in EmailSettings (spec 0002 pattern) |

**Key invariants**:

- The total is always the sum of the live prices of the lines in the basket, computed only on the server; no browser value decides an amount.
- The cart cookie carries identifiers only (plan slug, duration label): never prices, never days, never personal data; every price and every day count is read from the database at every render and at order creation.
- A gateway signal writes an order only when the payment's amount, currency and order id all match the gateway order, and the amount equals the sum of the intent's line prices; the write is guarded by the unique `gatewayOrderId`, so an order is recorded exactly once and the mails fire exactly once, from whichever signal won.
- `gatewayOrderId` is unique, which is what makes webhooks and returns idempotent.
- A basket holds at most 10 lines; a line is one plan and one duration; duplicate lines are refused at add time and at order creation.
- A captured payment empties the cart: the verify path that wins the insert race clears the cart cookie, so a paid basket cannot be checked out again; a failed check leaves the cart untouched.
- Lines, delivery snapshots and amounts on an order are immutable once written; plan edits never rewrite history.
- A paused or unknown plan, or a missing duration, can never enter an order: it is refused at add time, marked stale on the cart page, and blocks payment at checkout with a plain sentence.
- Prices are integers in paise; currency is INR only.
- An order row exists only for a captured payment by a signed in, verified customer; no order is anonymous, and no order exists for an unpaid checkout.

**Security model**:

- `plans`: public read, staff only write (the existing staff and admin gates). `orders`: written only by the payment confirmation (the verify endpoint and the webhook) with `overrideAccess` (public REST create stays off); read is staff or the owning customer; GraphQL is turned off for `orders` outright so the auto generated API cannot leak rows. The webhook is public but useless without a valid signature.
- Order creation is rate limited per IP like the enquiry endpoint, and same origin checked; the webhook route handler is exempt from the same origin check because Razorpay posts it, and the HMAC over the raw body is its authentication.
- The cart cookie is not a money surface: it holds identifiers only, is readable by JavaScript so the header count can update, and a doctored cookie can only produce lines that the server refuses at the next resolution. The checkout form posts no lines at all: the create endpoint reads the basket from the cart cookie on the server and resolves and prices every line itself, so a crafted request body cannot order a basket the customer never saw.
- No card data ever touches this server: Standard Checkout collects payment inside Razorpay's hosted frame, so PCI scope stays with the gateway. What the site stores is ids, amounts and delivery details.
- The confirmation email and the mail log (spec 0002) provide the audit trail for money messages; the immutable order row is the record of the payment itself.

**Configuration required**:

- `RAZORPAY_KEY_ID`: the gateway key id, test keys first
- `RAZORPAY_KEY_SECRET`: the key secret, used for REST auth and return signature verification
- `RAZORPAY_WEBHOOK_SECRET`: the webhook signing secret configured in the Razorpay dashboard

**Critical test scenarios** (each maps to an acceptance criterion in `## Requirements`):

- Happy path: browse `/plans` signed out, add two plans with their durations to the cart, see the header count rise, review the cart at live prices, sign in at checkout, pay once in test mode, land on the order placed page with both lines and an emptied basket, see both emails list both lines, see the order with both items in the account list, verifies AC-1 through AC-9, AC-11
- Failure case: a tampered or stale cart (unknown plan, paused plan, removed duration) renders marked on `/cart` and blocks payment at checkout with the line named; a doctored cookie with prices in it changes nothing because the server never reads prices from the cookie; an unsigned or replayed webhook changes nothing; a checkout that is never paid writes no row; a 11th line and a duplicate line are refused, verifies AC-2, AC-3, AC-4, AC-5, AC-6, AC-7
- Auth/permission: a signed out visitor at `/checkout` is redirected to sign in and back with the cart intact; customer A cannot read customer B's order; a customer session cannot reach the CMS, verifies AC-4, AC-9

## Build plan

Ordered for the Tracer Bullet approach (prove the whole pipe with one real user path, then thicken). Tasks 1 to 13 are the two earlier passes and stay as history; the cart parts of tasks 1 to 8 are brought back, adapted to everything that changed since (completed payments only, no local rows, the reworked chrome contract).

14. Cart core: the cart cookie module (identifiers only, 10 line cap, duplicate and paused refusals), the Add to cart control with duration choice on every open plan card, and the Buy now checkout link removed from the cards, satisfies **AC-2**, **AC-1**
15. The cart page and the header count: `/cart` with live resolution, stale line markers, no JavaScript removal, the empty state and noindex, and the header cart control with the live count, satisfies **AC-3**, **AC-2**
16. Multi line checkout and order creation: checkout renders every line with the server computed total and refuses stale lines by name, the create endpoint resolves and prices every line from the records, enforces the cap and duplicate rules, and carries the intent on the gateway order's notes within the note size limits, satisfies **AC-4**, **AC-5**
17. Confirmation with all items: the verify return and the signed webhook write one paid row holding every line snapshot, guarded by the unique gateway order id, with the amount checked against the sum of the intent's line prices, and the winner clears the cart cookie so the paid basket cannot be checked out twice, satisfies **AC-6**, **AC-7**, **AC-11**
18. Mail, account, admin and chrome: the order emails list every line and the total, the account list shows the lines, the admin shows the items, and the chrome copy no longer says one plan per order (the cart link itself is added by staff in the admin), satisfies **AC-8**, **AC-9**, **AC-10**, **AC-12**
19. Tests and re-verify: cart unit and integration coverage (cookie rules, stale lines, cap, duplicates, tampered cookie), the multi line checkout and webhook coverage, the cross customer denials, and a fresh `/check verify` pass, satisfies all ACs

No migration is needed: the `orders.items` array already holds multiple items, and the cart state lives in a cookie by design.

## Consequences

**Positive**:

- One payment covers several plans: the mixed basket story is back, and the kitchen is ready for the products that make sense together.
- The cart carries identifiers only, so the tampering class the removal noted (a cookie that pretended to hold prices) cannot exist; every price is read from the record at every hop.
- No server side cart means no merge rules, no cleanup job and no abandoned cart table; the cookie survives sign in untouched.
- A row means a completed payment, still true with many lines: one row per payment, up to ten immutable line snapshots.
- The 10 line cap keeps the gateway order's notes small enough to carry the whole intent.

**Negative / tradeoffs**:

- The cart's complexity returns: a cookie format, duplicate refusals, a cart page with empty and stale line states, and a second place where a total is shown (the server computes it, but it must agree everywhere it renders).
- The checkout intent now carries up to ten lines, so the notes payload is bigger and the cap is a real constraint; a future product with larger baskets would need the intent to live somewhere bigger than notes.
- Two buttons' worth of copy on every card (duration choice plus Add to cart) is one more thing to keep accessible and honest.

**Neutral**:

- The direct checkout deep links stop working as purchase links: an old shared `/checkout?plan=...` link now lands on checkout's empty cart sentence, which points to the plans.
- Razorpay runs in test mode first; going live is a key swap plus a webhook configuration in the dashboard.
- Refunds and cancellations stay handwork in the Razorpay dashboard, by message.

## Follow-up

- [ ] Confirm the Razorpay dashboard webhook points at the deployed host and the event subscription covers `payment.captured` before go live (test mode first)
- [ ] Consider Product and Offer structured data on `/plans` in a later pass
- [ ] Run `/sync` after the build so `AGENTS.md` reflects the changed account contract
- [ ] Fulfilment states, staff actions and auto renewing subscriptions stay deferred (scope)
- [x] If customers ask for mixed plan orders, design a basket in a later spec; the `items` array already allows more than one item (done: the 2026-11-06 revision restores the cart in this spec)
- [ ] Re run `/check verify` against the renumbered acceptance criteria after the build
- [ ] Verify Razorpay's actual note size limits during the build against the 10 line intent; if the real limit is smaller, lower the cap and record it here

## Rationale

Reasoning and options: see [rationale.md](rationale.md).
