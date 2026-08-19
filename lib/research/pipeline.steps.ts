import { supabaseAdmin } from "@/lib/supabase/admin";
import { TRACK_CLIENT_COPY } from "@/lib/content/trackClientCopy";
import type { TrackContext, TrackOutput, TrackSignal, SupplierIdentity } from "@/lib/research/contracts";
import { SOURCING_CLIENT_SUMMARY } from "@/lib/research/contracts";
import { type TrackKey, trackByNumber } from "@/lib/constants/tracks";
import { runTrack0 } from "@/lib/research/track0";
import { resolveSupplierIdentity } from "@/lib/research/track05";
import { runTrack1 } from "@/lib/research/track1";
import { runTrack2 } from "@/lib/research/track2";
import { runTrack3 } from "@/lib/research/track3";
import { runTrack4 } from "@/lib/research/track4";
import { runTrack5 } from "@/lib/research/track5";
import { deriveTrackSignal } from "@/lib/research/signals";
import { applySourceDiversityCap } from "@/lib/research/sourceDiversity";
import { normalizeEvidence } from "@/lib/research/normalize";
import { enrichWithGraph } from "@/lib/research/graph";
import { runSynthesis } from "@/lib/research/synthesisEngine";
import { computeVerdict } from "@/lib/research/verdictEngine";
import { applyVerdictCeiling, type CeilingResult } from "@/lib/research/verdictCeiling";
import { applyDocumentationNoOverride, type NoOverrideResult } from "@/lib/research/verdictNoOverride";
import { certifySynthesisForVerdict, type CertificationAudit } from "@/lib/research/synthesisFirewall";
import { buildReport } from "@/lib/research/reportBuilder";
import { assembleIosVersion } from "@/lib/research/ios";
import { modelFor } from "@/lib/ai/runModel";
import { upsertTrackResult, getNextAttemptNumber } from "@/lib/data/track-results";
import { upsertCaseSynthesis, persistSynthesisExtension } from "@/lib/data/synthesis";
import { writeIntelligence } from "@/lib/data/intelligence";
import type { MemoryWriteArgs } from "@/lib/data/intelligence-events";
import { PIPELINE_VERSION } from "@/lib/research/pipeline.registry";

// ── Pipeline STAGES ────────────────────────────────────────────────────────────────────────────
// The stage bodies lifted out of runPipeline VERBATIM (no logic change) so both the synchronous
// runPipeline (dev route) and the durable Inngest function call ONE source. Each stage is
// idempotent (writes are upserts keyed by case_id/track) so an Inngest retry/replay is safe.
// Decision logic (runTrackN, deriveTrackSignal, computeVerdict, runSynthesis, the firewall) is
// untouched — only orchestration moved.

const TRACK_FNS: Record<number, (ctx: TrackContext) => Promise<TrackOutput>> = {
  1: runTrack1, 2: runTrack2, 3: runTrack3, 4: runTrack4, 5: runTrack5,
};

type Synthesis = Awaited<ReturnType<typeof runSynthesis>>["synthesis"];
type Verdict = ReturnType<typeof computeVerdict>;

export interface FindingTrackResult {
  output: TrackOutput;
  signal: TrackSignal;
  acquisition_failed: boolean;
  failed: boolean;          // H2 — unified failure flag (acquisition OR llm): track could not score
  not_implemented: boolean; // H3 — deliberate absence (dimension not built): skipped, never escalated
  track_number: number;     // H2 — lets orchestrators aggregate failed/skipped tracks for finalize
}

// H1 — resolve this execution's investigation attempt ONCE at pipeline start (durable step in
// Inngest). A re-investigation (attempt > 1) is audit-logged; rows/packs/synthesis all write
// under this attempt so no prior attempt is ever overwritten.
export async function stageResolveAttempt(caseId: string): Promise<number> {
  const attempt = await getNextAttemptNumber(caseId);
  if (attempt > 1) {
    await supabaseAdmin.from("audit_log").insert({
      table_name: "cases", record_id: caseId, action: "UPDATE",
      actor_id: "system", actor_type: "system", new_value: { reinvestigation_attempt: attempt },
    });
  }
  return attempt;
}

// H1 — status flip guarded: a delivered/complete case keeps its client-visible status while a
// re-investigation runs; only non-terminal cases show research_running.
export async function stageSetRunning(caseId: string): Promise<void> {
  await supabaseAdmin.from("cases")
    .update({ status: "research_running", pipeline_version: PIPELINE_VERSION })
    .eq("id", caseId)
    .not("status", "in", "(delivered,complete)");
}

// Track 0 — intake (deterministic). Not a finding; auto-approved, signal n_a.
export async function stageTrack0(ctx: TrackContext): Promise<void> {
  const t0 = runTrack0({ vendor_name: ctx.vendor_name, brands_submitted: ctx.brands_submitted, has_document: false });
  const res = await upsertTrackResult({
    case_id: ctx.case_id, track: "track_0", track_key: "intake_scope_guard", track_number: 0, attempt_number: ctx.attempt_number ?? 1,
    source_mode: "ai_generated", compiled_findings_json: t0 as unknown as Record<string, unknown>,
    track_verdict_signal: "n_a", founder_review_status: "approved", manual_review_required: false,
  });
  // H2 — persistence failures throw so the durable step retries; a case must never finalize
  // "complete" over missing rows.
  if (res.error) throw new Error(`track_0 row persist failed: ${res.error}`);
}

// Track 0.5 — Supplier Identity Resolution (Phase 5.1c.5). Runs AFTER Track 0, BEFORE the finding-track
// fan-out: resolves the supplier identity once so Track 2+ classify against resolved_domain instead of
// the raw (optional) vendor_website. Pure compute + research; persistence happens in the orchestrators.
export async function stageResolveIdentity(ctx: TrackContext): Promise<SupplierIdentity> {
  // H7 (OQ-D) — REPLAY reuses the case's FROZEN identity: the identity is part of the record being
  // re-judged, and live re-resolution would add exactly the variance replay exists to eliminate.
  // Fail loud for pre-identity legacy cases (nothing frozen to replay against).
  if (ctx.replay_from_attempt) {
    const { data } = await supabaseAdmin.from("cases").select("supplier_identity").eq("id", ctx.case_id).maybeSingle();
    const stored = (data?.supplier_identity ?? null) as SupplierIdentity | null;
    if (!stored) throw new Error(`replay: case ${ctx.case_id} has no stored supplier_identity — replay requires a frozen identity`);
    return stored;
  }
  return resolveSupplierIdentity(ctx);
}

// Persist the resolved identity onto the case EARLY (right after resolution) so the manual-review
// human sees candidates/confidence/notes while research is still running. Idempotent (a plain column
// update keyed by case_id); stageFinalize re-persists it as part of the final case record.
export async function stagePersistIdentity(caseId: string, identity: SupplierIdentity): Promise<void> {
  // H1 — a delivered/complete case's identity record is frozen with the rest of the delivered record.
  await supabaseAdmin.from("cases").update({ supplier_identity: identity }).eq("id", caseId)
    .not("status", "in", "(delivered,complete)");
}

// One finding track (n ∈ 1..5): run it, apply the acquisition-failure guard, derive the CODE signal,
// persist the row + classification metrics. Returns the output + signal for fan-in.
export async function stageFindingTrack(ctx: TrackContext, n: number): Promise<FindingTrackResult> {
  const def = trackByNumber(n);
  const out = await TRACK_FNS[n](ctx);

  // ── H3 — not-implemented guard: the dimension is not built yet. A deliberate ABSENCE — n_a
  // (excluded, weights redistribute), status 'skipped', auto-approved (nothing to review), and
  // NEVER an escalation (absence ≠ failure ≠ finding). Pre-H3 these scored soft_fail and Track 3's
  // floor pinned every case at verify_before_purchase. ──
  if (out.not_implemented) {
    const res = await upsertTrackResult({
      case_id: ctx.case_id, track: def.track, track_key: def.track_key, track_number: n, attempt_number: ctx.attempt_number ?? 1,
      source_mode: "ai_generated",
      evidence_items: [], reasoning_notes: out.reasoning_notes, unknowns: out.unknowns,
      track_verdict_signal: "n_a", finding_certainty: "unknown",
      manual_review_required: false, founder_review_status: "approved",
      compiled_findings_json: { signal: "n_a", not_implemented: true, summary: TRACK_CLIENT_COPY.not_implemented },
    });
    if (res.error) throw new Error(`${def.track} row persist failed: ${res.error}`);
    return { output: out, signal: "n_a", acquisition_failed: false, failed: false, not_implemented: true, track_number: n };
  }

  // ── Track 4 (OQ-A3, founder-ruled) — nothing-to-review guard: the dimension IS built, but this
  // case gave it nothing (zero uploads). An ABSENCE exactly like not_implemented in shape — n_a
  // (excluded, weights redistribute), 'skipped', auto-approved, NEVER escalated and NEVER a
  // soft_fail ("paperwork comes after commitment" — the N2 anti-pattern stays dead). ──
  if (out.nothing_to_review) {
    const res = await upsertTrackResult({
      case_id: ctx.case_id, track: def.track, track_key: def.track_key, track_number: n, attempt_number: ctx.attempt_number ?? 1,
      source_mode: "ai_generated",
      evidence_items: [], reasoning_notes: out.reasoning_notes, unknowns: out.unknowns,
      track_verdict_signal: "n_a", finding_certainty: "unknown",
      manual_review_required: false, founder_review_status: "approved",
      compiled_findings_json: { signal: "n_a", nothing_to_review: true, summary: TRACK_CLIENT_COPY.nothing_to_review },
    });
    if (res.error) throw new Error(`${def.track} row persist failed: ${res.error}`);
    return { output: out, signal: "n_a", acquisition_failed: false, failed: false, not_implemented: false, track_number: n };
  }

  // ── Track 5 (sub-gate B, founder-ruled) — NON-VOTING branch: a structural path, not a
  // convention. Track 5 arbitrates (flags + contract-frozen contradiction records for Module 4)
  // and NEVER votes: signal is n_a BY THIS BRANCH, never derived — an empty evidence set through
  // the scored path would hit the empty-set floor and score soft_fail, which IS a vote. Approved
  // (nothing to review — the flags are admin-side arbitration data), never escalated. ──
  if (out.non_voting) {
    const res = await upsertTrackResult({
      case_id: ctx.case_id, track: def.track, track_key: def.track_key, track_number: n, attempt_number: ctx.attempt_number ?? 1,
      source_mode: "ai_generated",
      evidence_items: [], reasoning_notes: out.reasoning_notes, unknowns: out.unknowns,
      track_verdict_signal: "n_a", finding_certainty: "unknown",
      manual_review_required: false, founder_review_status: "approved",
      compiled_findings_json: {
        // OQ-D summary rule (founder-ruled 2026-07-14): summary survives the client strip, so it
        // gets the NEUTRAL constant — the arbitration conclusion (coherence + counts) is as
        // sensitive as the records. The descriptive line stays in reasoning_notes (admin-read).
        signal: "n_a", non_voting: true, summary: SOURCING_CLIENT_SUMMARY,
        // The arbitration record (OQ-B1a): flags + coherence + contradictions ride the frozen
        // per-attempt record; ADMIN-ONLY (OQ-D) — stripped from the delivered client payload.
        sourcing_logic: out.sourcing_logic ?? null,
      },
    });
    if (res.error) throw new Error(`${def.track} row persist failed: ${res.error}`);
    return { output: out, signal: "n_a", acquisition_failed: false, failed: false, not_implemented: false, track_number: n };
  }

  // ── Acquisition-failure guard — an EMPTY Evidence Pack means we COULD NOT research, not that we
  // researched and found nothing. Such a track must NOT score (→ n_a, excluded from the verdict),
  // must NOT write institutional memory, and must escalate to manual review. ──
  if (out.acquisition_failed) {
    const res = await upsertTrackResult({
      case_id: ctx.case_id, track: def.track, track_key: def.track_key, track_number: n, attempt_number: ctx.attempt_number ?? 1,
      source_mode: "ai_generated",
      evidence_items: [], reasoning_notes: out.reasoning_notes, unknowns: out.unknowns,
      track_verdict_signal: "n_a", finding_certainty: "unknown",
      manual_review_required: true, manual_review_reason: "acquisition produced no sources — could not research",
      founder_review_status: "pending",
      compiled_findings_json: { signal: "n_a", acquisition_failed: true, summary: TRACK_CLIENT_COPY.acquisition_failed },
      weight_validation: out.weight_validation ?? null,
      track_validation_report: out.track_validation_report ?? null,
      classifications_total: 0, classifications_accepted: 0, classifications_rejected: 0, classifications_unknown: 0, acceptance_rate: null,
    });
    if (res.error) throw new Error(`${def.track} row persist failed: ${res.error}`);
    return { output: out, signal: "n_a", acquisition_failed: true, failed: true, not_implemented: false, track_number: n };
  }

  // ── H2 — LLM-failure guard: the model call failed or returned unparseable output. The track was
  // NOT researched-and-found-nothing — it was not scored at all. Mirror of the acquisition guard:
  // n_a (no verdict drag), held from auto-approve, escalated; never a soft_fail. ──
  if (out.llm_failed) {
    const res = await upsertTrackResult({
      case_id: ctx.case_id, track: def.track, track_key: def.track_key, track_number: n, attempt_number: ctx.attempt_number ?? 1,
      source_mode: "ai_generated",
      evidence_items: [], reasoning_notes: out.reasoning_notes, unknowns: out.unknowns,
      track_verdict_signal: "n_a", finding_certainty: "unknown",
      manual_review_required: true, manual_review_reason: "model call failed or returned unparseable output — track not scored",
      founder_review_status: "pending",
      compiled_findings_json: { signal: "n_a", llm_failed: true, summary: TRACK_CLIENT_COPY.llm_failed },
      weight_validation: out.weight_validation ?? null,
      track_validation_report: out.track_validation_report ?? null,
      classifications_total: 0, classifications_accepted: 0, classifications_rejected: 0, classifications_unknown: 0, acceptance_rate: null,
    });
    if (res.error) throw new Error(`${def.track} row persist failed: ${res.error}`);
    return { output: out, signal: "n_a", acquisition_failed: false, failed: true, not_implemented: false, track_number: n };
  }

  // ── Layer 4a — CODE-derived signal (the LLM never decides PASS/FAIL). Dedupe evidence_types so
  // each ADR-G003 type scores ONCE (presence is binary; anti-double-count). ──
  const foundTypes = [...new Set(out.evidence_items.map((e) => e.weight_key).filter((k): k is string => !!k))];
  const sig = deriveTrackSignal(def.track_key, foundTypes);
  // H7 (SO-3) — source-diversity cap: a single-source pass downgrades to infer. Same shared fn at
  // every signal site (track report signals use it too) so row/report/rejudge can never disagree.
  const div = applySourceDiversityCap(sig.signal, out.evidence_items);

  // Phase 5.1b — classification metrics from the firewall audit (0/empty for stub tracks).
  const wv = out.weight_validation ?? [];
  const cTotal = wv.length;
  const cUnknown = wv.filter((v) => v.rejection_reason === "llm_returned_unknown").length;
  const cAccepted = wv.filter((v) => v.validated_weight_key !== null).length;
  const cRejected = cTotal - cAccepted - cUnknown;

  // H7 (SO-4, OQ-A) — a failed consensus confirmation call keeps the veto but requires a human to
  // confirm it: we could neither confirm nor deny the highest-stakes signal, so a person decides.
  const consensusEscalate = out.hard_fail_consensus?.second_call_failed === true;

  const persisted = await upsertTrackResult({
    case_id: ctx.case_id, track: def.track, track_key: def.track_key, track_number: n, attempt_number: ctx.attempt_number ?? 1,
    source_mode: "ai_generated",
    evidence_items: out.evidence_items, reasoning_notes: out.reasoning_notes, unknowns: out.unknowns,
    evidence_weights_applied: sig.applied, suggested_signal: out.suggested_signal ?? null,
    track_verdict_signal: div.signal, confidence_score: sig.score_0_15, confidence_band: sig.band,
    finding_certainty: "unknown",
    compiled_findings_json: {
      signal: div.signal, score: sig.score_0_15, evidence_count: out.evidence_items.length, // ── THE ROOT-CAUSE FIX (founder-ruled 2026-08-19). This read `out.reasoning_notes`, so the
      // per-area summary every client has ever read WAS the model's internal scratchpad, verbatim.
      // reasoning_notes is still stored above, unchanged, for the operator. ⛔ NEVER fall back to it
      // here: a fallback restores the defect silently and looks like it is working.
      summary: out.client_summary?.trim() || TRACK_CLIENT_COPY.missing_client_summary,
      // H7 (SO-3) — the cap decision is part of the frozen record (SQL-checkable per attempt).
      source_diversity: { capped: div.capped, cap_reason: div.cap_reason, distinct_sources: div.distinct_sources },
      // H7 (SO-4) — the consensus record is part of the frozen record (null when no veto proposed).
      hard_fail_consensus: out.hard_fail_consensus ?? null,
      // H4 — WHO was researched is part of the frozen record (SQL-checkable per attempt).
      research_name: out.research_identity?.name ?? null,
      research_alias: out.research_identity?.alias ?? null,
      // Track 2 advisory metadata (stored for the analyst, NOT scored). null on tracks that don't emit them.
      auth_level: out.auth_level ?? null, auth_level_reasoning: out.auth_level_reasoning ?? null,
      b2b_only_detected: out.b2b_only_detected ?? null, b2b_only_brands: out.b2b_only_brands ?? null,
      // ADR-T2-002 — Track 2 lane-isolated narrative + code-templated boundary notes.
      brand_relationship_finding: out.brand_relationship_finding ?? null,
      identity_scope_note: out.identity_scope_note ?? null,
      authorization_scope_note: out.authorization_scope_note ?? null,
      marketplace_eligibility_disclaimer: out.marketplace_eligibility_disclaimer ?? null,
      // Track 3 (OQ-D) — brand-risk narrative + the analyst quartet: part of the frozen record,
      // rendered ADMIN-side only this gate; advisory, never scored. null on other tracks.
      brand_risk_finding: out.brand_risk_finding ?? null,
      analyst_reading: out.analyst_reading ?? null,
      // Track 4 — the documentation narrative (ships like brand_relationship_finding; HARD-scanned).
      documentation_finding: out.documentation_finding ?? null,
    },
    founder_review_status: consensusEscalate ? "pending" : "approved",
    manual_review_required: consensusEscalate,
    ...(consensusEscalate ? { manual_review_reason: "hard-fail consensus call failed — veto kept, human confirms" } : {}),
    weight_validation: out.weight_validation ?? null,
    classifications_total: cTotal, classifications_accepted: cAccepted,
    classifications_rejected: cRejected, classifications_unknown: cUnknown,
    acceptance_rate: cTotal > 0 ? Number((cAccepted / cTotal).toFixed(2)) : null,
    track_validation_report: out.track_validation_report ?? null,
    questions_to_ask: out.questions_to_ask ?? null,
  });
  if (persisted.error) throw new Error(`${def.track} row persist failed: ${persisted.error}`);

  return { output: out, signal: div.signal, acquisition_failed: false, failed: false, not_implemented: false, track_number: n };
}

// Layers 2 / 2.5 / 3 — the WIRED staged engine (S-1f Step 1). Throws on persist error so the
// step retries. MEMOIZATION IS DISABLED per Q4(b) (founder-ruled 2026-07-16): with the A1-widened
// input, the evidence-hash memo key covers only the accepted-evidence projection — reusing
// reasoning across different full inputs is the unsoundness Q4 closed. Fresh reasoning every
// case; the memo returns ONLY at the caching/ADR-008 gate, keyed on the FULL synthesis input.
export async function stageSynthesis(
  ctx: TrackContext, trackOutputs: TrackOutput[], signals: Partial<Record<TrackKey, TrackSignal>>,
): Promise<{ synthesis: Synthesis }> {
  const normalized = normalizeEvidence(trackOutputs);
  const enriched = enrichWithGraph(normalized);
  // S-2 (a) — the ios model string derives from MODEL_CONFIG (was hardcoded: flipping synthesis to
  // another model via the config map left ios_version stale, so memoized/stored synthesis would be
  // reused across a model change — silent drift in the determinism-versioning layer).
  const synthesisModel = modelFor("synthesis");
  const ios = assembleIosVersion(enriched.evidence_hash, synthesisModel.provider, synthesisModel.model);
  const { synthesis, artifacts } = await runSynthesis({
    trackOutputs,
    identity: ctx.supplier_identity ?? null,
    roster: ctx.brands_submitted ?? [],
    planType: ctx.plan_type,
    signals,
  });
  const synthErr = await upsertCaseSynthesis(ctx.case_id, synthesis, ios, ctx.attempt_number ?? 1);
  if (synthErr.error) throw new Error(`synthesis persist failed: ${synthErr.error}`);
  // The extension siblings (module_1_extension, brand_evidence_status, dimension_run_record,
  // schema_fallbacks, refuter/limitations/audits) persist LOUD-BUT-NON-FATAL until the founder
  // runs the additive `synthesis_extension` migration (S-1f describe-and-stop; the H2 OQ-2
  // contract pattern — a drop is audited, never silent).
  await persistSynthesisExtension(ctx.case_id, ctx.attempt_number ?? 1, {
    module_1_extension: synthesis.module_1_extension ?? null,
    brand_evidence_status: synthesis.brand_evidence_status ?? null,
    dimension_run_record: synthesis.dimension_run_record ?? null,
    schema_fallbacks: synthesis.schema_fallbacks ?? null,
    refuter: artifacts.refuter,
    limitations: artifacts.limitations,
    audits: artifacts.audits,
    parse_failures: artifacts.parse_failures,
    synthesis_cost_usd: artifacts.cost_usd,
  });
  return { synthesis };
}

// Layer 4 verdict (deterministic) + Layer 5 report payload. Pure compute.
// H3 — the verdict ceiling (shared fn, all three verdict sites) is applied here for the pipeline:
// the returned .verdict is the CEILED one (what cases.verdict stores); the pre-cap score-verdict
// and reason ride along for the admin explanation. confidence_0_15 stays evidence-derived.
// S-0 (founder-signed 2026-07-16) — the synthesis→verdict firewall: computeVerdict (and the
// no-override recompute inside the composition) receive ONLY certify(...).synthesis — an LLM
// narrative can never reach the verdict uncertified. Layer 5 (buildReport) keeps the ORIGINAL
// synthesis: Module 9/8 are a client-surface path, not a verdict path.
export function stageVerdict(
  signals: Partial<Record<TrackKey, TrackSignal>>, synthesis: Synthesis,
): Verdict & Omit<CeilingResult, "verdict"> & Omit<NoOverrideResult, "verdict"> & { certification_audits: CertificationAudit[] } {
  const certified = certifySynthesisForVerdict(synthesis);
  const verdict = computeVerdict(signals, certified.synthesis);
  buildReport(synthesis, verdict); // payload computed here; Phase H renders the PDF from it.
  // Documentation no-override (founder-ruled 2026-07-12; shared fn, all three verdict sites):
  // documents can raise concern, never manufacture comfort — applied BEFORE the ceiling.
  const noOverride = applyDocumentationNoOverride(verdict, signals, certified.synthesis);
  const ceiled = applyVerdictCeiling({ verdict: noOverride.verdict }, signals);
  return { ...verdict, no_override_applied: noOverride.no_override_applied, research_only_verdict: noOverride.research_only_verdict, ...ceiled, certification_audits: certified.audits };
}

// Institutional memory (ADR-G006/G007, H6): EVERY completed attempt appends one intelligence_events
// row (append-only, replay-idempotent); profile rollups fire only for confirmed identities. The old
// attempt-1-only guard is retired — case_count dedupes by DISTINCT case_id by construction.
export async function stageMemoryWrite(ctx: TrackContext, args: MemoryWriteArgs): Promise<void> {
  await writeIntelligence(ctx, args);
}

// Finalize: persist case state + per-track statuses + the orchestration version.
export async function stageFinalize(
  ctx: TrackContext,
  args: { included: Set<number>; identityAcquisitionFailed: boolean; failedTracks?: Set<number>; skippedTracks?: Set<number>; identityUnconfirmed?: boolean; supplierIdentity?: SupplierIdentity; verdict: string; confidence_0_15: number },
): Promise<{ error: string | null }> {
  // ── DISPUTE/ESCALATION RE-RUN (founder-ruled 2026-07-13) — the deliberate NO-ADVANCE path, a
  // first-class branch, not a flag layered onto the normal update (the AWI-2607-022 pointer-advance
  // lesson). A dispute re-run is the system regenerating its OWN answer from the same facts (same
  // verdict EXPECTED); DISTINCT from "request further investigation", where a human adds NEW
  // intelligence and the verdict may legitimately change. The new attempt's rows/packs/synthesis
  // are already persisted upstream under the new attempt_number (H1); HERE the live case pointer —
  // verdict, status, track statuses, supplier_identity, delivered_* — is NEVER advanced and the
  // case is NEVER auto-delivered, regardless of case status. Adoption of the new attempt is a
  // separate, deliberate founder step. A would-be verdict flip is SURFACED in the audit log,
  // never silently adopted. No credit is touched anywhere on this path (re-runs a PAID case).
  if (ctx.dispute_rerun) {
    const { data: cur } = await supabaseAdmin.from("cases").select("status, verdict").eq("id", ctx.case_id).maybeSingle();
    const { error } = await supabaseAdmin.from("cases").update({ reinvestigation_pending: true }).eq("id", ctx.case_id);
    if (error) throw new Error(`finalize persist failed: ${error.message}`); // H2 — fail loud
    await supabaseAdmin.from("audit_log").insert({
      table_name: "cases", record_id: ctx.case_id, action: "UPDATE",
      actor_id: "system", actor_type: "system",
      new_value: {
        dispute_rerun: true, attempt: ctx.attempt_number ?? null,
        current_verdict: cur?.verdict ?? null, rerun_verdict: args.verdict,
        verdict_stable: (cur?.verdict ?? null) === args.verdict,
      },
    });
    return { error: null };
  }

  // H1 — Case Investigation Ledger: a delivered case is IMMUTABLE. A re-investigation persists its
  // rows under the new attempt (already done upstream) and only raises a flag for admin review;
  // verdict/status/delivered_at/delivered_attempt never change outside an explicit admin publish.
  const { data: current } = await supabaseAdmin.from("cases").select("status").eq("id", ctx.case_id).maybeSingle();
  if (current?.status === "delivered" || current?.status === "complete") {
    const { error } = await supabaseAdmin.from("cases").update({ reinvestigation_pending: true }).eq("id", ctx.case_id);
    if (error) throw new Error(`finalize persist failed: ${error.message}`); // H2 — fail loud
    return { error: null };
  }

  // H2 (OQ-1) — ANY unscored included finding track (acquisition- or LLM-failed → n_a) escalates:
  // under full automation a verdict missing a paid-for dimension must never flow toward delivery
  // unflagged. Backward-compatible: callers not passing failedTracks fall back to the legacy
  // Track-1-acquisition-only behavior.
  const failedTracks = args.failedTracks ?? (args.identityAcquisitionFailed ? new Set([1]) : new Set<number>());
  // Phase 5.1c.5 — an unconfirmed supplier identity (genuine multi-candidate ambiguity / no resolution)
  // caps the outcome: escalate to human review rather than deliver a confident verdict on an unknown
  // supplier. Mirrors the acquisition-failure guard (same status); computeVerdict stays untouched (OQ-4).
  const escalate = args.identityAcquisitionFailed || !!args.identityUnconfirmed || failedTracks.size > 0;
  const caseUpdate: Record<string, unknown> = {
    status: escalate ? "manual_override_required" : "awaiting_review",
    synthesis_status: "complete",
    verdict: args.verdict, confidence_score: args.confidence_0_15, track_0_status: "complete",
    pipeline_version: PIPELINE_VERSION,
  };
  if (args.supplierIdentity !== undefined) caseUpdate.supplier_identity = args.supplierIdentity; // final identity record (idempotent)
  // H3 — precedence: not-in-plan → skipped; FAILED → manual_required (failure visibility wins over
  // any other marker); not-implemented → skipped (deliberate absence); else complete.
  const skippedTracks = args.skippedTracks ?? new Set<number>();
  for (let n = 1; n <= 5; n++) {
    caseUpdate[`track_${n}_status`] = !args.included.has(n) ? "skipped"
      : failedTracks.has(n) ? "manual_required"
      : skippedTracks.has(n) ? "skipped" : "complete";
  }
  const { error } = await supabaseAdmin.from("cases").update(caseUpdate).eq("id", ctx.case_id);
  if (error) throw new Error(`finalize persist failed: ${error.message}`); // H2 — fail loud
  return { error: null };
}
