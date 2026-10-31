# 0002. Reliable transactional email with ZeptoMail and an SMTP fallback

**Date**: 2026-10-29
**Status**: Accepted

**Amended 2026-10-30**: the access link template and its editable copy were removed with scope feature 5 (dropped). `TEMPLATE_KEYS` is now `system`, `cancellation` and `customerAuth`, `TemplateMailInput` carries only the cancellation variant, `subscriptions.linkSentAt` is gone, and the access-link clauses in AC-5, AC-6, AC-8 and AC-11 describe a message the site no longer sends. The transport, fallback, log, prune job and copy-in-a-global design all still hold. The admin test send now posts a plain message under the `system` key rather than the access link template.

**Amended 2026-10-31**: the plans and checkout system was removed from the site. The `cancellation` template, its copy group in EmailSettings and the `subscription` field on the mail log are gone, and `TEMPLATE_KEYS` is now `system` and `customerAuth`. The transport, fallback, log, prune job and copy-in-a-global design all still hold.

## Summary

This decision adds one mail path to the site. A message is rendered from a React Email template, sent through ZeptoMail, and retried over a plain SMTP relay when ZeptoMail fails. Every attempt is recorded in a mail log staff can read, and the message copy can be edited in the admin panel. The path is wired into Payload's own email adapter, so password resets and form notifications use the same route.

## Requirements

**User stories**:

- As a guest, I want the access link to arrive even when the first mail provider fails, so that I can open my plan.
- As a staff member, I want to see every send attempt and why it failed, so that I can help a customer who says no mail arrived.
- As an admin, I want to change the message copy and send a test message, so that the email stays accurate without a deploy.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

- **AC-1**: one server module renders a template and sends it through ZeptoMail when `ZEPTOMAIL_API_KEY` is set, using the sender address from `MAIL_FROM_ADDRESS`, the sender name from the settings global when set and `MAIL_FROM_NAME` otherwise, and the reply address from `MAIL_REPLY_TO`, and returns a typed result carrying `status`, `transport`, `fallbackUsed` and `messageId`.
- **AC-2**: when ZeptoMail fails for a retryable reason (network error, timeout, 5xx, 401, 403, or a 400 that does not name an invalid recipient), the same rendered message is attempted once over SMTP when the SMTP group is configured, within 15 seconds, and the result reports `transport: "smtp"` with `fallbackUsed: true`. An address that fails format validation, or a provider response that names an invalid recipient, produces `failed` with `transport: "none"` and no SMTP attempt.
- **AC-3**: every logical send writes exactly one `email-log` row. A primary success is `sent` with `zeptomail` and `fallbackUsed` false, a fallback success is `sent` with `smtp` and true, a success when only SMTP is configured is `sent` with `smtp` and false, both failing is `failed` with `smtp` and true plus the final error, a refused send is `failed` with `none` and false, and no configured transport is `skipped` with `none` and false. The row holds the recipient text, its masked form, recipient name, template key, subject, optional subscription, status, transport, fallback flag, provider message id, error code, error message, triggered by, created time and sent time. A request rejected by the test rate limit or by request validation writes no row.
- **AC-4**: staff and admin can read `email-log`, no user can create, update or delete a row through REST or GraphQL, the collection is capped at `maxDepth: 0`, a staff response contains `recipientMasked` and no `recipient`, and an admin response contains both.
- **AC-5**: the access link template produces subject, HTML and plain text from the `email-settings` global, falls back per empty field to code defaults, builds the link as `getServerSideURL()` plus `/plan/` plus the token, escapes every inserted value, strips carriage returns and line feeds from the subject and recipient name, and never writes the raw token to a log row, an error message or a server log line.
- **AC-6**: a successful access link send sets `subscriptions.linkSentAt` with a clean request context that cannot issue a token, after the caller's own write has committed, and a failed or skipped attempt leaves the value unchanged.
- **AC-7**: with no transport group configured, the module still renders the message, writes a `skipped` row, and makes no network call.
- **AC-8**: an admin can send a test from the email settings screen. The test renders the real access link template with the sample name `Sample Customer` and the sample token `sample-token`, is logged under template key `test`, and is limited to five requests per user per rolling hour. The sixth request returns 429 and writes no row.
- **AC-9**: only an admin can edit `email-settings`, and staff can read it and cannot change it.
- **AC-10**: a Payload job task on a daily schedule deletes `email-log` rows older than 90 days in batches and is callable through the jobs endpoint with `CRON_SECRET`.
- **AC-11**: an access link send with no raw token is refused, no transport is called, and a `failed` row records the reason.
- **AC-12**: `pnpm exec tsc --noEmit` passes with the new collection, global, adapter, templates, endpoint and regenerated import map for the test panel. Lint is not a gate, for the reason recorded in spec 0001.
- **AC-13**: a message sent through `payload.sendEmail` that is not template based goes through the same adapter and is logged under template key `system`; the adapter forces the from address and name to the environment sender, honours the recipient, subject, HTML, text, reply to, cc and bcc, and rejects attachments with a `failed` row.

## Decision

**Chosen option**: Option 1: One mail module wired into Payload's email adapter, ZeptoMail REST primary, SMTP fallback, stored log.

One module renders, sends, falls back and logs. Payload's email adapter delegates to it, the access link template is React Email, copy is a global, and every attempt is a row.

## Feature design

**Data model sketch**:

`email-log` (collection, written by the server, read by staff and admin)

| Field | Type | Rules |
|---|---|---|
| recipient | text | required, indexed, trimmed and lowercased, field read admin only |
| recipientMasked | text | required, computed on create, visible to staff |
| recipientName | text | optional, copied from the caller |
| templateKey | select | `accessLink`, `test`, `system`, required |
| subject | text | required, rendered snapshot |
| subscription | relationship to subscriptions | optional |
| status | select | `sent`, `failed`, `skipped`, required |
| transport | select | `zeptomail`, `smtp`, `none`, required |
| fallbackUsed | checkbox | default false |
| providerMessageId | text | optional |
| errorCode | text | optional, provider or module code |
| errorMessage | textarea | optional, sanitized |
| triggeredBy | relationship to users | optional, set for the admin test |
| createdAt | date | automatic |
| sentAt | date | set on success |

`email-log` is configured with `maxDepth: 0` so no relationship is populated into a response and none can restore the full address. Indexes: `createdAt` for the prune, and a compound index on `triggeredBy`, `templateKey`, `createdAt` for the rate limit query.

`email-settings` (global, admin editable, staff readable)

| Field | Type | Rules |
|---|---|---|
| senderName | text | optional, overrides `MAIL_FROM_NAME` when set |
| fromAddressDisplay | text | admin read only, filled from `MAIL_FROM_ADDRESS` at config load |
| replyToDisplay | text | admin read only, filled from `MAIL_REPLY_TO` at config load |
| accessLink | group | `subject`, `heading`, `intro`, `buttonLabel`, `footerNote`, `signature`, all plain text with preserved line breaks |
| testPanel | ui | hosts the test send component, admin only |

Defaults for every copy field live in `src/email/copy.ts`. A global `afterRead` hook merges stored values over defaults per field, so the admin panel shows the effective copy rather than blanks. The writable fields stay nullable and a saved blank is treated as absent.

**Copy defaults**:

| Field | Default |
|---|---|
| subject | `Your Unave plan link` |
| heading | `Your plan is ready` |
| intro | `Use the link below to open your plan. The link works for 7 days.` |
| buttonLabel | `Open my plan` |
| footerNote | `If you did not ask for this, you can ignore this message.` |
| signature | `The Unave team` |

The template renders a greeting line of `Hi <recipientName>,` above the heading, separate from the editable copy. `recipientName` is escaped and has carriage returns and line feeds stripped. Copy fields are fixed text and take no placeholders.

**State transitions**:

None. A log row is terminal at creation. Its outcome is one of: `sent` with `zeptomail`, `sent` with `smtp` and `fallbackUsed` true, `sent` with `smtp` and false when SMTP is the only configured path, `failed` with `smtp` and the final error after both transports fail, `failed` with `none` for a refused send, or `skipped` with `none` when no transport is configured. The only related state change is `subscriptions.linkSentAt`, set once on a successful access link send and never cleared by this feature.

A request rejected before a send starts, by the test rate limit or by request validation, writes no row. A render failure counts as a refused send and writes a `failed` row with `none`.

**API surface**:

| Surface | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `sendTemplateMail` (server function) | call | templateKey, to, recipientName, data (token, name), subscriptionId | `{ status, transport, fallbackUsed, messageId }` | server only | missing token, invalid recipient, render error |
| Payload email adapter `sendEmail` | call | to, subject, html, text, replyTo, cc, bcc, from (ignored) | same result shape | server only | attachment rejected, transport failure |
| `/api/email/test` | POST | `to` | `{ status, transport }` | admin session | 400 invalid address with no row, 401, 403, 429 with no row |
| generated `/api/email-log` | GET | where, limit, page, depth fixed at 0 | rows, masked recipient for staff | staff or admin | 401, 403 |
| generated `/api/globals/email-settings` | GET / POST | copy fields | merged effective copy | GET staff or admin, POST admin | 401, 403, 400 |

Only generated Payload routes serve the collection and the global. No custom collection or global route is added, so field access and depth rules apply unchanged. The test endpoint is the one custom route, mounted with an admin session check.

The adapter forces `from` to `MAIL_FROM_ADDRESS` and the effective sender name. It honours `to`, subject, HTML, text, `replyTo`, `cc` and `bcc`. It rejects `attachments` with a `failed` `system` row, because no current message needs them and they add a size and abuse surface.

**ZeptoMail call**: a POST to `ZEPTOMAIL_API_URL` with the header `Authorization: Zoho-enczapikey <token>` and a JSON body mapping the sender, recipient, subject, `htmlbody`, `textbody` and reply address. A 2xx is success and the message id comes from the response data. Retryable: network error, the 10 second timeout, 5xx, 401, 403 and a 400 that does not name an invalid recipient. Terminal, no fallback: a format failure before the call, or a response code naming an invalid recipient. The builder confirms the exact JSON field names against the account's regional API documentation before wiring, because the zone decides both the host and the token.

**Value sourcing**:

| Action | Value produced / displayed | Source |
|---|---|---|
| send access link | raw token | caller, from `req.context.rawAccessToken` issued in spec 0001, memory only |
| send access link | link URL | `getServerSideURL()` plus the literal `/plan/` plus the raw token |
| send access link | customer name | `recipientName` input, taken from `subscriptions.customerName` by the caller |
| any send | from address | `MAIL_FROM_ADDRESS`, forced for template and system mail |
| any send | from name | `email-settings.senderName`, else `MAIL_FROM_NAME` |
| any send | reply address | `MAIL_REPLY_TO`, overridden by a caller `replyTo` on system mail |
| any send | subject, heading, intro, button, footer, signature | `email-settings.accessLink` per field, else `src/email/copy.ts` default |
| any send | recipient | `to` input, trimmed, lowercased and format checked before any transport |
| any send | masked recipient | derived from `to`: first character, three asterisks, then the domain |
| any send | template key | caller for `accessLink` and `test`, adapter for `system` |
| any send | status, transport, fallbackUsed | transport result: `sent` with the transport that accepted, `failed` with `smtp` when both paths fail, `failed` with `none` on refusal, `skipped` with `none` when no transport group is configured |
| any send | provider message id | ZeptoMail response body, or nodemailer `messageId` |
| any send | error code and message | the final transport's provider code plus a fixed message, sanitized so no body text, address or URL is stored |
| staff test | triggeredBy | `req.user.id` from the authenticated admin request |
| staff test | sample name and token | literal `Sample Customer` and `sample-token`, never a real row |
| staff test | rate limit count | count of `email-log` rows with that `triggeredBy`, `templateKey` `test`, and `createdAt` within the last hour, served by the compound index |
| access link success | linkSentAt | server time written to `subscriptions` by id, with a clean `context: {}` and no token issuance, after the caller commits |
| log read | visible recipient | field access on `recipient` (admin only) plus `recipientMasked` (staff and admin), with collection depth forced to 0 |
| prune job | cutoff | current time minus 90 days |

**Key invariants**:

- The raw token is never persisted or logged, only placed inside the link in the rendered body.
- Exactly one `email-log` row is written per logical send, including a fallback, a refusal and a skip. A request rejected before a send starts writes no row.
- On a double failure the row keeps the final transport's error code, and the message names both providers by code only.
- `email-log` rows are immutable through the API; only the module creates them, with `overrideAccess`.
- The collection runs at `maxDepth: 0`, so no relationship can leak a full address into a staff response.
- `sent` means the transport accepted the message with a 2xx, or SMTP accepted it. It does not mean delivered.
- The fallback sends the identical rendered message, subject and text.
- A failed or skipped send never throws into the caller's flow; the helper returns a result. Argument and programmer errors may throw before any transport is touched.
- A send without a raw token never reaches a transport.
- An empty copy field never produces empty output; the code default fills it.
- Subject text and recipient name are stripped of carriage returns and line feeds before use, to prevent header injection.
- Every inserted value is HTML escaped in the body and plain text rendering.
- System mail always leaves with the verified sender address, whatever `from` the caller passed.
- At most five test requests succeed per user per rolling hour.
- The sender address cannot be changed from the admin panel.

**Security model**:

`email-log` is staff and admin readable, and write denied for every role, including admin. Rows are created by the module with `overrideAccess`. The full `recipient` field is admin only at field level; staff read `recipientMasked`, and `maxDepth: 0` prevents a relationship from restoring the full value. `email-settings` is admin writable and staff readable. The test endpoint requires an authenticated admin session and is rate limited per user. The adapter ignores any caller `from` and forces the verified environment sender, so system mail cannot spoof the domain.

ZeptoMail and SMTP credentials are server environment values and never use a `NEXT_PUBLIC_` prefix. Error messages store the provider's code and a sanitized message, never the message body and never the link. The log holds a name and an email address for 90 days, which is personal data; access is limited to staff and admin. No new public endpoint is added, so the anonymous surface is unchanged. No payment or card data is involved, so PCI scope is unchanged. Bounce and complaint handling are out of scope, so a bounce is not recorded.

**Configuration required**:

- `ZEPTOMAIL_API_KEY`: ZeptoMail send token, server only.
- `ZEPTOMAIL_API_URL`: ZeptoMail endpoint, default `https://api.zeptomail.com/v1.1/email`, set the regional host (for example `https://api.zeptomail.in/v1.1/email`) when the account is in that zone.
- `MAIL_FROM_ADDRESS`: verified sender address.
- `MAIL_FROM_NAME`: default sender display name.
- `MAIL_REPLY_TO`: reply address, a real inbox.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`: the fallback relay.
- `SMTP_SECURE`: `true` for implicit TLS on port 465, otherwise false for STARTTLS.
- Existing `NEXT_PUBLIC_SERVER_URL`, read through `getServerSideURL()`, and `CRON_SECRET` for the prune call, are reused.

Update `.env.example` with every key and a short comment.

**Transport availability**: ZeptoMail is available when the key, the from address and the reply address are present. SMTP is available when host, port, user, password, the from address and the reply address are present. If only SMTP is complete, it is the sole path and `fallbackUsed` stays false. If both are complete, ZeptoMail is primary and SMTP is the fallback. If neither is complete, the send is skipped and logged, never sent without a sender. A path missing the from or reply value counts as unavailable, and its absence never causes a send from an unverified address.

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):

- Happy path: render the access link, respond 2xx from a stubbed ZeptoMail, one `sent` row with `transport: zeptomail` and `fallbackUsed: false`, link points at `/plan/<token>`, verifies **AC-1**, **AC-3**, **AC-5**
- Fallback: ZeptoMail returns 500 and the SMTP stub accepts, one `sent` row with `transport: smtp` and `fallbackUsed: true`, verifies **AC-2**
- Both fail: ZeptoMail returns 500 and SMTP refuses, one `failed` row with `transport: smtp`, the final error code, and a message naming both providers by code, verifies **AC-2**, **AC-3**
- Invalid address: the format check fails and no transport is called, one `failed` row with `transport: none` and the invalid address stored as text, verifies **AC-2**, **AC-3**
- No credentials: no network call, one `skipped` row, verifies **AC-7**
- Missing token: no transport call, one `failed` row naming the missing token, verifies **AC-11**
- Log access: staff read returns `recipientMasked` and no `recipient`, a deep read returns no populated relationship, staff write is refused, anonymous read is refused, admin read returns the full address, verifies **AC-4**
- Settings access: staff POST is refused, admin POST succeeds, empty field falls back to the code default and the panel shows the effective copy, verifies **AC-9**, **AC-5**
- Test action: an admin sends five tests, the sixth within the hour returns 429 and writes no row, each test row carries `triggeredBy` and the sample token never matches a subscription, verifies **AC-8**
- Link stamp: a successful access link send writes `linkSentAt` with a clean context, a resend call cannot rotate the token during that update, a failed send leaves the field empty, verifies **AC-6**
- Prune: a row older than 90 days is deleted by the job and a newer row survives, verifies **AC-10**
- System mail: a `payload.sendEmail` call without a template is delivered, logged as `system`, and leaves with the env sender even when the caller passes a different `from`; an attachment is rejected with a `failed` row, verifies **AC-13**
- Types: `pnpm exec tsc --noEmit` passes and the import map contains the test panel, verifies **AC-12**

## Build plan

The project approach is Tracer Bullet. The plan opens a thin thread through every layer (schema, module, adapter, one real template, one visible admin surface), proves a message end to end against a stub, then thickens with the fallback, copy settings, the test action, masking and pruning.

1. Add the `email-log` collection (recipient as text, masked field, `maxDepth: 0`, the two indexes) and the `email-settings` global (display fields, copy fields, defaults, the `afterRead` merge) with the access rules above, then apply the schema and generate types, satisfies **AC-3**, **AC-4**, **AC-9**
2. Build the mail module with the typed send function, env driven sender and reply values, the transport availability rules, the ZeptoMail `fetch` call with a 10 second timeout and the retryable classification, one log row per logical send, and the adapter that forces the sender and rejects attachments, then wire it into Payload's `email` config, satisfies **AC-1**, **AC-3**, **AC-7**, **AC-13**
3. Build the React Email access link template with the shared layout, greeting line, six copy defaults, HTML and plain text rendering, escaped values, header injection stripping, `getServerSideURL()` for the link, missing token refusal, and the `linkSentAt` update with a clean context, satisfies **AC-5**, **AC-6**, **AC-11**
4. Add the SMTP fallback with nodemailer, the invalid recipient versus retryable split, the 15 second overall deadline on top of connection, greeting and socket timeouts, transporter close, and the transport and fallback flags, satisfies **AC-2**, **AC-3**
5. Add the admin surfaces: the field level split between full and masked recipient, list columns, the settings screen with the read only sender and reply displays, and the admin only test panel with the hourly limit backed by the compound index, then regenerate the import map, satisfies **AC-4**, **AC-8**, **AC-9**
6. Add the prune job task with a daily schedule, `overrideAccess`, batched deletes and the `createdAt` index, and document the cron call to the jobs endpoint with `CRON_SECRET`, satisfies **AC-10**
7. Update `.env.example` and the README mail section, add the local React Email preview script as a dev dependency only, and run typecheck plus the integration tests, satisfies **AC-12**

## Consequences

**Positive**:
- Every message takes one path, so the log can be trusted.
- A ZeptoMail failure has an independent second route.
- Staff can answer delivery questions and prove the pipe without a developer.
- Copy changes ship without a deploy, and later features get a ready helper.

**Negative / tradeoffs**:
- Two transports and two credential sets to configure and rotate.
- React Email adds runtime packages and a render step for what starts as one template.
- A checkout that waits on a send can add up to 25 seconds in the worst case, 10 for ZeptoMail then 15 for SMTP. The alternative, a queue, was rejected for this slice, and the overall deadline is enforced by a race rather than by socket close alone.
- The log stores personal data for 90 days, and the masked field duplicates part of the recipient column.
- `sent` does not mean delivered. Bounces and complaints are invisible, so a broken address looks like success.
- The masking rule makes the log less useful to staff than the subscription record, which is a knowingly accepted inconsistency.
- Sender name has two sources, the env default and the admin override. A wrong override is only visible in a sent message.
- The five per hour test limit is a count followed by an insert, so two simultaneous requests can both pass. The window is small and the abuse value is low.
- Forcing the environment sender changes the form builder's configured `emailFrom`, which now only affects the display name at most.

**Neutral**:
- One new collection and one new global add two admin menu entries under an Email group.
- Messages from the form builder and password resets now actually leave the building, a behaviour change nobody asked for directly.
- The test action uses a sample token, so a tested link never opens a real plan.

## Follow-up

- [x] Moot: feature 5 was to build the page at `/plan/[token]`. Feature 5 was dropped on 2026-10-30 and the access link was removed with it, so no test message links anywhere.
- [ ] Feature 6 staff resend must call this helper and issue a new token through the existing `req.context.issueNewAccessToken` flag, then let this module set `linkSentAt` with a clean context. Reusing the resend request context for that update can rotate the token a second time.
- [ ] Features 4 and 6 must send only after their own subscription write commits. A send inside an open transaction can mail a link to a record that then rolls back.
- [ ] Confirm the ZeptoMail regional host, token header and JSON field names against the account documentation before wiring the API call, since the zone decides the host.
- [ ] Schedule an external cron for the prune task. A task schedule alone does not run unless jobs auto run in process or the jobs endpoint is called.
- [ ] Add ZeptoMail bounce and complaint webhooks before launch at volume, so a rejected address stops looking sent.
- [ ] Configure SPF, DKIM and DMARC for the sending domain in ZeptoMail and on the fallback relay. Delivery depends on this and it is not code.
- [ ] Revisit whether staff should see the full recipient in the log after a few weeks of real support use.
- [ ] Run `/audit` to create `AGENTS.md`; it is still missing, and this feature's area conventions belong in `src/email/AGENTS.md` once audit runs.
- [ ] Add an external alert on repeated send failures when traffic makes silent failure expensive.
- [ ] Rate limit any future public send path; the test endpoint is limited, the internal helper is not exposed.
