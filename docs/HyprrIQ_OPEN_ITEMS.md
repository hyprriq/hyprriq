# HyprrIQ — Open Items Tracker (v2, merged)

**THE SSOT. Supersedes BOTH prior versions:** the founder's standalone v2 draft (preserved verbatim at commit `a1d883c`) and the accretion tracker 2026-07-04 → 2026-07-28 (archived with its full ruling history at `docs/HyprrIQ_OPEN_ITEMS_HISTORY.md` — read it for the WHY behind any line here).
**Merged + source-verified:** 2026-07-29 (build thread). Every ✅/❌ correction below was checked against code/git/live-DB, not carried.
**Last updated:** 2026-07-29
**Purpose:** One durable list of every open thread across all lanes, so nothing falls off between
sessions or between the planning thread, the UI/UX thread, and Fable.

**Legend:** 🔴 OPEN · 🟡 IN-PROGRESS · ⛔ BLOCKED · ✅ DONE · 🗄️ DEFERRED · 🔒 RESERVED

**Owner key:** **F** = Founder (live/prod actions, rulings) · **FA** = Fable (code) ·
**PT** = Planning thread (specs, rulings, review) · **UX** = UI/UX thread (design)

---

## 0. STATE OF PLAY — what is frozen and done

| Capability | State |
|---|---|
| Evidence layer — Tracks 0, 0.5, 1–5 | ✅ Frozen |
| Hardening H1–H7 (integrity substrate) | ✅ Frozen |
| Intelligence Synthesis Engine (ADR-G005, 9 modules) | ✅ Frozen `g005-1.0.0` |
| Deterministic Verdict Engine (ADR-G004) | ✅ Frozen |
| Track 6 — Category Compliance | ✅ Frozen `cc-1.0.0`, gated `scale_499` |
| Banned-language fix gate | ✅ Frozen `3d46314` |
| G3 write-side corpus | ✅ 2 of 3 (relationship records — see 6.2) |
| Phase E — checkout + webhook | ✅ **CLOSED 2026-07-29** (test checkout created `single_99` client) |
| `synthesis_extension` migration | ✅ Run + verified |
| First full loop: wired engine → publish → delivered | ✅ **AWI-2607-022 delivered 2026-07-29** |

| Morandelli outcome + `prediction_correct` | ✅ Recorded (founder, H6 panel) |
| Degraded-write tripwire (G006 item-4) | ✅ Built + registered (daily cron) |

**Development fixture:** AWI-2607-022 (delivered, wired-engine, real Module 9 output).

---

## 1. LAUNCH-BLOCKING — nothing ships without these

| # | Item | Status | Owner | Notes |
|---|---|---|---|---|
| 1.1 | **Client report — on-screen + PDF** | 🔴 | UX→FA | The gap carried by roadmaps v3 AND v4. Placeholder only today. |
| 1.2 | **Client-projection layer** | 🔴 | FA | Named gate deliverable. One projection function — not string-by-string, or it leaks. Must strip `src_N`/evidence tags DEFENSIVELY (present in 021's narrative, absent in 022's). |
| 1.3 | **ASIN intake field + one-brand cap** | 🔴 | FA | Real vertical slice: schema column + form + validation + code guard + `TrackContext` threading. 1 ASIN per brand; 5 brands / 5 ASINs max. Unblocks Keepa. |
| 1.4 | **Mobile layout** | 🔴 | UX→FA | Portal does not load on mobile. Broken surface. |
| 1.5 | **Credits display (BUG-2)** | 🔴 | FA | "12 of 5 remaining" — top-up overflow. Money surface; trust issue. |
| 1.6 | **Legal pages** | 🔴 | F+PT | Terms · Privacy · Data policy · Refund/cancellation · Cookie policy **+ consent banner** (mandatory once pixels are added) · IP/claims · no-guarantee disclaimer. |
| 1.7 | **Contact page** | 🔴 | UX | Plus a working inbound route. |
| 1.8 | **Sample-report page** | 🔴 | UX | Highest-converting page not yet built — a $499 prospect wants to see the deliverable. |
| 1.9 | **Env separation (test/live keys)** | 🔴 | F+FA | Marked "business-ending risk" in the tracker. |
| 1.10 | **RLS suite / tenancy isolation** | 🔴 | FA | Portal uses service-role with manual scoping. Must be proven before the first real client. |
| 1.11 | **Stripe live mode** | 🔴 | F | Incl. a LIVE-mode $149 price (test price must never reach Production env). |
| 1.12 | **staging → main promotion** | 🔴 | F | main is still create-next-app scaffold. Carries the reconciled Track 6 migration. |

---

## 2. MARKETING SITE

| # | Item | Status | Owner |
|---|---|---|---|
| 2.1 | Website redo — better design + more content | 🔴 | UX |
| 2.2 | Pricing page redo — FAQs, clearer instructions, "how we work" | 🔴 | UX |
| 2.3 | Legal pages (see 1.6) | 🔴 | F+PT |
| 2.4 | Contact + Help pages | 🔴 | UX |
| 2.5 | Blog / Sanity CMS + 5–10 SEO posts pre-launch | 🔴 | F+Cowork |
| 2.6 | Full SEO — keywords, Search Console, pixels | 🔴 | UX |
| 2.7 | About page | 🔴 | UX |
| 2.8 | Login page + error pages (404/500) | 🔴 | UX |
| 2.9 | Technical SEO plumbing — sitemap.xml, robots.txt, schema markup, OG/social cards | 🔴 | FA |
| 2.10 | Analytics (GA4 or similar) | 🔴 | F |
| 2.11 | `#pricing` href in announcement-bar (→ `/pricing`) — **verified still wrong** (`announcement-bar.tsx:27`); footer checked: only `/` links remain, **no dead links found** | 🔴 | FA |
| 2.12 | Email capture / newsletter signup | 🔴 | UX |
| 2.13 | **Go-live gate condition:** site must not go public advertising category flags unless built — **now satisfiable** (Track 6 is live) | 🟡 | F |
| 2.14 | Copy edits marked PROPOSED at the banned-language gate: `help.ts` action line, `how-it-works.ts` negation | 🔴 | PT |
| 2.15 | `SAAS_ARCHITECTURE.md:32` still shows retired $79/$197 | 🔴 | FA |

---

## 3. CLIENT PORTAL

| # | Item | Status | Owner |
|---|---|---|---|
| 3.1 | **Case output / report redo** — most important; what the client reads | 🔴 | UX→FA |
| 3.2 | Portal page redesign | 🔴 | UX |
| 3.3 | Credits section fix (BUG-2) | 🔴 | FA |
| 3.4 | ~~Plan-upgrade button (missing)~~ **✅ VERIFIED BUILT** — "Upgrade to a subscription" card + Upgrade action live on the billing page | ✅ | — |
| 3.5 | Billing overhaul — credit FAQs, per-case usage, top-up clarity | 🔴 | UX |
| 3.6 | Latest-news section (Sanity posts) | 🔴 | UX |
| 3.7 | **ASIN field + one-brand cap** (see 1.3) | 🔴 | FA |
| 3.8 | Mobile (see 1.4) | 🔴 | UX→FA |
| 3.9 | ~~Settings page — never built~~ **✅ VERIFIED BUILT** — real page (profile form, contact/billing/tax fields, `SettingsForm`). If v2 meant a richer scope, log the delta as a NEW item | ✅ | — |
| 3.10 | Case status/progress view (client-facing, no method exposure) | 🔴 | UX |
| 3.11 | Download-PDF action | 🔴 | FA |
| 3.12 | Clarification / dispute request flow | 🔴 | UX |
| 3.13 | ~~Submission form: drag-drop upload, conditional notes~~ **✅ VERIFIED BUILT** — drag-drop path shares validation with the button path; notes REQUIRED when no document uploaded (the conditional rule, live) | ✅ | — |
| 3.14 | Client-facing checkpoint emails (OQ-3, currently gated — admin-digest only) | 🗄️ | PT |

### Report content rules (carry into design)
- Remove "Dimension N" labels · scrub `src_N` and evidence tags (`(A1, E2)`, `(A10, RG-02)`)
- Rewrite engine headers into plain client language · hide operator states and "informational; does not affect verdict" notes
- Render `documentation_review` etc. as human labels, never raw snake_case
- `category_verdict` **never** shown to a client as "verdict" (Condition 3)
- Category client projection is a **gate-closing requirement** — the $499 differentiator
- `brand_evidence_status` render (OQ-S4 option ii)
- The "beyond our control" alert + closing disclaimer placed
- Design must survive: 1-line or 6-line risk paragraphs · 130-word single blocks · a dimension "not assessed" · 1 or 5 brands · empty analyst block · 2–14 verify questions

---

## 4. ADMIN CONSOLE

| # | Item | Status | Owner | Notes |
|---|---|---|---|---|
| 4.1 | Admin redesign — output reading format | 🔴 | UX | Denser than client side by design |
| 4.2 | **Rerun button + attempt-history versioning** (OQ-CASE-RERUN) | 🔴 | FA | Re-runs currently overwrite in place |
| 4.3 | **Operator-added material — Modes A & B** | 🔴 | FA | A = note/links → report only, no verdict change. B = finding → track → **must trigger re-run**. Forbidden: track-added material reaching the verdict without a re-run. |
| 4.4 | Live pipeline-progress tracker (UX-1) | 🔴 | FA | Per-stage status; diagnosis when a case breaks |
| 4.5 | **Super user — unlimited credits, run reports for direct clients** | 🔴 | FA | See 4.6/4.7 — **one coherent feature, not three** |
| 4.6 | **Manual client creation** | 🔴 | FA | Attribution matters: reports must belong to a client for delivery + corpus |
| 4.7 | **Credit bypass for admin-run cases** | 🔴 | FA | ⚠️ Touches money. Must be explicit, audited, impossible to trigger accidentally (H6 atomic RPCs) |
| 4.8 | **Billing control** — view invoices, manual refunds, partial refunds, add credits | 🔴 | FA | Admin credit-adjust tool does not exist. Refunds are straightforward Stripe API |
| 4.9 | **Invoice format/branding** | 🔴 | F | Do Stripe invoice branding settings FIRST (logo/colour/footer, ~20 min) before any custom generator |
| 4.10 | Staff accounts + permissions | 🔴 | FA | Role-enum migration **is applied** — unblocked |
| 4.11 | Verify ⚖ LEGAL FLAG banner renders | 🔴 | F | Built, unverified |
| 4.12 | Outcome panel refinement | 🔴 | UX | Recurring task, not a buried field |
| 4.13 | Agency panel | 🔒 | — | Phase K |

---

## 5. SECURITY / RELIABILITY (Phase I)

| # | Item | Status | Owner |
|---|---|---|---|
| 5.1 | Env separation (see 1.9) | 🔴 | F+FA |
| 5.2 | RLS suite (see 1.10) | 🔴 | FA |
| 5.3 | Sentry — not wired | 🔴 | FA |
| 5.4 | UptimeRobot | 🔴 | F |
| 5.5 | Support widget | 🔴 | F |
| 5.6 | Credit-concurrency, gating-matrix, determinism test suites | 🔴 | FA |
| 5.7 | Whole-platform audit (the bug hunt was seam-only) | 🗄️ | FA |

---

## 6. ENGINE / BACKEND — deferred or conditional

| # | Item | Status | Notes |
|---|---|---|---|
| 6.1 | **Keepa gate** | 🗄️ | Needs ASIN field. Plugin, scenario intelligence, NEVER a verdict input (Q-K1). Remove the 3 dormant weight keys. Reporting law: brand enforcement = brand-wide (Track 3); seller dynamics = per-ASIN (Keepa) |
| 6.2 | vendor×brand relationship records | 🗄️ | Never built; lost in the G007 reshape. **Backfillable** at G6 from `intelligence_events.brands_normalized` + `case_outcomes` |
| 6.3 | Degraded-write tripwire | ✅ | Built + registered (`degradedWrites.ts`, daily cron, three families, silent on clean days) |
| 6.4 | **$149 tier assembly** | 🔴 | PlanType + registry + credits + `single_149` joins the category gate + live Stripe price. Sellable only once Keepa + category justify it |
| 6.5 | G4 threshold recalibration | 🗄️ | Against the outcome corpus. **Entry conditions (recorded at the S-1 freeze):** k-term noise dominance in the gap axis · degenerate cost axis (59/66 low, 0 severe) · A6 per-hypothesis scoring vs H1 immutability (the write path is G4's design problem) |
| 6.6 | G6 Institutional Memory read-side | 🔒 | ~50–100 delivered cases. **Heavy gate** — as specced it reopens the frozen verdict engine. Alternative to weigh: scenario-intelligence-only (Keepa pattern) |
| 6.7 | Category Compliance V2 (ASIN-level) | 🗄️ | `scope` field is the upgrade hinge |
| 6.8 | OQ-CC2 — M9 narrative mentions category | 🗄️ | V2 engine-touch, own gate |
| 6.9 | Engine-voice question | 🗄️ | Does M9 write our-voice legitimacy conclusions often enough to warrant a prompt fix? Data so far: blocking sentence on attempt 10, clean on attempt 13 — **intermittent** |
| 6.10 | Opus 4.8 → Opus 5 | 🗄️ | Free capability upgrade, same price. **Post-launch recalibration gate** — re-run A5, re-rule thresholds, re-freeze. Do alongside G4 |
| 6.11 | `max_brands_per_credit` is NULL on all client rows | 🔴 | Brand cap enforced from `PLAN_BRAND_CAPS` in code, not per-client. Resolve in the client-surface gate |
| 6.12 | Track 4 signal flap (`soft_fail` → `n_a` between runs on 021) | 🟡 | Logged, not acted on. Watch if it recurs |

---

## 7. GTM (not UI/UX — separate lane)

| # | Item | Status |
|---|---|---|
| 7.1 | Email marketing platform + sequences | 🔴 |
| 7.2 | LinkedIn presence + content cadence | 🔴 |
| 7.3 | Affiliate/referral (columns exist: `referral_code`, `referred_by`) | 🗄️ |
| 7.4 | YouTube avatar strategy | 🗄️ |

---

## 7b. CARRIED FROM THE PRIOR TRACKER (missed by the v2 draft — its mirror was dated 2026-07-04)

| # | Item | Status | Owner | Notes |
|---|---|---|---|---|
| 7b.1 | BUG-1 live check | 🔴 | F | Standing founder-ledger item since the S-1F handover |
| 7b.2 | Canary panel — first monthly run | 🔴 | F | All four amendment items implemented; the run itself never happened |
| 7b.3 | Untracked-folders ruling (`backups/`, `codex-fresh-design/`, `mockups-codex-exploration/`) + `skills-lock.json` | 🔴 | F | Standing ledger; the tree carries them every commit |
| 7b.4 | OQ-CC5/H4 embed decision — **now UNBLOCKED** | 🟡 | PT | The H4 negation carve-out is live: both founder-authored denial strings (the §8 governing law + the OQ-CC5 scope sentence) are embeddable at the client-surface gate. Was a blocker; now a choice |
| 7b.5 | Identity-discrepancy client-note enhancement ("the website you provided belongs to X" wording upgrade) | 🗄️ | PT | Logged pre-S-1; natural home = client-surface refresh |
| 7b.6 | Keepa Q-K2 test-gate corpus requirements | 🗄️ | PT | (a) the stall-breaker end-to-end (Keepa resolves the lean WITHOUT moving the verdict) · (b) a wrong/junk-link case (validation fires, graceful) · (c) real ASINs across scenarios — attach to 6.1 when the gate opens |
| 7b.7 | Q-K1's flagged consequence: the three dormant Keepa weight keys contradict the ruled design | 🗄️ | PT | Removal is a 6.1 build step; flagged UNRULED in `weights.ts` until then |

## 8. STANDING RULES

1. Founder runs ALL live/prod actions (migrations, batch re-runs, Stripe live). Fable never touches prod.
2. Spec → founder rulings → RED-first build → founder ATs → freeze declared → Fable records.
3. **Two-sided is three sides:** mandated denials, verdict vocabulary, and the evidence's own research vocabulary. Any new rule tests all three.
4. **No output scanner freezes until run against REAL stored engine output** from at least one delivered case.
5. Founder-authored spec docs the build depends on must live in the repo where verification can read them.
6. **When a design supersedes a spec, the superseding record must NAME what it drops.** (Three silent drops so far: category flags, banned-language surfaces, relationship records.)
7. New extractions land as NEW files — never re-copied over annotated ones.
8. Any new client-facing string joins the must-pass fixture in the SAME commit.
9. Client wording is a RENDERING concern — never a stored-literal change. No client-wording ruling may reopen a freeze.
10. **Productization gets built fast and rough — NOT gated like the engine.** The heavy gates are done.

---

## 9. RULED SEQUENCE TO FIRST PAYING CLIENT

1. ~~Founder hour — migration, re-runs, publish, test checkout~~ ✅ **DONE 2026-07-29**
2. **Client-surface / PDF gate** — spec first; ASIN field + one-brand cap built once; client-projection layer as a named deliverable
3. **Env separation + RLS suite** — pulled ahead of Keepa (the DB is the least-hardened thing in the system)
4. **Keepa gate**
5. **$149 tier assembly**
6. **Phase J** — live keys, legal, staging→main, Sentry, final E2E as a stranger

---

## 10. CUT LINE (≈3-week window)

**Must ship:** §1 in full.
**Ship shortly after:** blog/SEO · admin redesign · rerun button · super user + manual client · billing controls · news section.
**Post-launch:** email marketing · staff permissions · agency panel · analytics depth.

**If the window compresses, cut the super-user / manual-client / billing-control cluster first** — genuinely useful, but operator convenience. It does not block a stranger paying you.

---

*Open Items Tracker v2 — Hyprr Retail LLC — Internal.*
