# UNAVE

The website for **UNAVE**, a cloud kitchen. It carries the brand pages, the blog, meal plans with online payment, customer accounts, the enquiry path, and a staff admin, all in one Next.js app.

Browsing the site and messaging the kitchen never need an account. An account saves a customer's details, and it is asked for only when someone buys a plan.

---

## Stack

| Layer | What we use |
| --- | --- |
| Framework | Next.js 16, App Router, Turbopack |
| UI | React 19, Tailwind CSS v4, shadcn/ui and Radix primitives, Lucide icons |
| CMS and admin | Payload 3.92, mounted in the same Next app |
| Database | PostgreSQL through `@payloadcms/db-postgres` (Neon in development, self hosted in production) |
| Content editing | Lexical rich text, Payload block library, live preview |
| Forms | `@payloadcms/plugin-form-builder`, React Hook Form, Zod |
| Mail | React Email templates, ZeptoMail REST as primary, SMTP through Nodemailer as fallback |
| Payments | Razorpay checkout and webhook |
| Tests | Vitest for integration, Playwright for end to end |
| Runtime | Node 22 or 24, pnpm 9 to 11 |

Plugins switched on in `src/plugins/index.ts`: redirects, nested docs (categories), SEO, search over posts, form builder.

---

## Getting started

```bash
pnpm install
cp .env.example .env      # then fill in the values below
pnpm dev
```

- Site: `http://localhost:3000`
- Admin: `http://localhost:3000/admin`. The first account you create there is the staff account.
- Database: point `DATABASE_URL` at a Postgres database. The project ships guarded migrations in `src/migrations`, applied with `pnpm payload migrate`.

### A new database

An empty Postgres database is built from the migrations, never from the dev server:

```bash
# with DATABASE_URL, PAYLOAD_SECRET and NEXT_PUBLIC_SERVER_URL set for that database
pnpm payload migrate          # apply every migration in src/migrations, in order
pnpm payload migrate:status   # show what is applied and what is still pending
```

Run `pnpm payload migrate` before the site starts serving after a deploy, and on every deploy after it. It is safe to repeat: a migration that already ran is skipped, and each one in `src/migrations` is written to survive a database that already holds part of the schema.

Two rules keep this safe:

- **Development pushes, production migrates.** A database the dev server has touched has tables but no migration history. Running `pnpm payload migrate` against it makes Payload stop and ask how to reconcile the two, and its answer can drop data. For a schema change, add a guarded SQL file to `src/migrations` and register it in `src/migrations/index.ts`; everything after the 2026-10-29 baseline is hand written that way, so `migrate:create` is not the tool here.
- **Never point `pnpm dev` at the production database.** The dev server reconciles schema on its own, outside the migration history.

After migrating an empty database, create the first staff account at `/admin`, then fill in the site chrome globals (**Site chrome**, **Email settings**) in the admin.

### Deploying

Production is Docker on one server, managed by Dokploy, with Postgres running beside the app and Neon left to development. `docker-compose.yml` holds the app, the database and a one shot migration, `docker-compose.dokploy.yml` adds the Traefik labels for Dokploy, and `docs/deploy.md` is the runbook from a bare server to `https://unave.in`.

### Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Next dev server with Payload mounted |
| `pnpm build` / `pnpm start` | Production build, then serve it |
| `pnpm generate:types` | Regenerate `src/payload-types.ts` after schema changes |
| `pnpm generate:importmap` | Regenerate the admin import map after adding admin components |
| `pnpm payload migrate` | Apply pending database migrations |
| `pnpm test:int` | Vitest integration suite |
| `pnpm test:e2e` | Playwright suite, needs the dev server running |
| `pnpm email:dev` | Preview the React Email templates |
| `pnpm lint` | ESLint |

---

## Pages

| Route | What it is |
| --- | --- |
| `/` | Home: hero, trust strip, welcome, what makes us different, the newest plans, what we cook, how it works, kitchen photographs, customer words, FAQ, closing call to action |
| `/about` | The story, what we stand for, how it works here, goals notice |
| `/our-kitchen` | Inside the kitchen: the day in five steps, ingredient preparation, how a plate is planned, hygiene standards |
| `/contact` | Ways to reach the kitchen and the enquiry form, which works without JavaScript |
| `/plans` | Meal plans, with a buy action on each card |
| `/checkout` | Sign in and pay for the chosen plan through Razorpay |
| `/order-placed/[id]` | The receipt for a paid order |
| `/blog` | The blog index, with a grid or list view and numbered paging |
| `/blog/page/[pageNumber]` | The paged blog index |
| `/blog/[slug]` | A single article |
| `/search` | Search across posts |
| `/[slug]` | A CMS page from the `pages` collection, opened by the shared green band. Holds the five policy pages: delivery, refunds, cancellation, terms, privacy |
| `/sign-in`, `/sign-up` | Customer sign in and sign up, email and password or Google |
| `/forgot-password`, `/reset-password` | Customer password recovery |
| `/verify-email` | Address confirmation after sign up |
| `/account` | The customer's account, in three tabs: details, delivery details, and paid orders with pause and cancellation requests |
| `/admin` | Payload admin, staff only |
| `/api/razorpay/webhook` | Razorpay webhook for payment confirmation |
| `/api/customers/oauth/google/callback` | Google OAuth callback |
| `/pages-sitemap.xml`, `/posts-sitemap.xml` | Sitemaps |

`/posts` and its old article and pager URLs permanently redirect to `/blog` (see `redirects.ts`).

---

## Admin

The admin is Payload, branded in `src/app/(payload)/custom.scss` and dressed with `BeforeLogin`, `BeforeDashboard`, `AdminLogo` and `AdminIcon`.

**Site chrome is content, not code.** The header (`/admin/globals/header`) owns the menu links, the primary pill and the WhatsApp button. The footer (`/admin/globals/footer`) owns the tagline, link columns, contact details, disclaimer and copyright. Changing copy never means touching a component.

**Money is stored in paise and shown in rupees.** Database fields keep the smallest unit; `RupeeField` and `RupeeCell` read and write rupees in the admin.

### Collections

| Collection | Holds |
| --- | --- |
| `pages` | CMS pages, with SEO, layout blocks and drafts |
| `posts` | Blog articles, with categories, related posts and drafts |
| `categories` | Blog categories, nested |
| `media` | Uploads, with alt text and captions |
| `users` | Staff accounts, the only identity that reaches the CMS |
| `customers` | Customer accounts, separate from staff and on its own session cookie |
| `enquiries` | Contact form submissions, written by the public endpoint and read by staff |
| `plans` | Meal plans on sale, with durations and prices |
| `orders` | Paid orders, one plan per order |
| `order-requests` | Pause and cancellation requests from customers, written by the account action and triaged by staff |
| `email-log` | One row per mail attempt, with the recipient masked |

### Globals

| Global | Holds |
| --- | --- |
| `header` | Announcement strip, menu links, primary call to action, WhatsApp button |
| `footer` | Tagline, link columns, contact block, disclaimer, copyright |
| `email-settings` | Sender name, the copy for account mail, and the test send panel |

---

## Email notifications

One module, `src/email/`, renders, sends, falls back and logs.

- Payload's mail adapter (`unaveEmailAdapter`) catches everything Payload itself sends and logs it under the `system` key.
- Code calls the senders directly: `sendCustomerAuthMail` for address confirmation and password reset, `sendOrderMail` for the buyer confirmation and the kitchen notice, `sendSystemMail` for every kitchen notice and the admin test send.
- The kitchen hears about all four public forms: a contact enquiry, a paid order, a pause or cancellation request from an order, and a form builder submission. Each notice goes to the footer contact email (Site chrome > Footer), and each submission also writes its own admin row (`enquiries`, `orders`, `order-requests`, `form-submissions`), so a skipped or failed email never loses the message. Notice failures are logged and never fail the request, the form or the order.
- Form builder submissions are mailed by an `afterChange` hook on create only, so editing a submission in the admin does not mail the kitchen again.
- ZeptoMail is tried first. A retryable failure falls back to SMTP once. Every attempt writes one row in `email-log`, and a failed send never throws into the calling flow.
- Templates are React Email files in `src/email/templates/`, rendered to HTML and plain text.
- A scheduled task, `pruneEmailLog`, trims old rows. It is protected by `CRON_SECRET`.

Detail: `docs/specs/0002-transactional-email/`.

---

## Environment

All server side, none of them prefixed with `NEXT_PUBLIC_` except the server URL.

| Variable | Used for |
| --- | --- |
| `DATABASE_URL` | Postgres connection string. In development the Neon database; in production the compose stack builds its own: `postgres://unave:password@postgres:5432/unave` |
| `PAYLOAD_SECRET` | Payload session and token signing |
| `NEXT_PUBLIC_SERVER_URL` | Canonical site URL, links, CORS, sitemaps. `http://localhost:3000` in development, `https://unave.in` in production |
| `CRON_SECRET` | Authenticating the jobs endpoint |
| `PREVIEW_SECRET` | Validating preview requests |
| `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME`, `MAIL_REPLY_TO` | Sender identity, required for any send |
| `ZEPTOMAIL_API_KEY`, `ZEPTOMAIL_API_URL` | Primary mail transport |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_SECURE` | Fallback mail transport, on a different provider |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Customer Google sign in, optional |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Plan checkout, optional |

Every optional group degrades politely: without Google credentials there is no Google button, without Razorpay keys the pay step answers with a plain sentence, and without mail settings a send is logged as skipped.

See `.env.example` for the comments on each one.

---

## Tests

```bash
pnpm test:int                                    # Vitest, no server needed
pnpm dev                                         # then, in another shell
pnpm test:e2e
```

Integration tests live in `tests/int` and cover access control, the customer auth flow and endpoints, the enquiry endpoint, plans and orders, the Razorpay webhook, mail rendering, transports, the mail log and money helpers. End to end tests in `tests/e2e` drive the site and the admin in a browser.

---

## Project structure

```
src/
  app/(frontend)/(site)/      public pages: home, about, our kitchen, contact, plans, checkout, blog, search
  app/(frontend)/             customer auth pages and verify-email
  app/(payload)/              admin, API and GraphQL routes
  app/(frontend)/(sitemaps)/  Postgres backed sitemaps
  collections/                Payload collections
  globals/                    Payload globals other than header and footer
  Header/ Footer/             site chrome globals and their renderers
  blocks/                     the block library used by pages and posts
  components/                 shared UI, home sections, blog archive, store, forms
  email/                      mail module: adapter, send, transports, templates
  auth/                       customer session and Google OAuth
  access/                     shared access rules
  migrations/                 guarded Postgres migrations
  utilities/                  copy modules, helpers, formatting
tests/int, tests/e2e          integration and browser tests
docs/                         design contract, specs, scope
```

---

## Conventions

- **Publish state gates public reads.** Content is read as staff or published, never as anyone.
- **Two identities, never one cookie.** Staff live in `users`, customers live in `customers`. A customer can never reach the CMS.
- **Money in paise, rupees on screen.**
- **Accessibility is part of done.** WCAG 2.2 AA, 44px targets, `prefers-reduced-motion` respected.
- **Claims carry a notice.** Medical, allergy, diabetes and child nutrition copy always ships with the notice block nearby.

---

## Docs worth reading first

| File | What it is |
| --- | --- |
| `docs/design/design.md` | The brand and UI contract: tokens, typography, component specs, page blueprints, copy rules |
| `docs/scope/scope.md` | The living scope: features, what is done, what is next |
| `docs/specs/` | One folder per feature, with the decisions, the acceptance criteria and the verify notes |
| `AGENTS.md` | Rules for AI agents working in this repo |

---

## Status

Built and working: content pages and the blog, the kitchen and about pages, the enquiry path, customer accounts, plans with Razorpay checkout, transactional email, and the branded admin.

Open items:

- A live Razorpay payment has not been driven with a real test card yet, and the dashboard and inbox delivery checks need a public URL and SMTP settings.
- Google sign in is code complete but has not been driven against live credentials.
- `pnpm lint` currently fails with an ESLint circular structure error in this environment.
- `tests/e2e/frontend.e2e.spec.ts` still asserts the old template heading and needs updating.
- Media is written to `public/media`, which is fine locally and needs object storage before the site runs on a serverless host.

---

## License

MIT, as declared in `package.json`.
