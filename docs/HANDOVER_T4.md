# HyprrIQ — Session Handover (Track 4 built + multi-doc gate → T4 freeze → sub-gate B) · 2026-07-12

**Working dir:** `D:\Projects\Hyprriq\portal`. **Branch:** `staging` (pushed through `72be6b6`; `main` = empty scaffolding, 250+ behind — promote at a stable point, logged).
**Read this first, then the tracker — resume from "IMMEDIATE NEXT". Do NOT re-derive or re-litigate anything frozen/ruled.**
**⚠ THE ONE AUTHORITATIVE ENGINEERING TRACKER: `docs/HyprrIQ_OPEN_ITEMS.md` IN THIS REPO (git-tracked SSOT). The planning set (Business Plan v2, CURRENT_STANDINGS.md v2, Roadmap v4, Tech Arch v1.4, Prompts v2.1, ADR-G005/G006) lives in `D:\Projects\Hyprriq\Docs\` — product-level orientation ABOVE the tracker, read-only; on any engineering contradiction THE TRACKER WINS — flag, never reconcile silently.**

## ⛔ IMMEDIATE NEXT

1. **Founder runs the Track 4 live ATs** (his action, not yours): the live multi-document test (expect `distinct_sources: 2+`, cap lifting; `no_override_applied: true` if a strong doc meets a brand-flag case) + any remaining A-board items → **founder declares Track 4 (sub-gate A) FROZEN**. Record the freeze (spec `docs/superpowers/plans/2026-07-11-tracks-4-5-gate.md` + tracker).
2. **Then sub-gate B — Track 5 (sourcing_logic)**, already fully ruled in the same spec: a **NON-VOTING flag emitter** — n_a-locked-by-test signal, contract-frozen Module-4 contradiction shape (revisitable at the synthesis gate via a contract-version bump), **AT-B1 = byte-identical verdicts with Track 5 on vs off (the non-negotiable proof it never votes)**. OQ-B1/B2 CONFIRMED by founder; build TDD, STOP before founder ATs.
3. Then per the ruled sequence: **pre-launch security phase** (env separation + RLS suite + virus scanning for uploads + **ADR-008 caching, PROMOTED to pre-launch REQUIREMENT** with the AT-7 numbers) → **Synthesis Engine** (entry condition: firewall the `module_4` seam — enforced-test style; C3 quartet scanner requirement lives there too).

## FROZEN (all founder-declared; never touch without explicit sign-off)

H1–H7 (the hardening arc) · **SB-1** (domain under-resolution; TLD fix; llm_failed for Track 0.5) · **SB-2** (domain-first comparator; OQ-B copy) · **PG-1** (supplier_identity client projection; pre-delivery render KEPT + invitation lock) · **Track 3** (brand risk live; recency/homonym/subject prompt law; Keepa keys firewall-INERT via RULED_EXCLUSIONS + code drop) · **SB-3** (suffix-aware fast path). **Track 4 is BUILT, not yet frozen** — commits `c457a07..72be6b6` incl. the founder-ruled pre-freeze fix (`794ed73`: consensus-dropped veto no longer leaves same-source suppression; Track-4-scoped re-validation) and the multi-document gate (`72be6b6`).

**Frozen core (sign-off to touch):** `deriveTrackSignal`, `computeVerdict`, `weights.ts`, firewall logic (config grows by SO — **VALIDATION 1.6.0**), Evidence Pack 1.1.0, `identityResolver.ts`, `researchIdentityFor`, `applyVerdictCeiling` (KEPT per SO-5 — self-retiring; header states the ruling), **`applyDocumentationNoOverride`** (new; documents raise concern, never manufacture comfort — one fn, all three verdict sites), the 794ed73 restoration logic, the empty-set→soft_fail floor, publish-confirm, credit model. Versions: **PIPELINE 1.6.0 · VALIDATION 1.6.0 · pack 1.1.0 · rubric g003-1.1.0** (pin tests everywhere; `rerun-batch.ts` pins VALIDATION).

## STANDING RULES (founder-confirmed; memory files carry them too)

- **Gate rhythm:** spec (founder-review artifact) → founder signs SOs + rules OQs → TDD build, commit per task, full verify (tsc+eslint+vitest+build) → push staging → **founder personally runs ATs → freeze**. Never bundle. STOP before code at every gate; STOP before ATs after every build.
- **Fixture rules (7 earns):** select by DB mechanism, never labels; verify STORED vs LIVE class separately; test submissions choose brands DELIBERATELY (confirmed cases write brands into the corpus — the nike incident); **replay only DELIVERED attempts** (a non-delivered replay advances the live pointer — AWI-2607-022 is such an artifact, needs a clean founder re-run before fixture use).
- **Canary amendment (implement before the first monthly run):** pair every canary replay with zero-API rejudge; noise floor via double-replay; version-pin preflight on `replay-attempt.ts`. Seeded envelope: re-inference swung a band-boundary track 12→7 with zero drift.
- **Client-copy bar:** notes state OUR limitation/what we found about the INPUTS, never conclusions against a supplier; founder rules every exact client string. Infra failures carry NO client note (OQ-A).
- **analyst_reading quartet = ADMIN-ONLY** (stripped from delivered payload server-side); full scanner scrutiny required before any client surface (C3, synthesis/PDF phase).
- **Keepa:** API-integrated (Serper pattern), Scale+Agency-gated, pre-launch build item — **signal explicitly when its gate is reached; NEVER integrate before the founder provides the key**; keys stay inert; the corroboration single-source rider revisits then.
- **Pricing (locked):** Single $99 · Single Deep $149 [consideration] · Growth $279 · Scale $499 · Agency $999 [future]; enum unchanged. Retired forever: $79/$197/$249/"Starter"/"Full Dossier" (3 known code stragglers listed in the tracker; top-up pricing contradiction awaits a planning ruling).
- **Uploads:** max 5 files = silent guardrail (ONE constant+message in `lib/constants/uploads.ts`, form + route); documents optional/additive — never expand research scope, never add brands, **never lift a verdict band** (the no-override guard makes this explicit); virus scanning = security-phase checklist item.
- Env file `.env.local`. Founder runs everything touching prod (scripts, ATs, publishes); Claude reads prod DB read-only only. `replay-attempt.ts` is FOUNDER-RUN by its own header.
- Tooling: vitest doesn't typecheck (type-level RED needs tsc); PowerShell here-strings choke on embedded double quotes in commit messages; UTF-8 docs need `[IO.File]` read/write (Get/Set-Content mojibakes em-dashes).

## OPEN RULINGS / RIDERS AT THEIR DESIGNATED GATES (all in the tracker — headline set)

single_99 unowned vendor-directed-enforcement facet (tier-design/Synthesis; options i/ii/iii, founder leans ii→iii) · single_99 brand-attribution framing requirement (PDF phase) · SB-2 OQ-D live two-entity case (deferred-live, AWI-2607-018 = sentinel) · SB-3 OQ-B stale-advisory reading-layer revisit condition · Track 0.5 identity cost not in cost accounting (close in caching gate) · "which web-era rules transfer to single-doc mode" (routed to Synthesis gate) · main→staging promotion · Docs' 3 retired-pricing stragglers (G-1 batch).

## KEY ARTIFACTS

Tracker (SSOT): `docs/HyprrIQ_OPEN_ITEMS.md`. Gate specs with all rulings inline: `docs/superpowers/plans/2026-07-09-spec-b1…`, `2026-07-10-sb2…`, `2026-07-10-pg1…`, `2026-07-10-track3-brand-risk-gate.md`, `2026-07-11-sb3…`, `2026-07-11-tracks-4-5-gate.md`. Founder scripts: `rejudge-case.ts` (read-only determinism) · `replay-attempt.ts` (founder-run, writes) · `rerun-batch.ts <ids> --run` · `cleanup-corpus.ts`. Supabase `mjkacjrrrmlwlwkienvq` (single project = prod until env separation). Staging URL `hyprriq-git-staging-hyprrx-hyprriq.vercel.app`. New dep this arc: `unpdf`.
