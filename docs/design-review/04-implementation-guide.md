# HyprrIQ — Implementation Guide (gated, one change at a time)

For the executing model (Opus). Each change below is a **gate**: build it, verify it, get founder sign-off, then move on. Never batch gates. Never touch anything in the "always preserve" list. The mockups in `mockups/` are the visual reference; the design system in `02-brand-design-system.md` is the token/component source of truth; copy comes from `03-content-package.md`.

## 0. Ground rules

**Always preserve (never modify while executing this guide):**
- Auth wiring: `ClerkProvider` scoping (root layout stays Clerk-free; `(auth)`/`(portal)`/`(admin)` layouts own it), `auth.protect()`, `requireAdmin()`, `requireOnboardedClient()`, `getClientWithAccess()` and the `deriveAccess` states (`no_plan`/`expired`/active).
- Data layer: everything under `lib/data/*`, `lib/research/*`, `lib/ai/*`, `lib/inngest/*`, `lib/supabase/*`, `lib/stripe*`. The case pipeline is FROZEN (H1–H5) — no import changes, no type changes, no "cleanup."
- API routes under `app/api/*` (one exception explicitly gated in G-13).
- The status/verdict *vocabulary* in `components/portal/badges.tsx` (labels/mappings may get icon upgrades; the enum→label logic and banned-language discipline stay).
- `buildPublishConfirm` / `buildDeliveredToast` logic in `lib/admin/publish-confirm` (G-12 changes only the *presentation* around it).
- `PRODUCT.md` / `DESIGN.md` (append, never rewrite; the v3 system in this review extends them).

**Care levels:**
- 🟢 **Static** — marketing/auth pages, no live data. Verify by build + eyeball.
- 🟡 **Wired-read** — portal/admin screens that *read* live data. Branch → preview URL → verify with a real staging account → merge.
- 🔴 **Wired-write / money / auth** — anything touching credits, Stripe, publish, roles, email. Branch → preview → founder walks the flow on staging → explicit sign-off → merge. Never combine two 🔴 gates in one PR.

**Branch/preview protocol (all 🟡/🔴):** `git checkout -b design/g-XX-short-name` from `staging` → implement → `npm run build` + `npm test` green → push, open the Vercel preview URL → run the gate's verify list on the preview → founder confirms → merge to `staging`. The `VERCEL_ENV !== "production"` view-switcher continues to work on previews — use it to check both roles.

**Global verification after every gate:** `npm run build` passes; no console errors on the touched routes; sign-in → dashboard → case detail happy path still loads; no new hardcoded hexes (grep `#[0-9A-Fa-f]{6}` in touched files — tokens only).

---

## Phase 1 — Zero-risk fixes (🟢, one PR, ~an hour)

**G-1. Copy & link fixes.**
Files: `components/marketing/faq.tsx` ($79→$99), `app/(marketing)/pricing/page.tsx` (metadata $79→$99), `components/marketing/announcement-bar.tsx` (`#pricing`→`/pricing`), `components/marketing/site-footer.tsx` (remove the three `#` links until G-3 ships their pages — a footer without About/Terms is better than one with dead legal links).
Verify: grep for `$79` returns nothing; click every footer/announcement link on `/`, `/how-it-works`, `/pricing`.

**G-2. Token additions + `muted` fix.**
File: `app/globals.css` only. Add to `@theme`: `--color-muted: #75736b` (change), `--color-muted-decor: #8a887f` (new), the four `--color-*-bright` tokens, semantic `--color-success/warning/danger/info` (+`-bg`) aliases, `--dur-fast/base/slow`, z-index custom properties (§7 of design-system doc). Nothing else changes — existing `text-muted` classes pick up the darker value automatically.
Verify: portal dashboard/case list visually — tertiary text slightly darker, nothing broken; contrast spot-check `#75736B` on `#FAF9F7` ≥ 4.5.

---

## Phase 2 — Marketing trust infrastructure (🟢)

**G-3. Trust pages: `/terms`, `/privacy`, `/about`, `/contact`.**
New files under `app/(marketing)/{terms,privacy,about,contact}/page.tsx` + content files `lib/content/{about,contact}.ts` (ADR-004 pattern). Copy skeletons in content package §2. **Terms/Privacy need real legal text from the founder — gate does not ship with lorem.** Restore footer links.
Verify: all four routes render, one `<h1>` each, metadata set, footer links live.

**G-4. Homepage refinements** (reference: `mockups/01-website-home.html`).
Files: `app/(marketing)/page.tsx` (+ `lib/content/home.ts` if extracting): (a) replace `TRUST_TOPICS` icon strip with the fact strip; (b) hero sub-paragraph rewrite (content package §1.2); (c) CTA vocabulary ("Start with Growth/Scale", "See a sample report"); (d) add the sample-report teaser band (linking to G-5's route; ship band with G-5 if sequencing matters); (e) founder-identity block per the founder's Option A/B choice — **ask before building**.
Verify: build; scroll the page at 375/768/1280; reveal animations unaffected; JSON-LD still valid (paste into a validator).

**G-5. `/sample-report` page.**
New route + content. Needs one real anonymized report from the founder — **blocked on that input**. Render in HTML per mockup 04's snapshot structure; PDF download can be a plain link first, email-gated later.
Verify: route renders, indexable (no auth), linked from hero + teaser band + footer.

**G-6. SEO/GEO technical pass.**
New files: `app/sitemap.ts`, `app/robots.ts`, `public/llms.txt`; add `openGraph`/`twitter`/`alternates.canonical` to each marketing page's `Metadata`; OG image (static `public/og.png` first, `next/og` template later).
Verify: `/sitemap.xml`, `/robots.txt`, `/llms.txt` respond; share-preview a URL in a validator.

**G-7. Auth polish** (reference: `mockups/02-auth-sign-in.html`).
Files: `components/auth/auth-shell.tsx`, `lib/content/auth.ts`. Tokenized bright dots (from G-2), sign-up violet → warm-bright, staggered pill entrance (CSS only, reduced-motion instant), copy per content package §5, legal line (after G-3).
Verify: sign-in and sign-up render, Clerk form unaffected (🟡 edge: do NOT touch `clerk-appearance.ts` beyond nothing — it stays), complete one real sign-in on preview.

**Phase 2 content track (parallel, no code):** pillar articles 1–2 + 12 glossary terms drafted → `/resources` + `/glossary` routes ship as a later 🟢 gate using the same marketing layout.

---

## Phase 3 — Portal visual credibility (🟡 — wired-read surfaces)

**G-8. Icon system portal-wide** (reference: mockups 03/05).
Files: `components/portal/portal-shell.tsx` (NAV `icon: string` → `icon: LucideIcon` per design-system §5.2), `app/(portal)/portal/dashboard/page.tsx` (KPI `icon`/`chip` props, quick actions, greeting emoji out), `components/portal/badges.tsx` (label glyphs "⚠"/"✓" → icons inside the pill markup — labels and enum mapping untouched), `components/portal/case-detail-view.tsx` + `submit-form.tsx` + `onboarding-flow.tsx` (inline ⚠/🔍/💬/✓/→/← glyphs), admin equivalents in G-11. lucide-react is already a dependency.
**Preserve:** every `href`, `deriveAccess` gating, blocked/disabled states, badge text.
Verify on preview: each nav item routes correctly for (a) active-plan, (b) no-plan (blocked items still disabled), (c) expired account; grep the four surfaces for emoji (`[\u{1F300}-\u{1FAFF}]` + ⚠✓⏱→←＋) → zero in JSX chrome.

**G-9. Responsive portal shell.**
File: `components/portal/portal-shell.tsx` (+ a small client component for the off-canvas state). Sidebar hidden < lg with hamburger + overlay (z-scale from G-2); `CaseTable` stacked-card layout < md (per mockup 03's pattern — CSS grid re-templating, not new data logic).
**Preserve:** server-component boundaries — keep `PortalShell` server-rendered; isolate interactivity in a `"use client"` leaf.
Verify on preview at 375/768/1024: nav opens/closes, focus trapped in overlay, case rows readable, no horizontal scroll.

**G-10. Report view redesign** (reference: `mockups/04-client-report.html`) — the flagship.
File: `components/portal/case-detail-view.tsx` (presentation only). (a) Decision Snapshot header for delivered cases: spectrum motif, vendor display, 24px verdict + one-sentence statement (statement map = the existing marketing `OUTCOME_COPY`, moved to a shared `lib/content/verdicts.ts` consumed by both — additive), "what we looked at"/"ask your vendor" two-column, disclaimer footline; (b) Evidence tab grouped by dimension with the §5.1 icon set; (c) priority pills → Must ask/Should ask/If useful; (d) waiting-state module for in-research cases ("expected delivery {date}" from `sla_deadline`).
**Preserve:** `findingsVisibleToClient` gating (raw findings never show pre-delivery), `extractQuestions`/`mergeCaseQuestions` data paths, the 4s `router.refresh()` polling, scope-confirmation flow untouched this gate, Export/Share buttons **omitted** until G-13 (don't ship dead buttons).
Verify on preview with staging cases in ≥3 states (awaiting_client, research_running, delivered): correct gating per state, verdict statement matches verdict, dimensions map correctly, reduced-motion kills the settle animation.

---

## Phase 4 — Admin efficiency (🟡 / 🔴)

**G-11. Admin queue upgrade + icons** (reference: `mockups/06-admin-queue.html`). 🟡
Files: `components/admin/admin-shell.tsx` (icons, badge counts), `app/(admin)/admin/cases/page.tsx` and `app/(admin)/admin/dashboard/page.tsx` (client column via existing `c.clients` join, triage strip, SLA aging classes, search/sort — client-side first over the already-fetched list; move to query params only if volume demands).
**Preserve:** `getAllCasesAdmin` signature and filters; the review-link routing logic (delivered→portal view, else→review).
Verify on preview as admin: counts match tabs, sort orders correctly, search filters, client names correct against DB.

**G-12. Publish-confirm modal** (reference: modal in `mockups/07-admin-review.html`). 🔴
File: `components/admin/case-review.tsx` — replace `window.confirm(confirmMsg)` with the modal (case/vendor/client/verdict identity block, consequence line, checkbox-gated destructive button). **The guard logic (`buildPublishConfirm` deciding *whether* to confirm, the API call, banned-language error path) is unchanged** — only presentation. Also: sticky decision bar + "next in queue" link after publish (queue order from the existing dashboard query).
Verify on staging with a **test client account and a disposable case**: publish flows end-to-end, cancel paths leave state untouched, override + investigation flows still work, banned-language block still surfaces.

**G-13. Report PDF export.** 🔴 (backend-adjacent — the one new API surface)
New: a server route rendering the delivered report (react-pdf or headless print CSS on a print-view route) + the Export button from G-10. Read-only over already-client-visible data (`findingsVisibleToClient` re-checked server-side; auth = same case-access check as the case page).
Verify: client A cannot fetch client B's case PDF (test with two staging accounts); PDF content matches the on-screen report; no raw/unreviewed fields serialized.

**G-14. Email notifications (submitted / action-needed / delivered).** 🔴
Requires an email provider decision (founder choice) and hooks into case-status transitions — the closest this guide comes to the pipeline. Implement as *listeners on existing status changes* (e.g., an Inngest step or DB-trigger-driven job **added alongside**, never modifying existing pipeline functions). Copy in content package §4 tone; every mail links to the case.
Verify on staging: one email per transition, once (idempotency key = case+status), correct client, banned-language check on templates. **Founder sign-off on template copy before enabling.**

---

## Phase 5 — Agency ("Teams") portal (🔴 throughout — net-new, but touches auth/billing)

Build order (each its own gate; reference mockups 08–11):
- **G-15. Data model + gating**: `agencies`, `agency_members` (role: owner/analyst), `agency_clients` tables; `agency_id` attribution column on cases (nullable, additive — **no change to existing case rows or pipeline reads**); `/agency/*` route group with its own layout guard (member check), `AgencyShell` cloned from `PortalShell` + Teams chip.
- **G-16. Client book + workspace** (mockup 09): CRUD on `agency_clients`, client-scoped case lists (query = existing case fetch + `agency_client_id` filter).
- **G-17. Attributed submit** (mockup 10): the existing `SubmitForm` wrapped with the client-selector step; submit API gains optional `agency_client_id` — **additive parameter, existing clients unaffected**; queue-another loop is client-side state.
- **G-18. Pooled credits + ledger**: agency plan in Stripe (`teams_999`), credits on the agency record, per-client attribution rows on spend. Reuses the existing credit-charge path with an agency wallet lookup — the single riskiest change in this guide; founder walks a full purchase→submit→refund cycle on staging before merge.
- **G-19. Team management + activity** (mockup 11): invites (Clerk organization or invite-token — decide with founder), role enforcement in the layout guard + API checks, activity log from an `agency_events` table written by G-16/17 actions.
- **G-20. Reports library + handoff PDF**: G-13's renderer + a co-brand line ("Prepared by {agency} · Research by HyprrIQ").
Public-facing naming throughout: **Teams**, never "agency" (routes/internal code may keep `agency`).

---

## Sequencing summary

| Order | Gates | Risk | Depends on |
|---|---|---|---|
| 1 | G-1, G-2 | 🟢 | — |
| 2 | G-3 → G-7 (+content track) | 🟢 | G-2 tokens; G-5 blocked on founder's report; G-4(e) blocked on founder naming choice |
| 3 | G-8 → G-10 | 🟡 | G-2 |
| 4 | G-11 → G-14 | 🟡→🔴 | G-8 icons; G-13 before G-20 |
| 5 | G-15 → G-20 | 🔴 | Phases 1–3 shipped (agency reuses portal components) |

**Founder inputs needed before their gates:** legal text (G-3) · anonymized report (G-5) · founder-identity option A/B (G-4) · "Expert review" vs "Founder review" timeline label (G-10) · email provider (G-14) · Teams invite mechanism + Stripe product (G-18/19).
