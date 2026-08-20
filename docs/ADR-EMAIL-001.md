# ADR-EMAIL-001: The email system — transactional in-repo, marketing in a tool, one layout, one send record

**Status:** Proposed (founder sign-off = the design preview approval)
**Date:** 2026-08-20
**Deciders:** Founder

## Context

Five transactional senders exist in `lib/email/notify.ts` — delivery (with PDF), submission,
admin alert, operator invitation, support dual-send — all key-safe and gated, all bare inline
HTML with no shared appearance. The founder's brief: nine transactional emails, one shared
layout nothing may bypass, idempotency stated per trigger class, marketing strictly separated
onto its own tool and sending domain, consent capture built now because it cannot be
reconstructed later. This project has paid four times for copies that drift (`AREA_NAMES`);
the architecture below is shaped by that.

## Decision — the transactional pipeline

```
trigger ─▶ template (React Email, imports EmailLayout) ─▶ render to HTML string
        ─▶ banned-language email gate (scans the RENDERED string — the gate-reach argument)
        ─▶ idempotency check (email_log dedup_key)
        ─▶ Resend send ─▶ email_log write (the send record, both types)
```

- **One layout.** `lib/email/templates/EmailLayout.tsx` — text wordmark header (no image:
  the design must survive images-off), body, ONE action button, shared footer (Hyprr Retail
  LLC · Terms · Privacy · support contact). Every template imports it; what varies is the
  words and the button, nothing else.
- **The palette is IMPORTED, not approximated:** `PALETTE_COLOUR` from
  `lib/pdf/reportTemplate.ts` — the deliverable's own navy/ink/soft/copper. One correction to
  "match the report and the portal": the report navy (#122E4A) and the portal brand navy
  (#173e63) are two different navies; the email accompanies the deliverable, so it wears the
  REPORT palette. Two near-identical navies side by side is the drift class in colour form.
- **Email-client constraints honoured:** table layout via React Email primitives, inline
  styles only, email-safe font stacks (Georgia for display — the serif register of the report's
  Fraunces without a webfont; system sans for body), single 600px column, readable at phone
  width, meaningful with images blocked (there are none).
- **The lock:** a source-scan test fails any `notify.ts` sender that builds HTML without
  rendering an `EmailLayout`-importing template — a quick one-off cannot exist quietly.
- **Content rules unchanged and re-asserted per template:** no verdict content, no
  delivery-time promise beyond the 24h SLA, every string through the banned-language fixtures.
  Transactional emails carry NO unsubscribe link (it invites unsubscribing from paid
  deliverables and is not required for transactional mail).

## Decision — idempotency, per trigger class

| Class | Emails | Guard |
|---|---|---|
| Stripe-driven | payment-failed, cancellation | Two layers. (1) Same-event retries are already dropped by the webhook's `stripe_events.processed` early-return — the send lives inside that guarded handler. (2) Distinct events for the same fact dedup via `email_log` `dedup_key` = `payment_failed:{invoice_id}` / `cancelled:{subscription_id}` — unique-violation = already sent = skip silently. |
| App-driven | welcome, submitted, delivered, support-ack, invitation | Welcome is the only new risk: it sends ONLY on the create path (insert-returning, not the upsert's every-visit path) + `dedup_key = welcome:{user_id}` as the belt. The four existing sends keep their existing idempotency (submit: one audit-checked send per case; delivery: the render job's idempotent per-attempt step; support/invitation: explicit one-time actions) and gain `email_log` rows. |
| Scheduled | low-credit (at 1, again at 0), renewal reminder | The dangerous class. `dedup_key = low_credit_{threshold}:{client_id}:{billing_cycle_anchor}` — one send per threshold per cycle BY CONSTRUCTION, not by cooldown arithmetic; a daily job can fire forever and the unique key absorbs it. Renewal reminder: same shape, `renewal:{subscription_id}:{period_end}`. **Verdict on the reminder earning its place: yes, but only the pre-renewal one** — it doubles as the CAN-SPAM-adjacent "you are about to be charged" courtesy that cuts disputes; a generic "engagement" reminder does not earn a send. |

**The send record:** `email_log` (exists, zero rows, no writers) becomes the ledger for BOTH
email types. It needs one founder-run migration: add `dedup_key text` + a partial unique index
`(template, dedup_key) where dedup_key is not null`, and widen `template` usage by convention.
Every sender writes it via one internal `logSend()` seam in `notify.ts`.

## Decision — marketing: the app collects, a tool sends. Confirmed.

```
visitor ─▶ signup box (marketing site) ─▶ POST /api/newsletter
        ─▶ marketing_contacts row {email, consent_status, consent_ts, source, unsubscribe_status}
        ─▶ (launch: CSV export → tool)  (later: tool API push)

Sanity blog post published ─▶ YOU compose a campaign in the tool (its editor, its list)
        ─▶ tool sends from mail.hyprriq.com ─▶ tool records opens/clicks/unsubscribes
        ─▶ periodic sync of unsubscribes back into marketing_contacts (export at launch volume)
```

- **The app NEVER sends a campaign.** It owns the signup box, the consent record, and a
  permanent unsubscribe route (`/unsubscribe?token=…`, tokenized per address, sets
  `unsubscribe_status` irreversibly). That's the whole app-side surface.
- **A blog post does not auto-email.** Publishing in Sanity and mailing the list are two
  deliberate acts; the tool is where "send this post to the list" happens (most tools can
  ingest the post URL or RSS; automation of that is a tool feature to enable later, not app code).
- **The CRM question:** at this stage the marketing tool IS the prospect CRM — list, tags,
  source, campaign history live there; paying clients already live in our `clients` table with
  their full case history. Do not buy a separate CRM now; revisit when a human does outbound
  sales. The one join we maintain: `marketing_contacts.source` records where every address came
  from, so a future CRM import has provenance.
- **Separate sending domain** `mail.hyprriq.com` for the tool; transactional stays on the root
  domain via Resend. Reputation isolation is the point: a spam complaint against a campaign
  must never bounce a report delivery.
- **Tool choice deferred** (founder-ruled) — the consent table is tool-agnostic by design.

## Decision — virus scanning (provider changed by founder ruling)

Cloudmersive, blocking at upload. **Env shape: one variable — `CLOUDMERSIVE_API_KEY`**
(sent as the `Apikey` header to `https://api.cloudmersive.com/virus/scan/file`). No URL or
secondary var needed. Key-safe like every sibling: absent key = uploads refuse with a plain
"scanning unavailable" message (fail CLOSED — an unscanned file never enters the bucket),
scan verdict audited either way, infected refusal returns a plain client-facing message.

## Options considered (the load-bearing one)

**Templates.** React Email in-repo (chosen: versioned; the banned-language gate scans the
rendered string; brand tokens imported not approximated) vs Resend dashboard templates
(rejected: outside the gate's reach entirely — disqualifying) vs external builder (rejected:
a vendor for nine emails).

## Consequences

- Easier: one appearance to maintain; every send leaves a ledger row; consent evidence exists
  from day one; marketing can never contaminate transactional reputation.
- Harder: `email_log` migration is founder-run and BLOCKS emails 4–7 (the ledger is their
  idempotency); template edits now involve JSX rather than string edits.
- Revisit: tool choice + unsubscribe sync cadence when the list is worth sending to; RSS
  automation for Sanity posts; renewal-reminder copy once the deletion policy exists
  (cancellation email BLOCKS on that policy by founder ruling).

## Action items

1. [ ] Design preview: EmailLayout + delivery notification as browser-openable HTML → founder approves
2. [ ] Wire layout into the five existing senders; lock test lands in the same commit
3. [ ] Migration (founder-run, described-and-stopped): `email_log.dedup_key` + unique index; `marketing_contacts`
4. [ ] Emails 1, 4, 6, 7 (welcome, payment-failed, low-credit, renewal); 5 waits on the deletion policy
5. [ ] Signup box + `/api/newsletter` + `/unsubscribe` route
6. [ ] Cloudmersive wiring on key arrival (`CLOUDMERSIVE_API_KEY`)
