# 0005. Customer accounts

**Date**: 2026-10-30
**Status**: In Progress

## Summary

A customer signs in with email and password, or with Google, and gets a durable identity. Signed in, they see every subscription tied to their email and can cancel any active one. Managing a plan now needs an account: the private emailed link this spec originally preserved was removed on 2026-10-30 (see dropped scope feature 5), so a plan is reached through the account that owns it and no other way.

This spec supersedes the account decisions in specs 0001 and 0003, the design contract's "No account. No password." promise, and the deferred scope item at `docs/scope/scope.md:144`.

**Amendment, 2026-10-30**: the original design was Google only. The form now offers email and password alongside Google (AC-15, AC-16), which adds a hash, a confirmation step, a reset flow, lockout and rate limiting. The session, the `customers` collection and the access split are unchanged. The guest plan link was removed the same day, which retires AC-9's "continues to work through the guest link" clause.

**Amendment, 2026-10-31**: the plans and subscriptions were removed from the site (see the Removed section in `docs/scope/scope.md`). The account no longer lists or cancels plans — it is sign-in plus a saved profile: delivery details and a food preference. The identity work in this spec (the `customers` collection, email and password, Google, sessions) is exactly what survives, and the user stories about reaching or stopping a plan describe a site that no longer exists.

## Requirements

**User stories**:

- As a returning customer, I want to sign in with Google so that I can reach my plans without hunting for an old email.
- As a customer with more than one plan, I want one page that lists them all so that I stop asking staff what I am paying for.
- As a customer, I want to stop a plan from my account so that I do not have to find the original link.
- As staff, I want a customer record linked to a subscription so that I can see who is behind an order.
- As the site owner, I want a customer to be able to reach only their own data, and to never be able to touch the CMS.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

- **AC-1**: a `customers` collection exists with Payload's auth enabled on the built in local strategy: `auth: { verify: true, maxLoginAttempts: 8, lockTime: 10 * 60 * 1000, tokenExpiration: 2592000, strategies: [customerSessionStrategy] }`. Payload owns the credential fields (`email`, `password`, `salt`, `hash`, `_verified`, `_verificationToken`, `resetPasswordToken`, `resetPasswordExpiration`, `loginAttempts`, `lockUntil`, `sessions`) and every credential operation. The app's own fields are `name` (text, optional), `picture` (text, optional, hidden in the admin list), `googleId` (text, unique, index, hidden, not creatable or updatable through the API), `hasPassword` (checkbox, default false, hidden and read-only in the admin; maintained by the sign-in paths, never edited by hand), and the profile the customer saves on the account page: `phone` (text, optional on the record, validated only when present), `address` (a group of optional `line1`, `line2`, `city`, `state` and `pincode` texts, the pincode validated only when present) and `foodPreference` (select: `none`, `vegetarian`, `vegan`, `eggetarian`, `non-vegetarian`, default `none`). `admin.useAsTitle` is `email`, `defaultColumns` is `['name', 'email', '_verified']`, and the group is `Customers`. `admin.user` in `payload.config.ts` stays `Users.slug`, so the admin panel login is unchanged and a customer document can never be a panel user.

- **AC-2**: `GET /api/customers/oauth/google` redirects (302) to Google's authorization endpoint with `response_type=code`, `scope=openid email profile`, `access_type=online`, the configured `client_id`, a redirect URI of `${getServerSideURL()}/api/customers/oauth/google/callback`, a `state` of 32 random bytes as base64url, a `code_challenge` of the S256 transform of a 32 byte `code_verifier`, and `code_challenge_method=S256`. It sets a short-lived (10 minute) `HttpOnly`, `Secure` in production, `SameSite=Lax` cookie holding `state` and `code_verifier` signed with the session signing key, `Path=/api/customers/oauth`. If the client id or secret is missing it returns HTTP 503 with one log line and no redirect.

- **AC-3**: `GET /api/customers/oauth/google/callback` requires a `code` and a `state` that matches the value in the stored cookie, compared with `timingSafeEqual` on equal-length buffers. A missing cookie, a missing `state`, or a mismatch clears the cookie and redirects to `/sign-in?error=state` without exchanging the code. The cookie is cleared on every exit path, so a state value is single use. The `code_verifier` from that same cookie is sent with the exchange, so an intercepted code cannot be replayed from another client.

- **AC-4**: the callback exchanges the code at `https://oauth2.googleapis.com/token` (POST, `application/x-www-form-urlencoded`, 10 second timeout) and then reads the profile from `https://openidconnect.googleapis.com/v1/userinfo` with the returned `access_token`. The identity is the `sub` claim, stored as `googleId`. A response whose `email_verified` is not exactly `true`, or that has no `sub`, no `email`, or a non-string `email`, is rejected and redirects to `/sign-in?error=profile`. A failed exchange, a non-2xx response or a network failure redirects to `/sign-in?error=exchange`. No raw provider response is logged; only a fixed outcome code and the HTTP status.

- **AC-5**: on success the callback finds the customer by `googleId`. If none matches it finds a case-insensitive match on `email` (`where: { email: { equals: normalised } }` against a trimmed, lowercased address) and links the `googleId` onto that existing record, so an existing subscription email becomes a working account. That link path marks `_verified` and rotates the password to an unknown random value, because Google has just proved control of the address: a password a stranger pre-registered on it must not survive. If neither matches it creates a customer with `name`, `email`, `googleId` and a random password, using `overrideAccess: true`, then marks `_verified`. A random password is required because Payload's local strategy hashes on create; nobody knows its value, and the reset flow can set a real one. `googleId` uniqueness is enforced by the column, and a concurrent first login that trips the unique violation re-reads by `googleId` and continues rather than failing.

- **AC-6**: a successful sign-in sets the session cookie `unave-customer` to a Payload JWT, signed by Payload's own `jwtSign` with `PAYLOAD_SECRET`. The token is the same one `payload.login` issues: `id`, `collection`, `email`, `sid`, `iat` and `exp`, signed HS256. Verification is delegated to Payload's `JWTAuthentication`, which checks the signature, expiry, `_verified` and the human session row named by `sid`. The cookie is `HttpOnly`, `Secure` in production, `SameSite=Lax`, `Path=/`, and expires 30 days from issue, matching `auth.tokenExpiration`. A malformed, tampered or expired cookie authenticates nobody. `POST /api/customers/logout` revokes the session row and clears the cookie; this shadows Payload's built in `/api/customers/logout`, which would clear the shared `payload-token` instead, so signing a customer out cannot sign a staff member out. The account page has no sign-out of its own — the header's account menu posts to this same endpoint. The cookie name is not `${cookiePrefix}-token`, so a customer session and a staff admin session in one browser do not overwrite each other.

- **AC-7**: the `customerSessionStrategy` custom strategy reads the `unave-customer` cookie, hands the token to Payload's own `JWTAuthentication` through a synthesized `payload-token` header with `DisableAutologin`, and returns the customer. It never reads the real `payload-token`, so a staff token in the same browser never authenticates a customer, and a customer token in `unave-customer` never authenticates staff. `GET /api/customers/oauth/session` uses the same helper to answer the header's signed in check.

- **AC-8**: every CMS collection that today trusts "any authenticated user" instead trusts a staff role. `Pages`, `Posts`, `Media` and `Categories` use `isStaff` for `create`, `delete` and `update`, and a new `staffOrPublished` for `read`, which returns `true` for an admin or staff user and otherwise restricts to `_status: 'published'`. `src/access/authenticated.ts` and `src/access/authenticatedOrPublished.ts` are deleted once no collection references them. A signed in customer calling any of those collections over REST is denied. This is a behaviour preserving change today, because every existing authenticated user already has `role` `admin` or `staff`, and it is what makes the customer role safe.

- **AC-9**: `subscriptions` gains an optional `customer` relationship to `customers`, staff only in the admin sidebar. The migration backfills it from the lowercased email where exactly one customer matches an existing subscription's email. A subscription with no matching customer keeps a null `customer` and has no route to it at all, because the guest link that used to reach it was removed; such a plan needs an owner assigned by hand. Nothing reads `customer` on the sign-in paths.

- **AC-10**: `/sign-in` and `/sign-up` are public pages sharing one auth frame that fills exactly one viewport with no page scroll — the form tightens on short screens (`short` and `shorter` height variants shrink the fields to the 44px minimum, the gaps, the divider and the card padding) rather than growing a scrollbar (a slim logo-and-back bar, then a split brand panel beside the form on desktop — the brand half is desktop only, so the form owns the full height on mobile). The four account screens render without the site header and footer; every content page keeps them, which is why the chrome lives in the `(site)` route group rather than the root layout. The email and password form is the section's single primary action; `Continue with Google` is `secondary` below an "or" divider, so no frame carries two primaries. Sign-up additionally offers the optional **Food preference** select, parsed by the same shared Zod schema, and an unknown submitted value falls back to the default rather than failing the sign-up; sign-in never shows the field. The password field carries a show/hide toggle and a *"Forgot your password?"* link; the sign-in and sign-up forms are validated by the same shared Zod schema as the endpoints. Each renders a plain, non-brand-frightening error line keyed by the `error` parameter, and a success or notice line keyed by `registered`, `resent`, `sent` or `verified`; no line appears when neither parameter is present. Each screen cross-links the other in one quiet line and links to `/forgot-password`. `/sign-in` and `/sign-up` redirect a visitor who already holds a valid customer session to `/account`, so a signed in customer never sees a second form; `/forgot-password` and `/reset-password` stay reachable, because a signed in customer may still need an emailed link to set a password. `/sign-in`, `/sign-up`, `/forgot-password` and `/reset-password` are all `noindex, nofollow`, `Cache-Control: no-store`, and `force-dynamic`. `/account` requires a session: with no valid session it redirects to `/sign-in`. With a session it lists every subscription whose `customer` is the signed in customer, newest first, showing plan title, status, the start and end dates and the price, and offers a cancel action. Sign out lives in the header's account menu rather than on this page, so it is one control in one place. The page is two columns from `lg` — the plans on the left, and a 20rem sidebar on the right carrying an at-a-glance summary (plans on the account, active now), account details (name, email, sign-in method and member since) and a help card linking to plans, the menu and contact; on smaller screens the plans come first and the sidebar follows. Its cancel confirmation is the modal described in design 6.13. The account page renders each plan inline from the same row, with no separate plan page to open.

- **AC-15**: `POST /api/customers/register` creates an account from an email and a password, and `POST /api/customers/login` signs one in. The password is hashed by Payload's local strategy (PBKDF2-SHA256, 600000 iterations, a 32 byte random salt and a 32 byte key, stored in `salt`/`hash`); the same construction the old custom column used, so the migration carries existing hashes across. A password shorter than 10 characters or longer than 200 is refused by the shared Zod schema, the upper bound being a denial-of-service limit on an unauthenticated route. The address is trimmed and lowercased the same way Payload's `email` field normalises. Register never writes to an existing record: a duplicate address goes to `/sign-in?error=exists`, because the route is unauthenticated and must not become an oracle. `payload.create` writes the unverified account (`_verified: false`) and the branded confirmation email carries the token. `payload.login` refuses a locked account, refuses an unverified account once the password is correct, counts failed attempts and locks after 8 failures for 10 minutes. Login answers `?error=unverified` for a correct password on an unconfirmed address and `?error=locked` for a lock, so the two are distinguishable only after the password is known. Both are Payload collection endpoints that parse `application/x-www-form-urlencoded`, require a same-origin POST (`Sec-Fetch-Site: same-origin`, else an `Origin` host matching the request host or the configured public origin), and answer with a `303` redirect carrying an `?error=` code, so they work with JavaScript disabled. The address and password rules live in one shared, client-safe Zod schema (`src/auth/password/schema.ts`) that both the browser form and these endpoints apply, so a value the form accepts is a value the endpoint accepts.

- **AC-16**: `POST /api/customers/forgot-password`, `/reset-password` and `/resend-verification` complete the flow. Payload generates and stores the tokens: `payload.forgotPassword({ disableEmail: true })` returns the reset token and writes `resetPasswordToken`/`resetPasswordExpiration`; `payload.resetPassword` spends it; `payload.verifyEmail` spends `_verificationToken`. A reset token lives one hour and is single use. `GET /verify-email?token=...` is a Next route handler that calls `payload.verifyEmail` and redirects to `/sign-in?verified=1`, or to `?error=verify`. The confirm-your-address and reset messages are React Email templates rendered by `renderCustomerAuth`, logged under the `customerAuth` template key, and carry no subscription. Rate limits are per IP and per address: sign-in 20 per IP and 10 per email per 10 minutes, and the mailing routes 15 per IP per hour. A successful reset signs the person in and marks `_verified`; it does not revoke their other sessions.

- **AC-11**: the header shows code rendered account links that are not editorial CMS copy, because they reflect session state: `Sign in` linking to `/sign-in` and `Sign up` linking to `/sign-up` when there is no customer session, and an account menu when there is one. Signed in, the bar's control is a button labelled with the customer's first name (falling back to `Your plans` when Payload holds no name) that opens a panel naming who is signed in and carrying `Your plans` linking to `/account` and `Sign out`. `Sign out` is a plain form post to `/api/customers/logout`, so it also works without JavaScript, and that endpoint revokes the session row. The menu is keyboard complete — ArrowDown/ArrowUp move between items, Home and End jump, Escape closes and returns focus to the trigger, Tab leaves, and a pointer down outside closes it — and closes on navigation, since the header outlives a client route change. In the bar these sit in the actions row next to the search control and the primary pill; `Sign in` is labelled from the `sm` breakpoint up and icon only with a screen reader label below it, `Sign up` appears from `sm` up so the narrowest bar is never crowded, and the drawer repeats them as full width 56px rows (`Sign in` and `Sign up` signed out; `Your plans` and `Sign out` signed in). The session is fetched client side once per header from `/api/customers/oauth/session` after hydration and shared by the bar and the drawer, which is also where the name comes from; the root layout reads no cookie, so the statically rendered marketing pages stay static. While that check is in flight the links render the signed out state, so they are present in the server HTML and no visitor sees the bar shift; only a signed in customer sees the control swap, once, after hydration. The links render whether or not Google credentials are configured, so `/sign-in` is reachable from the header on a deployment that has not set them yet.

- **AC-12**: new environment variables `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are documented in `.env.example` as server-only, with a note that the Google Cloud console must register `${NEXT_PUBLIC_SERVER_URL}/api/customers/oauth/google/callback` as an authorized redirect URI. No secret is ever sent to the client. The feature works with the existing `PAYLOAD_SECRET` and needs no new infrastructure.

- **AC-13**: `docs/design/design.md` no longer promises "No account. No password.". Principle 4, the hero trust row, section 6.8, the Home blueprint and the Don'ts list are all rewritten to promise control over a plan instead. `docs/scope/scope.md` moves customer accounts out of Deferred and records the decision. `AGENTS.md` drops the no-account constraint and states the new rule: customer identity lives in `customers`, staff identity in `users`, and the two never share a cookie collection.

- **AC-14**: a generated migration creates `customers`, its unique index on `google_id`, the `subscriptions.customer_id` column and its foreign key, and performs the email backfill from AC-9, with a `down` that drops all of it. `pnpm exec tsc --noEmit` passes, `payload generate:types` is re-run, and the new unit tests for session signing, state comparison and the CMS access predicates pass.

- **AC-17**: the account page carries a **Delivery details** form that saves `phone`, `address` and `foodPreference` onto the signed in customer's own row through a server action. The action reads the customer id from the session — never one from the form — and writes only those fields, so email, name, password and `hasPassword` have no path from it. The collection still refuses customer REST writes (`update: isAdmin`); this action is the one self-service write, and `overrideAccess` applies only to the session holder's row. Validation is one shared client-safe Zod schema (`src/utilities/customerProfile.ts`) run in the browser and again in the action: the phone must match the same pattern the subscriptions collection validates a per-plan phone with, the pincode must be six digits, address line 2 is optional, and the food preference is optional with unknown values falling back to `none`. The delivery fields are required on save, so the action never stores half an address; the whole profile may stay empty. Per-field errors render under the field they belong to with `role="alert"` and `aria-invalid`, and the form stays a plain form with a server action so it still saves without JavaScript. The sign-up form offers the same preference as an optional native select. A migration adds the columns and the `food_preference` enum, and carries each customer's most recent plan's delivery details into their profile so nobody retypes an address the subscriptions table already holds.

## Decision

**Chosen option**: Option 2, a separate `Customers` auth collection on Payload's own local strategy, with a hand written Google OIDC trade and its own session cookie name.

Customer identity lives in its own auth collection, never in `users`. Sign-in is email and password, or Google. Payload owns the credentials: it hashes the password, counts failed attempts, locks the account, issues and spends verification and reset tokens, signs the JWT and tracks the session row. The app adds only the pieces Payload cannot own: the Google trade, the branded emails, the redirect responses the no-JS forms expect, and the `unave-customer` cookie name. That name is the one deliberate difference from Payload's default, so a storefront sign-in can never overwrite a staff member's `payload-token` in the same browser.

## Feature design

**Data model sketch**:

`customers` (new collection, auth)

| Field | Type | Rules |
|---|---|---|
| email | email | Payload's auth identity field, trimmed and lowercased on write, unique through auth |
| name | text | optional, from the Google profile |
| picture | text | optional, profile image URL, hidden in the admin list |
| hasPassword | checkbox | whether the customer can sign in with a password: false for a Google-only account (its stored password is random and unknown), true once one is registered, signed in with, or set by a reset. Read by the account page; hidden |
| phone | text | optional on the record, validated against the subscriptions phone pattern when present. Saved by the customer from the account page |
| address | group | optional `line1`, `line2`, `city`, `state`, `pincode`, all optional on the record so an account can exist before an address does. Saved by the customer from the account page |
| foodPreference | select | optional personal preference: none, vegetarian, vegan, eggetarian, non-vegetarian. Default `none`. A kitchen question, never a medical claim, so it sits beside delivery details and not near the notice block |
| googleId | text | unique, indexed, hidden, never writable through the API, the Google `sub` |
| password, salt, hash, `_verified`, `_verificationToken`, `resetPasswordToken`, `resetPasswordExpiration`, `loginAttempts`, `lockUntil` | Payload auth fields | owned by Payload's local strategy; this feature never writes the hash by hand |
| sessions | array | one row per signed-in device, owned by Payload; sign out deletes the token's row |

`subscriptions` (existing collection, one new field)

| Field | Type | Rules |
|---|---|---|
| customer | relationship to customers | new, optional, staff only, backfilled by lowercased email, never read by the guest token flow |
| all existing fields | unchanged | status and cancellation behaviour are untouched; the token hash columns were dropped when the guest link was removed |

**API surface**:

| Surface | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/customers/oauth/google` | GET | none | 302 to Google | public | 503 when credentials are missing |
| `/api/customers/oauth/google/callback` | GET | `code`, `state`, the state cookie | 302 to `/account` and the session cookie | possession of the state cookie | `error=state`, `error=exchange`, `error=profile` |
| `/api/customers/logout` | POST | the session cookie | 302 to `/`, cookie cleared | the session cookie | none |
| `/sign-in` | GET | `error` query | sign-in page | public | none |
| `/sign-up` | GET | `error` query | sign-up page | public | none |
| `/account` | GET | the session cookie | the customer's subscriptions | a valid session | redirect to `/sign-in` |

**Value sourcing**:

| Action | Value produced or displayed | Source |
|---|---|---|
| authorize redirect | `client_id` | `GOOGLE_CLIENT_ID` |
| authorize redirect | redirect URI | `${getServerSideURL()}/api/customers/oauth/google/callback` |
| authorize redirect | `state` | `randomBytes(32).toString('base64url')` |
| authorize redirect | `code_verifier` | `randomBytes(32).toString('base64url')` |
| authorize redirect | `code_challenge` | `createHash('sha256').update(verifier).digest('base64url')` |
| callback | identity | the `sub` claim from `https://openidconnect.googleapis.com/v1/userinfo` |
| callback | email | the `email` claim, trimmed and lowercased |
| callback | display name | the `name` claim, else the email local part |
| callback | avatar | the `picture` claim |
| session cookie | signing key | `PAYLOAD_SECRET`, the same secret Payload already owns |
| session cookie | lifetime | 30 days |
| account page | subscription list | `subscriptions` where `customer` equals the session `cid`, sorted `-createdAt`, read with `overrideAccess: true` and an explicit `select` of the display columns only |
| account page | plan detail | rendered inline from the same row. There is no separate plan page: `/plan/[token]` was removed, so the card is the whole view |
| account page | cancel target | the subscription id from the form, re-checked against the session `cid` inside the action, never trusted from the client |
| account page | profile save | `phone`, `address` and `foodPreference` from the form, validated by `customerProfileSchema`, written to the row the session names with `overrideAccess: true`; no other field is written |
| header | signed in state | `/api/customers/oauth/session`, fetched client side after hydration, which verifies the `unave-customer` cookie server side |

**Key invariants**:

- Payload owns every customer credential operation. The local strategy is on, so `payload.login`, `payload.create`, `payload.forgotPassword`, `payload.resetPassword` and `payload.verifyEmail` are the only things that hash, compare, count, lock, mint and spend. This feature does not reimplement any of them.
- A customer can only ever read their own subscriptions. Every account query filters on the session `cid` and never trusts a client supplied id.
- A customer is denied every CMS collection by role, not by collection membership being unclear.
- The customer session cookie holds a Payload JWT and the staff `payload-token` does not: different cookie name, different collection, and the custom strategy only ever reads `unave-customer`.
- A state value is single use and bound to the PKCE verifier.
- An unverified Google email never creates or links an account.
- The guest link flow no longer exists. That is the one deliberate breaking change in this area: a plan with a null `customer` now has no route to it and needs an owner assigned by hand.

**Security model**:

The session cookie is the only bearer credential this feature adds, and it is `HttpOnly`, so script cannot read it, `SameSite=Lax`, so it is not sent on a cross site POST, and `Secure` outside development. It holds a Payload JWT signed with `PAYLOAD_SECRET`: Payload checks the signature, the expiry, the `_verified` flag and the session row the token names, using the same `JWTAuthentication` the admin panel uses. Because sessions are stored, signing out revokes the row rather than waiting for the token to expire, and rotating `PAYLOAD_SECRET` is still the blunt revocation switch for every session at once. Resetting a password does not revoke other sessions yet; that is recorded as a follow up.

Google OIDC is used without a JWT library. The ID token is not verified locally; instead the callback reads the profile from Google's `userinfo` endpoint over TLS using the access token it just exchanged. This avoids a JOSE dependency and an algorithm negotiation surface, at the cost of one extra network call. The exchange and the profile read each carry a 10 second timeout.

The access control change in AC-8 is the load bearing one. Before this feature, `authenticated` meant `Boolean(user)`, which was safe only because every authenticated user was staff. Adding a second auth collection makes that assumption false, so every collection that trusted it now trusts a role instead. The change is behaviour preserving for staff and closed for customers.

`googleId` is hidden and not writable through the API, so no client can take over an identity by writing a `sub` it does not own. Only the callback path sets it, with `overrideAccess: true`.

**Configuration required**:

`GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from a Google Cloud OAuth 2.0 client of type Web application, server side only. The authorized redirect URI must be `${NEXT_PUBLIC_SERVER_URL}/api/customers/oauth/google/callback`, and the same URI must be registered for every environment, including localhost during development. `PAYLOAD_SECRET` is unchanged and reused as the signing key. No new infrastructure.

**Critical test scenarios** (each maps to an acceptance criterion in `## Requirements`):

- Session verify: round trip one Payload JWT, then tamper the payload, tamper the signature and expire it, verifies **AC-6**
- State: mismatched, missing and replayed state values, verifies **AC-3**
- Profile rejection: `email_verified: false`, a missing `sub`, a non-string email, verifies **AC-4**
- Exchange failure: a 4xx, a 5xx and a timeout, verifies **AC-4**
- First login creates, second login reuses, existing email links, verifies **AC-5**
- Concurrent first login trips the unique index and recovers, verifies **AC-5**
- Customer denied on `pages`, `posts`, `media` and `categories` over REST, staff allowed, verifies **AC-8**
- Customer and staff cookies coexist in one browser, verifies **AC-6**, **AC-7**
- Account isolation: two customers, each sees only their own subscriptions, verifies **AC-10**
- Profile save: writes the four fields onto the session's row, refuses a bad pincode without writing, falls back on an unknown preference, and refuses a signed-out visitor, verifies **AC-17**
- Auth copy: each auth screen links to the other and every error code maps to a plain line, verifies **AC-10**
- Account regression: a subscription whose `customer` is set shows on exactly that customer's account page, and one whose `customer` is null shows on nobody's, verifies **AC-9**
- Migration backfill, up and down, verifies **AC-9**, **AC-14**
- No credentials configured: the authorize route returns 503 and `/sign-in` says sign in is not switched on yet, while the header links still render, verifies **AC-2**, **AC-11**

## Build plan

1. Land the schema: add the `customers` collection with auth fields, the hidden `googleId`, the custom strategy stub, register it in `payload.config.ts`, add the `subscriptions.customer` relationship, generate the migration with the email backfill, regenerate types, satisfies **AC-1**, **AC-9**, **AC-14**
2. Close the access hole first, before any customer can authenticate: add `staffOrPublished`, repoint `Pages`, `Posts`, `Media` and `Categories` to `isStaff` and `staffOrPublished`, delete the two now unused access modules, and prove a customer is denied, satisfies **AC-8**
3. Build the session primitive: verify the `unave-customer` JWT through Payload's `JWTAuthentication`, mint and revoke the session row for the Google path, and its unit tests, satisfies **AC-6**
4. Build the OAuth endpoints: the authorize redirect with state and PKCE, the callback with exchange, profile read, find or link or create, and the cookie, plus sign out, satisfies **AC-2**, **AC-3**, **AC-4**, **AC-5**
5. Wire the strategy: read the `unave-customer` cookie, hand it to Payload's JWT strategy, return the customer, satisfies **AC-7**
6. Build the pages: `/sign-in` and `/sign-up` sharing one auth panel with the Google button and the error states, `/account` with the subscription list and cancel, the session guard, and the no-store and noindex headers, satisfies **AC-10**
7. Add the account links behind the credentials switch, in the bar and the mobile drawer, satisfies **AC-11**
8. Reconcile the docs: rewrite `design.md`, move the scope item, rewrite the `AGENTS.md` constraint, document the environment variables, satisfies **AC-12**, **AC-13**

## Consequences

**Positive**:

- A returning customer gets a durable identity and stops depending on a link surviving in an inbox.
- One page answers "what am I paying for" for a customer with several plans.
- Staff can see which customer a subscription belongs to.
- Email and password means a hash to store and a reset flow to defend, which is why the hashing, lockout and rate limits in AC-15 and AC-16 exist. Google stays as the lower-friction path.
- The guest flow is untouched, so nothing that works today breaks.

**Negative or tradeoffs**:

- This reverses a decision recorded in specs 0001 and 0003 and stops a stated marketing promise, so the design contract and `AGENTS.md` both change.
- Google only excludes any customer without a Google account. For a kitchen whose customers may prefer a phone, this is a real funnel cost, recorded as the top follow up.
- A stolen Payload JWT is valid until it expires, up to 30 days, unless the session row is revoked. Signing out revokes that row; a copied cookie is no longer useful.
- The access control change touches four collections and is security critical. It is small, but it is the one change here that could silently expose the CMS if it is wrong.
- The ID token is not verified locally, so correctness depends on the TLS call to Google's `userinfo`.
- One more external dependency to operate: the Google Cloud client, its redirect URIs and its quota.
- Linking by email means whoever controls the Google account for an address gains that customer's plans. That is the intended Google behaviour and it is also the risk.

**Neutral**:

- One new collection, one new relationship, one new cookie, three new routes, two new environment variables and two new pages.
- The header gains one code rendered control that is not editorial.
- Specs 0001 and 0003 keep their guest-link design; only their account rejection is superseded.

## Follow-up

- [ ] **Verify the migrations against a clean database.** `src/migrations/20261030_160000_customer_accounts.ts` is hand written, because `payload migrate:create` could not be used: the development database was built by Drizzle push and does not match the migration history, so `migrate:create` prompted about enums that already existed. The column, index and constraint names mirror Payload's conventions and the baseline, and the integration tests prove the resulting schema works, but the migration SQL itself has never been executed. `src/migrations/20261031_090000_payload_customer_auth.ts` adds the Payload auth fields, carries the old `pbkdf2-sha256-v1:<salt>:<key>` hashes into `salt`/`hash` and drops the custom columns; every step is guarded so it is safe on a database that only ran the committed migrations. Run both against a fresh database, then confirm `payload migrate:create` produces an empty diff.
- [x] Email and password sign-in, so a customer without Google has a way in. Rate limits, Payload's lockout and the reset flow answer the hash and abuse concerns that came with it.
- [x] Server side sessions: Payload stores a row per customer session in `customers_sessions`, and sign out revokes the row named by the token.
- [ ] Revisit once online payments land, since a paid plan is the point at which a durable account earns its keep.
- [ ] Add a `blocked` flag on `customers` and refuse the session for a blocked customer.
- [ ] Surface the `customer` link in the `subscriptions` admin list and add a filter.
- [ ] Consider verifying the Google ID token locally with JWKS once a JWT library is already in the tree.
- [ ] Add rate limiting to the authorize and callback routes, mirroring the account mail limiter.
- [ ] Resetting a password does not revoke other sessions. Payload stores the sessions now, so closing this is a matter of deleting the other rows on reset; decide whether that is the product behaviour we want.
- [ ] Update the guest plan page to offer "Sign in to see all your plans" once this ships.
- [ ] Run `/check verify` and `/test` after the build.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).
