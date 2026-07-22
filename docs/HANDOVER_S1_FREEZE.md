# HyprrIQ — Session Handover · 🏁 **S-1 FROZEN, LAYER 2 COMPLETE** · declared 2026-07-19, recorded 2026-07-21

**Working dir:** `D:\Projects\Hyprriq\portal`. **Branch:** `staging`. **Model note:** nothing here is model-specific — follow the artifacts, not memory.
**Read this first, then the tracker (`docs/HyprrIQ_OPEN_ITEMS.md` — THE SSOT), then the gate spec's freeze record. Supersedes `HANDOVER_S1F.md` (kept, marked).**

## 🟢 WHERE WE ARE — NOTHING IS BLOCKED, NOTHING IS MID-FLIGHT

**The Intelligence Synthesis Engine (ADR-G005) is FROZEN.** Founder-declared 2026-07-19 at `875f158`, `synthesis_version g005-1.0.0`. **S-1 = S-0 + S-2 + S-1a–f, all frozen.** The evidence layer (six tracks) completed 2026-07-14; the reasoning layer completes now.

Freeze evidence, re-verified from source at recording time: **796/796 across 91 files unpiped `$LASTEXITCODE 0`** · **tsc 0** (it caught the module-5 type divergence the green suite could not) · **frozen core byte-identical** — `git diff 875f158~1 875f158` over the verdict trio, weights, the firewall, the four calls, doubtMatrix, m1Assembler, the method scanner returns EMPTY, and no frozen file appears in the commit's 14-file list · **AWI-2607-021 reproduces `usable_with_conditions`** — the 3/8/13 rewire is doubt-only and moved no verdict, proven on a real delivered case.

## THE NEXT GATE — CLIENT-SURFACE / PDF (ruled sequence, do not resequence)

**client-surface/PDF gate → pre-launch security phase → caching/ADR-008 → Keepa gate + Category Compliance track (paired).**

The client-surface gate owns: **M9 activation** · **G1–G3** · **the EXACT client strings** (everything client-facing in code today is PROPOSED admin-side literal — `VERDICT_SENTENCES`, the M9 limitation sentences, the shape glue) · **per-brand-status rendering** (client-value #7) · **OQ-S2/S6** · the two T4-deferred laws (cross-track standpoint; financial scope) · **the plan→output mapping for category flags** · and the live client-copy exposure below.

**⚠ LIVE CLIENT-COPY EXPOSURE, carried into that gate:** the marketing site already advertises a capability that does not exist — `lib/content/how-it-works.ts:44` ("are there category flags") and `lib/content/help.ts:57` ("category risks"). This is the only item in the current backlog that is arguably live-risk today rather than future work.

## FOUNDER'S LEDGER (his, not the build thread's)

1. **Morendelli 30-day outcome-checkpoint email — WAS DUE ~2026-07-20; now past.** 2. **The additive migration (Supabase dashboard, non-blocking):** `ALTER TABLE case_synthesis ADD COLUMN synthesis_extension jsonb;` — until it lands, extension persists drop LOUD (audit-logged, H2 OQ-2 pattern). 3. staging→main promotion (steps long delivered; still pending). 4. Canary panel first monthly run. 5. `skills-lock.json` + untracked folders (`backups/`, `codex-fresh-design/`, `mockups-codex-exploration/`) rulings. 6. BUG-1 live check. 7. ~~Two items set by CONVENTION at Step 4 — his to confirm or change~~ **✅ RESOLVED (founder-confirmed 2026-07-19 in-session, recorded 2026-07-21): `g005-1.0.0` CONFIRMED as the S-1 value; A6's additive contract field ACCEPTED under A6's standing approval. Not open items.**

## G4 ENTRY CONDITIONS (all three, carried forward)

**(a) K-term noise dominance in the gap axis** — the axis sums unresolved assertions + stored unknowns, and real attempts carry 3–14 stored unknowns, so the unknowns term dominates the signal the threshold reads. **(b) Degenerate cost axis** — Axis 2 lands `low` 59/66, `severe` 0/66; an axis that never reaches its top level is unexercised, not calibrated. **(c) A6 per-hypothesis scoring vs H1 immutability** — scoring a delivered attempt's hypothesis writes to the reasoning row H1 exists to protect; the write path is G4's design problem. These are why 3/8/13 is **PROVISIONAL-PENDING-G4**.

## FROZEN — NEVER TOUCH WITHOUT SIGN-OFF

Everything through S-0/S-2 (see tracker) + all of S-1: **S-1a contracts (`530881b`)** · **S-1b `m1Assembler.ts` (`bd5402c`)** · **S-1c `synthesisCallA*` (`af04420`)** · **S-1d `synthesisCallB*` (`e30808a`)** · **S-1e `synthesisCallC*` + `doubtMatrix.ts` + `synthesisMethodScan.ts` (`2ea4893`)** · **S-1f wiring + freeze (`d82248b`, `875f158`)**.
Versions: PIPELINE 1.7.0 · VALIDATION 1.7.0 · **synthesis g005-1.0.0** · rubric g003-1.1.0 · pack 1.1.0. Suite **796/796 unpiped exit 0**.

## KEY IN-CODE FLAGS THE NEXT SESSION MUST KNOW

- `SYNTHESIS_GAP_THRESHOLDS` (synthesisEngine.ts) = the RULED 3/8/13, provisional-pending-G4. `TEST_ONLY_GAP_THRESHOLDS` (synthesisCallC.ts) is the test fixture — importing it in production code is a defect, now locked against in `s1f.freeze.test.ts`.
- `VERDICT_SENTENCES` + the M9 limitation sentences + shape glue = **PROPOSED admin-side literals** — the client-surface gate rules the exact strings.
- The FINANCIAL_SCOPE regex exists in TWO frozen files (callB + callC), kept identical by the cross-file lock in `s1f.wiring.test.ts` — consolidation only at a gate that unfreezes one.
- **`scripts/backtest-synthesis.ts` now measures the PRODUCT thresholds.** The delivered 2026-07-19 table was produced under the TEST_ONLY 1/3/6 stand-in — reproduce it from commit `b46e280`, NOT from the current harness.
- b2b advisory metadata is not reconstructed by the backtest harness; M1 diversity carriers ride empty on live wiring v1 — both flagged, neither verdict-relevant.
- **Naming trap:** `lib/research/tracks/track05.queries.ts` is **Track 0.5 (identity discovery)**, NOT Track 5. Track 5 makes no research calls at all.
- The four delivered-case rejudge ids: 001 `a1ee6ef3-6527-47fe-8050-0bb467528e20` (expected exit 1, ruled pre-existing) · 021 `2b359a6a-98f9-49c9-8f57-c19f4d8daaac` · 023 `6c4ad68d-b2a7-446a-9064-e60f0683c13c` · 031 `5f6a093f-d3f8-4675-be4e-4452b931a80e`. 022 case id `1e13b79e-09ce-4100-abf2-4b1333b449c5`.

## STANDING (compressed — full versions in the tracker)

LLM proposes code decides · absence ≠ fraud · Modules 1–8 never reach any external party · no threshold tuning to force a result · founder runs everything touching prod; build thread reads prod READ-ONLY only · `.env.local` env file · TDD RED-first with WATCHED-FAILS (a lock that has never failed is not a lock) · stop-before-ATs · describe-and-stop on migrations/frozen surfaces · claims about repo state verified FROM SOURCE · **a ruling that exists only in conversation is NOT a ruling** · corrections preserve the original text and mark it, never delete · **NEW (2026-07-19): a ruling's casualties are recorded for EVERY output it kills, not just the first** (the OQ-B3 category-flags lesson) · planning-thread errors get flagged not reconciled · the founder's mandate: verify his instructions from source, challenge errors plainly, proceed autonomously on reversible non-gated ground.

## KEY ARTIFACTS (all in-repo)

Gate spec + the full S-1 freeze record: `docs/superpowers/plans/2026-07-16-synthesis-engine-gate.md` · Tracker SSOT: `docs/HyprrIQ_OPEN_ITEMS.md` · The two S-1f ruling artifacts: `2026-07-19-a5-backtest.md` (66-row table + distribution, under TEST_ONLY thresholds) and `2026-07-19-a5-flip-contradictions.md` · doubt matrix (filled, d7-1.0.0): `2026-07-16-doubt-matrix-skeleton-UNFILLED.md` (filename historical; content governs) · ADDENDUM-1: `2026-07-16-synthesis-addendum-1-algorithm-amendments.md` · superseded mid-sitting handover: `docs/HANDOVER_S1F.md` · UI/UX tracker (ASIN field entry — shared dependency of Keepa + Category Compliance): `D:\Projects\Hyprriq\Docs\HyprrIQ_UIUX_TRACKER.md`.

**NEXT SESSION'S OPENING MOVE:** read this file → read the tracker's headline + item 5 → confirm with the founder which gate opens next (ruled: client-surface/PDF) → that gate gets its OWN spec + founder rulings before any code, the same discipline S-1 just completed under. **No S-1 work remains. Nothing is in flight.**
