# 0007. Razorpay checkout and payments

**Date**: 2026-10-31
**Status**: In Progress

**Documented after the build.** This spec records the checkout and payment layer that was built ahead of a written decision. It replaces the parked checkout in [spec 0004](0004-plans-listing-and-cart/index.md), whose disabled `Proceed to checkout` button and `Checkout is coming soon.` note no longer exist. It also moves the Razorpay line out of `## Deferred` in the scope, because one time checkout is now built. Auto debit mandates, recurring charges and refunds stay deferred.

## Summary

A visitor pays for a plan in the cart with Razorpay Checkout. One order buys one paid period. The server opens a Razorpay order, saves the subscription in status `new`, and only marks it paid after verifying a signature that only Razorpay could have produced. Two independent paths do that last step: the browser's confirm call and a signed webhook. Every charge gets one row in a new `payments` collection, keyed by its unique Razorpay payment id, which is what makes webhook retries and a double confirm harmless.

There is no automatic renewal. When the end date passes, the customer buys again.

## Requirements

**User stories**:

- As a visitor, I want to pay for the plan I chose without leaving the site, so I do not have to arrange a transfer by hand.
- As a visitor whose browser closes after paying, I want my plan to still start, so a lost tab does not lose my money.
- As the kitchen, I want a payment recorded exactly once, so my books match Razorpay's.
- As staff, I want to see every payment beside its subscription, so a query is answered in the admin panel.
- As the site owner, I want no path where a browser response alone marks a plan paid, so a fake confirm cannot give away food.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

- **AC-1**: `/cart` with an active plan renders the delivery details form (`CheckoutForm`): name, phone, email, address line 1, address line 2 (optional), city, state, pincode, each labelled with `autocomplete` and `inputMode`, then one primary `Pay and start` button, the checkout note and the secure payment line. A signed in customer's fields are prefilled from their `customers` row and the email input is `readOnly` with the locked hint, because their order must land on their account. When Razorpay is not configured the submit button is disabled and the form cannot start a payment. The page keeps the `Remove` form, the `Browse all plans` link, the no index metadata, and the empty and unavailable states from spec 0004.

- **AC-2**: `startCheckout` (a server action in `src/app/(frontend)/(site)/cart/actions.ts`) refuses with `CART_CHECKOUT_LIMITED` past 5 attempts per IP per hour (`checkCheckoutIpLimit`), and with `CART_CHECKOUT_UNAVAILABLE` when Razorpay is not configured. It validates every field with Zod: name, address line 1, city and state required, line 2 at most 160 characters, a real email, a phone of 7 to 15 characters from digits, spaces, `+` and `-`, and a 6 digit pincode. Invalid input returns `CART_CHECKOUT_DETAILS_INVALID` plus per field messages. A signed in customer's email from the session replaces whatever the form posted. The plan is then re-read from the cart cookie with `overrideAccess: false`, so a plan that is switched off or unknown can never be bought, and with no entry or no plan the action answers `CART_EMPTY` or `CART_CHECKOUT_UNAVAILABLE`. It creates one Razorpay order for the plan price converted from whole rupees to paise, then one subscription in status `new` carrying the address, the `razorpayOrderId`, and `customer` only when someone is signed in. An order failure logs `razorpay_order_create_failed` and returns `CART_CHECKOUT_REJECTED`. A subscription write failure logs `subscription_row_create_failed` and fails the checkout rather than charge a customer whose row could not be saved. The ready state returns amount in paise, plan title, public key id, order id and the brand theme colour.

- **AC-3**: `confirmCheckout` accepts only a shape with `orderId`, `paymentId` (each 1 to 128 characters) and `signature` (1 to 256). It verifies the HMAC SHA256 of `order_id|payment_id` keyed with `RAZORPAY_KEY_SECRET` using a timing safe compare, and answers `CART_CHECKOUT_CONFIRM_FAILED` on any failure, including when the keys are absent. On success it reads the payment back for amount, method and time (a read failure is logged as `razorpay_payment_read_failed` and is not fatal), applies the payment through `activatePaidSubscription` with source `checkout`, clears the cart cookie, and the browser goes to `/order-placed`, which confirms in plain words, offers the account link to a signed in customer and the plans link to everyone, and is never indexed.

- **AC-4**: `POST /api/razorpay/webhook` is `force-dynamic`. It answers `503 webhook_not_configured` when `RAZORPAY_WEBHOOK_SECRET` is unset so Razorpay keeps retrying, `401 invalid_signature` unless `x-razorpay-signature` matches the HMAC of the raw body, and `400 invalid_body` on unparseable JSON. It applies `payment.captured` (activate the row) and `payment.failed` (file a failed row), answers `200 { handled }` for those, `200 { handled: 'ignored' }` for any other event, and on an apply error logs `razorpay_webhook_apply_failed` and answers `500` so the event is retried. The body is read as text and never re-serialised before hashing.

- **AC-5**: `activatePaidSubscription` (`src/utilities/razorpaySync.ts`) finds the subscription by `razorpayOrderId`. When the row is not already `active`, `cancelled` or `expired`, it sets `status: active`, `paymentReceivedAt`, `paymentReference` to the Razorpay payment id, and `startDate` to UTC midnight of the day after the payment, which is the first delivery day. `endDate` is then computed by the existing hook from the copied billing period. It writes exactly one `payments` row per payment id, and skips the write when the row already exists. Its writes pass `context.skipRazorpaySync`. Running it twice, from both the browser and the webhook, leaves one active subscription and one payment row.

- **AC-6**: a `payments` collection stores one gateway payment beside its subscription: `razorpayPaymentId` (required, unique, indexed), `razorpayOrderId`, `subscription` and `plan` relationships, `amount` in paise, `currency` defaulting to `INR`, `status` of `paid` or `failed`, `method`, `email`, `contact`, `source` of `checkout` or `webhook`, `eventAt`, and timestamps with a composite index on `subscription` and `status`. Public REST create, update and delete are off; only the checkout confirm step and the webhook write, through the local API with `overrideAccess: true`. Read is staff only. The admin group is `Plans and subscriptions`, the title is the Razorpay payment id, and the default columns are created, subscription, amount, status, method and source.

- **AC-7**: the guarded migration `20261031_170000_razorpay_payments` creates the `payments` table, the unique index on the payment id, the indexes on the order id and the subscription, and adds `subscriptions."razorpay_order_id"` with its index. Every statement is `IF NOT EXISTS` guarded, because a dev database managed by schema push may already hold the table. It is registered in `src/migrations/index.ts`.

- **AC-8**: checkout needs `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`, and the webhook needs `RAZORPAY_WEBHOOK_SECRET`, all server only and never prefixed with `NEXT_PUBLIC_`. Only the public key id reaches the browser. With the keys unset, `isRazorpayConfigured()` is false, the cart disables the pay button, and signature verification returns false, so a half configured environment can never pass a payment.

- **AC-9**: `tests/int/razorpay.int.spec.ts` proves the checkout signature accepts what Razorpay would send and rejects a tampered order id or a signature made with another secret, proves the webhook signature rejects a re-serialised body, and proves rupees convert to paise. `pnpm exec tsc --noEmit` passes.

## Value sourcing

| Value | Source |
| --- | --- |
| Amount charged | the plan's `price` read live with `overrideAccess: false`; the cart cookie carries only a plan id |
| Customer email | the session's email when signed in, otherwise the validated form value |
| First delivery day | `startOfUtcDay` of the payment time plus one day |
| End date | `computeSubscriptionEndDate` from the copied `billingPeriod` |
| Payment identity | Razorpay's `payment_id`, stored as the unique `razorpayPaymentId` |
| Paid or not | the checkout signature and the webhook signature, never the browser response alone |
| Payment method and amount | read back from Razorpay, with the plan price as the fallback amount |

## Copy table

| Surface | Copy |
| --- | --- |
| Details heading | `Delivery details` |
| Pay button | `Pay and start`, `Paying` while the modal is open |
| Checkout note | `CART_CHECKOUT_NOTE`: one payment covers one period, renewal is a new payment |
| Closed modal | `CART_PAYMENT_CLOSED` |
| Confirmation page | `Your plan is starting` |
| Errors | `Check the highlighted fields and try again.`, `We could not start checkout. Please try again.`, `Too many attempts. Please try again in a little while.` |

## Test scenarios

- Signature unit suite (`tests/int/razorpay.int.spec.ts`): fresh signature accepted, tampered order id rejected, other secret rejected, re-serialised webhook body rejected, whole rupees to paise.
- Not yet automated: activation and idempotency, the webhook event handler, the payments access rules, the checkout action's validation and rate limit, the cart and confirmation pages.
- Live, still to run: a payment with `rzp_test_` keys, the dashboard webhook pointed at `/api/razorpay/webhook` for `payment.captured` and `payment.failed`, and a replay of a captured event to prove one row.

## Build plan

- [x] 1. The Razorpay server client: orders, payment read, checkout signature, webhook signature, key handling, `src/utilities/razorpay.ts`, satisfies **AC-3**, **AC-4**, **AC-8**
- [x] 2. The sync bridge: order id lookup, guarded activation, one payment row per payment id, webhook event handler, `src/utilities/razorpaySync.ts`, satisfies **AC-4**, **AC-5**
- [x] 3. The `payments` collection, its access rules, indexes and admin view, satisfies **AC-6**
- [x] 4. The cart checkout: details form, Razorpay modal, `startCheckout` and `confirmCheckout`, the confirmation page and the hourly IP limit, satisfies **AC-1**, **AC-2**, **AC-3**
- [x] 5. The webhook route, the guarded migration, the env documentation and the signature tests, satisfies **AC-4**, **AC-7**, **AC-9**

## Consequences

- **A row is created before the money.** A visitor who closes the Razorpay modal leaves a subscription in `new` with no payment. Staff see it in the admin. Nothing collects or expires those rows yet.
- **The account is optional, but the link is not made later.** A purchase made while signed in writes `subscriptions.customer`. A guest purchase leaves it null, and the account page reads only `customer`, so signing up afterwards with the same email does not surface the plan. Scope feature 4's "done when" is only half met.
- **No confirmation email.** `src/email/templates/` holds cancellation and customer auth mail only, so a paid order sends nothing. Checkout's success is the page alone.
- **The method is fetched and dropped.** `activatePaidSubscription` accepts `method` and never writes it, so `payments.method`, and the `email`, `contact` and `plan` fields, stay empty on rows the app creates. The admin column exists and shows nothing.
- One order means one period, so nothing in the system can charge a customer twice by accident.
- The plan price is read server side, so a tampered cookie cannot change the amount.
- Payments are append only from the app's side: staff cannot edit or delete a row, so the record stays a record.
- Razorpay is a second external dependency in the checkout path. Checkout is unavailable, not broken, when its keys are missing.
- The webhook is a safety net rather than the only path, so a missed webhook delays nothing that the browser already confirmed.

## Follow-up

- [ ] Send a confirmation email when a plan is paid, and cover the "a plan bought as a guest shows up once that email signs up" case by claiming subscriptions on sign up (see scope feature 4).
- [ ] Write `method`, `email`, `contact` and `plan` onto the payment row, or drop those fields; today they are declared and never filled.
- [ ] Decide what happens to abandoned `new` subscriptions: expire them on a schedule, or leave them for staff.
- [ ] Run the migration. It has not been executed, and the guarded `IF NOT EXISTS` statements are untested against a live database.
- [ ] Run a payment against `rzp_test_` keys, configure the dashboard webhook, and replay a captured event to prove one row and one activation.
- [ ] Add integration tests for activation, idempotency, the webhook handler and the payments access rules.
- [ ] Rate limit the webhook? Not needed while the signature is the gate, but revisit if the endpoint ever does expensive work before verifying.
- [ ] Refunds, auto debit mandates and recurring charges are not in this spec. They stay in the scope's Deferred list.
