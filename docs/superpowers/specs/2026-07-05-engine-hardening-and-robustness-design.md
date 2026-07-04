# Engine Hardening & Robustness — Design Spec + ADR-G007 (Proposed)

**Date:** 2026-07-05 · **Branch:** `staging` · **Status:** DRAFT — for founder review before any implementation plan.
**Source:** the 2026-07-05 independent audit (5 subagents + fresh-context verification; all findings file:line-anchored and live-data-confirmed).
**Sequence context (HANDOVER_SPEC_B "IMMEDIATE NEXT"):** Spec-B shipped; globaldist live-validation pending; held sequence was Track 3 → Track 5 → UI batch. **This spec proposes inserting the hardening phases BEFORE Track 3** — reasons in Part 1.

**Goal:** one engine that (a) gives the same answer to the same case every time, (b) survives typos, wrong data, and conflicting evidence without producing a wrong or unstable verdict, (c) fails loudly instead of scoring its own failures, and (d) is ready to receive Track 3–5 and the invisible Synthesis Engine on a foundation that will not need re-work.

---

## PART 1 — PLAN OF ACTION (all audit issues, phased and ordered)

Phases are ordered by dependency, not just severity. Each phase ends with a founder gate (migration run and/or live-validation). Nothing in Phases 1–6 touches `deriveTrackSignal`, `computeVerdict`, `weights.ts` scoring, or the Evidence Pack schema — the frozen decision core stays frozen; we fix what feeds it and what records it.

| Phase | Name | Fixes (audit ref) | Founder gate |
|---|---|---|---|
| **H1** | Truth & Record layer | Re-run overwrites delivered records; no evidence snapshot; no attempt history; corpus double-count on re-run | Migration (attempt/pins), live-validate one re-run |
| **H2** | Fail-loud error semantics | LLM/parse failure scored as soft_fail (live: Ingram "could not parse" → do_not_rely); persistence errors swallowed; no Inngest onFailure/concurrency/watchdog; dead-end statuses (`request_investigation`, `queued`); paid-but-stuck submit | None (code only), live-validate a forced failure |
| **H3** | Verdict semantics correction | Stub Tracks 3/4/5 score as real soft_fail → only 2 of 4 verdicts reachable; Track 5 stub persists a signal row | OQ-1 decision, live-validate one clean case |
| **H4** | Identity coherence | Tracks 1/2 research the ENTERED name after resolution (wrong-entity verdicts); fuzzy fast-path (Medline/medlink); Spec-B validation gap | Live-validate globaldist WITH evidence-entity check |
| **H5** | Client surface & compliance | `ai_output_json`/`manual_notes` shipped to browser at every status; banned-language scan too narrow (surface + regex gaps) | None (code only) |
| **H6** | Money & corpus integrity | Webhook credit RMW races; memory write unguarded/unlogged/double-counting; no domain key; junk rows; `case_outcomes` empty | Migration (RPCs + ledger + domain), corpus cleanup script (founder-run) |
| **H7** | Firewall hardening | `website_fraudulent` single-source lock; corroboration counts pack-ids not URLs; no source-diversity for pass; T3/T4 keys absent from firewall registries | OQ-2/OQ-3 decisions |
| **T3–T5** | Track 3 → Track 4 → Track 5 | Existing Track 3 spec (2026-07-03) + its 5 OQs + veto-collision audit | Per existing rhythm |
| **S** | Synthesis Engine (the invisible engine) | ADR-G005 nine modules, built per Part 5 §D | Spec → review → build |
| **L** | Learning loop | 30/90-day outcomes, accuracy dashboard, corpus read-side (G6 trigger) | Migration + cron approval |

Why hardening precedes Track 3 (three code-grounded reasons): (1) every verdict Track 3 improves is currently computed on unfrozen evidence and mutable records; (2) all Track 3/4 weight keys are missing from `ALLOWED_PROFILES`/`MIN_AUTHORITY` in `weightValidation.ts:18-60` — wired as-is, every Track 3 evidence item auto-rejects and the soft-fail floor persists *after* the build; (3) Track 3 inherits whatever identity the tracks research (H4).

---

## PART 2 — HOW EACH ISSUE IS FIXED (mechanisms, anchored)

### H1 — Truth & Record layer (the determinism fix)
**Principle: collect once → freeze → judge from the frozen record → never mutate a delivered case.**

1. **Attempt semantics.** `upsertTrackResult` (`lib/data/track-results.ts:64`) gains a required `attempt_number` from the pipeline context instead of the hardcoded `1`. A pipeline execution computes its attempt at start: `max(attempt_number)+1` for re-runs of a case that already has rows (first run stays 1). The UNIQUE `(case_id, track, attempt_number)` already exists — inserts, never overwrites.
2. **Delivered-case immutability.** `stageFinalize` (`lib/research/pipeline.steps.ts:160-181`) refuses to touch `cases.verdict/status` when `status='delivered'|'complete'`; a re-run of a delivered case persists its rows under the new attempt and sets a `reinvestigation_pending` flag for admin review. Delivery (`review/route.ts`) pins `cases.delivered_attempt`.
3. **Evidence packs become the input of record.** Packs are already persisted append-only (`lib/data/acquisition.ts:8`) with a deterministic hash (`pack.ts:18-25`). Add `attempt_number` to the pack row, and add a **replay mode** to the pipeline: `runPipeline(ctx, { replay_attempt: N })` loads the stored packs for attempt N instead of calling `orchestrator.gather` — same evidence in, and (given H7's extraction stability) the same verdict out. This is the "re-score stored evidence" capability the re-run harness explicitly lacked (`scripts/rerun-batch.ts:13-14`).
4. **Corpus writes keyed per (case, attempt)** — see H6 — so a re-run can never double-count.
5. **Audit trail.** Every re-run writes an `audit_log` row (actor, case, prior attempt, new attempt). Today the July-4 overwrites left zero audit records.

### H2 — Fail-loud error semantics
1. **LLM failure ≠ finding.** `parseTrack1Output`/`parseTrack2Output` already collapse failures to empty items; instead, the catch in `track1.ts:56-62` / `track2.ts:71-77` sets `llm_failed: true` on `TrackOutput` (new optional field, mirror of `acquisition_failed`). `stageFindingTrack` maps it exactly like the acquisition guard: signal `n_a`, `manual_review_required: true`, reason "model call failed — could not extract evidence", `founder_review_status: 'pending'`, no memory write. Hard Rule #15 applied in both directions.
2. **Persistence errors throw.** Every discarded `{ error }` in `pipeline.steps.ts` (`:46, :77, :104`) and `intelligence.ts` (`:21, :24`) becomes a thrown error inside the Inngest step → Inngest retries → real failures surface instead of finalizing incomplete cases.
3. **Inngest hardening.** `pipeline-run-case` gains `concurrency: { limit: 5 }` (protects Anthropic/Serper from self-inflicted 429 storms), `onFailure` → set `cases.status='research_failed'` + admin notification, and a scheduled watchdog function (cron, every 15 min) sweeping cases stuck in `research_running` beyond 30 minutes → `research_failed` + alert. (First scheduled function; also the home for the L-phase outcome crons.)
4. **Dead ends re-wired.** `request_investigation` re-sends `pipeline/run-case` (as a new attempt per H1). `confirm-scope` either triggers the pipeline or routes to the founder queue explicitly — `queued` stops being a black hole. Submit-path `inngest.send` failure refunds the credit (the `refund_client_credits` RPC already exists) and marks the case `submission_failed` instead of leaving a paid `pending_intake`.

### H3 — Verdict semantics correction
1. Stub tracks return `not_implemented: true`; `stageFindingTrack` maps it to signal `n_a` + `track_N_status='skipped'` + `founder_review_status='approved'` (nothing to review), and **no row for Track 5** (the arbitrator never has a signal row — matches the master spec). `computeVerdict` already redistributes weights over `n_a` — no frozen-code change.
2. **OQ-1 (founder):** with only Tracks 1–2 real, should the engine be allowed to output `source_clear`? Recommendation: **no** — cap the score-verdict at `usable_with_conditions` while `brand_risk_assessment` is `n_a`, with a code-templated "dimensions not assessed" limitation block listing skipped tracks. A `source_clear` that never looked at brand risk (30% weight, "the actual account risk" per the master spec) is indefensible in a dispute. The cap is implemented in `pipeline.steps.ts`/finalize (NOT in `computeVerdict`) and removed automatically when Track 3 goes live.

### H4 — Identity coherence
1. `buildTrack1Requests`/`buildTrack2Requests` and both prompts use the **research identity**: `resolved_name` when `resolution_confidence` is high/medium (methods `provided|resolved_dominant|resolved_from_website|normalized`), else the entered name. The entered name is passed to the prompts as an alias line ("client entered: X — treat as the same entity where the domain matches") so alias-scoped evidence still counts. The contract already mandates this (`contracts.ts:51` "tracks use THIS, not original_input") — the fix honors an existing contract, no new contract.
2. **Fuzzy fast-path tightened:** when a website is provided and the name matches the host only *within* tolerance (not exactly after normalization), run the Spec-B domain-identity check instead of the zero-research fast path (`track05.ts:87-90`). "Medline" + medlink.com stops silently binding. Cost: one extra Sonnet call on near-miss cases only.
3. **Spec-B validation extension:** the globaldist live-validation checklist gains one item — *"Track 1 `evidence_items` are about Global Distribution LLC, not Bosch."*

### H5 — Client surface & compliance
1. `getCaseFindings` (`lib/data/cases.ts:129`) stops selecting `ai_output_json` and `manual_notes`; it returns `[]` server-side unless `findingsVisibleToClient(status)` — the gate moves from render to data. The page passes only what the client may see.
2. Banned-language scan runs over **every client-visible string at delivery**: compiled findings, `questions_to_ask`, `identity_discrepancy.client_note`, `brand_relationship_finding`. Regex list extended: "approved seller/reseller", "brand approved", "fully legitimate" (spec list vs `banned-language.ts:5-15`).
3. Admin remains unrestricted (separate components, role-guarded routes).

### H6 — Money & corpus integrity
1. **Atomic credit RPCs** (migration, founder-run): `add_client_credits(client_id, amount)` and `apply_plan_renewal(client_id, plan_credits, rollover_cap)` as single SQL UPDATEs; the webhook (`stripe/route.ts:45-49, :211-221`) calls them. Same shape as the proven `deduct_client_credits`. Also re-point or drop the stale `reset_client_credits` (keys retired plan names — `initial_schema.sql:830-835`).
2. **Intelligence event ledger** (migration): append-only `intelligence_events` (case_id, attempt_number, resolved_name, resolved_domain, entered_names, brands, track1_signal, verdict, created_at, UNIQUE(case_id, attempt_number)). `vendor_intelligence`/`brand_intelligence` become recomputable rollups (case_count = COUNT(DISTINCT case_id)); `risk_history` finally gets its append (from events). Fixes double-count, provenance, and corpus versioning (ADR-G006's own requirement) in one seam.
3. **Write gating:** memory write skips when `identity_unconfirmed` (today only `identityAcquisitionFailed` is checked — `pipeline.steps.ts:155-157`); dev/validate routes stop writing corpus rows; errors propagate (H2).
4. **Domain key:** `vendor_intelligence.resolved_domain` column + lookup; `normalizeName` guard for empty-key collapse (non-Latin names) — write refused (event still recorded) rather than merged into a `""` row.
5. **Corpus cleanup (founder-run script, backup-first):** merge td synnex/td synexx, delete Zzqxwv/xyz/colox/nike-on-Bosch junk, recompute counts from the event ledger backfill.
6. **Outcome loop (Phase L, but the migration ships now):** `case_outcomes` columns `outcome_30d/outcome_90d/prediction_correct`; Inngest crons email the client at 30/90 days post-delivery; a one-click response writes the row. The moat's ground truth starts accumulating from the first delivered case.

### H7 — Firewall & extraction stability
1. **Canonical-URL dedupe** in `finalizePack` (before `src_N` numbering): strip scheme/`www.`/trailing slash/query-tracking params; identical canonical URLs collapse to one source. Kills the "same URL = two corroborating sources" hole (`weightValidation.ts:105` + `pack.ts:30`). Pack `schema_version` bumps to 1.1.0 (deliberate, documented).
2. **Corroboration for all irreversible keys:** `CORROBORATION_REQUIRED` gains `website_fraudulent: 2` (and, post-dedupe, the count means real distinct sources). `VALIDATION_VERSION` → 1.3.0. **OQ-2 (founder):** also `address_fraudulent: 2`? Recommendation: yes — same irreversible-veto class, and its gov/registry sources are unaffected (corroboration only bites the variable-trust profiles).
3. **Hard-fail consensus gate (extraction stability):** when a run's validated keys include any hard-fail key, the pipeline makes ONE additional extraction call on the same frozen pack; the hard-fail key survives only if proposed in both passes (code-side consensus — deterministic given the two outputs). Converts residual LLM proposal variance on the highest-stakes keys into a code-controlled gate. Cost: +1 Sonnet call only on hard-fail-proposing runs. This is the direct fix for "same evidence, morning hard_fail / evening pass."
4. **Source-diversity for `pass` — OQ-3 (founder):** the spec defines pass as "multiple independent sources confirm"; the code lets one registry page stack 4 keys to 8 points = pass (`signals.ts:35`). Recommendation: in `stageFindingTrack` (code-decides layer — `deriveTrackSignal` stays frozen), if the applied evidence cites fewer than 2 distinct canonical sources, cap `pass` → `infer` with a recorded reason. Closes the shell-company false-clear seam.
5. **Track 3/4 firewall registry entries** are authored as part of the Track 3/4 builds, with the ADR-T1-001 collision audit run against them *before* freeze (already forward-flagged; now a hard gate in the plan).
6. **Structured outputs:** `runModel`'s unused `schema` parameter is wired to Anthropic structured outputs for all track calls — parse failures drop to ~zero (they currently produce wrong verdicts; after H2 they'd produce manual reviews; with schemas they mostly stop happening).

---

## PART 3 — INNOVATIONS: an engine that thinks better under typos, wrong data, and conflict

These build ON the fixes above; each is deliberately code-first (deterministic where possible) so the "invisible engine" stays explainable.

**I1 — Judgment backtesting (the corpus becomes the algorithm's test suite).** Once H1's replay exists, every rubric/prompt/firewall change is replayed against ALL historical evidence packs before shipping: "under v1.3.0, 3 of 29 verdicts change — here's the diff." Regression-testing judgment itself is a moat feature no weekend competitor will have, and it's the honest answer to an acquirer's "how do you know a change didn't break your verdicts?"

**I2 — Pre-research client confirmation loop (kills wrong-data cases at intake).** The machinery already exists (`awaiting_client` + confirm-scope). When Track 0.5 finds a discrepancy (`name_is_brand`, `name_website_mismatch`, `multiple_entities`), pause BEFORE the expensive tracks: "You entered **Bosch**; the website belongs to **Global Distribution LLC** — is this your supplier?" One click resumes the pipeline against the confirmed entity. Typos and mislabels stop costing research spend and stop risking wrong-entity verdicts; the client sees an engine that *caught their mistake* — trust, not friction. (Escalation kinds still go to admin as today.)

**I3 — Divergence as a product feature, not an embarrassment.** With attempts + packs frozen, when attempt N+1 differs from N the engine diffs the packs (hash + per-source) and emits a structured "what changed": *"2 new sources appeared (one enforcement report dated after your report); signal moved flag → hard_fail."* Internally: drift monitoring dashboard. Client-facing (re-checks/Brand Monitor): a dated change narrative. Same-world re-runs that differ with NO evidence diff auto-flag an extraction-stability bug — the system now detects its own nondeterminism.

**I4 — Confidence-aware autonomy (spend the human where the verdict is flippable).** `computeVerdict` already emits `decision_confidence` from the margin to the band boundary. Route low-margin verdicts (distance < 0.25) to mandatory founder review; high-margin verdicts flow autonomously. At 100/day this is the difference between reviewing 100 cases and reviewing the 12 that could genuinely flip — the founder's 15 years applied exactly where they change outcomes.

**I5 — Alias-aware evidence interpretation.** The identity layer already produces `entered_names` aliases; feed the alias set into track prompts and the firewall's source matching so "TD Synexx" evidence counts for "TD Synnex" when the domain anchors them — typos stop fragmenting evidence (live data showed the misspelled vendor scoring HIGHER than the real one because evidence fragmented differently across runs).

**I6 — The conflict ladder (what "thinks better" means mechanically).** Conflicting evidence is not an error — it's the product's core input. The ladder, each rung deterministic: (1) same-source conflicts die in the firewall (exists); (2) cross-source conflicts on one key → authority comparison (exists); (3) cross-dimension conflicts → synthesis Module 4 contradiction objects with `is_load_bearing` (build in S-phase with enum-locked, evidence-ID-grounded output + a synthesis firewall that rejects any contradiction citing nonexistent assertion IDs); (4) unresolvable load-bearing conflict → the verdict floor/lock vetoes (exists) + a client-facing "the real risk" statement naming the conflict (Module 9). The client gets a decision even from messy inputs: a committed leading interpretation, the conflict named, and the exact questions that would resolve it.

**I7 — Corpus-informed priors, firewalled (G6, later but shaped now).** When the read-side arrives, memory enters as ONE weighted, versioned input (`corpus_version` is already reserved in `ios.ts`) — never a verdict override. The event ledger (H6) is what makes this safe: every prior is traceable to specific cases and outcomes.

---

## PART 4 — TRACK PROMPT CHANGES (existing + future)

**All tracks (cross-cutting):**
- **Structured outputs** via `runModel({ schema })` — ends truncation/parse-failure wrong verdicts (pairs with H2/H7.6).
- **Corroboration citation rule:** "When multiple sources support the same finding, cite ALL of them on ONE evidence item — never split one finding across items." (Fixes the under-trigger where a genuinely corroborated scam scores no fraud key because citations were spread across two items.)
- **Research identity block:** every prompt names the RESOLVED entity as the subject, with entered-name alias line (H4/I5).
- **Vocabulary guard:** negative instruction against banned-language terms in narrative fields (defense-in-depth before the delivery scan).

**Track 1 (`track1.prompt.ts`):** keep the fe51002 `website_fraudulent` definition (audit: sound, tested); add the corroboration citation rule adjacent to the fraud-key instructions; add alias handling ("evidence referring to 'TD Synexx' with the same domain is the same entity"); add "report the LEGAL entity name exactly as it appears on registry/footer" for statements that feed identity.

**Track 2 (`track2.prompt.ts`):** already strong (brand isolation, ADR-T2-002 lanes, LOA exclusion). Add the research-identity block; add the corroboration rule for `counterfeit_channel`/`conflicting_authorization`.

**Track 0.5 identity prompt (`identity.prompt.ts`):** instruct `entity_name` to be the legal name from footer/about/imprint pages, normalized casing — stabilizes cross-run entity strings and cuts false `multiple_entities` escalations caused by formatting variance.

**Track 3 (future — amend the 2026-07-03 spec):** carry the corroboration citation rule from day one for its three hard-fail keys; require **dated** enforcement evidence (enforcement is time-sensitive; undated "brand enforces" claims default to `UNKNOWN`); per-brand isolation already speced. Firewall entries (`ALLOWED_PROFILES`/`MIN_AUTHORITY`/`CORROBORATION_REQUIRED` for `active_ip_complaints`, `cease_and_desist_distributed`, `confirmed_amazon_restrictions`, `b2b_only_confirmed`) are authored WITH the prompt and collision-audited before freeze.

**Track 4 (future):** manipulation-signal hard fails (`document_alteration`, `retail_receipt_as_wholesale`) require multi-field corroboration in the prompt (one formatting anomaly ≠ manipulation) and corroboration entries in the firewall.

**Track 5 / Synthesis (S-phase):** not one "think hard" prompt — see Part 5 §D. Module outputs enum-locked; every contradiction/hypothesis must cite assertion IDs that exist; Module 9 copy generated from templates + scanned before storage.

---

## PART 5 — ADR-G007: Case-Run Ledger & Replayable Judgment (architecture)

**Status:** Proposed · **Date:** 2026-07-05 · **Deciders:** Founder/CTO

### Context
ADR-G005 requires "same evidence pattern → same verdict" and the audit proved the verdict math already delivers that — but the system re-collects evidence live on every run, overwrites attempt-1 rows in place, and mutates delivered verdicts. The July-4 re-runs flipped verdicts across the full range on identical inputs, and production data shows infrastructure failures scored as findings. The moat promise (defensible, repeatable, compounding judgment) is broken at the record layer, not the decision layer.

### Decision (proposed)
Adopt the **Case-Run Ledger**: every pipeline execution is an immutable, numbered **attempt** whose evidence packs are the frozen input of record; judgment is a pure, replayable function of a stored attempt; delivery pins an attempt; the corpus is fed by an append-only per-(case, attempt) event ledger. Supporting decisions: fail-loud error taxonomy (`acquisition_failed` / `llm_failed` / `not_implemented` are states, never scores), a hard-fail consensus gate, and a module-split Synthesis Engine with its own firewall.

### Options considered

**A — Status quo + spot fixes** (pin Serper params, more prompt rules).
Complexity: Low · Determinism: still unbounded (live web every run) · Defensibility: none (records still mutate) · **Rejected** — treats symptoms; the acquirer's run-it-twice test still fails.

**B — Case-Run Ledger (CHOSEN).** Attempts + frozen packs + replay + pinned delivery + event-ledger corpus.
Complexity: Medium (plumbing; no frozen-logic changes; storage already 80% exists — packs persist append-only today) · Determinism: same attempt → same verdict, provable; fresh attempts explicitly versioned · Defensibility: every delivered verdict reconstructible with dated evidence · Enables: I1 backtesting, I3 divergence diffs, G6 corpus versioning.
Cons: attempt-awareness threads through pipeline/persistence; admin UI needs an attempt picker eventually; storage grows per attempt (jsonb, negligible at current scale).

**C — Full event-sourcing rebuild** (every state change an event, projections for all tables).
Complexity: High · Rejected: the benefits HyprrIQ needs (immutability, replay, provenance) are delivered by B at a fraction of the cost; C rebuilds working billing/portal layers for no client-visible gain.

### Trade-off analysis
The core trade is **freshness vs. stability**, and it is resolved by making it explicit rather than choosing one: investigations are fresh *by decision* (a new attempt, diffed against the last), never fresh *by accident* (a silent mutation). The second trade is **LLM adaptiveness vs. verdict stability**, resolved the same way ADR-G005 resolves it — the adaptive layer proposes, deterministic code disposes — extended one level down: the consensus gate makes even the *proposals* stable where they are irreversible. Cost impact is bounded: replay is free (no API calls), consensus adds one Sonnet call only on hard-fail runs, confirmation-loop pauses reduce wasted research spend.

### Consequences
- **Easier:** due-diligence (run any attempt twice → identical verdict); disputes (dated frozen evidence per delivered verdict); safe algorithm evolution (backtesting); Brand Monitor & re-check products (diff narratives); G6 memory (versioned, provenance-carrying corpus).
- **Harder:** one more concept (attempt) in pipeline, admin, and data code; migrations to run; the corpus cleanup is a one-time founder task.
- **Revisit:** attempt retention policy at volume; whether replay verdicts on old attempts should auto-recompute on rubric bumps (recommend: only via explicit backtest runs).

### Supporting architecture decisions (same ADR)
- **D1 Fail-loud taxonomy** (H2) — failure states are workflow routes, never scores.
- **D2 Identity-coherent research** (H4) — tracks receive ONE research identity object; entered input is an alias, never the subject, once resolution confidence is sufficient.
- **D3 Client confirmation loop** (I2) — discrepancy pauses precede spend; uses existing `awaiting_client` machinery.
- **D4 Synthesis Engine shape** (S-phase): Modules 1–3 (normalization, claim attribution, assertion assembly) are **deterministic code** over the frozen pack; Modules 4–7 are constrained LLM steps with enum-locked schemas and a **synthesis firewall** (assertion-ID grounding, enum validation, risk-level whitelist — closing the audit's "unvalidated `risk_level` string can lock do_not_rely" seam BEFORE it goes live); Modules 8–9 are template-generated + compliance-scanned. Opus only for 4–7; versioned via the existing `ios.ts` vector.
- **D5 Environment separation** — a second Supabase project for staging before go-live; test data never again interleaves with the corpus (single-project-is-prod is how Zzqxwv got into the moat).
- **D6 Ops hardening** — Inngest concurrency limit, onFailure, watchdog cron; admin queries paginated; queue/SLA columns actually written at submit (the schema already has them).

### Action items (become the implementation plans, one per phase)
1. [ ] Founder reviews this spec + answers OQ-1..OQ-4
2. [ ] H1 implementation plan → build → migration → live-validate re-run immutability
3. [ ] H2–H3 plan → build → live-validate forced-failure + clean case
4. [ ] H4 plan → build → globaldist live-validation WITH evidence-entity check
5. [ ] H5–H7 plans → build (migrations for H6) → corpus cleanup (founder-run)
6. [ ] Track 3 per its spec + firewall entries + collision audit → T4 → T5
7. [ ] Synthesis Engine spec (D4 detail) → review → build
8. [ ] Outcome-loop crons live; backtest harness (I1) over the accumulated packs

---

## OPEN QUESTIONS for founder (decide before implementation plans)

- **OQ-1 (verdict ceiling while tracks are stubs):** cap score-verdicts at `usable_with_conditions` until Track 3 ships, with an explicit "dimensions not assessed" block? *(Recommend yes — a `source_clear` that never assessed brand risk is indefensible.)*
- **OQ-2 (corroboration breadth):** extend the ≥2-distinct-sources rule to `address_fraudulent` alongside `website_fraudulent`? *(Recommend yes — same irreversible class; gov/registry-sourced findings unaffected.)*
- **OQ-3 (source diversity for pass):** cap `pass` → `infer` when applied evidence cites <2 distinct canonical sources? *(Recommend yes — closes the shell-company seam; implemented outside the frozen scorer.)*
- **OQ-4 (confirmation loop scope):** pause-for-client-confirmation on `name_is_brand` + `name_website_mismatch` (recommend), or admin-only as today? Pausing costs a client interaction; it saves research spend and kills the wrong-entity class at intake.
- **OQ-5 (daily capacity):** the business plan's 10-case/day cap and `daily_case_count` table exist but are unenforced. Enforce at submit (with the SLA-pause message) or drop deliberately?

---

*Nothing in this spec modifies `deriveTrackSignal`, `computeVerdict`, `weights.ts` scoring, or Evidence Pack schema 1.0.0 semantics without an explicit version bump named above. All migrations are founder-run. All live-validations are founder-run against prod keys.*
