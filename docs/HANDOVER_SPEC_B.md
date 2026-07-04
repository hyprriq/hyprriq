# HyprrIQ — Session Handover (Spec-B → next) · 2026-07-05

**Working dir:** `D:\Projects\Hyprriq\portal` (lowercase "iq"). **Branch:** `staging`. **Next-build model:** **Fable**.
**Read this file first — it is the single source. Do NOT re-derive; resume from "IMMEDIATE NEXT".** Auto-memory `build-progress.md` points here.

## ⛔ IMMEDIATE NEXT — Spec-B is a HELD FOUNDER GATE (nothing shipped yet)
Spec-B (Track 0.5 website-anchored vendor-identity resolution) is **BUILT + fully tested** but committed **LOCAL-ONLY** as `c2c61c2` — **NOT pushed, NOT deployed, migration NOT run.** `origin/staging` is still at `fe51002`. Order (founder-run — Claude never touches prod/migrations/live-validation):
1. Founder reviews `c2c61c2` (`git show c2c61c2 --stat`).
2. Founder runs migration **BEFORE deploy** (this one adds a column the new code writes — opposite of a drop): `supabase/migrations/20260705000000_vendor_intelligence_entered_names.sql` → `ALTER TABLE vendor_intelligence ADD COLUMN IF NOT EXISTS entered_names text[] NOT NULL DEFAULT '{}';`
3. Then push/deploy: `git push origin staging`.
4. Founder live-validates globaldist (name="Bosch", website=globaldist.com, brand="Bosch"): resolves **"Global Distribution LLC"** from the website, `identity_discrepancy.kind="name_is_brand"`, `resolution_confidence=high` + `input_consistency=low`, `identity_unconfirmed=false` (no verdict penalty), client "⚠ Please confirm the supplier" banner shows, **memory keyed on resolved identity, NOT "bosch"**. Entity-name discovery is LLM-behavioral (branch logic is unit-locked).

## What Spec-B did (commit `c2c61c2`, additive to FROZEN Track 0.5; verdict math/fraud keys/Track1-2-3 untouched)
A name/website mismatch is an **intelligence signal, never fraud, never a verdict/confidence penalty** (lowers `input_consistency` only). Key files:
- `lib/research/websiteAnchor.ts` — PURE decision: `name_is_brand`/`name_website_mismatch` → resolve from website (identity holds); `multiple_entities`/`website_dead` → escalate (existing `manual_override_required`, never fraud) + plain `client_note`.
- `lib/research/track05.ts` — matched name≈website = unchanged zero-research fast-path; mismatch → domain-keyed research (`buildDomainIdentityRequests`) → dominant real entity → `resolved_name` = discovered entity; name research only for the ambiguity check; brand-in-name short-circuits.
- `lib/research/contracts.ts` — `IdentityDiscrepancyKind` (9-value enum, 4 implemented) + `IdentityDiscrepancy`; two-dim confidence `resolution_confidence`+`input_consistency` (optional; legacy `identity_confidence` kept); `resolution_method += "resolved_from_website"`. `identity.prompt.ts`/`identityResolver.ts` gained `entity_name` (LLM proposes).
- `lib/data/intelligence.ts` — **memory re-keyed on RESOLVED identity, never entered name** (fixes active pollution bug: globaldist wrote a "bosch" row); records `entered_names` aliases (needs the migration).
- Client `components/portal/case-detail-view.tsx` (Overview banner, pre-delivery) + admin `components/admin/case-review.tsx` (discrepancy panel); `supplier_identity` threaded via `cases.ts`/`admin.ts`.
- Tests: `websiteAnchor.test.ts`, `track05.test.ts` (globaldist/multiple_entities/dead-website), `intelligence.test.ts` (re-key). **289 total, +10.**

## Held sequence AFTER Spec-B ships+validates (do not lose)
1. **Track 3 — Brand Risk Assessment**: design spec DONE + awaiting founder review of its **5 OQs** → `docs/superpowers/specs/2026-07-03-track3-brand-risk-assessment-design.md` (grounded in the locked `brand_risk_assessment` weight table; Keepa = new plugin, OQ-1). On OQ answers → impl plan → founder review → TDD build → live-validate → freeze. **Forward-flag from ADR-T1-001: run the veto-collision audit on Track 3/4 hard-fail keys' ALLOWED_PROFILES/MIN_AUTHORITY before they freeze.**
2. **Track 5 — Sourcing Logic** (last finding track).
3. **Deferred UI batch** ([[deferred-ui-portal-session]]): credits/plan display bug, "Upgrade to Scale" button, mobile responsive layout — UI-only, after Track 3 spec review.

## Recent context you may need (all on staging unless noted)
- Track 0.5 FROZEN (matrix validated) → Track 1 retrofit to resolved_domain (`757c717`) → Track 2 ADR-T2-002 decision-separation (validated) → admin Questions Gap A/B (`389e88d`/`3f0e932`) → dropped vestigial `failure_type` (`d424419`, migration `20260704000000` founder-run).
- **Track 1 fraud-classification fixes (all validated/shipped):** scam corroboration gate `VALIDATION_VERSION 1.2.0` (`ef76964`), registration_fabricated prompt rule (`b34d5cb`), **website_fraudulent definition** (`fe51002`) — collision-class audit + residual seam in `docs/adr-t1-001-scam-corroboration-gate.md`.
- Re-run harness: `scripts/rerun-batch.ts` (backup-first, founder-run) — used for the 8-case re-scores.

## Working rhythm / standing orders
Verify (tsc+eslint+vitest+next build) + commit each change; honest progress. Gate-based: spec→founder review→plan→review→TDD build→founder live-validation→freeze; **no code until plan approved**. Founder runs ALL migrations (write→founder runs→confirm via information_schema→then code) + ALL live-validations (prod Supabase + real keys); **Claude never touches prod data**. Frozen-track changes = investigate→founder review→build. Test-engineer mindset: hunt+fix bugs before production ([[test-engineer-debug-standing-order]]).

## Key identifiers
Supabase `mjkacjrrrmlwlwkienvq.supabase.co` (single project = prod). Inngest app `hyprriq`. staging URL `hyprriq-git-staging-hyprrx-hyprriq.vercel.app`. Untracked-but-harmless: two old plan docs under `docs/superpowers/plans/2026-06-28-*`, plus local `backups/` (re-run snapshots). `main` is stale — promote staging→main before go-live.
