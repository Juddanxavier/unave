# 0006. About and contact pages

**Date**: 2026-10-31
**Status**: In Progress

**Amended 2026-10-31**: the plans and checkout system was removed from the site. The about page now hands over to the contact page instead of a plans catalogue, and its closing band says "Message the kitchen". The enquiry pipeline in this spec is unchanged.

## Summary

Two public pages complete the site's supporting set: `/about`, which tells the story of the kitchen and hands over to the plans, and `/contact`, which gathers every way to reach the kitchen in one place and carries the site's first public write path — an enquiry form that stores a row and emails the kitchen, all without JavaScript.

## Requirements

**User stories**:

- As a visitor deciding whether to trust this kitchen, I want to read who cooks and how, so the plans stop being an anonymous form.
- As a visitor with a question, I want WhatsApp, phone and email in one place, so I can reach out the way I prefer.
- As a visitor who prefers to write, I want to send a message from the page and be told it arrived.
- As staff, I want every enquiry as a row I can read and mark answered, so a broken mail transport loses nothing.
- As the kitchen, I want the enquiry email to arrive with the person's address as reply-to, so answering it is just answering mail.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):

- **AC-1**: `/about` is a static server component whose copy and image paths live in `src/utilities/aboutCopy.ts`. It renders, in order: the green hero band (swoosh, gold-accented headline, one primary CTA to `/plans`, three trust chips) with the kitchen photograph full-bleed behind it under a `green-900/85` scrim and `priority` loading; the story section with the morning-prep photograph beside the text from `lg` up (rounded 16px, real alt text via `ABOUT_STORY_IMAGE_ALT` — the band photos stay decorative with empty alts) and the gold notice block (§6.11, now a shared `Notice` component) directly below it because the story mentions cooking around diabetes; four value cards on the tint band; three numbered "how it works" steps on white; and a green final CTA band with exactly one primary (`See the plans`) and one secondary (`Message us` → `/contact`). Metadata carries `alternates.canonical: '/about'`. No medical, cure or guarantee language anywhere; the notice block is the only place health is spoken about.

- **AC-2**: `/contact` is `force-dynamic` because it reads the query string for the form's answer, with `alternates.canonical: '/contact'`. Its hero carries the CTA-band photograph behind the copy under the same scrim, `priority` loaded, and a gold `Message us on WhatsApp` button (`https://wa.me/<number>`, `target="_blank"`, `rel="noopener noreferrer"`) when the footer global holds a WhatsApp number, and no button when it does not. A **Ways to reach us** section renders at most three large link cards — WhatsApp, Call the kitchen (`tel:` with non-digits stripped, exactly as the footer builds it), Email (`mailto:`) — each showing the raw number or address, a plain note and a verb CTA line. The cards read the footer global's contact group through `getCachedGlobal('footer', 1)`, the same source the footer chrome reads, so the kitchen edits the details once. Only configured ways render; when none are set the section disappears and the form is the only way. A configured address is a quiet line under the cards.

- **AC-3**: the enquiry form is a plain HTML `method="post"` form posting urlencoded to `POST /api/enquiries/send`, so it works without JavaScript. Fields: name (required, `autocomplete="name"`, ≤80), phone (optional, `autocomplete="tel"`, ≤20), email (required, `type="email"`, ≤254), message (required, ≤2000). The browser's `required` and `type=email` checks are the first gate; the server applies the same rules through `enquirySchema` (`src/collections/Enquiries/schema.ts`, client-safe Zod, no Payload imports). The endpoint requires a same-origin POST, answers a filled honeypot (`website` field, visually hidden, `tabIndex={-1}`) with the success redirect while storing and sending nothing, rate limits at 5 accepted posts per IP per hour (`error=slow`), and answers every exit with a `303` to `/contact` carrying either `sent=1` or one error code: `name`, `email`, `phone`, `message`, `slow`, `session` (cross-site), `tryagain` (write failure). The page renders one plain sentence per code via `contactError()`, and on `sent=1` replaces the form section with the confirmation state (`Thank you — we have it`) and the WhatsApp CTA again.

- **AC-4**: an `enquiries` collection stores each accepted message: `name`, `email`, `phone`, `message`, and a `handled` checkbox (label `Answered`, sidebar, default false) for triage. Public REST `create` is off (`create: () => false`); only the endpoint writes, with `overrideAccess: true`. Read, update and delete are `isAdmin`; the admin group is `Customers`, `useAsTitle` is `email`, default columns are `name, email, phone, handled, createdAt`. The guarded migration `20261031_150000_enquiries` creates the table and is registered in `src/migrations/index.ts`.

- **AC-5**: on success the endpoint emails the kitchen through `sendSystemMail` (template key `system`, so the send lands in the existing email log). The recipient is the footer global's contact email; with none set the notice is skipped with a warning and nothing else changes. The reply-to is the enquirer's address. The subject is `New enquiry from <name>`; the text and minimal HTML body carry name, address, phone (or "not given") and the message, with HTML escaped. A failed or skipped send never fails the enquiry — the row is the record and the admin is the backup inbox — and a transport-less site logs `enquiry_notice_skipped`, not an error.

- **AC-6**: the no-JS form plumbing the password endpoints carried privately — `seeOther`, `backWithError`, `readFormFields` (urlencoded bodies, which Payload's helper does not read) and `isSameOriginPost` — moves to `src/utilities/formPost.ts`, and `src/auth/password/endpoints.ts` imports it, so there is one implementation for both the auth forms and the enquiry form.

## Value sourcing

| Value | Source |
| --- | --- |
| Contact details (phone, email, WhatsApp, address) | the footer global's contact group; the page and the footer chrome read the same cached global |
| Ways to reach us | derived from which of those fields are filled; the section exists only when at least one is |
| Enquiry storage | the `enquiries` collection, one row per message |
| Kitchen notification | `sendSystemMail`, recipient from the footer global, reply-to the enquirer |
| Form rules | `enquirySchema`, shared by any future browser pass and the endpoint |
| Form plumbing | `src/utilities/formPost.ts`, shared with the password endpoints |

## Copy table

| Surface | Copy |
| --- | --- |
| Contact hero headline | `Talk to us` + accent `we read everything` |
| Hero WhatsApp button | `Message us on WhatsApp` |
| Ways heading / intro | `Ways to reach us` / `Any one of these is fine. WhatsApp is usually the quickest; the form suits a longer question.` |
| Card titles | `WhatsApp`, `Call the kitchen`, `Email`; notes and CTA lines in `contactCopy.ts` |
| Form heading / intro | `Send a message` / `Tell us what you need, and we will come back to you.` |
| Submit / privacy line | `Send message` / `We use these details only to answer you, and never pass them on.` |
| Confirmation | `Thank you — we have it` / `Your message is with the kitchen. We usually reply within a day, and sooner on WhatsApp.` |
| Error lines | one plain sentence per code in `contactError()`, e.g. `Please check the phone number — at least 10 digits.` |
| About hero | `Food from a kitchen,` + accent `not a factory`; CTA `See the plans` |
| About sections | `Why we started UNAVE`, `What we stand for`, `How it works here`, `A note on your goals`, `Come and eat with us` |

## Test scenarios

- Enquiry endpoint int suite (`tests/int/enquiry-endpoint.int.spec.ts`): a valid post stores the row, emails with the enquirer as reply-to and confirms; cross-site refusal before any read; honeypot answers success and stores nothing; each field's validation code; an enquiry stands without a phone; a failed notice still confirms; the sixth post inside an hour is slowed; the notice email escapes markup.
- Auth endpoint int suite re-run: the password endpoints answer exactly as before the `formPost.ts` extraction.
- E2E (`tests/e2e/about-contact.e2e.spec.ts`, written but not executed in this environment — no browsers installed): about renders hero, story, notice, values and CTA; contact renders hero button, ways cards, labelled fields and the hidden honeypot; the form posts and confirms; `?error=slow` renders its sentence.
- Live: both pages render; a real POST returns `303 /contact?sent=1`; invalid and cross-site posts return their codes; the ways section appears only with configured details.

## Build plan

- [x] 1. Extract the shared no-JS form plumbing into `src/utilities/formPost.ts` and point the password endpoints at it, satisfies **AC-6**
- [x] 2. Add the `enquiries` collection, its schema, its guarded migration and the rate limit, satisfies **AC-4**
- [x] 3. Build the enquiry endpoint with same-origin, honeypot, validation, rate limit, write and notice mail, satisfies **AC-3**, **AC-5**
- [x] 4. Build the contact page: hero with the WhatsApp connect button, ways-to-reach-us cards from the footer global, the plain form, the confirmation and error states, satisfies **AC-2**, **AC-3**
- [x] 5. Build the about page and the shared `Notice` component, satisfies **AC-1**
- [x] 6. Int tests for the endpoint and the notice email, e2e for both pages, and the design contract's §6.18, satisfies **AC-1**–**AC-6**

## Consequences

- The `/contact` and `/about` code routes shadow any CMS page with the same slug — static segments beat the `[slug]` catch-all, the same trade `/plans` already made.
- The About page is linked from the header nav (**About**) and the footer's Explore column (**About us**). Both are Payload globals: the seed's defaults gained the links, and the dev database's globals were updated to match.
- The dev database's footer contact group holds placeholder details (the seed leaves it empty for the business); they are edited in the admin under **Site chrome → Footer → Contact details**.
- The e2e contact-form test leaves one enquiry row named `E2E Enquiry` per run; the int suite deletes its own rows.
- A server-rendered `unstable_cache` read only sees out-of-band database writes after `.next` is removed; edits made through the admin revalidate in-process and need nothing.
- Follow-up: if the kitchen wants enquiries triaged beyond the `Answered` checkbox (assignment, replies from the admin), grow the collection then; the endpoint and the page do not change.
