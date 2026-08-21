# Marketing Site Blueprint â€” pages, URLs, what goes on each

**Status: BLUEPRINT ONLY (founder-directed 2026-08-21). No code until the founder adds their own
ideas on top of this and says build.** This is the inventory of what already exists plus the
proposed full map, so the founder's ideas land on a concrete structure rather than a blank page.

## A Â· What EXISTS today (live on staging, public, indexed)

| URL | Page | What's on it | State |
|---|---|---|---|
| `/` | Home | Hero, product story, verdict spectrum, dashboard/report previews, announcement bar, FAQ, CTA | âœ… built |
| `/how-it-works` | How it works | The process, submission â†’ research â†’ founder review â†’ verdict; scroll narrative | âœ… built |
| `/pricing` | Pricing | The four tiers ($149 + Scale shown "coming soon" until Keepa lands), plan comparison, CTA | âœ… built |
| `/sample-report` | See a real report | The whole deliverable, anonymized vendor â€” structure, voice, checklist, limits | âœ… built |
| `/how-to-read` | How to read a report | The four verdicts, five assessment areas, Verified/Assessed/Not-assessed â€” every sentence imported from the report's own copy modules | âœ… built 2026-08-21 |
| `/unsubscribe` | Email preferences | Tokenized marketing unsubscribe (permanent URL â€” must exist before any campaign) | âœ… built |
| Footer signup box | Consent capture | "Notes on sourcing" newsletter box â†’ marketing_contacts | âœ… built |

## B Â· REQUIRED before launch (blocked on founder copy, structure ready to build)

| URL | Page | What goes on it | Blocked on |
|---|---|---|---|
| `/terms` | Terms of Service | The service contract; the verdict-is-not-a-guarantee framing; refund window; change-request policy | ✅ BUILT 2026-08-21 (locked copy transcribed) |
| `/privacy` | Privacy Policy | What we collect, processors (Clerk, Stripe, Supabase, Resend, Cloudmersive), rights | ✅ BUILT 2026-08-21 (locked copy transcribed) |
| `/data-policy` | Data & Retention Policy | The ruled retention table verbatim (uploads 12mo Â· reports while active +30d post-closure Â· case records 180d Â· account 30d post-closure Â· transactions 7y); deletion is permanent; the 30-day warning email | ✅ BUILT 2026-08-21 (locked copy transcribed) |
| `/refund-policy` | Refund Policy | The locked 14-day window and its terms | ✅ BUILT 2026-08-21 (locked copy transcribed) |

Footer's Company column re-gains Terms/Privacy/Data links when these land (removed 2026-08-08
under the no-dead-links rule).

## C Â· PROPOSED additions (founder to keep, cut, or reshape â€” nothing here is started)

| URL | Page | Why it earns a place |
|---|---|---|
| `/about` | About | Tracker 2.7 already names it. Who runs this, why it exists, the founder-reviews-every-report fact â€” the trust page a $499 buyer looks for. |
| `/faq` | Public FAQ | The portal help FAQ already has the answers (authorization limits, credits, change requests) â€” a public surface for the same questions prospects ask pre-purchase; overlaps SEO long-tail. |
| `/contact` | Contact | Currently a `mailto:`. A page gives it a URL for footers, invoices, and legal pages to point at. |
| `/blog` + `/blog/[slug]` | Blog | The ADR already assumes Sanity-published posts feed campaigns. Needed for content marketing, not for launch. |
| `/grant/[token]` | Invite-link landing | The acquisition grant's front door: "You've been invited â€” one full assessment, free" (never the tier name), register â†’ auto-applied. Phase 2 of the grant build; listed here so the URL is part of the map. |
| `/vs/...` or `/alternatives` | Comparison pages | SEO plays for later â€” only if the founder wants that lane at all. |

## D Â· Principles already in force (carry into anything new)

- Every marketing page is in `PUBLIC_ROUTES` â€” the lock test refuses a marketing page behind auth
  (the /sample-report defect class, caught twice now).
- Client-visible product claims come from the canonical copy modules, never re-typed
  (`reportCopy.ts`, `help.ts`, `plans.ts` price labels). The how-to-read page is the pattern.
- No dead links, no "coming soon" hrefs (founder-ruled 2026-08-08).
- $149/Scale stay "coming soon" until Keepa; grant copy says "full assessment," never "Scale."
- Sitemap + OG + robots already plumbed â€” new pages register in `app/sitemap.ts`.

**Next step: the founder's own ideas land on this map â†’ the map is amended â†’ then build + deploy.**

