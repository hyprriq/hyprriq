# HyprrIQ — Build Roadmap & Workflow v5
## The Single Map: Where We Are, What's Next, What's Reserved

**Version:** 5.0 — Supersedes Build Roadmap v4 (July 2026) and v3 (off-disk; its critical-path line survives below, verbatim).
**Date:** 2026-07-28
**Location note (spec-in-repo standing rule):** the roadmap now lives IN THE REPO (`portal/docs/`). v4 stays in `Docs/` marked superseded; never deleted.
**Every status below was verified from source/git/live-DB this sitting — not carried from v4.**

**What changed v4 → v5:** v4 was written mid-hardening and froze in place: it shows H4 as BUILDING and H5–H7, G2a, G2b as blocked/not-started — **all of that is now FROZEN AND DONE**, plus a body of work on neither roadmap. This version reconciles the map to reality and states the uncomfortable constant plainly:

> **H-pdf — the client-readable report — has been the open gap in BOTH v3 and v4.** Two consecutive roadmaps where "the client can't read anything" went unclosed while the engine beneath it became excellent. Closing that gap is the point of this document.

---

## THE FOUR LAYERS — v5 status

```
LAYER 1 — EVIDENCE     ✅ COMPLETE  (Tracks 0, 0.5, 1–5 + Track 6 Category Compliance)
LAYER 2 — REASONING    ✅ FROZEN    (Synthesis Engine g005-1.0.0, S-1 freeze 2026-07-19)
LAYER 3 — DECISION     ✅ FROZEN    (deterministic verdict engine, ADR-G004)
LAYER 4 — LEARNING     🟡 WRITE-SIDE LIVE (ledger+rollups+A6+outcomes; read-side reserved G6)
DELIVERY               ⬜ THE GAP   (H-pdf / client-surface gate — the client still can't read it)
```

---

## PHASE STATUS — THE FULL MAP (verified)

| Phase | What it is | v4 said | **v5 reality (verified)** |
|---|---|---|---|
| A–D | Schema, health, auth, marketing, Stripe products | ✅ | ✅ |
| E | Checkout + webhook | 🟡 "test-mode webhook fix pending" | **✅ CLOSED (founder AT 2026-07-28)** — code-complete (signature verification, idempotency, 5 events, lazy client-row creation, fail-loud top-ups, billing_audit; five price IDs Stripe-verified) **AND the end-to-end test checkout PASSED: clients row created with single_99 / one_time / 1 credit / active — lazy creation, plan mapping, and credit allocation DB-verified.** Live-mode keys remain a Phase J item. *Gate-spec flag: `clients.max_brands_per_credit` is NULL on every row — `PLAN_BRAND_CAPS` in code is the authority until the gate rules otherwise.* |
| F | Portal screens, lifecycle | ✅ mostly | ✅ — settings/support/help/billing/onboarding pages exist; drag-drop in submit-form; **role-enum migration 20260620 IS APPLIED** (live probe: `role` values founder/client + `agency_id` present — v3's "written not applied" is stale). **Open: admin credit-adjust/refund tool (not found in admin API — still manual via dashboard).** |
| G1 | Tracks 0–2, acquisition, Inngest | ✅ | ✅ hardened (H1–H7 under it) |
| H1–H7 | The integrity substrate | H4 building; H5–H7 ⬜ | **✅ ALL SEVEN FROZEN** (H7 at 2026-07-07) |
| G2a | Tracks 3, 4, 5 | ⛔ blocked | **✅ ALL FROZEN** (Track 3 2026-07-10 · Track 4 sub-gate A 2026-07-11 · Track 5 sub-gate B 2026-07-14). Evidence layer complete 2026-07-14. |
| G2b | Synthesis Engine (the IP) | ⛔ blocked | **✅ FROZEN** — S-1 = S-0+S-2+S-1a–f, `g005-1.0.0`, declared 2026-07-19 at `875f158`. Four calls + B′ refuter, founder-authored doubt matrix d7-1.0.0, ruled gap thresholds 3/8/13 (provisional-pending-G4), A5 backtest (66 attempts, $6.97), flip ruling, A6 watch conditions live. |
| G3 | Memory write-side | ⬜ | **🟡 2-of-3 + rulings (2026-07-28):** ledger+rollups live (G007 reshape), outcomes+checkpoint cron live (admin-digest by design), loud-non-fatal RATIFIED superseding the ADR + the degraded-writes tripwire; **vendor×brand relationship records = G6 backfill task (casualty note recorded)**. |
| **NOT ON v4 AT ALL** | | | **Track 0.5 identity resolution · SB-1/2/3 · PG-1 · F-spec F1–F5 · dispute re-run (no-advance) · A5 backtest + threshold calibration · Track 6 Category Compliance (cc-1.0.0, $499-gated, own step outside the registry, verdict-inert proven) · the banned-language fix gate (frozen `20ede18` + the 2026-07-28 amendments) · four Brief v1 sections recovered + verified against code · doc recovery discipline + the absent-docs list** |
| **H-pdf** | **The client report** | ⬜ | **⬜ THE GAP — now the client-surface/PDF gate**, with ~a dozen accumulated rulings waiting in the tracker (M9 activation, exact client strings, per-brand status, category rendering/Condition 3, ASIN intake field + one-brand cap, operator-added material modes A/B, §9.1 rephrase, the two PROPOSED copy edits, client-view reactions, OQ-CC5/H4 embeds) |
| I | Monitoring + test suites | ⬜ | **⬜ mostly** — Sentry NOT wired (`app/error.tsx` comment: "Wired to Sentry in a later session"); UptimeRobot external/not set; in-app support page exists (not a widget); **RLS test suite NOT built** (RLS policies exist in migrations; the suite verifying them does not — pre-launch security phase, "business-ending risk" class with env separation). Watchdog + outcome + degraded-writes crons DO exist. |
| J | Go live | ⬜ | ⬜ — env separation, live Stripe keys (incl. a live $149 when the tier exists; the test ID never reaches Production), legal pages, staging→main, the category-copy truth condition (now satisfiable), `SAAS_ARCHITECTURE.md` $79/$197 doc fix |
| G6 | Memory read-side | 🔒 | 🔒 — **and re-scoped: a HEAVY gate** (the ADR's weighted-verdict-input design now requires reopening the frozen verdict engine — logged 2026-07-24; alternative: scenario-intelligence-only, the Keepa pattern) + the relationship-record backfill task |
| K | Agency Mode | 🔒 | 🔒 — architecture documented; `agency_id` nullable and live in schema |

---

## THE CRITICAL PATH (v3's line, carried verbatim, because it was right)

> "G3, G6, and K are enhancements that come after you can take money and deliver a report."

**v5's path — RATIFIED BY THE FOUNDER 2026-07-28 (security amendment included):** the engine is done; the money path is CLOSED (Phase E AT passed); **the first full loop is proven end to end** (AWI-2607-022: wired engine → real synthesis → M9 → publish gate → delivered — the client-surface gate's development fixture). The ruled order: **(1) founder hour ✅ → (2) client-surface/PDF gate (spec first; ASIN field + one-brand cap built once; the client-projection layer a named deliverable, category projection included — the gate does not close without it) → (3) env separation + RLS suite → (4) Keepa → (5) $149 tier → (6) Phase J.** Keepa and $149 ride per the pre-launch sequence ruling ("$149 must be visibly worth $50 more than $99"). Everything else is enhancement.

---

## v4 STATEMENTS SUPERSEDED (explicit, so nobody builds the old version)

1. **KEEPA — v4 placed it INSIDE Track 3.** ❌ SUPERSEDED. Track 3 is a SCORING track; v4's placement would have made Keepa a **verdict input** — the exact thing the Keepa gate ruling forbids (Q-K1, 2026-07-18: scenario intelligence, NEVER a verdict input). Keepa is a PLUGIN at its own gate, needs the ASIN intake field (client-surface gate), pairs with Category Compliance V2. The three dormant Keepa weight keys in `weights.ts` are the fossil of v4's design — **removed at the Keepa gate, never revived**.
2. **AUTOMATION MODEL — v4 locked "full automation, human optional; AI output = 100% complete."** SUPERSEDED BY THE OPERATING REALITY, reconciled into one statement: **the ENGINE reaches report-ready autonomously (v4's part that survives — and it does, end-to-end), and the FOUNDER's review is a designed, value-adding layer, not a failure mode** — universal awaiting_review gate, approve/override with written reasons (ADR-G004's own design), and operator-added material as a first-class capability (Mode A report-note / Mode B track-finding + mandatory re-run, ruled 2026-07-24). Roughly 80% AI / 20% human. **The reconciled statement governs.** v4's "100%, human optional" described the engine's ceiling, not the product's operating model — and the $999 Agency tier it cited as the forcing function is itself future/unpriced (below).
3. **THE TWO RESERVED G2b DESIGN QUESTIONS — status: NEITHER was formally ruled during S-1; neither lapsed silently either.** Reported, not resolved: **(a) Confidence Arbitration Layer** — S-1 built the B′ refuter (A3: an adversarial second read of Call B, conviction artifact, advisory-only) plus the synthesis firewall + certified M4 — which together occupy the ground the question named; but no ruling ever said "this IS the arbitration layer, closed." **(b) "Need More Information" output** — never added; the four verdicts stayed locked; the tracker still carries it as the one sanctioned addition candidate, tied to the confirmation loop (client-surface gate territory). **Both go on the client-surface/PDF gate's ruling board to be closed deliberately.**
4. **PRICING — v4's "$999 Agency tier."** Not in the locked model (one-time **$99 · $149** · monthly **$279 · $499** · top-ups **+3/$99 · +6/$179**, Stripe-verified). **Marked FUTURE/UNPRICED** — it rides Agency Mode (K), reserved. The retired figures ($79/$129/$197/$239/$249) are lock-tested out of live copy.
5. **v4's H5 note — "engine must generate observable-signal language, not authorization/guarantee claims" prompt hardening.** **VERIFIED: NOT a fourth silent drop.** H5 Task 5 shipped exactly what it scoped: the ATTRIBUTION guard in Track 1+2 system prompts (present, test-asserted), and Call C later shipped its own laws ("never 'confirm authorization' — only observable signals", attribute-to-source). The 2026-07-28 probe's "is a verifiably legitimate corporate entity" is a **LEGITIMACY-vocabulary** conclusion — a class NO document ever scoped for prompt hardening (H5's scope line and its "why not" reasoning are explicit in the plan). So the engine-voice question stands as logged: **new scope for a future engine gate, answerable with data — not planned-work completion.** The H14 scanner amendment covers the gap at the publish gate meanwhile.

---

## CLOSED IN THIS RECONCILIATION

- **PLAN_BRAND_CAPS.scale placeholder — FOUNDER RULED: 5 brands, 1 ASIN per brand** (the ASIN half lands with the client-surface intake field). The TODO in `lib/constants/plans.ts` is closed with the ruling.
- **The reading set fixed:** v4 pointed at `Brief_v1.docx` (OFF-DISK — four sections recovered into `portal/docs/`: category flags · banned language · escalation triggers · verdict gates, each verified against built code) and `Business_Plan_v1.docx` (retired pricing). **v5's reading set:** `docs/HyprrIQ_OPEN_ITEMS.md` (THE SSOT) · the gate specs in `docs/superpowers/plans/` · the four recovered tables · `Docs/HyprrIQ_Technical_Architecture_v1_4.md` · the ADRs. Brief v1 §13 remains HISTORICAL STRUCTURE ONLY (retired pricing) if ever recovered.
- **Build Roadmap v3 joins the absent-docs list** (referenced by v4, not on disk).

## BUILD DISCIPLINE — unchanged from v4, plus what this arc added

Spec → founder rulings → RED-first build → founder ATs → freeze. Two-sided tests. Founder runs migrations/prod. Frozen core byte-identical. **Added since v4, now standing:** a ruling that exists only in conversation is not a ruling · a ruling's casualties are recorded for every output it kills · spec docs the build depends on live in the repo · new client strings join the must-pass fixture in the same commit · **no output scanner freezes until run against real stored engine output** · new extractions land as new files, never over annotated ones.

---

*Build Roadmap v5 — Hyprr Retail LLC — Internal. Supersedes v4 (kept, marked) and v3 (off-disk). This is the map; the tracker is the truth.*
