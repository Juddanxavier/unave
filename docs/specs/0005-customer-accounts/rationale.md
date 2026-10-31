# 0005. Customer accounts rationale

## Context

> ⚠️ Premise note: this feature was previously decided *against*, twice, and is recorded as a parked scope item. Spec 0001 (`Option 3: Accounts first, subscriptions attached to users`) and spec 0003 (`Option 3: Customer accounts with a login`) both rejected it, with 0003 stating it is "the right answer at a much later stage, when repeat customers and payment methods exist." `docs/scope/scope.md:144` lists it under **Deferred** as "replace guest links with real logins · needs a decision". The client has now made that decision in favour of building it. The cost is that a stated product promise ("No account. No password.") is withdrawn and four documents change.

The site sells food plans to guests with no account. Spec 0001 built the subscription record and the hashed token. Spec 0002 built the mail path. Spec 0003 built the guest plan page with immediate cancel and self serve resend. Spec 0004 built the plan listing and cart. Payments are still taken outside the app and online payments remain a deferred decision, so today there is no order, no invoice and no payment method on file.

The forces are the ones 0003 named. Staff are few. A guest's only way back to a plan is a credential in a URL that expires in 7 days, which is shorter than a monthly plan. The resend form is the current answer to that, and it works, but it makes the guest do the remembering.

What has changed is the client's judgement about the remaining friction. A resend that lands in spam, a link opened on a different device, or a customer with two plans and no single page to see them is support work. The client wants a durable identity now rather than after payments.

## Options considered

### Option 1: Keep guest links only, improve the resend flow

Leave accounts out. Shorten the path back to a plan with an emailed one time code that mints the same session the link already grants.

**Pros**:
- Costs almost nothing and keeps every current promise.
- No new identity, no new cookie, no CMS access control change.
- No external dependency and no credential to operate.

**Cons**:
- Still no single page for a customer with several plans.
- Still no durable record of who the customer is beyond an email string on a row.
- The client has asked for accounts, and this does not deliver them.

### Option 2: A separate `Customers` auth collection with Google sign-in

Customer identity in its own auth collection, never in `users`. Email and password, or Google. Payload owns the credential: it hashes the password, counts attempts, locks the account, mints and spends the verification and reset tokens, signs the JWT and stores the session row. The only thing this feature owns is the Google trade, the emails, the redirect responses and the `unave-customer` cookie name, which keeps the session separate from Payload's `payload-token`.

**Pros**:
- Staff access control stays true by construction: a customer document has no `role`, so every existing `isStaff` gate already denies it.
- The account can still feel passwordless when a customer wants it to: Google remains one click, and the password path exists for those who choose it.
- A separate cookie name means a staff admin session and a customer session no longer fight over one browser.
- Google returns a verified email, which is the key subscriptions already use, so linking an existing subscription is direct.

**Cons**:
- Google only excludes customers without a Google account.
- A stolen session is valid until it expires, up to 30 days, unless the session row is revoked. Sign out revokes it; a password reset does not yet revoke the other rows.
- One more external service to operate, with redirect URIs per environment.
- Still requires the CMS access control hardening.

### Option 3: Add a `customer` role to the existing `users` collection

Reuse the staff collection and add a role.

**Pros**:
- One collection, one table, one migration.
- Payload's built in local strategy gives email and password login with no new code.

**Cons**:
- `authenticated` in this repo is `Boolean(user)`, and it gates create, delete and update on `Pages`, `Posts`, `Media` and `Categories`. Every customer would become a CMS author.
- `users.role` has `defaultValue: 'admin'`. A customer row created without an explicit role becomes an administrator.
- Customers would share an auth collection with panel users, so a mistake in the admin access rule exposes the panel.
- One cookie name for an auth collection, so a customer session and a staff session collide in one browser.

## Rationale

Option 2 wins on the one thing that matters most here, which is that it does not weaken the CMS. The existing access control is role based for staff gated collections and `Boolean(user)` for the four content collections. Put customers in the `users` collection and that second group silently opens. Keep them in their own collection and a customer document has no `role` at all, so every `isStaff` gate already returns false without a single edit. The only work left is closing the `Boolean(user)` hole, which this spec does anyway and which is safer for staff too.

Option 3 is rejected on two concrete defects found in the code, not on taste. `defaultValue: 'admin'` on `users.role` turns any missed role assignment into a privilege escalation, and `authenticated` as `Boolean(user)` grants CMS write access to every customer. Both are fixable, but both are landmines that a later change can re-arm, and neither exists if customers are somewhere else.

Option 1 is the honest runner up. It is cheaper, keeps the promise, and solves the sharpest problem, which is getting back in. It loses because it does not give the client what they asked for, and because the single account page for a multi plan customer is a real gap that a resend does not close. If the Google only risk in Consequences turns out to bite, Option 1 is the fallback that does not require undoing any of this.

**Hand written OIDC over a plugin.** The ecosystem options were examined. `payload-authjs` is beta and Auth.js has been folded into Better Auth with an uncertain release path, which is not a foundation for a live storefront. `payload-auth-plugin` sets its session cookie client side through JavaScript, so it cannot be `HttpOnly`. A hand written strategy is roughly 150 lines, owns its cookie name, and adds no dependency that can break on a Payload minor. The cost is that this code is ours to maintain and review, which the security model in `index.md` and the unit tests in `AC-14` are meant to make tractable.

**No local ID token verification.** Verifying Google's ID token locally needs JWKS and a JOSE implementation, which is not in the tree. Reading the profile from the `userinfo` endpoint over TLS with the access token just exchanged is a supported OIDC pattern and avoids adding a JWT library and an algorithm negotiation surface. It costs one extra network call per sign in. The runner up was adding `jose` and verifying JWKS locally, which is stronger but larger and adds a dependency for one code path.

**Google only.** This is the client's call and it is recorded as the top follow up rather than argued here. It is worth stating plainly that a kitchen whose customers are reached by phone may have a meaningful share of people without a Google account, and that a one time code by email or SMS is the natural second method if the funnel suffers.

**Separate cookie.** `extractJWT` in Payload builds the cookie name from a single config wide `cookiePrefix`, so every auth collection shares one browser slot. Shipping a second auth collection without its own cookie would log a staff member out of the admin panel the moment they signed in as a customer on the same browser. The hand written strategy reads `unave-customer` for exactly this reason.

**Why this supersedes rather than edits.** Specs 0001 and 0003 keep their guest link designs, which are still correct and still shipped. Only their account rejection is superseded, and only because the client has decided the timing is different. The design contract's "No account. No password." line was a marketing promise, and a promise that is no longer true is worse than no promise, so it is rewritten rather than quietly left.

## Cross check

- The access control change is sequenced before any customer can authenticate, so there is no window in which the CMS is open.
- Every account query filters on the session `cid` and never on a client supplied id.
- The guest link flow was originally asserted to be unchanged. It was removed the same day, so this feature is not additive after all: the account page is now the only way to reach a plan, and a plan with no owner is unreachable.
- The `googleId` write path is `overrideAccess: true` from the callback only, and the field is not writable through the API.
- The cookie flags, the signing scheme, the single use state and the PKCE verifier are all named with their sources.
