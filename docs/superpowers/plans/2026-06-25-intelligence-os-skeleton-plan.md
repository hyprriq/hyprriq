# HyprrIQ Intelligence OS — Reconciled Skeleton-First Implementation Plan (Phases 2–3)

> **Status:** Presented for approval. Nothing is applied or built until each gate is approved.
> **Governing docs:** Tech Arch v1.4, ADR-G004 (verdict), ADR-G005 (synthesis), ADR-G006 (memory write-side), Master Prompts v2.1, Phase G1 Brief, CTO Addendum. Decisions locked in the conversation of 2026-06-23/25.

**Phase order (founder-locked):** 1 schema reconciliation → **2 skeleton pipeline** → **3 deterministic contracts** → 4 intelligence engine → 5 track automation → 6 synthesis → 7 calibration. This plan covers **Phases 2–3 only**. No intelligence reasoning code (Phase 4+) until skeleton + contracts are approved.

---

## A. The five-layer architecture (the contract everything obeys)

| Layer | Module | Owner | Determinism |
|---|---|---|---|
| 1 | **Evidence Collection** — Tracks 0–5 gather observable evidence | **LLM** (Sonnet 4.6) | non-deterministic (live web) |
| 2 | **Evidence Normalization** — uniform evidence set + `evidence_hash` | **Code** | deterministic |
| 3 | **Intelligence Reasoning** — 9-module synthesis; produces Decision Snapshot *content* | **LLM** (Opus 4.8) | adaptive method, versioned |
| 4 | **Deterministic Judgment** — code-derived track signals → weighted verdict + vetoes | **Code** | deterministic |
| 5 | **Report Communication** — formats report/PDF from snapshot + verdict | **Code** | deterministic (LLM never writes the delivered report) |

**Determinism claim (precise):** reproducible at Layers 2–5 **given the captured evidence** (cache-hit during a run, or full replay from stored `evidence_items`). NOT claimed end-to-end from a fresh web submission. `corpus_version` only affects determinism once ADR-G006 read-side (G6) lands.

**Human role:** the engine reaches report-ready **autonomously** through Layers 1→5. Human approval is an *optional business-policy gate* per surface — the engine **never waits** on it. `manual_required` is exceptional escalation (a failed track), never the default path.

---

## B. File structure (created as stubs in Phase 2, implemented later)

```
lib/ai/
  runModel.ts            ← provider-agnostic adapter (config-driven model + provider)   [Phase 2 — REAL]
  providers/anthropic.ts ← Anthropic impl behind runModel                                [Phase 2 — REAL]
lib/research/
  pipeline.ts            ← orchestrator: submit → tracks → normalize → synth → judge → report  [Phase 2 stub→real]
  track0.ts … track5.ts  ← evidence collectors (Layer 1)                                 [stubs; real in Phase 5]
  normalize.ts           ← Layer 2: normalize evidence + evidence_hash                    [Phase 3 — REAL]
  signals.ts             ← Layer 4a: CODE-derived track_verdict_signal (ADR-G003 weights) [Phase 3 — REAL]
  synthesisEngine.ts     ← Layer 3 (9 modules, Opus)                                      [stub; real in Phase 6]
  verdictEngine.ts       ← Layer 4b: deterministic verdict (ADR-G004 weights+vetoes)      [Phase 3 — REAL]
  reportBuilder.ts       ← Layer 5: snapshot+verdict → report payload                     [stub; real in Phase H]
  prompts/               ← track + synthesis prompts (v2.1)                               [stubs]
  ios.ts                 ← IOS version vector assembly + evidence_hash helpers            [Phase 3 — REAL]
lib/external/
  whois.ts               ← WHOIS client (Track 1 domain age)                              [Phase 5]
  keepa.ts, serper.ts    ← stubs (G2/G3, conditional)
lib/data/
  trackResults.ts        ← exists; extend for v2.1 columns                                [Phase 2]
  synthesis.ts           ← case_synthesis read/write (admin) + client snapshot read       [Phase 2]
```

---

## C. Phase 3 — the deterministic contracts (specified now; these are what you approve)

These TypeScript interfaces are the spine. They are stable regardless of model/provider.

```typescript
// Layer 1 output — what an LLM track returns (evidence only; NEVER the authoritative signal)
export type Certainty = "verified" | "inferred" | "unknown";
export interface EvidenceItem {
  evidence_id: string;            // e.g. "t1_e1"
  statement: string;
  certainty: Certainty;
  source_type: "government_record" | "vendor_self_assertion" | "third_party" | "inference";
  source_url: string | null;
  claimant: "vendor" | "brand" | "independent_registry" | "third_party" | "ai_inference";
  claimant_benefits: boolean;     // true if the claimant benefits from it being believed
  supports: string;               // which assertion this supports
}
export interface TrackOutput {
  track_key: TrackKey;
  evidence_items: EvidenceItem[];
  evidence_weights_applied: { evidence_type: string; points: number; note?: string }[];
  reasoning_notes: string;
  unknowns: { unknown: string; why_unresolvable: string; resolvable_by_client: boolean }[];
  suggested_signal?: TrackSignal; // QA ONLY — never used by the verdict
}

// Layer 2 output
export type TrackSignal = "pass" | "infer" | "flag" | "soft_fail" | "hard_fail" | "n_a";
export interface NormalizedEvidence { items: (EvidenceItem & { source_track: TrackKey })[]; }
export function computeEvidenceHash(n: NormalizedEvidence): string; // stable hash of the normalized set

// Layer 4a — CODE derives the authoritative signal from weights + hard/soft-fail rules (NOT the LLM)
export function deriveTrackSignal(
  weights: { evidence_type: string; points: number }[],
  hardFailHits: string[],   // red-flag registry codes (verified-tier only)
  softFailHits: string[],
): { signal: TrackSignal; score_0_15: number; band: ConfidenceBand };

// Layer 4b — deterministic verdict (ADR-G004): weighted score + 8 veto rules
export type Verdict = "source_clear" | "usable_with_conditions" | "verify_before_purchase" | "do_not_rely";
export interface VerdictResult {
  verdict: Verdict;
  weighted_score: number;
  veto_fired: boolean;
  veto_reasons: string[];
  decision_confidence: "low" | "moderate" | "high"; // margin to band boundary + what_would_change_the_leader
}
export function computeVerdict(signals: Record<TrackKey, TrackSignal>, synthesis: SynthesisOutput): VerdictResult;

// Layer 3 output (stub in Phase 2 returns a placeholder of this exact shape)
export interface SynthesisOutput {
  module_1_normalized_evidence: unknown[];
  module_2_claim_attributions: unknown[];
  module_3_assertions: unknown[];
  module_4_contradictions: { is_load_bearing: boolean; risk_level: string }[];
  module_5_hypotheses: { hypotheses: unknown[]; what_would_change_the_leader: string };
  module_6_risk_gaps: unknown[];
  module_7_doubt_calibration: { doubt_level: string; doubt_focus: string; rationale: string };
  module_8_vendor_questions: string[];
  module_9_decision_snapshot: {
    headline: string; leading_interpretation: string; the_real_risk: string;
    what_to_verify: string[]; what_to_monitor: string[];
  };
}

// IOS version vector (enhancements #5/#6) — written on every case_synthesis row
export interface IosVersion {
  prompt_version: string; rubric_version: string; synthesis_version: string;
  corpus_version: string; configuration_version: string;
  model_provider: string; model_version: string;
  evidence_hash: string; ios_version: string; // e.g. "HyprrIQ IOS v1.2"
}
```

**Verdict firewall (enforced):** `computeVerdict` reads only `signals` (enums) + structured `synthesis` fields (booleans/enums/numbers) — never synthesis free-text. The LLM cannot leak a verdict.

---

## D. `runModel()` adapter (Phase 2 — real)

```typescript
// lib/ai/runModel.ts — the ONLY path to a model. Business logic never imports a vendor SDK.
export interface RunModelInput {
  task: "track" | "synthesis";          // selects model via config, not hardcode
  system: string; user: string;
  schema?: object;                       // structured-output JSON schema
  temperature?: number;                  // default 0 (determinism)
}
export interface RunModelResult { json: unknown; model_provider: string; model_version: string; tokens: number; cost_usd: number; latency_ms: number; }
export async function runModel(input: RunModelInput): Promise<RunModelResult>;
// Config (env/DB, not code): task→{provider, model}. Initial: track→anthropic/claude-sonnet-4-6,
// synthesis→anthropic/claude-opus-4-8. A future provider is a config change + a providers/* impl.
```

---

## E. Build stages & gates (skeleton-first — each is a commit + your approval)

**Phase 2 — Skeleton (prove data flow with stubs; no intelligence):**
- **2.1 Scaffold:** create all files above as stubs; `runModel()` real but unused; data-layer extended for v2.1 cols + `case_synthesis`. **Gate:** `tsc`+`eslint`+`build` green; nothing wired.
- **2.2 Data flow:** `pipeline.ts` runs submit → Track 0 (stub) → Inngest event → Tracks 1–5 (stub evidence) → normalize (real hash) → synthesis (stub snapshot) → signals+verdict (real on stub signals) → `case_synthesis` row written → `cases.status` walks `…→synthesis_running→awaiting_review` → report payload (stub) → **report-ready autonomously, no human gate**. Intelligence-table upserts fire (ADR-G006 write-side, simple). **Gate:** one test case flows end-to-end with stubs; `case_synthesis` row + evidence_hash present; case reaches report-ready with zero human input.

**Phase 3 — Deterministic contracts (real code, still no LLM reasoning):**
- **3.1** `normalize.ts` + `computeEvidenceHash` (real, unit-tested).
- **3.2** `signals.ts` `deriveTrackSignal` (real, ADR-G003 weights + hard/soft-fail registry; unit-tested — this is enhancement #1).
- **3.3** `verdictEngine.ts` `computeVerdict` (real, ADR-G004 weighted + 8 vetoes + decision_confidence; unit-tested incl. the worked example).
- **3.4** `ios.ts` version-vector assembly + evidence-hash memoization (reuse stored synthesis on identical hash + ios_version).
- **3.5** **Human-gate rework:** replace `isCaseReadyForReport`-as-blocker with an autonomous report-ready state + an *optional* approval flag (config per surface). **Gate:** determinism test — same evidence set run twice → identical signals + identical verdict; full unit coverage on signals + verdict; a case completes with zero human input.

**Deferred (separate approvals):** Phase 4 intelligence-engine contracts wiring, Phase 5 track automation (real Sonnet + WHOIS), Phase 6 synthesis engine (real Opus 9-module), Phase 7 calibration. Plus the 3 backlog refinements (identity-mismatch matrix, archetype playbooks, determinism hardening) woven in during 5–7.

---

## F. What this plan deliberately does NOT do
- Does not touch `clients.id`/`cases.client_id` types (keep live text PKs — conflict #3).
- Does not implement any LLM reasoning (Phases 4–6, gated).
- Does not drop `research_findings` or the transitional `intake` track_key (later cleanups).
- Does not build Agency UI/roles/billing (Phase K) — only the agency-agnostic foundation.
