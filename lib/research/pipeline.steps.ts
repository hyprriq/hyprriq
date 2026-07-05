import { supabaseAdmin } from "@/lib/supabase/admin";
import type { TrackContext, TrackOutput, TrackSignal, SupplierIdentity } from "@/lib/research/contracts";
import { type TrackKey, trackByNumber } from "@/lib/constants/tracks";
import { runTrack0 } from "@/lib/research/track0";
import { resolveSupplierIdentity } from "@/lib/research/track05";
import { runTrack1 } from "@/lib/research/track1";
import { runTrack2 } from "@/lib/research/track2";
import { runTrack3 } from "@/lib/research/track3";
import { runTrack4 } from "@/lib/research/track4";
import { runTrack5 } from "@/lib/research/track5";
import { deriveTrackSignal } from "@/lib/research/signals";
import { normalizeEvidence } from "@/lib/research/normalize";
import { enrichWithGraph } from "@/lib/research/graph";
import { runSynthesis } from "@/lib/research/synthesisEngine";
import { computeVerdict } from "@/lib/research/verdictEngine";
import { applyVerdictCeiling, type CeilingResult } from "@/lib/research/verdictCeiling";
import { buildReport } from "@/lib/research/reportBuilder";
import { assembleIosVersion } from "@/lib/research/ios";
import { upsertTrackResult, getNextAttemptNumber } from "@/lib/data/track-results";
import { upsertCaseSynthesis, getSynthesisByEvidenceHash } from "@/lib/data/synthesis";
import { writeIntelligence } from "@/lib/data/intelligence";
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

type Synthesis = Awaited<ReturnType<typeof runSynthesis>>;
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
      compiled_findings_json: { signal: "n_a", not_implemented: true, summary: out.reasoning_notes },
    });
    if (res.error) throw new Error(`${def.track} row persist failed: ${res.error}`);
    return { output: out, signal: "n_a", acquisition_failed: false, failed: false, not_implemented: true, track_number: n };
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
      compiled_findings_json: { signal: "n_a", acquisition_failed: true, summary: out.reasoning_notes },
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
      compiled_findings_json: { signal: "n_a", llm_failed: true, summary: out.reasoning_notes },
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

  // Phase 5.1b — classification metrics from the firewall audit (0/empty for stub tracks).
  const wv = out.weight_validation ?? [];
  const cTotal = wv.length;
  const cUnknown = wv.filter((v) => v.rejection_reason === "llm_returned_unknown").length;
  const cAccepted = wv.filter((v) => v.validated_weight_key !== null).length;
  const cRejected = cTotal - cAccepted - cUnknown;

  const persisted = await upsertTrackResult({
    case_id: ctx.case_id, track: def.track, track_key: def.track_key, track_number: n, attempt_number: ctx.attempt_number ?? 1,
    source_mode: "ai_generated",
    evidence_items: out.evidence_items, reasoning_notes: out.reasoning_notes, unknowns: out.unknowns,
    evidence_weights_applied: sig.applied, suggested_signal: out.suggested_signal ?? null,
    track_verdict_signal: sig.signal, confidence_score: sig.score_0_15, confidence_band: sig.band,
    finding_certainty: "unknown",
    compiled_findings_json: {
      signal: sig.signal, score: sig.score_0_15, evidence_count: out.evidence_items.length, summary: out.reasoning_notes,
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
    },
    founder_review_status: "approved", manual_review_required: false,
    weight_validation: out.weight_validation ?? null,
    classifications_total: cTotal, classifications_accepted: cAccepted,
    classifications_rejected: cRejected, classifications_unknown: cUnknown,
    acceptance_rate: cTotal > 0 ? Number((cAccepted / cTotal).toFixed(2)) : null,
    track_validation_report: out.track_validation_report ?? null,
    questions_to_ask: out.questions_to_ask ?? null,
  });
  if (persisted.error) throw new Error(`${def.track} row persist failed: ${persisted.error}`);

  return { output: out, signal: sig.signal, acquisition_failed: false, failed: false, not_implemented: false, track_number: n };
}

// Layers 2 / 2.5 / 3 + memoized synthesis persist. Throws on persist error so the step retries.
export async function stageSynthesis(ctx: TrackContext, trackOutputs: TrackOutput[]): Promise<{ synthesis: Synthesis }> {
  const normalized = normalizeEvidence(trackOutputs);
  const enriched = enrichWithGraph(normalized);
  const ios = assembleIosVersion(enriched.evidence_hash, "anthropic", "claude-sonnet-4-6");
  // Memoize (enhancement #2): identical evidence under the same IOS version → same synthesis.
  const memoized = await getSynthesisByEvidenceHash(enriched.evidence_hash, ios.ios_version);
  const synthesis = memoized ?? (await runSynthesis(enriched));
  const synthErr = await upsertCaseSynthesis(ctx.case_id, synthesis, ios, ctx.attempt_number ?? 1);
  if (synthErr.error) throw new Error(`synthesis persist failed: ${synthErr.error}`);
  return { synthesis };
}

// Layer 4 verdict (deterministic) + Layer 5 report payload. Pure compute.
// H3 — the verdict ceiling (shared fn, all three verdict sites) is applied here for the pipeline:
// the returned .verdict is the CEILED one (what cases.verdict stores); the pre-cap score-verdict
// and reason ride along for the admin explanation. confidence_0_15 stays evidence-derived.
export function stageVerdict(
  signals: Partial<Record<TrackKey, TrackSignal>>, synthesis: Synthesis,
): Verdict & Omit<CeilingResult, "verdict"> {
  const verdict = computeVerdict(signals, synthesis);
  buildReport(synthesis, verdict); // payload computed here; Phase H renders the PDF from it.
  const ceiled = applyVerdictCeiling(verdict, signals);
  return { ...verdict, ...ceiled };
}

// Institutional memory write-side (ADR-G006). SKIP when identity acquisition failed (no corpus pollution).
// H1 interim guard (full event ledger lands in H6): only a case's FIRST investigation feeds the
// corpus — re-runs must never inflate case_count or overwrite history.
export async function stageMemoryWrite(ctx: TrackContext, identitySignal: TrackSignal | null, identityAcquisitionFailed: boolean): Promise<void> {
  if (!identityAcquisitionFailed && (ctx.attempt_number ?? 1) === 1) await writeIntelligence(ctx, identitySignal);
}

// Finalize: persist case state + per-track statuses + the orchestration version.
export async function stageFinalize(
  ctx: TrackContext,
  args: { included: Set<number>; identityAcquisitionFailed: boolean; failedTracks?: Set<number>; skippedTracks?: Set<number>; identityUnconfirmed?: boolean; supplierIdentity?: SupplierIdentity; verdict: string; confidence_0_15: number },
): Promise<{ error: string | null }> {
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
