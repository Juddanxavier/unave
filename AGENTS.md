<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Design system

`docs/design/design.md` is the UNAVE brand and UI contract: brand green + gold tokens, Playfair Display/Inter type, spacing, radii, shadows, component specs, page blueprints and copy rules. Read it before building or restyling any frontend surface.

Hard constraints from it that override defaults:

- Never require an account, or imply one is needed, to browse the menu or place an order. Managing a plan does need an account: a customer signs in with email and password, or with Google. Customer identity lives in the `customers` collection; staff identity lives in `users`. Never put a customer in the `users` collection, and never let the two share a session cookie.
- Never use `--gold-400` as text on light backgrounds; use `--gold-600` or green.
- One primary action per section, pill-shaped buttons, CTA verbs (Start, Browse, Compare, Choose, Message).
- WCAG 2.2 AA, 44px minimum targets, `prefers-reduced-motion` respected.
- Medical, allergy, diabetes and child-nutrition claims must carry the notice block nearby.

`src/app/(frontend)/globals.css` holds the design tokens as Tailwind `@theme` variables plus the `.logo-lockup`, `.swoosh` and scrolled-header utilities.

## Site chrome

The navbar and footer are Payload globals, not code: edit them in the admin under **Site chrome** (`/admin/globals/header`, `/admin/globals/footer`). The header owns the menu links, the primary pill and the WhatsApp button; the footer owns the tagline, link columns, contact details, disclaimer and copyright. `src/Header/*` and `src/Footer/*` only render what the CMS returns, so changing copy never means touching a component.
