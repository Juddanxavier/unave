# Verify steps: plans and payments (spec 0007)

Run these against the dev server (`pnpm dev`, port 3000) after `/develop`. Steps marked **[keys]** need `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` in `.env` (test keys). Everything else runs with or without them.

## AC-1: the plans shelf

1. Sign out (or use a private window). Open `/plans`.
2. Every plan renders as a pricing card with its description, every duration with its own total, and one **Buy now** control; no photo band, no cart control.
3. Turn a plan's `available` off in the admin and reload `/plans`: the plan still renders, with the **Paused** label, its durations listed, no buy control, and the gold "what paused means" notice under the grid.
4. With JavaScript disabled, the page still renders the full grid, every chip, and a working **Buy now** button.
5. Open `/sitemap.xml` and confirm `/plans` is listed.

## AC-2: the direct buy path

1. From `/plans`, choose a duration and press **Buy now**. The browser goes to `/checkout?plan=<slug>&duration=<label>`; signed out, it is sent to `/sign-in` with that whole link as its `return`.
2. Sign in with email and password: you land back on the same checkout with the same plan and duration.
3. Open a link with an unknown plan: checkout shows "That plan is not on the menu" and a **Browse the plans** pill, not an empty form. Same for a paused plan and for a duration that is no longer on the plan.
4. Devtools, Application, Cookies: no `unave-cart` cookie is created, and an old one from the earlier build is ignored.
5. The header and footer never show a cart link, and `/cart` is gone.

## AC-3: the checkout guard, summary and prefill

1. Signed out, open `/checkout?plan=<slug>&duration=<label>`: redirected to `/sign-in?return=...` carrying the full link.
2. Sign in: you land back on that checkout, and the summary card shows the one plan, its duration, days and the live **To pay** total.
3. The delivery form is prefilled from the saved profile. Edit a field, pay (or attempt), then check `/account`: the saved profile is unchanged.
4. Submit with an empty required field: the field's own error line appears, nothing is sent.

## AC-4: server computed order creation **[keys]**

1. Pay at checkout with test keys. Only then does the order appear in the admin, with the total equal to the chosen duration's price in the plan record, in paise. Before the payment is captured there is no row at all.
2. By hand, POST to `/api/orders/create` (from the browser console, so the origin matches) with extra `price`, `days` or `total` fields: they are ignored, the gateway order is opened for the plan record's amount, and no row is written.
3. Same with an unknown plan slug: 422 "not on the menu". A paused plan: 422 with the "paused" sentence. A duration that is not on the plan: 422 with the "duration has changed" sentence. No plan or duration: 422.
4. Rename a plan's duration in the admin after a link was shared, then open the link: checkout refuses it with the plain sentence.
5. Retry the same plan and duration twice: each attempt opens a fresh gateway order and writes no row, so the admin shows nothing new.
6. Hammer create six times in a minute: the sixth answers the rate limit sentence.

## AC-5: the popup and the return check **[keys]**

1. Pay a small test plan in the Razorpay test popup. On success the browser walks to `/order-placed/{id}` showing the plan and duration, the amount and the payment id; the row appears in the admin only now.
2. Close the popup before paying: one plain sentence on the checkout page, and the admin shows no new order.
3. Force a bad return (edit the signature in the handler's network call, or replay with a wrong one): nothing is written, and the admin shows no new order.

## AC-6: the webhook **[keys]**

1. Point a Razorpay dashboard webhook at `{NEXT_PUBLIC_SERVER_URL}/api/razorpay/webhook` with the same secret as `RAZORPAY_WEBHOOK_SECRET`.
2. Capture a test payment without completing the browser return: the webhook writes the paid order from the gateway order's notes and sends the mails exactly once.
3. Replay the same event (Razorpay retries): the answer is 200 and nothing is written or mailed twice.
4. Send an unsigned or wrongly signed body: 400, nothing changes.
5. Send a `payment.captured` with a wrong amount: acknowledged, nothing changes.

## AC-7: the two order emails **[keys]**

1. On a paid order, the customer address receives the confirmation mail and the kitchen address receives the notice, both branded, both logged in the admin's mail log under the `order` template.

## AC-8: the account order list

1. On `/account`, **Your orders** lists the customer's orders newest first, each with its plan, duration, amount and payment id.
2. Sign in as a second customer: their list is empty and `/order-placed/{id}` for the first customer's order is a plain 404.

## AC-9: the admin

1. In the admin, create and edit a plan: title, photo, description, durations, availability.
2. Open **Orders**: every row is a completed payment and the description says so; there is no status column and no pending row.
3. Open a paid order: the one item, delivery snapshot, note, payment id, paid at, and `startsOn` editable by staff; every snapshot field refuses edits.

## AC-10: snapshots never move

1. Buy a plan, then change that plan's price and title in the admin. The past order, the order page and the account list still show the price and title paid at purchase time.

## AC-11: chrome

1. The header carries the **Plans** menu link; the primary pill reads **Order a plan** and goes to `/plans`; the footer's Explore column carries **Plans**. All three are editable in the admin under Site chrome (the chrome data migration `20261101_130000_plans_chrome` seeds them).

## AC-12: without keys

1. With the Razorpay variables blank, browse, message and sign in all work normally.
2. Press **Pay for the order** at checkout: one plain sentence ("Online payment is not set up yet..."), no crash, no order row.
3. `.env.example` documents the three variables; the create log line and the admin show the mode (`test` or `live`) read from the key id prefix.
