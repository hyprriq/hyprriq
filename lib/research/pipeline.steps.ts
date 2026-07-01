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
import { buildReport } from "@/lib/research/reportBuilder";
import { assembleIosVersion } from "@/lib/research/ios";
import { upsertTrackResult } from "@/lib/data/track-results";
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
}

// Track 0 — intake (deterministic). Not a finding; auto-approved, signal n_a.
export async function stageTrack0(ctx: TrackContext): Promise<void> {
  const t0 = runTrack0({ vendor_name: ctx.vendor_name, brands_submitted: ctx.brands_submitted, has_document: false });
  await upsertTrackResult({
    case_id: ctx.case_id, track: "track_0", track_key: "intake_scope_guard", track_number: 0,
    source_mode: "ai_generated", compiled_findings_json: t0 as unknown as Record<string, unknown>,
    track_verdict_signal: "n_a", founder_review_status: "approved", manual_review_required: false,
  });
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
  await supabaseAdmin.from("cases").update({ supplier_identity: identity }).eq("id", caseId);
}

// One finding track (n ∈ 1..5): run it, apply the acquisition-failure guard, derive the CODE signal,
// persist the row + classification metrics. Returns the output + signal for fan-in.
export async function stageFindingTrack(ctx: TrackContext, n: number): Promise<FindingTrackResult> {
  const def = trackByNumber(n);
  const out = await TRACK_FNS[n](ctx);

  // ── Acquisition-failure guard — an EMPTY Evidence Pack means we COULD NOT research, not that we
  // researched and found nothing. Such a track must NOT score (→ n_a, excluded from the verdict),
  // must NOT write institutional memory, and must escalate to manual review. ──
  if (out.acquisition_failed) {
    await upsertTrackResult({
      case_id: ctx.case_id, track: def.track, track_key: def.track_key, track_number: n,
      source_mode: "ai_generated",
      evidence_items: [], reasoning_notes: out.reasoning_notes, unknowns: out.unknowns,
      track_verdict_signal: "n_a", finding_certainty: "unknown",
      manual_review_required: true, manual_review_reason: "acquisition produced no sources — could not research",
      failure_type: "soft", founder_review_status: "pending",
      compiled_findings_json: { signal: "n_a", acquisition_failed: true, summary: out.reasoning_notes },
      weight_validation: out.weight_validation ?? null,
      track_validation_report: out.track_validation_report ?? null,
      classifications_total: 0, classifications_accepted: 0, classifications_rejected: 0, classifications_unknown: 0, acceptance_rate: null,
    });
    return { output: out, signal: "n_a", acquisition_failed: true };
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

  await upsertTrackResult({
    case_id: ctx.case_id, track: def.track, track_key: def.track_key, track_number: n,
    source_mode: "ai_generated",
    evidence_items: out.evidence_items, reasoning_notes: out.reasoning_notes, unknowns: out.unknowns,
    evidence_weights_applied: sig.applied, suggested_signal: out.suggested_signal ?? null,
    track_verdict_signal: sig.signal, confidence_score: sig.score_0_15, confidence_band: sig.band,
    finding_certainty: "unknown",
    compiled_findings_json: {
      signal: sig.signal, score: sig.score_0_15, evidence_count: out.evidence_items.length, summary: out.reasoning_notes,
      // Track 2 advisory metadata (stored for the analyst, NOT scored). null on tracks that don't emit them.
      auth_level: out.auth_level ?? null, auth_level_reasoning: out.auth_level_reasoning ?? null,
      b2b_only_detected: out.b2b_only_detected ?? null, b2b_only_brands: out.b2b_only_brands ?? null,
    },
    founder_review_status: "approved", manual_review_required: false,
    weight_validation: out.weight_validation ?? null,
    classifications_total: cTotal, classifications_accepted: cAccepted,
    classifications_rejected: cRejected, classifications_unknown: cUnknown,
    acceptance_rate: cTotal > 0 ? Number((cAccepted / cTotal).toFixed(2)) : null,
    track_validation_report: out.track_validation_report ?? null,
    questions_to_ask: out.questions_to_ask ?? null,
  });

  return { output: out, signal: sig.signal, acquisition_failed: false };
}

// Layers 2 / 2.5 / 3 + memoized synthesis persist. Throws on persist error so the step retries.
export async function stageSynthesis(ctx: TrackContext, trackOutputs: TrackOutput[]): Promise<{ synthesis: Synthesis }> {
  const normalized = normalizeEvidence(trackOutputs);
  const enriched = enrichWithGraph(normalized);
  const ios = assembleIosVersion(enriched.evidence_hash, "anthropic", "claude-sonnet-4-6");
  // Memoize (enhancement #2): identical evidence under the same IOS version → same synthesis.
  const memoized = await getSynthesisByEvidenceHash(enriched.evidence_hash, ios.ios_version);
  const synthesis = memoized ?? (await runSynthesis(enriched));
  const synthErr = await upsertCaseSynthesis(ctx.case_id, synthesis, ios);
  if (synthErr.error) throw new Error(`synthesis persist failed: ${synthErr.error}`);
  return { synthesis };
}

// Layer 4 verdict (deterministic) + Layer 5 report payload. Pure compute.
export function stageVerdict(signals: Partial<Record<TrackKey, TrackSignal>>, synthesis: Synthesis): Verdict {
  const verdict = computeVerdict(signals, synthesis);
  buildReport(synthesis, verdict); // payload computed here; Phase H renders the PDF from it.
  return verdict;
}

// Institutional memory write-side (ADR-G006). SKIP when identity acquisition failed (no corpus pollution).
export async function stageMemoryWrite(ctx: TrackContext, identitySignal: TrackSignal | null, identityAcquisitionFailed: boolean): Promise<void> {
  if (!identityAcquisitionFailed) await writeIntelligence(ctx, identitySignal);
}

// Finalize: persist case state + per-track statuses + the orchestration version.
export async function stageFinalize(
  ctx: TrackContext,
  args: { included: Set<number>; identityAcquisitionFailed: boolean; identityUnconfirmed?: boolean; supplierIdentity?: SupplierIdentity; verdict: string; confidence_0_15: number },
): Promise<{ error: string | null }> {
  // Phase 5.1c.5 — an unconfirmed supplier identity (genuine multi-candidate ambiguity / no resolution)
  // caps the outcome: escalate to human review rather than deliver a confident verdict on an unknown
  // supplier. Mirrors the acquisition-failure guard (same status); computeVerdict stays untouched (OQ-4).
  const escalate = args.identityAcquisitionFailed || !!args.identityUnconfirmed;
  const caseUpdate: Record<string, unknown> = {
    status: escalate ? "manual_override_required" : "awaiting_review",
    synthesis_status: "complete",
    verdict: args.verdict, confidence_score: args.confidence_0_15, track_0_status: "complete",
    pipeline_version: PIPELINE_VERSION,
  };
  if (args.supplierIdentity !== undefined) caseUpdate.supplier_identity = args.supplierIdentity; // final identity record (idempotent)
  for (let n = 1; n <= 5; n++) {
    caseUpdate[`track_${n}_status`] = !args.included.has(n) ? "skipped"
      : (n === 1 && args.identityAcquisitionFailed) ? "manual_required" : "complete";
  }
  const { error } = await supabaseAdmin.from("cases").update(caseUpdate).eq("id", ctx.case_id);
  return { error: error?.message ?? null };
}
