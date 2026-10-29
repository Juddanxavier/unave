# Scope: Unave food plans

A Payload and Next.js site that sells subscription food plans. Visitors pick a weekly or monthly plan, check out as a guest, and manage their plan through a secret link. Staff run everything from the Payload admin panel. Online payments come later.

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
| 1 | Plans and subscriptions data model | Foundation | done |
| 2 | Transactional email | Foundation | done |
| 3 | Plans listing and plan detail | Slice 1 | planned |
| 4 | Guest checkout and confirmation | Slice 1 | planned |
| 5 | Guest plan page | Slice 1 | planned |
| 6 | Admin subscription operations | Slice 1 | planned |
| 7 | Active customer list and export | Slice 2 | planned |
| 8 | Expiry and renewal reminders | Slice 2 | planned |

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

### 1. Plans and subscriptions data model · done
Two collections and their admin views. A plan holds name, weekly or monthly period, meals per week, price, description and an on or off switch. A subscription holds guest details, address, plan, start and end dates, status, payment status and the secret link token.
**Done when:** an editor can create a weekly and a monthly plan in the admin panel, a subscription can be created and read through the API, and no public request can read or change someone else's subscription.
- [x] Design it (spec): `/architect plans and subscriptions data model`
- [x] Build it: `/develop plans and subscriptions data model`
   - [x] Roles, access helpers and user access rules (AC-5)
   - [x] Plans collection, unique slug and active only public read (AC-1, AC-2)
   - [x] Subscriptions collection, plan snapshot, hashed token, delete guard (AC-3, AC-4, AC-7, AC-8)
   - [x] Indexes, schema applied, types generated (AC-1, AC-4, AC-9)
   - [x] Admin groups, list columns and seeded sample plans (AC-1, AC-9)
- [x] Verify it: `/check verify plans and subscriptions data model`
- [x] Test it: `/test plans and subscriptions data model`
Spec [0001](../specs/0001-plans-subscriptions-data-model.md) · code in `src/collections/Plans/`, `src/collections/Subscriptions/`, `src/access/`

### 2. Transactional email · done
Outbound mail through ZeptoMail with SMTP as a fallback, so the secret link and later reminders actually arrive.
**Done when:** a test message sends through ZeptoMail, the same message sends through SMTP when the primary fails, and every failure is logged.
- [x] Design it (spec): `/architect transactional email`
- [x] Build it: `/develop transactional email`
   - [x] Data model, access rules and copy defaults (AC-3, AC-4, AC-9)
   - [x] Send module, Payload adapter and access link template (AC-1, AC-5, AC-6, AC-7, AC-11, AC-13)
   - [x] SMTP fallback, classification and timeouts (AC-2)
   - [x] Admin mail log, settings screen and test action (AC-8)
   - [x] Prune job, env docs and typecheck (AC-10, AC-12)
- [x] Verify it: `/check verify transactional email`
- [x] Test it: `/test transactional email`
Spec [0002](../specs/0002-transactional-email/index.md) · code in `src/email/`, `src/collections/EmailLog/`, `src/globals/EmailSettings/`

## Slice 1: Guest subscription loop

### 3. Plans listing and plan detail · needs a decision
Public pages that show the weekly and monthly plans with price, what is included and a subscribe button.
**Done when:** a visitor can browse plans, open one, and reach checkout from it, and each page carries its own title, description and social card.
- [ ] Design it (spec): `/architect plans listing and plan detail`

### 4. Guest checkout and confirmation · needs a decision
The guest enters name, phone, email, address and plan, and gets a subscription with a secret link, both by email and on the confirmation screen. No password.
**Done when:** a guest can submit checkout, the subscription is stored, the link arrives by email, bad input is rejected on the server, and the confirmation screen shows the same link.
- [ ] Design it (spec): `/architect guest checkout and confirmation`

### 5. Guest plan page
The secret link opens a page with plan, dates, status and payment status, and a cancel action.
**Done when:** a valid link shows the right subscription, an invalid or expired link shows a safe message, and cancel updates both the page and the admin record.
- [ ] Build it: `/develop guest plan page`
- [ ] Verify it: `/check verify guest plan page`
- [ ] Test it: `/test guest plan page`

### 6. Admin subscription operations
Staff can list subscriptions, activate, cancel, resend the link and leave a note. Payment status stays editable by hand until a gateway exists.
**Done when:** staff can move a subscription from new to active to cancelled from the admin panel, each change is visible to the guest, and the resend action sends a fresh link.
- [ ] Build it: `/develop admin subscription operations`
- [ ] Verify it: `/check verify admin subscription operations`
- [ ] Test it: `/test admin subscription operations`

## Slice 2: Running the service

### 7. Active customer list and export
One screen that lists everyone currently subscribed with plan, dates, address and phone, plus a CSV export for the kitchen.
**Done when:** staff can filter the active list and export it to CSV with the columns they need.
- [ ] Build it: `/develop active customer list and export`
- [ ] Verify it: `/check verify active customer list and export`
- [ ] Test it: `/test active customer list and export`

### 8. Expiry and renewal reminders
A scheduled job marks plans that ended as expired and emails a renewal nudge a few days before the end date.
**Done when:** an ended subscription flips to expired without staff action, and each customer gets at most one reminder before their end date.
- [ ] Build it: `/develop expiry and renewal reminders`
- [ ] Verify it: `/check verify expiry and renewal reminders`
- [ ] Test it: `/test expiry and renewal reminders`

## Deferred

Out of scope for this build pass, kept so the plan stays honest.

- **Online payments with Razorpay**: plans, auto debit mandates, webhooks, refunds · needs a decision · GA
- **Invoices and GST**: numbered invoices and tax breakdown · needs a decision
- **Customer accounts**: replace guest links with real logins · needs a decision
- **Delivery scheduling**: day level skips and pauses · needs a decision
- **Delivery zones**: pincode check and different prices per area · needs a decision
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
