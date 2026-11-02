# UNAVE Cloud Kitchen — Design System (design.md)

Design guide for the UNAVE Cloud Kitchen website. Derived from the brand logo (deep forest green + warm gold, rounded sans wordmark, swan/bird swoosh mark) and the website page content (Home, Gym & Fitness, Healthy Food, Children).

---

## 1. Brand Essence

**What UNAVE is:** A cloud kitchen that cooks only healthy food: Healthy, Nutrition, Diet and Diabetes-conscious meals. Orders happen by message — WhatsApp, phone, email or the contact form — on a schedule the kitchen agrees with each customer.

**Personality:** Calm, trustworthy, fresh, warm, honest. Nothing loud, nothing clinical.

**Voice (from copy):** Plain, friendly, reassuring. Short sentences. Speaks "from one parent to another" rather than like a brand. Never makes medical or result promises ("We don't promise weight loss or muscle gain").

**Design principles**

1. **Calm over clever.** Generous whitespace, few elements per section. The brand sells relief from daily planning.
2. **Fresh and natural.** Green dominates, gold accents. Photography of real, simply cooked food.
3. **Honest and clear.** What we cook, where we deliver, terms and disclaimers are visible, never hidden. Design should make the "fine print" readable.
4. **Easy to act.** One primary action per section: *Message us on WhatsApp*. Browsing the plans and sending a message need no account and no form-fighting. Buying a plan is the one thing that asks for an account, and only at checkout, so the kitchen knows who ordered and where to deliver. Signing in otherwise buys convenience only (a saved profile, the order list), never access.
5. **Soft, rounded, friendly.** Echoes the rounded letterforms and curved swoosh of the logo.

---

## 2. Logo

- **Mark:** Gold swan/bird swoosh forming a "U" curve (the "U" of UNAVE and a bowl/plate shape).
- **Wordmark:** "UNAVE" in all caps, rounded geometric sans, wide letter-spacing.
- **Primary lockup:** Mark stacked above wordmark, gold on deep green (as supplied).
- **Horizontal lockup (header):** Mark left, wordmark right. Create from the supplied artwork.

**Usage rules**

| Rule | Spec |
| --- | --- |
| Clear space | At least the height of the "U" letter on all sides |
| Min size (mark + wordmark) | 120px wide on web, 80px for mark alone |
| Favicon / app icon | Mark only, gold on green rounded square |
| On light backgrounds | Deep green (`--green-700`) mark and wordmark |
| On dark backgrounds | Gold (`--gold-400`) mark and wordmark |
| Don't | Stretch, recolor outside the palette, add shadows or outlines, place on busy photos without a green overlay |

---

## 3. Color

### 3.1 Brand palette (sampled from logo)

| Token | Hex | Use |
| --- | --- | --- |
| `--green-700` (Brand Green) | `#1A4B36` | Primary brand, header, footer, headings on light, primary buttons |
| `--gold-400` (Brand Gold) | `#F1C361` | Accent, CTA on dark, highlights, icons |

### 3.2 Extended palette

| Token | Hex | Use |
|---|---|---|
| `--green-900` | `#0F2E21` | Footer base, deep overlays |
| `--green-800` | `#143B2A` | Hover on dark surfaces |
| `--green-600` | `#256349` | Hover on primary buttons, links |
| `--green-500` | `#3A7D5F` | Icons, secondary accents |
| `--green-200` | `#CFE3D8` | Borders on tinted sections |
| `--green-100` | `#E6F0EA` | Tinted section backgrounds, table header |
| `--green-50` | `#F3F8F5` | Subtle surfaces |
| `--gold-600` | `#B8892A` | Gold text on light (AA-safe) |
| `--gold-500` | `#D9A93F` | Gold hover on dark |
| `--gold-300` | `#F6D88F` | Soft highlight |
| `--gold-100` | `#FCF1D6` | Notice/disclaimer background |
| `--cream` | `#FAF7EF` | Page background (warm off-white) |
| `--white` | `#FFFFFF` | Cards |
| `--ink-900` | `#1B2620` | Body text |
| `--ink-600` | `#4A5A52` | Secondary text |
| `--ink-400` | `#7C8A83` | Captions, placeholders |
| `--line` | `#E4E0D2` | Dividers and card borders |

### 3.3 Semantic colors

| Purpose | Color |
| --- | --- |
| Success (saved, sent) | `#2E8B57` on `#E6F4EC` |
| Error | `#B3261E` on `#FBE9E7` |
| Warning / medical note | `#8A5A00` on `--gold-100` |
| Info | `--green-700` on `--green-100` |

### 3.4 Category colors (four food types)

Subtle tints for category cards and tags. Always pair color with an icon and label.

| Category | Accent | Tint |
| --- | --- | --- |
| Healthy food | `#3A7D5F` | `#E6F0EA` |
| Nutrition food | `#D9A93F` | `#FCF1D6` |
| Diet food | `#5B8C85` | `#E4F0EE` |
| Diabetes-conscious | `#8A6D3B` | `#F4EBDD` |

### 3.5 Contrast rules

- Gold `#F1C361` on green `#1A4B36` is about 6:1. Use for text and buttons on dark.
- **Never use gold as text on white or cream.** Use `--gold-600` or green.
- Body text: `--ink-900` on cream or white.
- Minimum WCAG AA (4.5:1 body, 3:1 large text and UI).

### 3.6 Background rhythm

Alternate sections to keep pages calm and scannable:

1. Hero: deep green with gold CTA
2. Cream
3. White / green-50
4. Cream
5. Green-100 (notice or highlight)
6. Final CTA: deep green
7. Footer: `--green-900`

---

## 4. Typography

The logo uses a rounded geometric sans. Headings deliberately contrast with it: an editorial serif reads richer and more considered than a rounded sans at display sizes.

| Role | Font | Fallback |
| --- | --- | --- |
| Headings | **Playfair Display** (600, 700, italic), high-contrast serif | `"Playfair Display", Georgia, serif` |
| Body / UI | **Inter** (400, 500, 600) or Nunito Sans | `system-ui, -apple-system, "Segoe UI", sans-serif` |
| Wordmark | Use supplied logo artwork only, never retype | n/a |

Load via Google Fonts with `display=swap`. Include real fallback stacks.

### Type scale (desktop / mobile)

| Style | Size | Line height | Weight | Notes |
| --- | --- | --- | --- | --- |
| Display (hero H1) | 60px / 36px | 1.08 | 700 | Letter-spacing -0.02em. One phrase may be italic |
| H1 | 44px / 32px | 1.15 | 700 | Letter-spacing -0.015em |
| H2 | 34px / 26px | 1.2 | 700 | Section titles, letter-spacing -0.01em |
| H3 | 22px / 20px | 1.35 | 600 | Card titles |
| Lead / hero sub-line | 20px / 17px | 1.55 | 400 | `--ink-600` or cream on green |
| Body | 17px / 16px | 1.65 | 400 | Max width 65ch |
| Small / caption | 14px | 1.5 | 500 | |
| Button | 16px | 1 | 700 | Not uppercase |
| Eyebrow / label | 13px | 1.2 | 700 | Uppercase, 0.12em tracking, gold-600 |

**Rules**

- Sentence case everywhere. Reserve ALL CAPS for the wordmark and eyebrow labels.
- Hero headlines can emphasize one phrase in gold (e.g. "planned for your *whole month*").
- Keep line length 45 to 75 characters.

---

## 5. Layout and Spacing

**Grid:** 12 columns, max container 1200px, 24px gutters (16px mobile). Content-heavy text blocks max 720px.

**Spacing scale (4px base):** 4, 8, 12, 16, 24, 32, 48, 64, 96, 128.

| Context | Value |
| --- | --- |
| Section vertical padding | 96px desktop / 56px mobile |
| Card padding | 24px to 32px |
| Gap between cards | 24px |
| Heading to paragraph | 16px |
| Paragraph to paragraph | 16px |

**Breakpoints:** 480 (small phone), 768 (tablet), 1024 (laptop), 1280 (desktop). Design **mobile-first**; most users arrive from WhatsApp and phone links.

**Radius:** Soft and rounded to echo the logo.

| Token | Value | Use |
| --- | --- | --- |
| `--r-sm` | 8px | Inputs, tags |
| `--r-md` | 16px | Cards |
| `--r-lg` | 24px | Hero image, large panels |
| `--r-pill` | 999px | Buttons, chips |

**Elevation (soft, green-tinted):**

- `--shadow-sm`: `0 1px 3px rgba(26,75,54,.08)`
- `--shadow-md`: `0 8px 24px rgba(26,75,54,.10)`
- `--shadow-lg`: `0 16px 40px rgba(26,75,54,.14)`

---

## 6. Components

### 6.1 Buttons

| Variant | Light bg | Dark (green) bg |
| --- | --- | --- |
| **Primary** | bg `#1A4B36`, text cream, hover `#256349` | bg `#F1C361`, text `#1A4B36`, hover `#D9A93F` |
| **Secondary** | 2px green border, green text, hover green-50 | 2px gold border, gold text, hover rgba(gold, .12) |
| **Text link** | Green, underline on hover, arrow icon | Gold |

- Pill shape, 52px tall (44px min on mobile), padding 0 28px.
- Focus ring: 3px `--gold-400` with 2px offset (on light: 3px `--green-500`).
- One primary button per section. Pair with one secondary.
- **WhatsApp actions.** Every "message the kitchen" button opens WhatsApp through one helper, `whatsappHref` in `src/utilities/whatsapp.ts`, which reads the number from the footer global, sends digits only to `wa.me`, and prefills the opening line. The button carries the filled WhatsApp glyph (`WhatsAppIcon`, in `src/components/WhatsAppIcon`) and reads **Message us on WhatsApp**. When the footer holds no number yet, the button falls back to the contact page and reads **Message us**.
- **Standard CTA labels (from copy):** Message us on WhatsApp, Message us, Contact us, Talk to us, Ask us a question, How it works, Common questions.

### 6.2 Header / Navigation

- Sticky, and transparent while the page sits at the top: the band that opens a page runs up behind it, so the bar has no fill of its own there and its words turn cream and gold over a dark band, or stay green over cream. Once the page scrolls it becomes a solid `--green-700` bar with a gold wordmark, gold links, cream text and a 1px `--green-800` bottom edge. A page that opens on a photograph or a green field marks that band `.opening-band` (`src/app/(frontend)/globals.css`), which pulls the band up behind the bar and hands the bar's own height back as padding, so nothing inside the band moves.
- Above it, a slim `--green-900` announcement strip: gold headline, cream supporting line, underlined gold link. The whole strip is one link, and it pins together with the bar so the bar sits directly under it.
- Left: horizontal logo. Center/right: the menu links from the **Site chrome** header global — today Home · About · Contact, six at most. **About** also sits in the footer's Explore column; the header and footer are Payload globals, so the live list is whatever they hold.
- Right: primary pill button from the header global (its label and link are CMS copy), plus the account links: signed out, a quiet **Sign in** (icon only on the narrowest screens) and a **Sign up** beside it from the `sm` breakpoint up. Signed in, that control becomes an account menu — the customer's first name (or **Your account** when Payload holds no name) plus a chevron that turns when the menu is open, opening a small panel that names who is signed in and carries **Your account** and **Sign out**. These are code, never CMS copy, because they reflect session state; the primary pill stays the only primary action. Sign out is a quiet form post to `/api/customers/logout`, so it also works without JavaScript and revokes the session row.
- The menu is keyboard complete: ArrowDown/ArrowUp move between items, Home and End jump, Escape closes and returns focus to the trigger, Tab leaves, and a pointer down outside closes it.
- Mobile: hamburger opens a full-height green drawer, gold links, large tap targets (56px). Keep the CTA pinned at the bottom. The account links repeat at the end of the drawer: **Sign in** and **Sign up** signed out, **Your account** and **Sign out** signed in, one 56px row each.
- Add a floating **WhatsApp** button (bottom-right) for "send us a message and we'll help you choose".

### 6.3 Hero

- Deep green background, subtle large faint swoosh from the logo mark as a decorative element (8% opacity gold).
- Left: H1 (cream, key phrase in gold), sub-line (cream at 85%), two buttons.
- Right: rounded (24px) food photo, plate shot from above, natural light.
- Page-specific hero imagery: Home (a full-day meal set), Gym (training bag + meal box), Healthy (colorful balanced plate), Children (tiffin box, friendly and bright).
- Four icon chips under the buttons, not a bare text row: *Fresh daily · Small batches · No account needed · Home-style cooking* (see `HERO_CHIPS` in `src/utilities/homeCopy.ts`).

### 6.4 Category cards (four food types)

- 4-up grid desktop, 2-up tablet, 1-up mobile (horizontal swipe optional).
- Card: white, 16px radius, 1px line border, tinted icon circle (category tint), H3 title, 2 to 3 line description.
- **Diabetes-conscious card** carries a small inline note: *"Food option, not medical advice."*
- Hover: lift 4px, `--shadow-md`.

### 6.5 Tables (routine, situation and how-it-fits tables from the copy)

- Header row `--green-100`, bold green text. Row dividers `--line`. Zebra optional (`--green-50`).
- 16px radius on the wrapper, `overflow-x: auto` on mobile.
- **On mobile, convert to stacked cards** (label above value) rather than horizontal scroll where there are 3 or fewer columns.

### 6.6 How-it-works steps

Four steps: Tell us what you need → We plan the week → We cook and deliver → Say if it changes.

- Desktop: horizontal numbered timeline (2x2 grid acceptable). Mobile: vertical with a connecting line.
- Number in a gold circle with green numeral; title bold; one-line description.

### 6.7 "What makes us different" list

- Six reasons, numbered 01–06. The heading sits above the grid, then one card per reason on the tinted band (`bg-green-50`): white card, 16px radius, 1px `--line` border, `--shadow-sm`, three across on desktop, two on tablet, one on mobile. Inside, the numeral in a 44px gold chip (`--gold-100`, `--gold-600` numeral), the bold title, then the one-line body. The numeral is a reading aid and stays out of the accessibility tree; the list carries the order. The copy lives in `src/utilities/homeCopy.ts` (`BENEFITS`).

### 6.8 FAQ accordion

- Question in H3 style, chevron icon right. Open state: green-50 background. First item open by default.
- Smooth 200ms height transition. Keyboard accessible (`button` with `aria-expanded`).

### 6.9 Notice / disclaimer block

Used for medical, allergy, diabetes, child nutrition and goal disclaimers, wherever a claim is made.

- Background `--gold-100`, 4px left border `--gold-500`, 16px radius, info icon.
- Title in bold ("A note on your goals", "Important, from one parent to another").
- Text size at least 16px. **Never use tiny grey print.**

### 6.10 Forms (profile and enquiry)

Fields: Name, Phone, Email (+ message for enquiries); address lines 1 and 2, city, state, pincode and food preference for the account's delivery details.

- Labels above inputs, 16px; inputs 52px tall, 8px radius, 1.5px `--line` border, focus 2px green + soft ring.
- Inline validation, plain-language errors ("Please enter a 10-digit mobile number").
- Address and phone are required on save (never store half an address); the food preference is optional and explains itself in one line under the field.
- Every public form posts without JavaScript: a plain HTML form, server-side validation, and errors answered with one plain sentence.

### 6.11 Final CTA band

- Deep green, centered H2 (cream), one line of copy, gold primary + outlined secondary button.

### 6.12 Footer

- `--green-900`, logo in gold, short tagline, columns: Explore (About us, How it works, Common questions), Policies (Delivery, Refunds, Cancellation, Terms, Privacy), Contact (phone, email, WhatsApp, address).
- Small line: *"Our meals are food options and are not a substitute for medical or nutritional advice."*
- Policies must be a visible footer group (the copy promises published terms).

### 6.13 Sign-in and account pages

Utility screens, not campaign pages. The four account screens drop the site header and footer and fill exactly one viewport with no page scroll, so the menu, the pill and the WhatsApp button do not compete with a password field; the content pages keep them. They reuse the Card, Button and list primitives.

**Sign in (`/sign-in`), Sign up (`/sign-up`), Forgot password (`/forgot-password`), Reset password (`/reset-password`)**

All four share one standalone frame and fill exactly one viewport: the page itself never scrolls (`h-dvh`, `overflow-hidden`). A slim cream bar at the top carries the green logo, linked home, and one quiet *"Back home"* link, then a split panel fills the rest — a `--green-900` brand half beside the white form half, 32px radius, `shadow-md`, capped at `max-w-5xl`, vertically centred. The brand half carries the eyebrow *"Your account"*, the Playfair line *"Your details, always in reach"*, one paragraph of context and three short reassurance points, with the swoosh cropped at low opacity behind them. It is desktop only (`lg` and up): on a phone the form takes the whole height, because a panel above it would push the submit button below the fold. The form shrinks with the screen rather than scrolling: two height variants, `short` (under 54rem tall) and `shorter` (under 44rem), drop the fields from 52px to 44px, tighten the gaps, the divider and the card padding, and step the heading from `h2` to `h3`. If even that cannot fit — a phone in landscape, say — the form column scrolls on its own rather than the page, so nothing becomes unreachable. The site header and footer are deliberately absent — the slim bar replaces the header's real job, the way back home.

- The split panel is presentational only. It is never the way into anything: the form is. Its headline is a `p`, not a heading, so each screen's real `h1` stays first in reading order.
- Exactly one primary action per section: the email and password form. Its submit button is a pill at least 44px tall, and it is the only primary control in the form half.
- Fields carry a leading Lucide icon in `--ink-400` — mail on the address, lock on the password — and every password field carries a show/hide toggle: a 44px button, `aria-pressed`, with a label that changes between *"Show password"* and *"Hide password"*.
- Google is the second way in: a **Continue with Google** button carrying the four-colour Google mark, styled `secondary` and sitting below an "or" divider, so the frame never shows two competing primaries. When `GOOGLE_CLIENT_ID` is unset the button is replaced by one plain line saying which way in is available.
- Both sign-in and sign-up render the same form. Only the copy differs — signing in with Google creates the account if it does not exist, so the two screens are one flow seen from two directions. Sign-in is headed *"Your account, in one place"* and says *"Sign in to keep your details with us and to reach the kitchen faster."*; sign-up is headed *"One account with the kitchen"* and says the account saves your delivery details and food preference for next time. The brand half's title is *"Your details, always in reach"* (copy in `src/components/CustomerAuth/copy.ts`).
- Sign-up carries one extra field: a native `<select>` labelled **Food preference (optional)** — no preference, vegetarian, vegan, eggetarian, non-vegetarian — with one line under it explaining the kitchen reads it and it can be changed later on the account page. It is a native select, not the Radix one, because this form must keep posting without JavaScript. Sign-in never shows it.
- Password rules are stated up front rather than revealed as errors: a hint under the password field reading *"At least 10 characters."* on both account screens, and again on reset.
- One quiet line below the form: *"We use your email address to keep your account and to send you messages about your orders. Nothing else."*
- Each account screen links to the other with one quiet line — *"New to UNAVE? **Sign up**"* and *"Already have an account? **Sign in**"* — so neither is a dead end.
- A forgotten password is one quiet link opposite the password label on sign-in: *"Forgot your password?"*.
- Errors are one plain line above the form, never a full red banner: *"That sign-in didn't finish. Please try again."* Use the neutral error tone, not the destructive color on a button, because nothing was destroyed. Every failure lands on `/sign-in`, whichever screen started the attempt, because signing in works for a customer who has never signed in before.
- Field errors are the exception: a rejected email or short password is reported under the field it belongs to, in `--error`, with `role="alert"` and `aria-invalid`, and the field border and focus ring repaint. The rules are one shared Zod schema (`src/auth/password/schema.ts`) used by both the browser and the Payload endpoints, so the two can never disagree about what is acceptable. The form carries `noValidate`, so the browser's own `required` and `type="email"` checks cannot swallow the submit event and hide Zod's messages; a field is also re-checked when it loses focus, and its message clears as soon as the value changes.

**Account (`/account`)**

- Heading *"Your account"*, with one line of context: *"Your details, in one place, and how to reach the kitchen."*
- Two columns from `lg`: the main column carries the **Account details** card — name, email, sign-in method and the member-since date, plus one quiet line telling a Google-only customer to use *"Forgot your password?"* to set a password — and a 20rem sidebar carries a **Need a hand?** card linking to *About the kitchen* and *Message us*.
- **Sign out** is not on this page. It lives in the header's account menu, so there is one control in one place rather than two competing ones.
- Below the two columns, one full-width **Delivery details** card: phone number, address lines 1 and 2, city, state and pincode, then a **Food preference** select beside the pincode. Address and phone are required on save (never store half an address); the preference is optional and explains itself in one line under the field. One **Save details** primary action, per-field errors under the field they belong to from the shared Zod schema (`src/utilities/customerProfile.ts`), and one quiet green *Saved* line when it lands ("Saved. We use these details when you order."). Autofill uses the standard `tel`, `address-line1`, `postal-code` hints.

These screens are `noindex, nofollow` and are never cached.

### 6.14 About and contact pages

**About (`/about`)** — static content in a server component, copy in `src/utilities/aboutCopy.ts`:

- Hero: the deep green band with swoosh, gold-accented headline, one CTA to `/contact`, three trust chips. The kitchen photograph (`/images/kitchen.jpg`) runs full-bleed behind it under a `green-900/85` scrim — the same treatment as the home CTA band — and loads with `priority` as the page's one above-the-fold image.
- Story: `Why we started UNAVE`, three short paragraphs on a cream band, with the morning-prep photograph beside them from `lg` up (rounded 16px, real alt text — it is content, not decoration; the hero band photos stay decorative with empty alts because the words carry the meaning). Because the story mentions cooking around diabetes, the gold notice block (§6.9, shared `Notice` component) sits directly below it.
- Values: `What we stand for`, four icon cards on the tint band.
- How we work: three numbered steps on white, ending on the promise that a person who cooks here answers.
- Final CTA band: green, one primary (`Message us on WhatsApp`) and one secondary (`Message us`).

**Contact (`/contact`)** — `force-dynamic` (it reads the query string for the form's answer), copy in `src/utilities/contactCopy.ts`:

- Hero: the same green band; when the footer global holds a WhatsApp number, the hero carries one gold **Message us on WhatsApp** button — the page's connect action. The CTA-band photograph (`/images/band-cta.jpg`, the home closing band's image) sits behind it under the same `green-900/85` scrim, `priority` loaded.
- **Ways to reach us**: up to three cards (WhatsApp, Call the kitchen, Email) built from the footer global's contact group — the same place the footer's contact column reads, so the kitchen edits the details once. Each card is one large link showing the raw number or address, a plain note, and a verb CTA line (`Message us on WhatsApp`, `Call the kitchen`, `Write to us`). Only configured ways render; with none the whole section disappears and the form is the way. The address, if set, is a quiet line under the cards.
- **Send a message**: the enquiry form (§6.10 fields: name, phone optional, email, message), a plain HTML `method="post"` form that works without JavaScript. Labels above inputs; the auth screens' field styles. One primary action (`Send message`). Under it: *"We use these details only to answer you, and never pass them on."*
- The form's honeypot is visually hidden and skipped by keyboard and screen readers; a script that fills it gets the success redirect and sends nothing.
- On `?sent=1` the form section is replaced by the confirmation state: `Thank you — we have it`, the reply promise, and the WhatsApp CTA again. On `?error=` the form renders one plain sentence (`contactError` maps the endpoint's codes), never a field-by-field wall.

Enquiries are stored in the `enquiries` collection (staff read in the admin, one row per message, an `Answered` checkbox to triage) and the kitchen is emailed through `sendSystemMail` with the enquirer's address as reply-to. A failed or unconfigured mail never fails the enquiry.

### 6.15 Store (plans, checkout, orders)

Added with the plans and payments feature (spec 0007). Copy lives beside each page (`plansCopy.ts`, `checkout/copy.ts`, `order-placed/copy.ts`); money is always shown through the shared `formatPaise` paise formatter, never hand formatted. The store pages read live data on every request, so nothing in this section is ever cached.

- **Plans (`/plans`)** — the deep green hero band with swoosh, gold-accented headline, and one primary pill (*Browse the plans*, anchored to the grid). The grid is white pricing cards (24px radius, 1px line, `shadow-sm`, lifting 4px into `shadow-md` on hover), and the card leads with the price rather than a photo: the plan title, its description, up to five check-marked points, then the chosen duration's per day price in Inter bold with a quiet *a day* beside it and the total in one line under it. Inter rather than Playfair here because Playfair's rupee glyph collides with the digits at display size. One native radio chip per duration follows, each carrying its label and total price, so every duration and price renders without JavaScript; the chosen chip fills `--gold-400` with `--green-900` text, the one gold-filled control allowed on a light card. Under the chips sits one full width **Buy now** pill, which submits the chosen duration to `/checkout` with the plan, then a secondary **Message us on WhatsApp** pill carrying the WhatsApp glyph and linking to the footer's WhatsApp number, so a card never dead ends. Buying is one plan at a time; there is no cart. A paused plan renders with a small gold **Paused** pill above the title, its durations in a quiet list with prices, no buy or message control, and one quiet line pointing to messaging; the gold notice block (§6.9) sits under the grid explaining what *paused* means. The plan photo stays in the admin but is not used on the shelf, because the price is what a customer compares. The empty state is one quiet card with a **Message us on WhatsApp** secondary action, never a dead end. A three-step *How a plan works* list sits on the tint band, and the closing band carries the final CTA.
- **Checkout (`/checkout`)** — `noindex, nofollow`, signed in customers only; the guard carries the full plan link through sign in. Two columns from `lg`: the form (name, phone, address, city, state, pincode, food preference, optional note) prefilled from the saved profile but editable for this order alone, and a summary card listing the one plan, its duration and the **To pay** total. One primary action: **Pay for the order**, which opens the Razorpay popup. A link naming an unknown or paused plan, or a duration that left the menu, shows one plain sentence and a **Browse the plans** pill, never an empty form. Gateway messages appear as one plain line in the gold tone, never a red banner.
- **Order placed (`/order-placed/[id]`)** — `noindex, nofollow`, owner only. The green check icon and *Your order is confirmed* lead, with one honest sentence about what happens next. The order card lists the snapshot plan and duration, the amount, a green **Paid** pill and the payment id as the receipt. Back to the account is a quiet link, *Browse the plans* the primary. An order row exists only once a payment is captured, so this page has no pending state.
- **Account orders list** — a *Your orders* card in the account's main column, newest first. Each row: the amount, a green **Paid** pill, the plan and duration as one plain sentence, the payment id, and the delivery start date once the kitchen sets one. The row links to the order page.

### 6.16 Admin panel (Payload)

The admin is a staff tool rather than a customer surface, and it wears the brand without pretending to be the site. It is themed in one file, `src/app/(payload)/custom.scss`, by overriding Payload's own variables instead of rewriting its components:

- **Colour** — Payload's neutral `--color-base-*` scale becomes the UNAVE warm greys, from cream white at `0` to green black at `1000`. Payload reverses that one scale for dark mode, so light and dark are branded by the same definition. Green carries `success`, gold carries `warning`, and errors stay a warm brick that reads on white and on deep green.
- **Type** — Inter and Playfair Display load through `next/font` in `AdminFonts` (an `admin.components.providers` entry) and point Payload's `--font-body` and `--font-serif` at the site's two typefaces.
- **Shape** — `--style-radius-s/m/l` are 6/10/16px, tighter than the site's pills, because the admin is a working tool.
- **Brand moments** — sign in is the deep green band with a gold-edged card and the Playfair wordmark, the sidebar is green tinted with uppercase groups and a gold bar on the active item, and enabled primary buttons are green in light mode and gold in dark. The dashboard opens with a short UNAVE welcome and four desk links (Orders, Enquiries, Plans, Customers) rather than Payload's template instructions.
- **Money** — staff read and type rupees. `RupeeField` (with `RupeeCell` for list columns) shows rupees and still stores paise, so the database and the gateway are never touched.

## 7. Iconography and Illustration

- **Style:** Rounded line icons, 2px stroke, round caps and joins (Lucide or Phosphor "regular").
- **Colors:** Green strokes on light, gold on dark, optional tinted circle (48px) behind.
- **Meal slot icons:** Sun/sunrise (Breakfast), bowl or plate (Lunch), moon (Dinner), all three together (Full-day).
- **Category icons:** Leaf (Healthy), apple or wheat (Nutrition), clipboard-plate (Diet), drop with check (Diabetes-conscious). Avoid medical symbols such as stethoscopes or syringes.
- **Decorative motif:** The logo swoosh, used large, cropped, at low opacity behind hero and CTA bands. Also used as a soft section divider curve.

---

## 8. Photography and Imagery

- Natural light, top-down and 45° shots, simple ceramic or steel tiffin ware, real Indian home-style food (dal, rice, sabzi, millets, salads, idli, etc.). Fresh, not styled to the point of fake.
- Warm color grading that harmonizes with green and gold. Avoid cold blue tones.
- Show **portions that look satisfying**, not tiny "diet" plates.
- Children page: bright, friendly, tiffin box on a school table; if people appear, use real-looking families. No close-up faces of minors without proper consent.
- Gym page: meal box beside a gym bag or dumbbell. No body-transformation or before/after imagery (the copy promises no specific results).
- All images: WebP/AVIF, `loading="lazy"` below the fold, explicit width/height, meaningful `alt` text.
- Overlay `rgba(15,46,33,.55)` when text sits on photos.

---

## 9. Motion

- Subtle and quick: 150 to 250ms, `ease-out`. Cards lift on hover, buttons darken, accordions slide.
- Section reveal: fade up 12px on scroll, once.
- Hero swoosh: slow 12s gentle float (optional).
- Respect `prefers-reduced-motion`: disable all non-essential animation.

---

## 10. Page Blueprints

### 10.1 Home

1. Hero: "Good food, cooked in our own kitchen." + Message us on WhatsApp / How It Works, with four icon chips under the buttons
2. Trust strip (five claims: delivery, kitchen, FSSAI, home-style cooking, one focus)
3. Welcome to UNAVE (two short paragraphs + kitchen photo)
4. What makes us different (six numbered items)
5. What we cook (4 category cards + the goals notice)
6. How it works (4 steps)
7. From our kitchen (3 photos with captions)
8. What customers say (3 quotes; placeholders until real, attributed words exist)
9. Common questions (5 FAQs)
10. Final CTA: Message us on WhatsApp / Common Questions

### 10.2 Brand-source pages (Gym & Fitness, Healthy Food, Children)

The brand copy source describes three more pages. None of them is built. If one is added later, start from its blueprint in the brand source document and strip every ordering, plan or payment reference — the site takes orders by message.

### 10.3 Supporting pages

Sign in, Sign up, Forgot password, Reset password, Account, Contact, Policies (Delivery, Refund, Cancellation, Terms, Privacy). The header and footer still promise a menu page that does not exist yet (deferred in the scope).

### 10.4 Blog

1. Index (`/blog`) and its paged URLs: the shared green band hero, then the range line (*Showing 1 to 12 of 15 blog posts*), the Grid / List switch whose choice is a query string (`?view=list`) so it can be shared and survives without JavaScript, then the cards three-up, two-up, one-up, or one per row in list view, then the numbered pager: first, last, the current page and one either side, each a 44px target, the current page set as text rather than a link.
2. Article (`/blog/[slug]`): the green band hero, carrying the post's categories as the eyebrow, the title in Playfair and the byline, on the post's own photograph under a green-900 scrim, and running up behind the transparent navbar. Below it the post's photograph again, this time as the article's picture, 3:2 at 48rem with real alt text, then the body and the related posts. A post with no photograph still gets the band, just without the picture.

### 10.5 Our kitchen

`/our-kitchen`, a static content page in the same voice as the about page, with every string in `src/utilities/ourKitchenCopy.ts`:

1. The shared green band (§6.3): eyebrow "Inside our kitchen", a Playfair headline with the gold accent phrase, one lead line, then Message us on WhatsApp with Browse the plans as the quiet second action, and three small icon chips under them.
2. What happens before your meal reaches you: five numbered steps in the How-it-works rail (§6.6), fresh produce in, washed and cut, cooked in batches, portioned and packed, checked and dispatched.
3. Clean ingredients, careful preparation: three photographs at 4:3, each with real alt text and its caption set under the picture rather than on it.
4. How we plan a plate: four points in two columns, each with a hairline `--line` rule above it, followed by the gold goals notice (§6.9), because the copy names diabetes, allergies and food preferences.
5. Hygiene is part of every step: four icon cards in green-100 circles, the same shape as the about page values.
6. The closing green band (§6.11): Message us on WhatsApp as the primary, Browse the plans as the secondary, on the swoosh.

---

## 11. Content and Tone Rules for UI Copy

- Write like a helpful neighbor: short, warm, specific.
- Say what's included and what isn't. Be upfront about limits ("we'll tell you honestly what we can and cannot do").
- **Never claim to treat, cure, or guarantee** results. Diabetes-conscious and children content must always carry the medical disclaimer nearby.
- Avoid hype words: "miracle", "detox", "burn fat", "guaranteed".
- Prefer plain Indian-English food terms (tiffin, home-style, sabzi) where natural.
- Buttons use verbs: Start, Browse, Compare, Choose, Message.

---

## 12. Accessibility

- WCAG 2.2 AA minimum.
- All interactive elements at least 44x44px; visible focus on every control.
- Semantic HTML landmarks (`header`, `nav`, `main`, `footer`), one `h1` per page, logical heading order.
- Do not rely on color alone for categories, state or errors.
- Form fields have associated labels, `aria-describedby` for errors, correct `autocomplete` attributes (`name`, `tel`, `email`, `street-address`).
- Tables use `th` with `scope`; accordions use proper ARIA.
- Text resizable to 200% without breaking layouts.
- Respect `prefers-reduced-motion` and `prefers-color-scheme` (light theme is the default; dark mode is optional and should use `--green-900` surfaces with cream text).

---

## 13. Performance and Technical Notes

- Mobile-first, target LCP under 2.5s on 4G (many users are on mid-range Android phones in India).
- Self-host or preload the two font families, with only the weights used.
- Inline critical CSS for the hero; lazy-load images below the fold.
- No account, no app install: the enquiry form is one short form that posts without JavaScript.
- SEO: unique `title` and meta description per page, `Restaurant`/`FoodEstablishment` and `FAQPage` structured data, Open Graph image using the logo on green.

---

## 14. Design Tokens (CSS)

```css
:root {
  /* Brand */
  --green-900: #0F2E21;
  --green-800: #143B2A;
  --green-700: #1A4B36;
  --green-600: #256349;
  --green-500: #3A7D5F;
  --green-200: #CFE3D8;
  --green-100: #E6F0EA;
  --green-50:  #F3F8F5;

  --gold-600: #B8892A;
  --gold-500: #D9A93F;
  --gold-400: #F1C361;
  --gold-300: #F6D88F;
  --gold-100: #FCF1D6;

  /* Neutrals */
  --cream:   #FAF7EF;
  --white:   #FFFFFF;
  --ink-900: #1B2620;
  --ink-600: #4A5A52;
  --ink-400: #7C8A83;
  --line:    #E4E0D2;

  /* Semantic */
  --success: #2E8B57;
  --error:   #B3261E;
  --warning: #8A5A00;

  /* Type */
  --font-heading: "Playfair Display", Georgia, serif;
  --font-body: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;

  /* Shape */
  --r-sm: 8px;
  --r-md: 16px;
  --r-lg: 24px;
  --r-pill: 999px;

  /* Elevation */
  --shadow-sm: 0 1px 3px rgba(26, 75, 54, .08);
  --shadow-md: 0 8px 24px rgba(26, 75, 54, .10);
  --shadow-lg: 0 16px 40px rgba(26, 75, 54, .14);

  /* Spacing */
  --space-1: 4px;  --space-2: 8px;   --space-3: 12px;
  --space-4: 16px; --space-5: 24px;  --space-6: 32px;
  --space-7: 48px; --space-8: 64px;  --space-9: 96px;
}
```

### Tailwind mapping (optional)

```js
// tailwind.config.js
theme: {
  extend: {
    colors: {
      green: { 50:'#F3F8F5',100:'#E6F0EA',200:'#CFE3D8',500:'#3A7D5F',600:'#256349',700:'#1A4B36',800:'#143B2A',900:'#0F2E21' },
      gold:  { 100:'#FCF1D6',300:'#F6D88F',400:'#F1C361',500:'#D9A93F',600:'#B8892A' },
      cream: '#FAF7EF',
      ink:   { 900:'#1B2620',600:'#4A5A52',400:'#7C8A83' },
    },
    fontFamily: {
      heading: ['Playfair Display','Georgia','serif'],
      body: ['Inter','system-ui','sans-serif'],
    },
    borderRadius: { sm:'8px', md:'16px', lg:'24px' },
  },
}
```

---

## 15. Do and Don't

**Do**

- Keep green and gold as the only brand colors; let cream and white give breathing room.
- Show delivery areas and policies clearly and early.
- Place medical disclaimers where the claim is made.
- Use real food photography and rounded shapes.

**Don't**

- Use bright reds/oranges typical of fast-food branding; this is the opposite of UNAVE's positioning.
- Show calorie-counting or "before/after" imagery.
- Put gold text on light backgrounds.
- Hide refund or delivery information.
- Require an account, or imply that one is needed, to browse the site or to send a message. Signing in is optional and only ever saves a customer's details. The one exception is paying for a plan: checkout asks the customer to sign in, and `/plans` and every page before it must never say or imply otherwise.
- Use stock medical imagery for the diabetes-conscious category.

---

## 16. Open Items to Confirm with the Client

1. Exact brand fonts, if any (the logo wordmark is rounded sans; Playfair Display is the current heading choice, chosen for contrast against it).
2. Delivery areas and timings.
3. Photography source (shoot vs. licensed) and menu dish list.
4. Whether to include a Hindi/Tamil language toggle.
5. Allergy handling process, to be stated on the menu page.
