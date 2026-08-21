# Marketing Site Blueprint — pages, URLs, what goes on each

**Status: BLUEPRINT ONLY (founder-directed 2026-08-21). No code until the founder adds their own
ideas on top of this and says build.** This is the inventory of what already exists plus the
proposed full map, so the founder's ideas land on a concrete structure rather than a blank page.

## A · What EXISTS today (live on staging, public, indexed)

| URL | Page | What's on it | State |
|---|---|---|---|
| `/` | Home | Hero, product story, verdict spectrum, dashboard/report previews, announcement bar, FAQ, CTA | ✅ built |
| `/how-it-works` | How it works | The process, submission → research → founder review → verdict; scroll narrative | ✅ built |
| `/pricing` | Pricing | The four tiers ($149 + Scale shown "coming soon" until Keepa lands), plan comparison, CTA | ✅ built |
| `/sample-report` | See a real report | The whole deliverable, anonymized vendor — structure, voice, checklist, limits | ✅ built |
| `/how-to-read` | How to read a report | The four verdicts, five assessment areas, Verified/Assessed/Not-assessed — every sentence imported from the report's own copy modules | ✅ built 2026-08-21 |
| `/unsubscribe` | Email preferences | Tokenized marketing unsubscribe (permanent URL — must exist before any campaign) | ✅ built |
| Footer signup box | Consent capture | "Notes on sourcing" newsletter box → marketing_contacts | ✅ built |

## B · REQUIRED before launch (blocked on founder copy, structure ready to build)

| URL | Page | What goes on it | Blocked on |
|---|---|---|---|
| `/terms` | Terms of Service | The service contract; the verdict-is-not-a-guarantee framing; refund window; change-request policy | founder's legal copy |
| `/privacy` | Privacy Policy | What we collect, processors (Clerk, Stripe, Supabase, Resend, Cloudmersive), rights | founder's legal copy |
| `/data-policy` | Data & Retention Policy | The ruled retention table verbatim (uploads 12mo · reports while active +30d post-closure · case records 180d · account 30d post-closure · transactions 7y); deletion is permanent; the 30-day warning email | founder's legal copy |
| `/refund-policy` | Refund Policy | The locked 14-day window and its terms | founder's legal copy |

Footer's Company column re-gains Terms/Privacy/Data links when these land (removed 2026-08-08
under the no-dead-links rule).

## C · PROPOSED additions (founder to keep, cut, or reshape — nothing here is started)

| URL | Page | Why it earns a place |
|---|---|---|
| `/about` | About | Tracker 2.7 already names it. Who runs this, why it exists, the founder-reviews-every-report fact — the trust page a $499 buyer looks for. |
| `/faq` | Public FAQ | The portal help FAQ already has the answers (authorization limits, credits, change requests) — a public surface for the same questions prospects ask pre-purchase; overlaps SEO long-tail. |
| `/contact` | Contact | Currently a `mailto:`. A page gives it a URL for footers, invoices, and legal pages to point at. |
| `/blog` + `/blog/[slug]` | Blog | The ADR already assumes Sanity-published posts feed campaigns. Needed for content marketing, not for launch. |
| `/grant/[token]` | Invite-link landing | The acquisition grant's front door: "You've been invited — one full assessment, free" (never the tier name), register → auto-applied. Phase 2 of the grant build; listed here so the URL is part of the map. |
| `/vs/...` or `/alternatives` | Comparison pages | SEO plays for later — only if the founder wants that lane at all. |

## D · Principles already in force (carry into anything new)

- Every marketing page is in `PUBLIC_ROUTES` — the lock test refuses a marketing page behind auth
  (the /sample-report defect class, caught twice now).
- Client-visible product claims come from the canonical copy modules, never re-typed
  (`reportCopy.ts`, `help.ts`, `plans.ts` price labels). The how-to-read page is the pattern.
- No dead links, no "coming soon" hrefs (founder-ruled 2026-08-08).
- $149/Scale stay "coming soon" until Keepa; grant copy says "full assessment," never "Scale."
- Sitemap + OG + robots already plumbed — new pages register in `app/sitemap.ts`.

**Next step: the founder's own ideas land on this map → the map is amended → then build + deploy.**
