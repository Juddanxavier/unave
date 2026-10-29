# Rationale: Reliable transactional email with ZeptoMail and an SMTP fallback

**Spec**: [index.md](index.md)

## Context

The site has no mail configuration. Payload falls back to its console adapter, which prints messages and sends nothing. That is fine for a content site. It stops being fine the moment a guest checks out, because spec 0001 deliberately keeps the raw access token in memory only: the link cannot be recovered from the database, so a message that never leaves the building means a customer who can never open their plan.

Scope feature 2 fixes the primary vendor: ZeptoMail, with SMTP as a fallback. The feature ships the send path, the access link template, a log, and a staff test action. It does not send from inside checkout, because checkout does not exist yet. Feature 4 will call it, and feature 6 will reuse it for a staff resend.

Three forces shape the design. First, a failed mail must be visible to the people who run the service, not buried in server output. Second, the fallback must be a genuinely separate path: an SMTP relay on a different provider, not the same vendor under a different protocol. Third, the access link is a credential, so the raw token must never be written to a log row, an error message, or a server log line.

The build runs on a small team, at low volume, on Postgres and Node. There is no queue and no worker today. The design stays inside that reality.

## Options considered

### Option 1: One mail module wired into Payload's email adapter, ZeptoMail REST primary, SMTP fallback, stored log

A typed module owns rendering, transport choice, fallback and logging. Payload's `email` config points at an adapter that delegates to it. The access link template is a React Email component, copy lives in a global, and every attempt lands in a collection.

**Pros**:
- One path for every message, so the log is complete.
- Independent fallback, and a staff visible failure record.
- Later features call one helper instead of reimplementing transport logic.

**Cons**:
- Two transports and two sets of credentials to operate.
- React Email adds a render dependency and a preview tool.
- The log stores personal data for 90 days and needs pruning.

### Option 2: Payload's nodemailer adapter pointed at ZeptoMail SMTP only

Configure the stock Payload adapter with ZeptoMail's SMTP credentials. No custom module, no fallback, no log.

**Pros**:
- Smallest possible build, a config block and nothing else.
- Password resets and form notifications start working immediately.

**Cons**:
- A ZeptoMail outage stops all mail with no second path.
- Nothing in the admin panel shows what was sent or why it failed.
- The access link cannot use an HTML template with editable copy unless one is built anyway.

### Option 3: ZeptoMail REST primary and SMTP fallback, failures in server logs only

Same transport design as Option 1, but no `email-log` collection and no settings global. Failures go to Payload's logger and copy lives in code.

**Pros**:
- Less schema, no personal data stored beyond the subscription.
- Fewer admin surfaces to build.

**Cons**:
- Staff cannot answer "did this customer get their link" without a developer and log access.
- The scope's done condition is "every failure is logged", and a log nobody can query weakly satisfies it.
- Copy changes need a deploy, against the chosen requirement.

## Rationale

The decisive force is that the raw token exists only in memory (spec 0001). Delivery is not a nice extra, it is the only way the credential reaches the guest, so "the provider was down" must have a second path and a visible record. A fallback on the same vendor over SMTP would be cheaper to configure but shares the failure domain, which defeats the purpose.

Wiring into Payload's adapter rather than calling a private utility keeps one mail path. Form notifications and staff password resets already exist in this codebase and currently go nowhere. Routing them through the same module costs almost nothing and makes the log trustworthy.

React Email was the engineer's choice. For a single template I would have picked plain functions with a shared layout, because it is less machinery. React Email is still defensible here: component level composition and a local preview are real benefits once a second and third template arrive with reminders and cancellations. The cost is two runtime packages plus a dev preview tool, accepted knowingly.

The mask on the recipient field is a deliberate friction. Staff can already see a customer's email on a subscription, so masking the log adds a computed field without changing what staff can learn. The engineer chose it for tidiness of the log surface, and the spec records the cost rather than arguing it away.
