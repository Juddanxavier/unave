# Scope: Unave content site

A Payload and Next.js site for the Unave cloud kitchen: content pages, posts, an enquiry pipeline and customer accounts. The kitchen takes orders by message, not through the site. The earlier plan catalogue, cart, checkout and the Razorpay payment layer were removed on 2026-10-31 and their database tables dropped.

**Build approach:** Tracer Bullet (prove the whole pipe with one real user path, then thicken it).
**Workflow:** Beta (after `/develop`: `/check verify`, then `/test`). The project default level of rigor. `/architect` is the recommended first stop for a feature with a real decision, but skippable when you already know the build. Any feature can carry its own tag (e.g. `· GA`) to do more or less.

_These are recommendations to keep your build orderly, not requirements. Skip anything that does not fit: if you already know how to build a feature, use `/develop` and skip `/architect`. You decide when a feature is `done`._

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| A | Content pages and posts | Existing | existing |
| B | Site chrome and theming | Existing | existing |
| C | SEO, search and redirects | Existing | existing |
| D | Admin panel and staff auth | Existing | existing |
| E | Forms and submissions | Existing | existing |
| 1 | Transactional email | Foundation | done |
| 2 | About and contact | Slice 1 | in-progress |
| 3 | Customer accounts | Slice 2 | in-progress |
| 4 | Plans and payments | Slice 3 | in-progress |

## Removed

**Plans, subscriptions, cart, checkout and Razorpay. Removed on 2026-10-31, after they were built.** The site stopped selling plans: the `plans`, `subscriptions` and `payments` collections, the `/plans` and `/cart` routes, the order-placed page, the Razorpay client, webhook and migration, and the plan emails (cancellation) were deleted, and the database tables and their rows were dropped by `src/migrations/20261031_180000_remove_plans_subscriptions.ts`. Specs 0001, 0003, 0004 and 0007 were deleted rather than kept as history. The kitchen now takes orders by message (WhatsApp, phone, email, the contact form). What survives of that work: the `customers` collection and the account screens, now carrying saved delivery details and a food preference, and the transactional email plumbing. The same day, the kitchen decided to sell through the site again: feature 4 below rebuilds this, built fresh rather than restored from git history.

## Existing

### A. Content pages and posts · existing
The Payload driven content site: pages, posts, categories, media and the block library.
Code in `src/collections/`, `src/blocks/`.

### B. Site chrome and theming · existing
Header and footer globals, dark mode, Tailwind v4 with shadcn/ui primitives.
Code in `src/Header/`, `src/Footer/`, `src/providers/`, `src/components/`.

### C. SEO, search and redirects · existing
SEO plugin, search plugin, redirects, nested docs, sitemaps and previews.
Code in `src/plugins/index.ts`, `src/app/(frontend)/(sitemaps)/`.

### D. Admin panel and staff auth · existing
Payload admin at `/admin` with the users collection and authenticated access.
Code in `src/collections/Users/`, `src/app/(payload)/admin/`.

### E. Forms and submissions · existing
Form builder plugin with stored submissions, dynamic fields and email notifications.
Code in `src/blocks/Form/`, `src/collections/` (plugin generated).

## Foundations

### 1. Transactional email · done
Outbound mail through ZeptoMail with SMTP as a fallback, so account confirmations, password resets and enquiry notices actually arrive.
**Done when:** a test message sends through ZeptoMail, the same message sends through SMTP when the primary fails, and every failure is logged.
- [x] Design it (spec): `/architect transactional email`
- [x] Build it: `/develop transactional email`
   - [x] Data model, access rules and copy defaults (AC-3, AC-4, AC-9)
   - [x] Send module, Payload adapter and message templates (AC-1, AC-5, AC-6, AC-7, AC-11, AC-13)
   - [x] SMTP fallback, classification and timeouts (AC-2)
   - [x] Admin mail log, settings screen and test action (AC-8)
   - [x] Prune job, env docs and typecheck (AC-10, AC-12)
- [x] Verify it: `/check verify transactional email`
- [x] Test it: `/test transactional email`
Spec [0002](../specs/0002-transactional-email/index.md) · code in `src/email/`, `src/collections/EmailLog/`, `src/globals/EmailSettings/`

## Slice 1: Supporting pages

### 2. About and contact · in-progress
Two public pages: `/about`, which tells the story of the kitchen, and `/contact`, which gathers WhatsApp, phone, email and the site's first public write path, an enquiry form that stores a row and emails the kitchen.
**Done when:** both pages render with their copy and images, the enquiry form stores a row and notifies the kitchen without JavaScript, and bad input is answered with a plain sentence.
- [x] Design it (spec): `/architect about and contact`
- [x] Build it: `/develop about and contact`
   - [x] The shared no-JS form plumbing extracted to `src/utilities/formPost.ts` (AC-6)
   - [x] The `enquiries` collection, guarded migration and rate limit (AC-4)
   - [x] The enquiry endpoint with same-origin, honeypot, validation and notice mail (AC-3, AC-5)
   - [x] The contact page: hero, ways-to-reach-us cards, form, confirmation and errors (AC-2)
   - [x] The about page and the shared `Notice` component (AC-1)
   - [x] Int and e2e tests and the typecheck gate (AC-1–AC-6)
- [ ] Verify it: `/check verify about and contact`
- [ ] Test it: `/test about and contact`
Spec [0006](../specs/0006-about-and-contact/index.md) · code in `src/app/(frontend)/(site)/about`, `src/app/(frontend)/(site)/contact`, `src/collections/Enquiries/`, `src/utilities/aboutCopy.ts`, `src/utilities/contactCopy.ts`

## Slice 2: Customer identity

### 3. Customer accounts · in-progress (building)
A customer signs in with email and password, or with Google, and keeps their delivery details and food preference with the kitchen on one page. With plans gone, the account is a saved profile and a session, not a plan manager.
**Done when:** a customer can sign up with email and password, confirm their address, reset a forgotten password, or sign in with Google, then see and save their delivery details and food preference, and can never reach the CMS.
**Supersedes:** the account decisions in specs 0001 and 0003, and the "No account. No password." promise in `design.md`.
- [x] Design it (spec): `/architect customer accounts with Google sign-in`
- [x] Build it: `/develop customer accounts with Google sign-in`
   - [x] Schema: `customers` collection, migration and backfill (AC-1, AC-9, AC-14)
   - [x] Access: `staffOrPublished`, repoint the four content collections, prove a customer is denied (AC-8)
   - [x] Session: Payload JWT in `unave-customer`, verified through Payload's `JWTAuthentication`, revoked on sign out (AC-6)
   - [x] Google OAuth: authorize, callback, exchange, profile, find or link or create, sign out (AC-2, AC-3, AC-4, AC-5)
   - [x] Strategy: read the cookie, hand it to Payload's JWT strategy, return the customer (AC-7)
   - [x] Email and password on Payload's local strategy: `payload.create`, `payload.login`, branded confirm and reset mail, Payload's lockout (AC-15, AC-16)
   - [x] Move the schema and data onto Payload's auth fields: `_verified`, `_verificationToken`, `salt`/`hash`, sessions, guarded migration (AC-1, AC-14)
   - [x] Pages: `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`, `/account`, session guard, headers, and account links in the navbar (AC-10, AC-11)
   - [x] Docs: `design.md`, `scope.md`, `AGENTS.md`, `.env.example` (AC-12, AC-13)
   - [ ] Not yet driven against real Google credentials. The OAuth flow is code complete but no live sign-in has been performed (AC-2, AC-4, AC-5).
- [ ] Verify it: `/check verify customer accounts`
- [ ] Test it: `/test customer accounts`
Spec [0005](../specs/0005-customer-accounts/index.md) · code in `src/collections/Customers/`, `src/auth/`, `src/utilities/customerSession.ts`, `src/app/(frontend)/sign-in/`, `src/app/(frontend)/sign-up/`, `src/app/(frontend)/forgot-password/`, `src/app/(frontend)/reset-password/`, `src/app/(frontend)/account/`, `src/components/CustomerAuth/`, `src/Header/AccountLinks.tsx`, `src/access/`, `src/migrations/`

## Slice 3: Ordering

### 4. Plans and payments · in-progress (building) · GA
The kitchen sells plans through the site again, built fresh rather than restored from the removed build. A plan is a duration paid upfront, say a week or a month of meals, collected through an online payment gateway (Razorpay is the named pick; the spec owns that decision). A plan card sends the buyer straight to checkout with that plan and duration, one plan per order, checkout requires sign in, and staff manage plans and see orders and payments in the Payload admin.
**Supersedes:** the "an account only saves details" promise in `design.md`: buying now requires an account, so that contract changes at spec time, while browsing and messaging stay open to everyone.
**Done when:** a visitor can browse plans and start a purchase without an account, sign in at checkout, pay once for the plan they chose, and the kitchen sees the order and can edit plans, prices and availability in the admin; the chrome copy that says orders come by message is updated in the CMS.
- [x] Design it (spec): `/architect plans and payments`
- [ ] Build it: `/develop plans and payments`
   - [x] Collections, migration and access rules (AC-4, AC-9, AC-10)
   - [x] The thin thread in test mode: plan cards, checkout, the Razorpay popup, the return check and the webhook (AC-2, AC-3, AC-4, AC-5, AC-6, AC-8)
   - [x] Order mail and the refusals hardening (AC-4, AC-7, AC-8, AC-12)
   - [x] Full pages, the chrome migration and the design contract amendment (AC-1, AC-9, AC-11, AC-12)
   - [x] Int and e2e tests and the typecheck gate (AC-1 through AC-12)
   - [x] Cart removal revision: direct buy path, single plan orders, the cart surface removed, tests rebuilt (AC-1 through AC-11)
- [ ] Verify it: `/check verify plans and payments`
- [ ] Test it: `/test plans and payments`
- [ ] Review it (fresh model): `/check review plans and payments`
- [ ] Document it: `/document plans and payments`
Spec [0007](../specs/0007-plans-cart-and-payments/index.md) · code in `src/collections/Plans/`, `src/collections/Orders/`, `src/utilities/razorpay.ts`, `src/components/Store/`, `src/app/(frontend)/(site)/plans`, `src/app/(frontend)/(site)/checkout`, `src/app/(frontend)/(site)/order-placed/`, `src/app/(frontend)/api/razorpay/`, `src/email/templates/Order.tsx`, `src/migrations/`

## Deferred

Out of scope for this build pass, kept so the plan stays honest.

- **Fulfilment states and auto renewal**: order states with staff actions such as cancellation and refund notes, and auto renewing subscriptions · both cut from feature 4's first pass
- **A weekly menu page**: the header and footer promise a menu that has no page yet
- **SMS and WhatsApp**: notification channel beyond email · needs a decision
- **Email delivery events**: bounce and complaint webhooks, plus alerts on repeated send failure · from spec 0002 · needs a decision
- **Analytics**: conversion events and product analytics · needs a decision

## Legend

**The decision box.** Every feature carries exactly one, the sub-task whose label ends with `(spec)`. Its wording varies (`Design it (spec)` normally), so skills locate it by that `(spec)` suffix, never by an exact label. Every other box is an execution box and `/architect` never ticks one.

**Feature lifecycle**: the scope updates as a feature moves; each row is what it shows and who sets it:

| State | Set by | The feature shows |
|---|---|---|
| `planned` · needs a decision | `/scope` | one box: `Design it (spec): /architect <feature>` |
| `in-progress` (designed) | **`/architect` at spec capture** | `Design it` ticked; spec linked; `Build it: /develop <feature>` + **2 to 5 milestones**; the tier's closing boxes (`Verify it`, `Test it`) |
| `in-progress` (building) | `/develop` | milestone sub-boxes tick one by one; code pointer filled |
| `in-progress` (verified) | `/check verify` | `Build it` + milestones ticked; `Verify it` ticked |
| `done` | **you, when you decide it is** | boxes you ran ticked, skipped ones marked skipped |

- **Next step** = the first unticked box (always a command or a tracked milestone).
- **needs a decision** = run `/architect` first; otherwise straight to `/develop`.
- **Status** `planned` → `in-progress` → `done`, plus `existing` (pre-workflow) and `dropped` (de-scoped, kept for history).
- **Pointer line** (`spec <n> · code in <path>`): the spec link added by `/architect`, the code path by `/develop`.
