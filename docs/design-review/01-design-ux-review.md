# HyprrIQ — Design & UX Review (2026-07-06)

Read-only review of the full product surface: marketing website, auth, client portal, admin portal, plus a from-scratch design for the not-yet-built agency portal. Benchmarked against premium B2B SaaS standards (Mercury, Ramp, Stripe, Linear) and judged against the positioning lens: **premium supplier-intelligence firm for growing Amazon wholesale sellers protecting hard-won capital** — never "agency," never "AI tool," outputs shown, method never exposed.

Companion documents:
- `02-brand-design-system.md` — palette, typography, tokens, verdict semantics
- `03-content-package.md` — copy rewrites, SEO/content plan, auth copy
- `04-implementation-guide.md` — gated, step-by-step build instructions for Opus
- `mockups/*.html` — standalone previews of every redesigned/new screen

---

## 0. Executive summary — what kind of redesign this needs

**Verdict: unified refinement, not a ground-up redesign.** The locked design direction (DESIGN.md, 2026-06-17 "Synthesis") is genuinely strong: warm-neutral light base, single deep-blue brand, four matched-weight verdict colors as the loudest moment, Schibsted Grotesk / Hanken Grotesk / Geist Mono. The marketing site executes it at roughly 80% of premium standard. Throwing that away would be a mistake — it's a real identity, and identity preservation beats novelty.

What the product actually needs is **the same system executed to the same standard everywhere**:

1. **Marketing site** — targeted upgrades (trust infrastructure, missing pages, social proof), not a rebuild. ~85% keep.
2. **Auth** — small polish. ~90% keep.
3. **Client portal** — **significant visual and UX upgrade** on the existing skeleton: replace the emoji icon system, make it responsive, and above all redesign the **report view** so the delivered artifact looks like the premium Decision Snapshot the marketing site promises. ~50% redesign (visual layer), 100% preserve (data wiring, states, flows).
4. **Admin portal** — efficiency-at-scale upgrade: queue redesign (client column, sorting, aging, bulk), proper publish confirmation, build out the placeholder screens. ~60% redesign.
5. **Agency portal** — **100% net-new**, designed here from scratch, consistent with the client portal system.

The single most damaging gap today is **the credibility cliff between marketing and portal**: the marketing site looks like a $499/mo intelligence firm; the portal a paying client lands in uses emoji glyphs for navigation icons (🗎 💳 ⚙ ❓ ✉), emoji in KPI cards (🪙 🗂 ⏱), "Good day, Name 👋", text arrows (`→`) baked into button labels, and breaks entirely on mobile. Fixing that cliff is worth more than any single new feature.

### Top 10 actions by impact

| # | Action | Surface | Effort | Why |
|---|--------|---------|--------|-----|
| 1 | Replace all emoji/text-glyph icons with the Lucide system already used on marketing | Portal + Admin | S | Single biggest "not a serious product" tell |
| 2 | Redesign the case report view around a real Decision Snapshot artifact | Client portal | M | The paid deliverable must look like the thing marketing sells |
| 3 | Ship the trust pages: About, Contact, Terms, Privacy (footer links are dead `#` today) | Website | S–M | Dead legal links on a product asking for wire-sized trust is disqualifying |
| 4 | Portal responsive shell (collapsible sidebar, mobile nav) | Portal + Admin | M | Sellers check case status from their phone/warehouse |
| 5 | Admin queue: client column, sort, search, SLA aging, publish-confirm modal | Admin | M | Operator efficiency at 100+ cases/day |
| 6 | "Waiting for my report" experience: progress states + email notifications | Client portal | M | 2–5 day research product lives or dies on waiting reassurance |
| 7 | Fix `muted` token contrast (#8A887F → #75736B) portal-wide | All | S | WCAG AA failure on real content (3.38:1) |
| 8 | Social proof + sample-report page on the website | Website | M | Zero third-party evidence anywhere today |
| 9 | Fix pricing inconsistency ($79 vs $99 in FAQ/metadata vs everywhere else) | Website | XS | Price contradictions destroy trust at the decision moment |
| 10 | Build the agency portal (net-new, spec below + mockups) | Agency | XL | The $999 tier has no surface at all |

---

## 1. Marketing website

### 1.1 What works (keep — this is above-average work)

- **Narrative arc** (hook → pain → stakes → how it works → outcomes → depth → honesty manifesto → pricing → FAQ) is genuinely persuasive and correctly leads with the buyer's fear of a bad wire, not features.
- **The Decision Snapshot as hero artifact** — the deliverable *is* the hero image, with staged load choreography (`hq-rise` / `hq-verdict-settle`). This is the right move and distinctive; most competitors would use a stock dashboard screenshot.
- **The honesty manifesto** ("We will never tell you a source is safe.") on the single brand-ink drench is the best moment on the site — a real differentiator stated with typographic confidence. Protect it.
- **Verdict spectrum motif** — the 4-segment bar recurring across hero/outcomes/auth is a real brand signature.
- **Compliance-aware copy discipline** — "we don't promise safe," "illustrative example" label on the Amazon email mock, footer disclaimer. Rare and valuable.
- **Technical hygiene**: FAQPage + Organization JSON-LD, native `<details>` FAQ (crawlable), ClerkProvider scoped away from marketing (fast LCP), `prefers-reduced-motion` handled everywhere, content in `lib/content/*` files (ADR-004).
- Scroll-driven "how it works" with sticky stage visual is executed well (IntersectionObserver, mobile fallback inline).

### 1.2 What's weak

**Trust infrastructure is missing — the highest-severity issue.**
- Footer: **About → `#`, Terms → `#`, Privacy → `#`**. For a product whose entire pitch is "trust us before you wire money," dead legal links are close to disqualifying. A skeptical seller *will* click Terms before paying $279/mo.
- **Zero social proof.** No testimonials, no client outcomes, no "cases run" counter, no founder identity (the About story exists as one anonymous paragraph — "Founded by an Amazon wholesale seller with 15+ years" with no name, face, or verifiable history). Premium intelligence is bought on the credibility of the people behind it.
- **No sample report page.** The hero CTA "View sample report" anchors to a blurred mock; the "Download the sample report" button points at `/sample-report.pdf` which may or may not exist. The single most persuasive asset for this product — an actual anonymized report — has no dedicated, shareable, indexable page.
- **No Contact page** (footer link is `mailto:`). Fine for v1, weak for premium positioning; a contact page with response-time expectation reads as an operating firm.

**Conversion path issues.**
- Announcement bar links to `#pricing` — a dead anchor on every page except Home.
- **Price contradiction**: FAQ says "Buy a single report from $79"; pricing-page metadata says "from $79"; everything else says $99. A buyer noticing this at the decision moment loses trust in all other numbers.
- The two CTAs "Vet a supplier" (header, hero, manifesto) and "Get started" (pricing cards) both go to `/sign-up`, but the label vocabulary shifts. Pick one action verb system (recommendation in content package: keep **"Vet a supplier"** as the signature CTA; pricing cards say "Start with Growth/Scale" so the click states the commitment).
- No mid-funnel capture: a visitor not ready to pay has nothing — no lead magnet (e.g., "The 12 questions to ask any wholesale supplier" PDF), no email capture, no blog. For a considered purchase with a 2–5 day delivery promise, most first visits will not convert same-session; there is currently no way to come back.
- The `TRUST_TOPICS` strip (6 multi-colored icons under the hero) is the weakest section: it lists capabilities as colored icons where logos/testimonials normally live, and its rainbow of category colors (brand, teal, terracotta, brick, green) competes with the verdict system — the one thing DESIGN.md says must stay the loudest color moment. Replace with a quieter, single-hue credibility strip (numbers: cases run, data points, dimensions, review policy) or a client-outcome strip once testimonials exist.

**SEO / discoverability.**
- Only 3 indexable pages exist (`/`, `/how-it-works`, `/pricing`). The route plan in DESIGN.md (`/about`, `/contact`, `/use-cases/*`, `/glossary/*`, `/resources`, `/blog/*`, `/compare/*`) is the correct plan — none of it is built. Organic acquisition surface is effectively zero.
- **No `sitemap.ts`, no `robots.ts`, no Open Graph / Twitter card metadata** on any page (no `openGraph` key in any `Metadata` export). Shares of the site render as bare links.
- Root metadata title is good; per-page canonical URLs absent.
- For 2026 AI-search (GEO): no `llms.txt`, and the site's strongest, most citable claims (four verdicts, five dimensions, "never say safe" policy) exist only inside components — a glossary and methodology-adjacent pages (outputs, not method) would make HyprrIQ the citable source for "how to vet an Amazon wholesale supplier."

**Visual/craft details.**
- Hero right column dot-grid backdrop is nice; hero gradient is inline `style` (token drift risk — should reference tokens).
- Pain section's fake Amazon "Account Health" email uses raw `#232F3E` (Amazon navy) — intentional and fine, but keep it labeled "Illustrative example" (it is — good).
- `EDGE_STATS` count-up on real facts only — correct per DESIGN.md. Keep.
- Section rhythm (`py-12 lg:py-16`) is uniform; the manifesto correctly gets more (`py-20/24`). Consider +1 tier of variation so pricing and FAQ don't feel stamped from the same die.
- Mobile: hero clamp is safe; tables scroll horizontally with `min-w-[640px]` — acceptable.

### 1.3 Recommendations (options)

| Area | Option A (recommended) | Option B |
|---|---|---|
| Trust pages | Ship About (founder story + methodology-at-output-level + honesty policy), Contact, Terms, Privacy as real routes now | Minimum: Terms + Privacy static pages, drop About/Contact links until built |
| Social proof | Outcome-stat strip now ("2,400+ data points reviewed last quarter" class facts) + testimonial slots wired array-driven, filled as they arrive | Wait for 3 real testimonials, then a dedicated section + homepage strip |
| Sample report | Dedicated `/sample-report` page: full anonymized report rendered in HTML (indexable, shareable) + PDF download behind an email gate | Keep PDF direct-download, add email gate only |
| Hero CTA pair | "Vet a supplier" + "See a sample report" (both state outcomes) | "Vet a supplier" + "How it works" |
| TRUST_TOPICS strip | Replace with single-hue fact strip (cases, data points, dimensions, human review) | Keep icons, desaturate to neutral ink per DESIGN.md icon rules |
| Blog/resources | Ship `/resources` hub + 6 pillar articles (см. content package) with `/glossary` long-tail | Start glossary-only (12 terms), add articles monthly |
| OG/social | Per-route `openGraph` + one branded OG image template (verdict-spectrum motif) | Single site-wide OG image |

Full copy rewrites, new-page content, and the blog/glossary editorial plan are in `03-content-package.md`.

---

## 2. Auth (sign-in / sign-up)

### 2.1 What works
- Split-screen with brand-gradient panel: verdict pills on sign-in, value pills on sign-up — the right first-impression architecture, and it's on-domain (no Clerk-hosted redirect).
- Clerk appearance is themed to tokens; card chrome stripped so the form sits flush. `AuthShell` supplies heading/switch links.
- Copy is calm and correct ("Sign in to access your research portal and reports").

### 2.2 What's weak
- **Sign-up panel pills use off-token raw hexes** (`#6EE7B7`, `#93C5FD`, `#FCD34D`, `#C4B5FD` — Tailwind emerald/blue/amber/violet defaults). Violet especially has no meaning in this system. The sign-in TONE_DOT brights are a defensible dark-panel adaptation, but they should be *named tokens* (`verdict-*-bright`) not inline hexes, and sign-up should reuse the same four rather than introduce a fifth hue.
- "Sign up free" (sign-in switch link) is technically true but sets a freemium expectation the product doesn't have; "Create your account" is truthful and premium.
- The brand panel is static — one restrained moment of life (the verdict pills settling in staggered, 60ms apart, once) would carry the marketing site's choreography through the door.
- No password-manager/`autocomplete` concerns (Clerk handles), but the right-panel eyebrow "Client portal" on sign-*up* pages reads mismatched — sign-up eyebrow says "Get started" (correct); fine.
- Legal reassurance line missing on sign-up ("By creating an account you agree to Terms/Privacy") — required once those pages ship.

### 2.3 Recommendations
- Tokenize the bright dark-panel verdict colors (see design-system doc §4), reuse across sign-in and sign-up; replace violet "Built by operators" dot with `accent-warm`.
- Copy changes in content package §5 (headline, sub, switch-link, legal line).
- Add staggered pill entrance (reduced-motion: none). See `mockups/02-auth-sign-in.html`.

---

## 3. Client portal — the surface paying clients live in

### 3.1 What works
- **Information architecture is right**: Dashboard / New Case / Active Cases / Completed / Billing / Settings / Help / Support, with plan-gated access states (`no_plan`, `expired`, active) handled deliberately — the no-plan dashboard shows a single activation prompt instead of dead-zero KPI cards (genuinely good pattern), and expired shows read-only completed reports with a reactivation banner.
- **Status vocabulary discipline**: DB enums map to client-language labels ("In Research," "In Review," never "Track 3"); `research_failed` shows "Delayed — under review." This is exactly the show-outputs-not-method rule, enforced in one place (`badges.tsx`).
- Scope-confirmation flow (brand mismatch between typed brands and OCR-detected document brands) is a sophisticated, well-handled edge case with a clear side-by-side comparison and SLA-paused messaging.
- Submit flow: 3-step progressive disclosure with brand-chip input, drag-drop upload, conditional notes requirement (notes become required when no document — with an honest explanation why), credit-impact panel before confirm, and a proper confirmation receipt (case number, ETA, credits used/remaining, next actions). This flow is near SaaS-standard already.
- Live progress: case detail re-fetches every 4s during research so dimensions flip Queued → Complete without refresh.
- Onboarding: 3-step (business profile → plan → what-happens-next) with skip paths and checkout-return handling.
- Credits widget in sidebar (count, bar, renewal, add-more link) — right idea, right placement.

### 3.2 What's weak

**Visual credibility (the cliff).**
- **Emoji icon system**: sidebar (▪ ＋ 🗎 ✓ 💳 ⚙ ❓ ✉), KPI chips (🪙 🗂 ✓ ⏱), quick actions (＋ 💳 🗎 💬), no-plan state (🔍), alerts (⚠ 💬 🔍), greeting (👋). Emoji render differently per OS, can't be styled by tokens, and read as a prototype. Marketing already ships Lucide — the portal must use the same set (1.75 stroke, neutral ink default).
- **Text arrows in labels** ("View all →", "Choose a plan →", "Reactivate plan →", "← Back", "Next →") — mixed with real icon arrows on marketing. Replace with `ArrowRight`/`ArrowLeft` icons or drop.
- **Button vocabulary drift**: marketing uses pill (rounded-full) buttons; portal uses rounded-lg. Acceptable as a deliberate register split, but *within* the portal there are also `rounded-md` action chips — three shapes total. Standardize (design-system doc §6).
- KPI cards are the classic hero-metric template (big number, small label, icon chip). Serviceable, but the "SLA Risk" card speaks **internal ops language to a client** — a client doesn't manage your SLA; they wait for *their* reports. Rename to "Due Soon" framed as "reports arriving in ≤ X days" — reassurance, not risk.
- Greeting "Good day, {name} 👋" — warm is right, emoji is not; "👋" undercuts an intelligence firm. Time-aware "Good morning, Marcus." is warmer *and* more precise.

**Responsiveness — portal breaks on mobile.**
- `PortalShell` renders a fixed 248px sidebar with no breakpoint behavior; `Topbar` and tables have no small-screen adaptation; `CaseTable` is a CSS grid with fixed column widths that will crush. A seller waiting on a $40k buy decision *will* check status from a phone. Needs: off-canvas sidebar < lg, stacked case cards < md, sticky topbar.

**The report view undersells the product (highest-value redesign).**
- Marketing promises a **one-page Decision Snapshot** — a designed artifact (the hero mock). What a delivered case actually shows is: a small verdict pill next to a status pill, a 2-column list of dimension names with tiny status pills, and flat evidence/question lists behind tabs. **The reveal has no reveal.** The verdict — the loudest color moment the whole system builds toward — appears at pill size, visually equal to a status chip.
- Missing from the delivered view: the verdict *statement* (one-sentence plain-English meaning, which marketing shows in OUTCOME_COPY but the portal never renders), the "what we looked at / what to ask" snapshot structure, any sense of document/artifact.
- "Downloadable PDF export is coming soon" — the deliverable of a premium research service must be exportable/shareable. (Noted as roadmap; reflected in missing-features list.)
- Evidence tab is a flat list — no grouping by dimension, no dimension icons; the five-dimension structure that organizes the whole product disappears exactly where it matters.
- Questions tab is good (priority-ranked, reasons) but priority pills say lowercase "high/medium/low" — sentence-case, and "must ask / should ask" is client-language.
- Timeline is decent; "Founder review" as a client-facing step name is a positioning decision — it's used as a trust signal on marketing ("the founder reviews and approves every finding"), but at the $999 agency tier "Senior review" or "Expert review" scales better. Flagged as a business choice, options in content package.

**Waiting experience (2–5 day product).**
- After the (good) submit receipt, the client's only feedback channel is polling the case page. No email notifications exist anywhere in the flow ("Delivered to your email in 5 days" is promised on pricing!). No expected-delivery date shown on the case (only SLA countdown in a table column). The dashboard shows "Upcoming Deadlines" — again ops language — rather than "Your reports: expected Thursday."
- Recommendation: a per-case progress module (submitted → research → review → delivered with expected date), plus email at submit/action-needed/delivered. Email infra is backend-adjacent — flagged higher-care in the implementation guide.

**Smaller items.**
- Cases list: no search, no sort, no pagination (fine at 10 cases, broken at 50), no date column, no supplier-history grouping.
- Empty states are single lines of muted text; they should teach ("No cases yet" → mini 3-step of what a case gives you + CTA).
- `muted` (#8A887F) fails WCAG AA at 3.38:1 and is used for real content (timestamps, sub-labels, empty states). Fix globally to #75736B (4.51:1) and reserve the lighter value for disabled/decorative only.
- Billing page is solid functionally (plan card, top-ups, upgrade paths, invoices, cancel-with-date) — mostly needs the icon/typography polish pass, plus a credit *usage history* (spent on which case), which builds pricing trust.
- Buttons/links express `→` glyphs; `hover:opacity-90` on solid brand buttons instead of the `brand-hover` token in places (RowAction "Confirm").
- `window.confirm` doesn't exist here (portal) — good; error states are inline text — fine but style them consistently (icon + tone bg).

### 3.3 Client portal — Missing / Recommended Additions

| Item | Type | Priority | Notes |
|---|---|---|---|
| Report PDF export / share link | Net-new | **P0** | Copy already promises it; deliverable must be portable. Share = expiring read-only link |
| Email notifications (submitted / action needed / delivered) | Net-new | **P0** | Promised on pricing page ("delivered to your email"); the waiting-reassurance backbone. Higher-care (backend) |
| Decision-Snapshot report header (redesign of case detail) | Redesign | **P0** | See mockup 04 |
| Responsive portal shell | Redesign | **P0** | Off-canvas sidebar, card-stacked tables |
| Lucide icon system portal-wide | Redesign | **P0** | Replaces emoji |
| Expected-delivery date on case + dashboard ("arriving Thursday") | Redesign | **P1** | Reframe SLA countdown as client value |
| In-app notification center (bell, unread badge) | Net-new | **P1** | Pairs with email; low backend cost (cases already have events) |
| Case search + sort + pagination | Net-new | **P1** | Needed by month 3 of a Scale client |
| Credit usage history (which case consumed what) | Net-new | **P1** | Billing trust; data exists (`credits_charged`) |
| Onboarding checklist on first dashboard (profile ✓ plan ✓ first case ✓ sample report) | Net-new | **P1** | Converts trial energy into first submit |
| Supplier watchlist / saved suppliers ("re-vet in 6 months" reminder) | Net-new | **P2** | Natural repeat-purchase driver; a supplier's risk posture changes |
| Request further investigation on a delivered report | Net-new | **P2** | Change-request flow exists pre-delivery; extend post-delivery (paid or credit) |
| Report archive grouped by supplier (vendor history view) | Net-new | **P2** | "You've vetted this supplier before — March verdict: Verify" |
| Teaching empty states everywhere | Redesign | **P2** | Dashboard, cases, evidence, questions |
| Help-content search + contextual help links from screens | Redesign | **P3** | Help centre exists; surface it in context |
| Dark mode | Net-new | **P3** | Explicit non-goal per PRODUCT.md (light identity); only if clients ask |

---

## 4. Admin portal

### 4.1 What works
- **Dark-ink sidebar** instantly distinguishes admin from client portal — correct and cheap context signal. "Founder" badge is a nice touch.
- Dashboard KPI row covers the right six numbers (MRR, credits sold, cases, pending review, delivered, open support).
- **The case review surface is the strongest screen in the product**: Executive Summary → Verdict panel (weighted score, confidence, veto reasons, ceiling explanations, "why not the other verdicts") → cross-track intelligence → per-track evidence with certainty labels → analyst question CRUD → publish/override/investigate with banned-language blocking at delivery. This is a real intelligence-review instrument.
- Publish confirmation names the case identity (H5 addendum) — the *logic* is right.
- Client detail: internal notes first (correct priority), business profile, billing audit, case history.

### 4.2 What's weak
- **Queue is not an operator's queue.** For 100+ cases/day it lacks: a dedicated client column (client name is smushed into the supplier sub-line), sort (by SLA, age, plan), search, date submitted, SLA aging color scale (everything urgent-colored the same `text-verify-ink`), pagination, bulk selection, and a "cases needing attention" triage grouping (overdue / awaiting client / failed). The four tabs are the only tooling.
- **`window.confirm()` for the most irreversible action in the system** (publish delivers a report to a client permanently). A native confirm can't show the verdict being published, can't force attention to the case identity, is skippable by muscle-memory Enter. Needs a real modal: case number + vendor + client + verdict shown, type-to-confirm or explicit checkbox, destructive-styled confirm button. (The `buildPublishConfirm` string logic is preserved — only the presentation changes.)
- Emoji icons in the nav (🔍 ✓ ▦ 👥 ✉ 📈 📊 📄 ⚙) and 🎉 in the support empty state — same fix as portal.
- Support queue rows are dead (no detail view, no status change, no reply action); "Support Queue" nav item links to the dashboard.
- Revenue, Outcomes, Prompts, Settings are placeholders — fine as roadmap, but Revenue is the founder's own operating instrument and should come first among them (MRR trend, plan mix, top-up attach rate, churn).
- No keyboard efficiency: no shortcuts (j/k row navigation, R to open review, P to publish-focus), no next-case-in-queue button after publishing (operator has to navigate back). At 100 cases/day the back-and-forth alone is ~30 minutes.
- The review screen at full depth is long; it lacks a sticky decision bar (verdict + publish/override always in view) and per-section anchors.
- Admin tables share the portal's non-responsive grids (lower priority — admin is desktop work).

### 4.3 Admin portal — Missing / Recommended Additions

| Item | Type | Priority | Notes |
|---|---|---|---|
| Queue upgrade: client column, sort, search, date, SLA aging scale | Redesign | **P0** | The daily instrument; see mockup 06 |
| Publish-confirm modal (identity + verdict + explicit confirm) | Redesign | **P0** | Preserves existing guard logic; kills wrong-case delivery risk |
| "Next in queue" after publish + sticky decision bar on review | Redesign | **P1** | Direct throughput win |
| Lucide icons, admin-wide | Redesign | **P1** | With portal pass |
| Support request detail view (read, status, canned replies) | Net-new | **P1** | Rows are currently dead ends |
| Revenue screen (MRR trend, plan mix, top-ups, churn) | Net-new (placeholder exists) | **P1** | Founder's own dashboard |
| Keyboard shortcuts (j/k, Enter=review, publish focus) | Net-new | **P2** | Reviewer efficiency |
| Audit trail view per case (who did what when — publish, override, investigate) | Net-new | **P2** | Data likely exists in events; surface it |
| Client drill-down: lifetime value, cases by verdict, credit ledger | Redesign | **P2** | Extends existing client detail |
| Refund / credit-adjust tooling (grant credits, refund case) | Net-new | **P2** | Today requires DB access; higher-care (billing) |
| Bulk actions (multi-select → assign/flag) | Net-new | **P3** | Matters once there's >1 reviewer |
| Flags/labels on cases ("watch this client", "tricky vendor") | Net-new | **P3** | Cheap triage aid |
| Outcomes screen (verdict distribution, override rate, engine-vs-final drift) | Net-new (placeholder exists) | **P3** | Quality instrument |

---

## 5. Agency portal — net-new design

There is no agency surface in the codebase. This section is the design spec; mockups 08–11 render it. **Design principle: the client portal system, extended for one level of indirection** — an agency acts *on behalf of* end clients, so every object in the portal (case, credit, report) gains a "for client X" dimension, and every screen gains client-scoped filtering. Same tokens, same components, one new accent context (a client-scope chip) — never a separate brand.

### 5.1 Who uses it
- **Agency owner** — buys the $999 plan, manages staff, owns billing, sees everything.
- **Agency staff/analyst** — submits cases for assigned end clients, reads reports, cannot touch billing or team.
- **End client (of the agency)** — *not a login* in v1. The agency exports/hands off branded reports. (White-label client logins are a v2 flag, below.)

### 5.2 Information architecture

```
Agency Portal (/agency/*)
├── Dashboard          — cross-client overview: credits, active cases by client, due this week, needs action
├── Clients            — the agency's book: client list → client workspace
│   └── [client]       — per-client: cases, reports, notes, contacts
├── New Case           — same 3-step submit + REQUIRED "on behalf of client" selector + bulk mode
├── Cases              — all cases, client column, filter by client/staff/status/verdict
├── Reports            — delivered-report library, client-grouped, export/handoff center
├── Team               — staff seats, roles, per-client assignment, activity log        [owner only]
├── Billing & Credits  — pooled agency credits, usage by client + by staff, invoices   [owner only]
└── Settings           — agency profile, report handoff branding (v2: white-label)     [owner only]
```

### 5.3 Key design decisions

1. **Credits are pooled at the agency** (one wallet), with **per-client usage attribution** everywhere (dashboard, billing, client workspace). Simpler than per-client wallets, and matches how agencies bill their clients (they mark up).
2. **The client selector is the first field of every submit** — a case can never be orphaned. Client-scope chips (small neutral chip with client initial + name) appear on every case row, report card, and activity item across the portal.
3. **Roles are two, not five**: Owner and Analyst. Permissions: Analyst = submit + view for *assigned* clients; Owner = everything. Resist RBAC theater until a real agency asks.
4. **Bulk submission** = the same submit form with a "queue another for this client" loop + a review-all screen, *not* CSV upload in v1 (CSV is listed as v2 — the research pipeline intake is per-case and shouldn't be stressed by design).
5. **Report handoff, not white-label, in v1**: a delivered report can be exported as PDF with an "Prepared by [Agency] · Research by HyprrIQ" co-brand line, or a clean HyprrIQ report. Full white-label (agency logo replaces HyprrIQ) is a v2 monetization lever — flagged, not designed in.
6. **Team activity feed** (who submitted/downloaded what, for which client) gives the owner oversight without approval workflows.

### 5.4 Screens (all mocked)
- **Agency dashboard** (mockup 08): pooled-credit widget with by-client burn, "due this week" grouped by client, needs-action strip, per-staff activity.
- **Clients + client workspace** (mockup 09): client cards with open/delivered counts and last verdict; workspace = cases table scoped to client + notes + handoff history.
- **Bulk/new case** (mockup 10): client selector first, then the existing 3-step flow, queue-another loop, batch review with per-case credit line and total.
- **Team & roles** (mockup 11): seat list, role toggle, client assignment matrix, activity log.

### 5.5 Agency portal — feature list (all net-new)

| Item | Priority | Notes |
|---|---|---|
| Agency plan gating + `/agency/*` shell + roles (Owner/Analyst) | **P0** | Auth model extension — higher-care |
| Client book (CRUD) + client-scoped cases | **P0** | The core object |
| Submit with mandatory client attribution (+ queue-another loop) | **P0** | |
| Pooled credits + per-client usage attribution | **P0** | Billing — higher-care |
| Cross-client dashboard | **P0** | |
| Reports library + PDF handoff (co-brand line) | **P1** | Depends on client-portal PDF export |
| Team management + activity log | **P1** | |
| Per-staff client assignment | **P2** | Start with all-access analysts if needed |
| Batch review screen (multi-case confirm with credit total) | **P2** | |
| CSV bulk import | v2 | Pipeline-intake risk; design later |
| White-label branding (logo, colors on handoff PDF) | v2 | Price it |
| End-client read-only logins | v2 | Big auth surface; only with demand |

---

## 6. Cross-cutting issues (all surfaces)

1. **Icon system** — one library (Lucide), 1.75 stroke, neutral ink default, category hues only for the five research dimensions (per DESIGN.md). Zero emoji anywhere in UI chrome. The five dimension hues are now specified in the design-system doc §5.
2. **`muted` contrast failure** — #8A887F → #75736B for text; keep #8A887F as `muted-decor` for disabled/decorative only. All verdict pairs verified AA (4.87–6.17:1); ink 16.7:1; ink-2 7.2:1. Numbers in design-system doc §9.
3. **Button system** — 3 sizes × 4 variants defined once (design-system doc §6): marketing keeps pill, app surfaces standardize on 10px radius; text arrows out, icon arrows in; `:active` scale(0.98) feedback; loading states with spinner-in-place.
4. **Motion** — the marketing choreography vocabulary (ease-out-quint, 150–250ms) should be tokenized and reused in the portal for state changes only: tab underline slide, verdict badge settle on report open (the one earned "moment"), row hover, dimension flip Queued→Complete, toast slide. No entrance choreography in app surfaces. Specified in design-system doc §8.
5. **Register split is correct** — marketing (brand register: choreography, pill buttons, drench moments) vs portal (product register: density, consistency, speed). Keep the split deliberate; the design-system doc encodes which tokens belong to which register.
6. **Language compliance carries to UI chrome** — verified no "guaranteed/safe/authorized" violations in current UI copy. Keep the discipline in all new copy (content package includes the banned-list reminder per surface).

---

## 7. Mockup index

| File | Screen | Scope vs today |
|---|---|---|
| `mockups/01-website-home.html` | Homepage | Refinement: new trust strip, social-proof slots, sample-report section, unified CTAs |
| `mockups/02-auth-sign-in.html` | Sign-in | Polish: tokenized panel, staggered pills, copy |
| `mockups/03-client-dashboard.html` | Client dashboard | Redesign: icons, "arriving" reframe, teaching empty-adjacent states, responsive |
| `mockups/04-client-report.html` | Case detail / delivered report | **Major redesign**: Decision Snapshot artifact, dimension-grouped evidence, export |
| `mockups/05-client-submit.html` | Submit flow (step 2) | Polish: icons, refined upload, credit panel |
| `mockups/06-admin-queue.html` | Admin queue | Redesign: client column, sort, aging, search, triage |
| `mockups/07-admin-review.html` | Admin review + publish modal | Redesign: sticky decision bar, publish-confirm modal |
| `mockups/08-agency-dashboard.html` | Agency dashboard | Net-new |
| `mockups/09-agency-clients.html` | Agency clients + workspace | Net-new |
| `mockups/10-agency-submit.html` | Agency submit (client-attributed) | Net-new |
| `mockups/11-agency-team.html` | Agency team & roles | Net-new |

All mockups are self-contained (inline CSS, Google-Fonts link with system fallbacks, inline SVG icons, no app dependencies). They are previews for Opus to build from — not wired code.
