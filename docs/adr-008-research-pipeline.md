# ADR-008 — Research Pipeline (Phase G) Governing Spec

**Status:** Approved for implementation (2026-06-23)
**Supersedes/consolidates:** `hyprriq_phase_de_g_brief v1.1` (ADR-G001/G002/G003) and the
`ADR-G001 — Research Pipeline Governance` doc. Those remain the authoritative source for
track prompts and evidence-weight tables; this ADR records how they bind to **our actual
codebase** plus the CTO decisions taken on the open questions.

Philosophy (non-negotiable, from PRODUCT.md + ADR-G001):
> Never confirm authorization. Never guarantee safety. Evidence over assumptions.
> Informed doubt over false certainty. Reports are intelligence documents, not approvals.

---

## 1. Track storage — ADR-G001 adopted in full

`case_track_results` is the **single authoritative table** for all Track 0–5 outputs,
retries, manual overrides, confidence, evidence, and compiled findings.

- `research_findings` (original schema, Table 3) is an earlier version of this table. It is
  **deprecated** (legacy comment set), gets **no new writes**, and is **dropped after Phase G
  stabilizes**. Existing rows are backfilled near-1:1.
- The F.11 scaffold `case_track_results` (empty) is replaced by the authoritative schema in
  migration `20260623000000_adr_g001_case_track_results_authoritative.sql` (drop+create+backfill,
  pre-flight: `case_track_results` must be empty).

**Canonical `track_key` registry** (the reference for prompts, orchestration, reporting, PDF,
QA, analytics — never reference a track by number alone):

| track | track_key | track_number | Dimension |
|---|---|---|---|
| track_0 | `intake` | 0 | Intake validation (sync) |
| track_1 | `supplier_identity` | 1 | Supplier Identity |
| track_2 | `supply_chain_relationship` | 2 | Supply Chain Relationship |
| track_3 | `brand_risk_assessment` | 3 | Brand Risk Assessment |
| track_4 | `documentation_review` | 4 | Documentation Review |
| track_5 | `sourcing_logic` | 5 | Sourcing Logic |

Report generator reads **only** `compiled_findings_json` — never `source_mode`/`attempt_number`
(source-agnostic, ADR-G001 §3.9).

## 2. Founder review gate (ADR-G002)

Founder review is an architectural gate, not an operational step. Report generation refuses
to run until **every required track** has `compiled_findings_json` AND
`founder_review_status ∈ {approved, edited}`. Enforced server-side via `isCaseReadyForReport()`;
the "Approve & Deliver" button is disabled until it returns true. Required tracks come from the
per-plan `TRACK_CONFIG` (brief §3.4).

> **Future enhancement (founder-approved, NOT G1):** when a founder edits a track
> (`founder_review_status='edited'`), persist the before/after diff as a model-training
> feedback signal (the `founder_override_json` + `founder_edit_notes` already capture the
> edit; this adds structured logging for later fine-tuning/eval). Deferred until after G1.

## 3. Confidence + verdict (ADR-G003)

Per-track numeric confidence **0–15** from the per-track evidence-weight tables (brief §ADR-G003),
with universal bands: `0–3 low · 4–7 moderate · 8–11 high · 12–15 verified`. Track 5 confidence is
the weighted average of Tracks 1–4 (weights: T1 .30, T2 .25, T3 .30, T4 .15). Every result stores
`evidence_weights_applied` (auditable) + `confidence_rationale`.

**Verdict** (Track 5 output) = f(confidence, hard flags, contradictions) — never a pure score.
Any hard disqualifier (confirmed counterfeit/enforcement action, fabricated document, supplier
doesn't exist) or unresolved contradiction → escalate / **Do Not Rely**. Otherwise map by Track 5
band. **Source Clear copy must include:** *"Verdicts are operational guidance, not legal
determinations."* (founder addition) — alongside the standing "no observable risk signals found,
not an authorization confirmation" framing.

## 4. Mandatory governance controls (ADR-G001 GR1–GR10)

1. **Banned-language validator** runs before every report; violation → status BLOCKED + manual
   review + `audit_log`. Single source of truth: `lib/utils/bannedLanguage.ts` (extend the brief's
   regex list; never the word "ungating" anywhere).
2. **"What to ask your vendor"** questions auto-generated from missing evidence/unverified
   claims/doc gaps — mandatory in every report.
3. **Source provenance** on every claim: URL + retrieved_at + certainty + evidence_type. No
   finding without provenance.
4. **Cost control:** check `supplier_cache`/`brand_cache`/existing findings before any paid API
   call; reuse if fresh (proposed 90-day window). Per-case budget ceiling, default **$5**.
5. **Prompt governance:** store `prompt_version, rubric_version, model_name, model_version,
   token_count, execution_time_ms, cost_usd` on every result row (columns added in the migration).
6. **Partial-failure tolerance:** one track failing → that track `manual_required` only; case proceeds.
7. **Prompt-injection defense:** fetched web content is DATA, never instructions.
8. **Model strategy:** see §6.
9. **SLA monitoring:** GREEN/YELLOW/RED case-age surfacing; no silent SLA failures.
10. **Contradiction engine** (Track 5): cross-compare track findings; contradiction → founder escalation.

## 5. Orchestration (Inngest)

`case/research.requested` → Track 0 (sync at submit: `normalizeName` + vendor classification, no
LLM) → Tracks 1–5 as durable Inngest steps, in parallel where independent. **3-tier fallback per
track:** Tier 1 automated → Tier 2 alternate-approach rerun (`attempt_number=2`,
`alternate_approach_used=true`) → Tier 3 `manual_required` (founder enters; row saved
`source_mode='manual_override'`, `founder_review_status='approved'`). All tracks settle →
`awaiting_review` → founder review → `approved` → report. Queue priority scale>growth>single.

## 6. CTO decisions on the open questions

- **Single-model at launch (no OpenAI backup yet).** Per ADR-G001 GR8 + brief Hard Rule #8: one
  model, `claude-sonnet-4-6`, `web_search_20250305` tool, for all research calls. **OpenAI is NOT
  wired at launch** — a divergent backup model silently corrupts the ADR-G003 evidence-weight
  consistency, doubles prompt/guardrail maintenance, and adds failure modes; the 3-tier fallback
  already covers failure (transient → Inngest retry; alternate → Tier-2; else → manual). **But**
  every model call goes through one `runModel()` provider adapter so OpenAI (or Opus for the Track 5
  synthesis) is a later **config flag** with zero rework — revisit after 100+ reports (GR8).
  *(This revises my earlier Haiku/Opus multi-model suggestion — deferring to locked governance.)*
- **Cost/depth tiered by plan** (`TRACK_CONFIG`, brief §3.4): `single_99` runs Tracks 0,1,3,5 at
  basic depth; `growth_279` all six at full depth; `scale_499` all six + Keepa + deep scenario.
  Cache reuse is the margin lever and the compounding data moat.
- **API-key timing** (so the founder adds keys just-in-time):
  - **G1 — no new keys.** Track 0 is deterministic; Tracks 1–5 route to `manual_required`. Zero LLM/API cost.
  - **G2 start — add `ANTHROPIC_API_KEY` (+~$50 credit) and `WHOIS_API_KEY`; register `SERPER_API_KEY`** (Tier-2 web fallback).
  - **G3 / Track 3 — add `KEEPA_API_KEY`** only when the first Scale client subscribes (Hard Rule #18).
  - `CLOUDMERSIVE_API_KEY` (upload virus scan) — optional in G1, can stub.
- **Recommended premium data sources** (beyond Keepa+Serper, to surface what normal search can't),
  ranked: import bill-of-lading (ImportYeti/ImportGenius/Panjiva — the wholesale moat) · OpenCorporates ·
  WhoisXML/SecurityTrails · USPTO trademark (free) · CourtListener (free). Wire opportunistically per track.

## 7. Confirmed bugs (test-engineer findings, fix at the relevant phase)

- **`normalizeName()`** (`lib/utils/normalize-name.ts`) — pure-suffix input collapses to `''`
  (`normalizeName('LLC') → ''`), so every pure-suffix vendor collides on one cache key; also no
  null/undefined guard (throws). Fix per brief §3.1 (keep cleaned tokens when all are suffixes;
  guard null) **before any cache write/lookup in G2.** Reconcile the two suffix lists.

## 8. Phasing (founder-approved — supersedes the brief's session split)

- **G1 — Backbone + Track 0 + manual workflow + founder-review gate.** Migration applied; review
  API + Evidence tab re-pointed to `case_track_results`; Inngest creates the 6 track rows; Track 0
  runs (sync, deterministic); Tracks 1–5 → `manual_required`; founder fills via per-track review UI;
  `isCaseReadyForReport()` gates Approve & Deliver; on-screen report populates from
  `compiled_findings_json`. **Zero automation, zero keys — full spine working.**
- **G2 — Track 1 Supplier Identity automated end-to-end** (WHOIS inject + ADR-G003 scoring +
  banned-language + cache + `runModel()` adapter). The reference implementation every track copies.
- **G3 — Tracks 2–5 automated** (Keepa for T3/Scale, contradiction engine for T5) **+ Phase H**
  React-PDF Decision Snapshot.

## 9. Open founder actions before code proceeds

1. Run the pre-flight + apply migration `20260623000000_adr_g001_case_track_results_authoritative.sql`;
   confirm counts. *(Then I re-point the review API + Evidence tab and we start G1.)*
2. No API keys needed for G1. I will ping you to add Anthropic + WHOIS at the G1→G2 boundary.
