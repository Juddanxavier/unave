# Verify: Transactional email · spec 0002 · updated 2026-10-29
_Steps derived from spec 0002 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

Two kinds of step below. The manual steps need the admin panel or a real inbox. The value steps walk each row of the spec's Value sourcing table, and most of them need a small throwaway script that calls `sendTemplateMail` or `payload.sendEmail`, because no public route sends mail yet. Run the app with `pnpm dev` and sign in at `/admin` before starting.

Verified on 2026-10-29 with stubbed transports, since there are no live ZeptoMail or SMTP credentials yet. The panel steps were proven through the same REST endpoints and collection config, not through a browser.

## Commands

- [x] C1 `pnpm exec tsc --noEmit` → no output and exit code 0 → AC-12
- [x] C2 `pnpm generate:importmap` → the import map contains `@/components/EmailTestPanel#EmailTestPanel`, and a second run produces no diff → AC-12
- [x] C3 `pnpm test:int` → all suites pass, including the email log and access rules tests → AC-3, AC-4, AC-9
- [x] C4 With `CRON_SECRET` set, call the jobs endpoint: `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/payload-jobs/run` → 200, and the response reports the `pruneEmailLog` task ran → AC-10
- [x] C5 Call the same endpoint with a wrong secret and with no header → both refused, 403 or 401 → AC-10
- [x] C6 `POST /api/email/test` with no session → 401; with a staff session → 403 → AC-8

## Admin panel and API

- [x] U1 Sign in as staff, open Email Log → masked recipients only, and no create, edit or delete control → AC-4
- [x] U2 As staff, `GET /api/email-log?depth=2` → every row carries `recipientMasked`, none carries `recipient`, and `subscription` and `triggeredBy` come back as ids, not populated documents → AC-4
- [x] U3 As staff, `POST`, `PATCH` and `DELETE /api/email-log` → all refused → AC-4
- [x] U4 Signed out, `GET /api/email-log` → refused → AC-4
- [x] U5 As admin, `GET /api/email-log` → `recipient` present alongside `recipientMasked` → AC-4
- [x] U6 As staff, open Email Settings → fields visible, save refused; `POST /api/globals/email-settings` as staff → 403 → AC-9
- [x] U7 As admin, change the subject and the intro, save, then send a test → the mail shows the new copy → AC-5, AC-9
- [x] U8 As admin, clear one copy field and leave the others set, save, reopen → the cleared field shows its code default and the saved fields keep their values → AC-5, AC-9
- [x] U9 Send a test from the settings panel → a row appears with template key `test`, status `sent` or a documented failure, and `triggeredBy` set to you → AC-8
- [x] U10 Send five tests within an hour, then a sixth → the sixth returns 429, and no new row is written → AC-8
- [x] U11 Enter a bad address in the test panel → 400, and no row is written → AC-3
- [x] U12 Break `ZEPTOMAIL_API_KEY` while SMTP is complete, send a test → one row, `sent`, transport `smtp`, `fallbackUsed` true, and exactly one message arrives → AC-2, AC-3
- [x] U13 Break both transports, send a test → one row, `failed`, transport `smtp`, `fallbackUsed` true, and the message names both providers by code → AC-2, AC-3
- [x] U14 Remove every transport value, restart, send a test → one row, `skipped`, transport `none`, and no outbound request is made → AC-7

## Value sourcing, one step per spec row

- [x] V1 Access link send with a raw token → no field on the row, no error message and no server log line contains the token; only the rendered body holds it → AC-5
- [x] V2 Set `NEXT_PUBLIC_SERVER_URL` to a known host, send an access link, open the message → the link is that host plus `/plan/` plus the token, in HTML and in plain text → AC-5
- [x] V3 Send an access link with a customer name containing a line feed and a `<script>` tag → the greeting is cleaned of line breaks, escaped, and the subject carries no line break → AC-5
- [x] V4 Set `MAIL_FROM_ADDRESS` to a verified address different from the SMTP user, send one template message and one system message → both arrive from that address → AC-1, AC-13
- [x] V5 Set `email-settings.senderName`, send → the display name matches; clear it, send again → the name falls back to `MAIL_FROM_NAME` → AC-1
- [x] V6 Set `MAIL_REPLY_TO`, send template mail → the reply address matches; send system mail with a `replyTo` input → the reply address matches the caller's value → AC-1, AC-13
- [x] V7 Send to `  Foo@Example.com  ` → the row stores `foo@example.com` and the message arrives → AC-3
- [x] V8 Send to `priya@example.com` → the row stores `p***@example.com` → AC-4
- [x] V9 Send one access link, one test and one system message → the three rows carry `accessLink`, `test` and `system` → AC-3, AC-8, AC-13
- [x] V10 From the earlier steps, confirm the four documented outcomes on their rows: sent with `zeptomail` and false, sent with `smtp` and true, failed with `none` and false, skipped with `none` and false → AC-3, AC-7
- [x] V11 A successful ZeptoMail row carries a provider message id, and so does a successful SMTP row → AC-1, AC-3
- [x] V12 Inspect a failed row → `errorCode` is the provider code, `errorMessage` is a fixed sentence, and neither the recipient, the token nor any body text appears → AC-3
- [x] V13 Have two admins each send a test → each row names its own sender, and each admin gets a separate five per hour budget → AC-8
- [x] V14 A test message → the body greets `Sample Customer` and links to `/plan/sample-token`, and no subscription row changes → AC-8
- [x] V15 Send five tests as one admin and two as another, plus an access link and a system message, then attempt another test as the second admin → that send still succeeds, so the limit counts only rows with that `triggeredBy`, template key `test` and a `createdAt` inside the last hour → AC-8
- [x] V16 A successful access link send → `subscriptions.linkSentAt` is set, and the stored token hash is unchanged; a failed send → `linkSentAt` stays as it was → AC-6
- [x] V17 Compare a staff response and an admin response for the same row → they differ only on `recipient`, and neither carries a populated relationship → AC-4
- [x] V18 Send an access link with no raw token → a `failed` row with transport `none` and the reason recorded, and no transport is called → AC-11
- [x] V19 Send a system message with an attachment → a `failed` row under template key `system`, and no transport is called → AC-13
- [x] V20 Insert one log row dated 91 days ago and one dated 89 days ago, then run C4 → the older row is deleted, the newer one survives → AC-10

## Acceptance-criteria coverage

- AC-1 … U12, V4, V5, V6, V11
- AC-2 … U12, U13
- AC-3 … C3, U11, U12, U13, V7, V9, V10, V11, V12
- AC-4 … C3, U1, U2, U3, U4, U5, V8, V17
- AC-5 … U7, U8, V1, V2, V3
- AC-6 … V16
- AC-7 … U14, V10
- AC-8 … C6, U9, U10, V13, V14, V15
- AC-9 … C3, U6, U7, U8
- AC-10 … C4, C5, V20
- AC-11 … V18
- AC-12 … C1, C2
- AC-13 … V4, V6, V9, V19
