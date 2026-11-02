# 0007. Plans and payments

**Date**: 2026-10-31
**Revised**: 2026-11-01, the cart was removed; one plan per order. Later the same day, only completed payments are recorded: an order row is written when a payment is captured, so no pending rows exist.
**Status**: In Progress

## Summary

The kitchen sells meal plans on the site again. A plan is a duration of meals (say a week or a month) paid once through Razorpay's checkout popup. A plan card sends the buyer straight to checkout with that plan and duration, so there is no cart and every order holds one plan. Checkout requires signing in, the checkout intent rides on the gateway order until the payment lands, payment is confirmed by a verified webhook plus a return check, and only a captured payment writes an order row. The order, its two emails and the admin view all follow patterns the site already has. This is built fresh: the earlier implementation removed on this same date stays in git history and is not restored.

## Requirements

**User stories**:

- As a hungry customer, I want to browse plans and prices without an account so that I can decide before committing to anything.
- As a customer, I want to choose a plan and its duration and go straight to checkout so that I can buy without filling a cart.
- As a customer, I want to sign in at checkout so that the kitchen knows who ordered and where to deliver.
- As a customer, I want to pay once through Razorpay so that my plan is booked without sending money by hand.
- As a customer, I want the order confirmed by email and visible in my account so that I can trust it went through.
- As staff, I want plans, prices and availability editable in the admin so that the menu stays current without a deploy.
- As staff, I want every paid order visible in the admin and announced by email so that the kitchen can start deliveries.
- As the owner, I want every amount computed on the server so that nobody can pay a doctored price.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

- **AC-1**: `/plans` renders every plan from Payload with its durations and prices, carries search metadata and a sitemap entry, and browsing it works without JavaScript. A plan with `available` off still renders, with a paused label, and offers no buy action.
- **AC-2**: A signed out visitor can choose a duration on a plan card and press Buy now, which goes to `/checkout?plan=<slug>&duration=<label>` carrying only that plan and duration; no cart, no cookie and no account is involved in choosing. The choice survives the sign in round trip, so a signed out buyer who signs in lands back on the same checkout with the same plan. A checkout link whose plan is unknown or paused, or whose duration is no longer on the plan, is refused there with a plain sentence and a link back to `/plans`.
- **AC-3**: `/checkout` requires a signed in customer: a signed out visitor is sent to sign in and returned afterwards with the plan and duration intact. Checkout shows the one chosen plan with its title, duration label, days, live price and total, prefills the saved delivery details and food preference from the profile (spec 0005), lets the customer edit them for this order only, requires name, phone, address line 1, city, state and a six digit pincode (validated with the patterns spec 0005 already uses), and takes an optional note for the kitchen. A refused plan shows one plain sentence and a way back to the plans, never an empty form.
- **AC-4**: Order creation happens on the server: the plan is resolved from the slug in the request, its duration is matched by label, and the unit price and total are read from the plan record in paise integers, so no browser number can decide an amount. The delivery details and note, the resolved plan and the resolved price are placed on the Razorpay order's notes (the checkout intent) and the gateway order is created over REST; no order row is written at checkout. An unknown plan, a paused plan, a duration that is not on the plan, or a missing customer session is refused with a plain sentence and no gateway order, and order creation is rate limited per IP like the enquiry form.
- **AC-5**: After the popup succeeds and the browser returns, the server checks the payment itself (fetched over REST) before writing anything: the signature `${orderId}|${paymentId}` verifies against the key secret, the payment is captured, its amount equals the gateway order amount, its currency is INR, its order id matches the gateway order, and the gateway order's notes name the signed in customer. Only then is the paid order written, and the customer lands on an order placed page showing the plan, its duration, the amount and the payment id. A failed check writes nothing, logs a warning, and shows one plain sentence instead of an error.
- **AC-6**: The webhook (a plain route handler reading the raw request bytes before any parsing) writes the paid order on a validly signed `payment.captured`, reading the checkout intent from the gateway order's notes and checking the payment's order id, amount and currency against it. It is idempotent: a payment already recorded answers with success and writes nothing, an event with no readable intent logs and answers success (so Razorpay does not retry forever), and an invalid signature answers 400 with a logged warning and no write.
- **AC-7**: A successful payment sends the customer a confirmation and the kitchen a notice through the existing transport (spec 0002), under a new `order` template key with admin editable copy; a mail failure is logged and does not fail the order.
- **AC-8**: The account page lists the customer's own orders, newest first, with the plan, duration, amount and payment id. GraphQL is disabled on the `orders` collection outright, so a customer cannot read another customer's order over REST or GraphQL, and no customer can reach the CMS; a test proves each denial.
- **AC-9**: Staff create and edit plans, prices, durations and availability in the Payload admin and see every order with its items, delivery snapshot, note, payment details and when deliveries begin (`startsOn`); every row is one completed payment, and the admin description says so.
- **AC-10**: Every order's plan, duration, price and total shown anywhere match the server computed snapshot; editing a plan's title or price after a purchase never rewrites a past order.
- **AC-11**: The header global gains a plans link and the chrome copy that says orders come by message is updated in the CMS globals (header and footer).
- **AC-12**: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` are documented in `.env.example`; without them the site still browses and messages normally, and the pay action reports a plain configuration error instead of breaking the page. The active mode (test or live, read from the key id's prefix) is logged at order creation and shown in the admin, so a test key pointed at a live dashboard is visible before it costs money.

## Decision

**Chosen option**: Option 2: a dedicated Payload commerce slice on Razorpay Standard Checkout.

The `plans` and `orders` collections live beside the existing collections, a plan card links straight to checkout with the chosen plan and duration, the server talks to Razorpay over direct REST (no SDK dependency), and the paid signal is a verified return plus a signed webhook. Reasoning and options: see [rationale.md](rationale.md).

## Feature design

**Data model sketch** (the target; one guarded migration):

- `plans` (Payload collection, staff write, public read):
  - `title` text, required · `slug` text, required, unique · `description` rich text · `image` relation to media (optional)
  - `durations` array, required, each item { `label` text required · `days` integer required · `price` integer required (paise) }
  - `available` boolean, default true; off means the paused label shows and the plan cannot be bought
- `orders` (written only when a payment is captured, by the confirmation path, never by public REST):
  - `customer` relation to `customers`, required
  - `items` array holding exactly one item in this pass, each { `plan` relation · `planTitle` text · `durationLabel` text · `days` integer · `unitPrice` integer (paise) } — snapshots written once when the order is written. The array stays so a later basket can be added without a schema change.
  - delivery snapshot { `name`, `phone`, `addressLine1`, `addressLine2`, `city`, `state`, `pincode`, `foodPreference`, `note` } matching the customer profile fields of spec 0005
  - `subtotal` and `total` integers in paise, read from the captured payment
  - gateway fields: `gatewayOrderId` (unique), `gatewayPaymentId`, `gatewaySignature`, `paidAt`
  - `startsOn` optional date, staff editable (the kitchen records when deliveries begin)
  - timestamps

**The buy path** (a link, and an intent that lives on the gateway order):

- a plan card's Buy now control links to `/checkout?plan=<plan slug>&duration=<duration label>`, carrying no price and no days, with both labels URL encoded
- `/checkout` resolves the plan by slug and the duration by label from Payload at request time and renders the live price and total, with no store caching (matching the account pages of spec 0005); a paused or missing plan, or a missing duration, is refused with a plain sentence and a link to `/plans`
- the sign in guard keeps the full checkout URL as its return path, so signing in or up returns to the same plan and duration
- the create endpoint opens the gateway order with the checkout intent on its notes and writes nothing; nothing is stored in the browser or in a local order row until a payment is captured, and an `unave-cart` cookie left by the earlier build is ignored

**State transitions**:

- order: born `paid`. The row is written exactly once, when a captured payment is confirmed, and nowhere else; the verified return and the signed webhook can race, and the unique `gatewayOrderId` lets only one insert win, so only the winner writes the row and sends the mails. A checkout that is never paid writes no row at all. No other states in this pass (no fulfilment states, no refunds).

**API surface** (Payload custom endpoints, following the enquiry endpoint pattern of spec 0006):

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/orders/create` | POST | plan slug, duration label, delivery details, note | gatewayOrderId, amount, key id, mode | customer session | 401 signed out, 422 unknown or paused plan, duration not on the plan, 429 rate limited |
| `/api/orders/verify` | POST | razorpay_order_id, razorpay_payment_id, razorpay_signature | order id, status | customer session, order owner | 400 failed checks (nothing is written), 404 unknown or unowned gateway order |
| `/api/razorpay/webhook` (a Next route handler, not a Payload endpoint, because the HMAC needs the raw request bytes) | POST | Razorpay event body, `X-Razorpay-Signature` header | 200 | public, HMAC verified | 400 bad signature; an event with no readable intent answers 200 with a log |
| `/plans`, `/checkout`, `/order-placed/[id]` | GET | plan slug and duration label on checkout, order id on the last | rendered pages | public for `/plans`, sign in redirect on `/checkout`, owner session on the order page | 404, redirect to sign in |

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| Browse `/plans` | plan cards, durations, prices, paused label | `plans` columns and `durations` array; metadata via the existing SEO plugin |
| Render `/checkout` | plan title, duration label, days, price and total | the URL carries only the plan slug and duration label; prices read server side from `plans` at render time |
| Prefill checkout | name, phone, address, food preference | `customers` columns (spec 0005) |
| Create order | unit price | the `plans.durations` entry matched by label on the server; the request carries no amount |
| Create order | total | derived: the unit price, all inclusive (one plan per order, no fees or taxes added) |
| Create order | customer | session JWT verified by Payload's strategy (spec 0005) |
| Create order | gatewayOrderId, amount | response of Razorpay `POST /v1/orders` (amount in paise, currency INR) |
| Create order | the checkout intent (plan, duration, price, delivery) | carried on the Razorpay order's notes; nothing is written locally |
| Create order | active mode (test or live) | the key id's prefix |
| Verify and webhook | the payment's capture status, amount, currency and order id | fetched over REST (`GET /v1/payments/{id}`) on the return path; the webhook payload's `payment.entity` on the webhook path |
| Verify and webhook | the plan, duration, price and delivery the order is written from | the gateway order's notes, read over REST or from the event, never from the browser |
| Verify and webhook | who sends the mails | the signal whose insert won the unique `gatewayOrderId`; only the winner mails |
| Verify return | the paid row, `paidAt` | HMAC SHA256 of `${orderId}|${paymentId}` with the key secret; server clock |
| Webhook | the paid row | HMAC SHA256 over the raw request body with `RAZORPAY_WEBHOOK_SECRET`; the intent from the gateway order's notes |
| Order placed page | plan, duration, amount, payment id | `orders` columns (the payment id is the receipt; no separate money document, per the engineer's choice) |
| Account orders list | the customer's orders | orders filtered by the session customer (spec 0005 session) |
| Confirmation and notice mail | recipients, copy | customer email from the order; kitchen recipient from the same setting the enquiry notice already uses (spec 0006); copy from the `order` key in EmailSettings (spec 0002 pattern) |

**Key invariants**:

- The total is always the live price of the chosen plan duration, computed only on the server; no browser value decides an amount.
- A gateway signal writes an order only when the payment's amount, currency and order id all match the gateway order and its intent; the write is guarded by the unique `gatewayOrderId`, so an order is recorded exactly once and the mails fire exactly once, from whichever signal won.
- `gatewayOrderId` is unique, which is what makes webhooks and returns idempotent.
- Lines, delivery snapshots and amounts on an order are immutable once written; plan edits never rewrite history.
- The plan and duration in a checkout link must match a live plan and a duration label on it at checkout time; days and price always come from the record, never from the URL.
- Prices are integers in paise; currency is INR only.
- An order row exists only for a captured payment by a signed in, verified customer; no order is anonymous, and no order exists for an unpaid checkout.
- A paused plan cannot enter a new order; checkout refuses it with a plain sentence and a way back to the plans.

**Security model**:

- `plans`: public read, staff only write (the existing staff and admin gates). `orders`: written only by the payment confirmation (the verify endpoint and the webhook) with `overrideAccess` (public REST create stays off); read is staff or the owning customer; GraphQL is turned off for `orders` outright so the auto generated API cannot leak rows. The webhook is public but useless without a valid signature.
- Order creation is rate limited per IP like the enquiry endpoint, and same origin checked; the webhook route handler is exempt from the same origin check because Razorpay posts it, and the HMAC over the raw body is its authentication.
- No card data ever touches this server: Standard Checkout collects payment inside Razorpay's hosted frame, so PCI scope stays with the gateway. What the site stores is ids, amounts and delivery details.
- The checkout link is never trusted for money: it carries a plan slug and a duration label, and the server resolves the plan, the duration, the price and the total from the database on every render and every order create; the plan the order is written from travels on the gateway order, not in the browser.
- The confirmation email and the mail log (spec 0002) provide the audit trail for money messages; the immutable order row is the record of the payment itself.

**Configuration required**:

- `RAZORPAY_KEY_ID`: the gateway key id, test keys first
- `RAZORPAY_KEY_SECRET`: the key secret, used for REST auth and return signature verification
- `RAZORPAY_WEBHOOK_SECRET`: the webhook signing secret configured in the Razorpay dashboard

**Critical test scenarios** (each maps to an acceptance criterion in `## Requirements`):

- Happy path: browse `/plans` signed out, choose a duration and press Buy now, sign in at checkout, pay in test mode, land on the order placed page, see both emails fire, see the order in the account list, verifies AC-1 through AC-8
- Failure case: an unknown plan slug, an unknown duration or a paused plan is refused at checkout; an unsigned or replayed webhook changes nothing; a checkout that is never paid writes no row, verifies AC-2, AC-4, AC-6
- Auth/permission: a signed out visitor at `/checkout` is redirected to sign in and back; customer A cannot read customer B's order; a customer session cannot reach the CMS, verifies AC-3, AC-8

## Build plan

Ordered for the Tracer Bullet approach (prove the whole pipe with one real user path, then thicken): the first tasks stand up one thin end to end thread in test mode, later tasks thicken each layer.

1. [x] Collections and migration: `plans` and `orders` with the fields above, staff and customer access rules, public REST create off, one guarded migration, satisfies **AC-4**, **AC-9**, **AC-10**
2. [x] The thin thread in test mode: a minimal `/plans` listing, the cookie cart client component, `/cart` from the cookie, `/checkout` with the sign in guard and profile prefill, server order creation over REST, the Razorpay popup, return verification, the order placed page, the order in the account list, and the shared paise display formatter, satisfies **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-8**
3. [x] The webhook as a plain Next route handler: raw body HMAC, the payment's amount, currency and order id checks against the row, the atomic conditional flip, idempotent replays, satisfies **AC-6**
4. [x] Mail: the `order` template key with `confirmation` and `kitchenNotice` variants following the 0002 variant pattern, the customer mail addressed to the order's customer and the kitchen mail to the address the enquiry notice already uses, both through the existing transport, failure logged not thrown, and sent only by the caller that flipped the order, satisfies **AC-7**
5. [x] Refusals and hardening: duration matching against the live plan, required field validation, retry reuse by cart fingerprint, GraphQL disabled for orders, no store caching on the cart and checkout pages, rate limit, same origin, plain sentence errors, satisfies **AC-2**, **AC-3**, **AC-4**, **AC-8**, **AC-12**
6. [x] Full pages: the story led `/plans` composition (story sections, proof, plan cards), search metadata, sitemap entry, admin column and group polish, satisfies **AC-1**, **AC-9**
7. [x] Chrome and contract: a guarded data migration that upserts the header plans link and the messaging copy in the CMS globals, the design.md contract amendment (buying requires an account; browsing and messaging never do), amendment notes in specs 0002 and 0005, `.env.example`, satisfies **AC-11**, **AC-12** — the design.md amendment and `.env.example` are done; the amendment notes in specs 0002 and 0005 are spec content this build must not write, so they are flagged for `/architect`
8. [x] Int and e2e tests and the typecheck gate, including the cross customer denial, the webhook replay and the tampered amount tests, satisfies all ACs

Tasks 1 to 8 are the original 2026-10-31 build and stay as history. The cart parts they record (the cookie, `/cart`, multi line orders) are replaced by tasks 9 to 12, added by the 2026-11-01 revision.

9. [x] Direct buy path: a Buy now control on each open plan card linking to `/checkout?plan=<slug>&duration=<label>`; checkout resolves one plan and one duration from Payload and refuses an unknown, paused or missing duration with a plain sentence and a way back; the sign in guard carries the checkout URL through, satisfies **AC-1**, **AC-2**, **AC-3**
10. [x] Single plan orders: the create endpoint takes the plan slug and duration label, reads the price from the record, writes one order item, and drops the cart line array and its twenty line rules, satisfies **AC-4**, **AC-10**
11. [x] Remove the cart surface: `/cart`, `CartControls`, `cartCookie.ts`, the cart copy and the cart link in the chrome, plus the shop's cart mentions in the scope, satisfies **AC-2**, **AC-11**
12. [ ] Rebuild the tests and re-verify: replace the cart cookie and multi line tests with checkout resolution and single plan tests, update the e2e journey, keep the webhook, return check, mail, rate limit, admin and denial coverage, then rerun `/check verify`, satisfies all ACs

13. [x] Record only completed payments: drop the `status` field and every pending state; the create endpoint writes no row and carries the checkout intent on the Razorpay order's notes; the verify return and the signed webhook each write the one paid row, guarded by the unique `gatewayOrderId`; a migration removes never paid rows and drops the column; the order page, account list, admin and copy lose the confirming state, satisfies **AC-4**, **AC-5**, **AC-6**, **AC-8**, **AC-9**

## Consequences

**Positive**:

- The kitchen sells and gets paid online, with a catalogue staff control entirely from the admin.
- Immutable order snapshots keep every past order honest no matter what staff edit later.
- No new dependency: the gateway is two REST calls and two HMAC checks, in the same style as the mail module.
- Buying is one link to checkout: no cart state, no cookie to expire, no merge rules and no cleanup job.
- One plan per order keeps the money story simple: one price, one payment, one order.
- A row means a completed payment: there are no pending rows to explain, prune or mistake for revenue.

**Negative / tradeoffs**:

- A customer who wants a lunch plan and a kids plan pays twice and gets two orders; the mixed basket story is gone.
- Requiring sign in at checkout costs convenience and reverses the previous account contract; the engineer chose this knowingly, and `design.md` must say so.
- The webhook needs a public HTTPS endpoint Razorpay can reach, so payment confirmation depends on hosting and dashboard configuration, not just code.
- Refunds and cancellations are handwork in the Razorpay dashboard, by message; the site has no self service money actions in this pass.
- The checkout intent lives on the gateway order's notes rather than locally, so a long kitchen note is capped and an unpaid checkout leaves no local trace by design.

**Neutral**:

- Razorpay runs in test mode first; going live is a key swap plus a webhook configuration in the dashboard.
- The checkout link carries only a plan slug and a duration label: no price, no personal data.
- An `unave-cart` cookie left in a browser by the earlier build is ignored; there is no migration or cleanup to run.

## Follow-up

- [ ] Confirm the Razorpay dashboard webhook points at the deployed host and the event subscription covers `payment.captured` before go live (test mode first)
- [ ] Consider Product and Offer structured data on `/plans` in a later pass
- [ ] Run `/sync` after the build so `AGENTS.md` reflects the changed account contract
- [ ] Fulfilment states, staff actions and auto renewing subscriptions stay deferred (scope)
- [ ] If customers ask for mixed plan orders, design a basket in a later spec; the `items` array already allows more than one item

## Rationale

Reasoning and options: see [rationale.md](rationale.md).
