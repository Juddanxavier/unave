# 0001. Plans and subscriptions data model

**Date**: 2026-10-28
**Status**: Accepted

**Amended 2026-10-30**: the secret link was removed with scope feature 5 (dropped). A subscription no longer carries `accessTokenHash`, `accessTokenExpiresAt` or `linkSentAt`; those columns are dropped by `src/migrations/20261030_170000_remove_guest_plan_links.ts`. A plan is now reached through the account that owns it (spec 0005), so the paragraph below about the secret link no longer describes the shipped system. The plan snapshot, the access rules, the status values and the delete guard all still hold.

## Summary

This decision adds two collections to the Payload admin: plans, which are the food packages you sell, and subscriptions, which are the people who bought one. A subscription copies the plan price and meal count at the moment it is created, so a later price change never rewrites history. Each subscription carries a secret link (a long random token) that lets a guest open their plan without a password, and the token is stored only as a hash (a one way fingerprint) so a database leak cannot expose live links.

## Context

The site today is a content site. There is no place to record what you sell or who bought it. Every later feature (plans pages, guest checkout, the guest plan page, staff operations, reminders) needs those two records and the access rules around them.

Two forces shape the model. First, guests have no accounts, so the only way back to a subscription is a link, which makes that link a credential and it must be treated like a password. Second, prices and meal counts will change over time while old subscriptions must keep the terms the customer agreed to, so the model needs a snapshot rather than a live join.

Payments are deliberately out of scope for this slice. Staff confirm payment by hand and the subscription status carries that meaning for now. The model accepts that compromise knowingly: when Razorpay arrives, a separate payment record will be added beside the subscription, not inside its status.

## Requirements

**User stories**:
- As a staff member, I want to create and edit weekly and monthly plans so that the public site has something real to sell.
- As a staff member, I want to see and change every subscription so that I can run the service without touching the database.
- As the site owner, I want customer data and secret links to be safe so that a leak in one place does not expose everyone's plan.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
- **AC-1**: staff can create a plan with a title, a unique slug, a billing period of weekly or monthly, meals per week, and a whole rupee price, and the admin panel rejects the record when a required field is missing.
- **AC-2**: a plan can be switched off, and switched off plans never appear in a public read of the plans collection.
- **AC-3**: a subscription stores the customer name, email, phone and full delivery address, and copies the plan billing period, meals per week and price at creation, so editing the plan afterwards leaves the subscription values unchanged.
- **AC-4**: a new subscription starts with status `new`, a 32 byte random token whose raw value is returned exactly once to the code that created it and never written to the database or returned by any API, a SHA-256 hash of that token, and a link expiry exactly 7 days after creation.
- **AC-5**: only users with role `admin` or `staff` can read, create, update or delete subscriptions, plans and other users, and only an `admin` can change a user's role.
- **AC-6**: an anonymous request to the plans API returns active plans only, and an anonymous request to the subscriptions API returns 403.
- **AC-7**: activating a subscription requires a start date, and the end date is computed from that start date and the copied billing period (7 days for weekly, 1 month for monthly).
- **AC-8**: the status field accepts only `new`, `active`, `cancel_requested`, `cancelled` and `expired`, and defaults to `new`.
- **AC-9**: `pnpm exec tsc --noEmit` passes with the new collections registered and the regenerated types. Lint is not part of this gate because the project ESLint config fails to load before any file is checked (pre-existing, recorded in Follow-up).

## Options considered

### Option 1: One `plans` collection and one `subscriptions` collection with a plan snapshot

Plans hold the sellable package. Subscriptions hold the buyer plus a copy of the plan values at purchase time, and a hashed access token.

**Pros**:
- Price changes never alter existing agreements.
- Guests work without accounts, which matches the chosen checkout.
- Small surface, two tables, easy to reason about.

**Cons**:
- The same values live in two places and can drift if the copy hook is wrong.
- A plan cannot be edited for one customer only.

### Option 2: A single `orders` collection with embedded plan data

Everything about a purchase lives in one record, including package details typed per order.

**Pros**:
- Fewer collections, no relationships to manage.

**Cons**:
- No reusable catalogue, so the public plans page has no source of truth.
- Every price change is a data edit per order.

### Option 3: Accounts first, subscriptions attached to users

> ⚠️ Partly superseded. Accounts were later added as an optional layer in [spec 0005](../0005-customer-accounts/index.md), in a `customers` collection rather than the `users` collection this option proposed. A subscription still does not require an account: the `customer` link is optional and the guest link remains the primary path. The concerns below still hold.

Require a customer account before a subscription exists, and link every subscription to a user.

**Pros**:
- Natural place to show plan history and manage access.

**Cons**:
- Contradicts the chosen guest checkout and adds a signup step before revenue.
- Password reset and verification become part of this slice.

## Decision

**Chosen option**: Option 1: One `plans` collection and one `subscriptions` collection with a plan snapshot.

Two collections, role based staff access, and a hashed secret token per subscription, with no customer accounts and no payment gateway in this slice.

## Feature design

**Data model sketch**:

`plans` (staff managed, public read for active rows)

| Field | Type | Rules |
|---|---|---|
| title | text | required |
| slug | text | required, unique, lowercase |
| summary | textarea | short card copy |
| description | rich text | optional long copy |
| billingPeriod | select | `weekly` or `monthly`, required |
| mealsPerWeek | number | required, integer, 1 or more |
| price | number | required, whole rupees, tax included |
| highlights | array of text | optional, up to 8 lines |
| image | upload to media | optional |
| isActive | checkbox | default false |
| sortOrder | number | default 0, controls list order |
| group | text | admin grouping, default `Plans` |

`subscriptions` (staff only)

| Field | Type | Rules |
|---|---|---|
| plan | relationship to plans | required |
| status | select | `new`, `active`, `cancel_requested`, `cancelled`, `expired`, default `new` |
| customerName | text | required |
| email | email | required, indexed |
| phone | text | required |
| address | group: line1, line2, city, state, pincode | line1, city, state, pincode required |
| billingPeriod | select | snapshot, set from plan |
| mealsPerWeek | number | snapshot, set from plan |
| price | number | snapshot, set from plan |
| startDate | date | set by staff on activation |
| endDate | date | computed, read only |
| paymentReference | text | optional, staff fills by hand |
| paymentReceivedAt | date | optional, staff fills by hand |
| adminNotes | textarea | optional |
| accessTokenHash | text | hidden, unique index, read blocked at field level |
| accessTokenExpiresAt | date | hidden, creation time plus 7 days |
| linkSentAt | date | optional, updated when staff resend |
| cancelRequestedAt | date | set when the guest asks to cancel |
| cancelledAt | date | set when staff confirm |

`users` gains `role` (select `admin` or `staff`, default `staff`, editable by admin only).

**State transitions**:
`new` → `active` (staff, requires start date)
`new` → `cancelled` (staff)
`active` → `cancel_requested` (guest, feature 5)
`cancel_requested` → `active` (staff declines)
`cancel_requested` → `cancelled` (staff confirms)
`active` → `cancelled` (staff)
`active` → `expired` (scheduled job, feature 8)
`cancelled` and `expired` are final.

Amended by spec 0003: the guest plan page cancels immediately, so the guest path is `active` → `cancelled` directly. `cancel_requested` stays for existing records and for a staff led request.

`active` means paid and scheduled. A start date in the future is still `active`, and the guest page shows the start date rather than a separate scheduled status.

**Token handling**:
The token is made once per issue: 32 random bytes, base64url encoded, hashed with SHA-256 and stored as hex. The raw value travels in memory only, from the creation helper to the email and the confirmation screen, and is never written to a log or a row. Staff resend does not reuse the old link, because the raw value cannot be recovered. Resend issues a new token, replaces the hash and expiry, updates `linkSentAt`, and the previous link stops working.

**Date handling**:
Dates are date only values, stored and compared in UTC, with no time of day. The end date is computed on activation from the start date and the copied billing period: weekly adds 7 days, monthly adds 1 month with the day clamped to the last valid day of the target month (31 January becomes 28 or 29 February). Expiry is a date comparison, so a subscription expires at the start of the day after `endDate` in UTC.

**Indexes**:
Unique index on `plans.slug`, unique index on `subscriptions.accessTokenHash`, and ordinary indexes on `subscriptions.email` and `subscriptions.status`.

**Delete rule**:
A plan with any subscription cannot be deleted. Staff switch `isActive` off instead. A hook rejects the delete with a clear message.

**API surface**:

Payload generates REST and GraphQL for both collections. No custom routes in this feature.

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| /api/plans | GET | where, limit | active plans only | public | 403 never, filtered by access |
| /api/plans | POST | plan fields | created plan | staff | 400, 401, 403 |
| /api/subscriptions | GET | where, limit | subscriptions | staff | 401, 403 |
| /api/subscriptions | POST | customer, address, plan | subscription with status new | staff | 400, 401, 403 |

Checkout (feature 4) and the guest page (feature 5) use the Payload local API with `overrideAccess: true` after their own validation, so no public write path exists.

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| create plan | slug uniqueness | database unique index on `plans.slug` |
| create subscription | billingPeriod, mealsPerWeek, price | copied from the related plan in a `beforeValidate` hook, only when the record is new |
| create subscription | accessTokenHash | 32 random bytes from `node:crypto`, SHA-256 hex, the raw value returned once in memory |
| create subscription | accessTokenExpiresAt | creation time plus 7 days |
| resend link | token, hash, expiry | new random token replaces the stored hash, expiry reset to 7 days |
| activate subscription | startDate | staff input in the admin panel |
| activate subscription | endDate | derived from startDate plus the copied billingPeriod |
| plan list | visible rows | `isActive` true for public reads, all rows for staff |
| guest page (feature 5) | subscription match | lookup by `accessTokenHash` of the URL token, with expiry check |

**Key invariants**:
- The raw access token is never persisted or logged, only its hash.
- A plan with subscriptions cannot be deleted.
- A subscription's copied plan values are set on creation only and never change after that.
- An expired token never resolves to a subscription.
- Only staff roles reach the admin panel.
- Public reads of plans never include inactive rows.

**Security model**:
Staff access is role based on the existing Payload auth. Guests never authenticate and never receive a session. Personal data (name, phone, email, address) is readable only by staff. The token hash field has field level read blocked, so it never appears in API responses even for staff. Access tokens are single purpose and expire in 7 days. No card data and no payment credentials exist in this slice, so PCI scope is unchanged.

**Configuration required**:
- No new environment variables in this feature. The server URL used to build the guest link already exists as `NEXT_PUBLIC_SERVER_URL`.

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):
- Happy path: staff create a weekly plan and a monthly plan, then create a subscription from the monthly plan, verifies **AC-1**, **AC-3**, **AC-7**
- Snapshot: edit the plan price after a subscription exists and confirm the subscription price is unchanged, verifies **AC-3**
- Permission: anonymous call to `/api/subscriptions` is refused and anonymous call to `/api/plans` omits the inactive plan, verifies **AC-2**, **AC-5**, **AC-6**
- Token: a created subscription has a hash and an expiry 7 days out, and no response body contains the raw token, verifies **AC-4**
- Types: typecheck and lint run clean, verifies **AC-9**

## Build plan

Built as a thin thread through the real stack: roles and access first, then the two collections, then the admin surfaces, then schema and types, so the whole path from admin UI to database to API works before any page is built.

1. Add the `role` field to users, the staff and admin access helpers, and apply them to users, protects **AC-5**
2. Create the plans collection with fields, unique slug, active flag and public read constrained to active rows, satisfies **AC-1**, **AC-2**
3. Create the subscriptions collection with customer and address fields, status enum, create only plan snapshot hook, hashed token and 7 day expiry, field level read blocking, and the plan delete guard, satisfies **AC-3**, **AC-4**, **AC-7**, **AC-8**
4. Add the indexes (unique slug, unique token hash, email, status), register both collections, apply the schema to Postgres, generate types, satisfies **AC-1**, **AC-4**, **AC-9**
5. Admin polish: navigation groups, list columns, read only computed fields, and a seeded weekly and monthly plan for verification, satisfies **AC-1**, **AC-9**

## Consequences

**Positive**:
- Every later feature has a real table to read and write.
- History survives price changes.
- A leaked database does not hand over working guest links.

**Negative / tradeoffs**:
- One status field carries both payment meaning and lifecycle meaning. Razorpay will need a separate payments record, and possibly a migration of existing statuses.
- The copy hook duplicates data, so it needs a test to stay honest.
- Seven day token expiry creates support work when a guest returns late.
- A resend kills the previous link, so a guest holding the old email is locked out until they use the new one.
- "One active subscription per email" is enforced in checkout (feature 4), not in the database, so staff can still create extras by hand and a script could bypass it.

**Neutral**:
- Postgres schema push in dev. Production needs a generated migration before real customers.
- Two new tables mean the admin panel gains two menu groups.

## Follow-up

- [ ] Run `/audit` to capture the project conventions in `AGENTS.md`; it is missing today and later specs read it.
- [ ] Fix the ESLint config. `pnpm lint` crashes with a circular structure error from the FlatCompat setup, before any file is checked. Typecheck is the current gate.
- [x] Add a payments collection when Razorpay is designed; do not overload the subscription status further. (Done: `src/collections/Payments`, spec 0007.)
- [ ] Rate limit the token lookup once the guest page exists.
- [ ] Generate and commit a baseline migration before launch on the live database.
