# Marketing Site Blueprint — pages, URLs, what goes on each

**Status: BLUEPRINT for section C (founder-directed 2026-08-21). Sections A–B are BUILT.** The
founder's own ideas land on this map before anything in section C is coded.

## A · What EXISTS today (live on staging, public, indexed)

| URL | Page | What's on it | State |
|---|---|---|---|
| `/` | Home | Hero, product story, verdict spectrum, dashboard/report previews (synthetic fixture by ruling), FAQ, CTA | ✅ built |
| `/how-it-works` | How it works | The process, submission → research → founder review → verdict; scroll narrative | ✅ built |
| `/pricing` | Pricing | The four tiers ($149 + Scale shown "coming soon" until Keepa lands), plan comparison, CTA | ✅ built |
| `/sample-report` | See a real report | The whole deliverable, anonymized vendor — structure, voice, checklist, limits | ✅ built |
| `/how-to-read` | How to read a report | The four verdicts, five assessment areas, Verified/Assessed/Not-assessed — every sentence imported from the report's own copy modules | ✅ built 2026-08-21 |
| `/partners` | For agencies & VAs | The check-before-you-recommend pitch; grant invite links land here with context (?invited=1&code=…) | ✅ built 2026-08-21 |
| `/unsubscribe` | Email preferences | Tokenized marketing unsubscribe (permanent URL — must exist before any campaign) | ✅ built |
| Footer signup box | Consent capture | "Notes on sourcing" newsletter box → marketing_contacts | ✅ built |

## B · The legal set — BUILT 2026-08-21 from the LOCKED copy (HyprrIQ_LEGAL_PAGES_FINAL.md)

| URL | Page | State |
|---|---|---|
| `/terms` | Terms of Service | ✅ transcribed verbatim — PERMANENT path (Stripe points at it) |
| `/privacy` | Privacy Policy | ✅ transcribed verbatim — PERMANENT path (Stripe points at it) |
| `/data-policy` | Data Protection & Retention | ✅ transcribed verbatim |
| `/refund-policy` | Refund & Cancellation | ✅ transcribed verbatim |
| `/payment-policy` | Payment Policy | ✅ transcribed verbatim |
| `/cookie-policy` | Cookie Policy | ✅ transcribed verbatim |

All six in the footer bottom bar on every page, in the sitemap, in PUBLIC_ROUTES. One effective-
date constant (`LEGAL_EFFECTIVE_DATE`, lib/content/legal.ts). Cookie notice (not a consent
banner) mounted at the root. Acceptance lines at sign-up and checkout.

## C · PROPOSED additions (founder to keep, cut, or reshape — nothing here is started)

| URL | Page | Why it earns a place |
|---|---|---|
| `/about` | About | Tracker 2.7 already names it. Who runs this, why it exists, the founder-reviews-every-report fact — the trust page a $499 buyer looks for. |
| `/faq` | Public FAQ | The portal help FAQ already has the answers (authorization limits, credits, change requests) — a public surface for the same questions prospects ask pre-purchase; overlaps SEO long-tail. |
| `/contact` | Contact | Currently a `mailto:`. A page gives it a URL for footers, invoices, and legal pages to point at. |
| `/blog` + `/blog/[slug]` | Blog | The ADR already assumes Sanity-published posts feed campaigns. Needed for content marketing, not for launch. |
| `/vs/...` or `/alternatives` | Comparison pages | SEO plays for later — only if the founder wants that lane at all. |

## D · Principles already in force (carry into anything new)

- Every marketing page is in `PUBLIC_ROUTES` — the lock test refuses a marketing page behind auth
  (the /sample-report defect class, caught twice now).
- Client-visible product claims come from the canonical copy modules, never re-typed
  (`reportCopy.ts`, `help.ts`, `plans.ts` price labels). The how-to-read page is the pattern.
- Legal copy is LOCKED — transcribed, never edited; wording concerns go to reports.
- No dead links, no "coming soon" hrefs (founder-ruled 2026-08-08).
- $149/Scale stay "coming soon" until Keepa; grant copy says "full assessment," never "Scale."
- Sitemap + OG + robots already plumbed — new pages register in `app/sitemap.ts`.

**Next step: the founder's own ideas land on section C → the map is amended → then build + deploy.**
