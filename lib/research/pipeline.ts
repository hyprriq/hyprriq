import { supabaseAdmin } from "@/lib/supabase/admin";
import type { TrackContext, TrackOutput, TrackSignal } from "@/lib/research/contracts";
import { type TrackKey, requiredFindingTracks, trackByNumber } from "@/lib/constants/tracks";
import { runTrack0 } from "@/lib/research/track0";
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

const TRACK_FNS: Record<number, (ctx: TrackContext) => Promise<TrackOutput>> = {
  1: runTrack1, 2: runTrack2, 3: runTrack3, 4: runTrack4, 5: runTrack5,
};

// The Intelligence-OS pipeline — Layers 1→5, STRICTLY SEPARATED. Each layer is its own module;
// this function only ORCHESTRATES + PERSISTS. It reaches report-ready AUTONOMOUSLY (no human
// input). Stage 2 runs it synchronously; Phase 5 moves the Layer-1 loop into Inngest durable
// steps with no change to any layer's logic (transport-agnostic seam).
//
//   Layer 1 Evidence → Layer 2 Normalization → (Layer 2.5 Evidence Graph, reserved seam)
//   → Layer 3 Intelligence (the ONLY adaptive layer) → Layer 4 Judgment (deterministic)
//   → Layer 5 Communication (explains, never changes the verdict)
export async function runPipeline(ctx: TrackContext): Promise<{ error: string | null }> {
  const included = new Set(requiredFindingTracks(ctx.plan_type)); // finding tracks 1–5 for this plan

  // ── Layer 1 — Evidence Collection ───────────────────────────────────────────
  // Track 0 (intake, deterministic): not a finding — auto-approved, signal n_a.
  const t0 = runTrack0({ vendor_name: ctx.vendor_name, brands_submitted: ctx.brands_submitted, has_document: false });
  await upsertTrackResult({
    case_id: ctx.case_id, track: "track_0", track_key: "intake_scope_guard", track_number: 0,
    source_mode: "ai_generated", compiled_findings_json: t0 as unknown as Record<string, unknown>,
    track_verdict_signal: "n_a", founder_review_status: "approved", manual_review_required: false,
  });

  const trackOutputs: TrackOutput[] = [];
  const signals: Partial<Record<TrackKey, TrackSignal>> = {};
  let identityAcquisitionFailed = false;
  for (const n of [1, 2, 3, 4, 5]) {
    if (!included.has(n)) continue; // skipped for this plan
    const def = trackByNumber(n);
    const out = await TRACK_FNS[n](ctx);
    trackOutputs.push(out);

    // ── Acquisition-failure guard (correctness) — an EMPTY Evidence Pack means we COULD NOT research,
    // not that we researched and found nothing. Such a track must NOT score (→ n_a, excluded from the
    // verdict), must NOT write institutional memory, and must escalate to manual review. ──
    if (out.acquisition_failed) {
      if (def.track_key === "supplier_identity") identityAcquisitionFailed = true;
      signals[def.track_key] = "n_a";
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
      continue;
    }

    // ── Layer 4a — CODE-derived signal (the LLM never decides PASS/FAIL) ──
    // Dedupe evidence_types: each ADR-G003 type scores ONCE (presence is binary). Without this, the
    // same key accepted from two sources would double-count points and inflate the score (anti-gaming).
    const foundTypes = [...new Set(out.evidence_items.map((e) => e.weight_key).filter((k): k is string => !!k))];
    const sig = deriveTrackSignal(def.track_key, foundTypes);
    signals[def.track_key] = sig.signal;

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
      },
      founder_review_status: "approved", manual_review_required: false,
      weight_validation: out.weight_validation ?? null,
      classifications_total: cTotal, classifications_accepted: cAccepted,
      classifications_rejected: cRejected, classifications_unknown: cUnknown,
      acceptance_rate: cTotal > 0 ? Number((cAccepted / cTotal).toFixed(2)) : null,
      track_validation_report: out.track_validation_report ?? null,
    });
  }

  // ── Layer 2 — Normalization ──
  const normalized = normalizeEvidence(trackOutputs);
  // ── Layer 2.5 — Evidence Graph (reserved seam; passthrough today) ──
  const enriched = enrichWithGraph(normalized);
  // ── Layer 3 — Intelligence (the only adaptive reasoning layer) ──
  const ios = assembleIosVersion(enriched.evidence_hash, "anthropic", "claude-sonnet-4-6");
  // Memoize (enhancement #2): reuse synthesis when identical evidence was already reasoned over
  // under the same IOS version → same evidence → same synthesis → same verdict.
  const memoized = await getSynthesisByEvidenceHash(enriched.evidence_hash, ios.ios_version);
  const synthesis = memoized ?? (await runSynthesis(enriched));
  const synthErr = await upsertCaseSynthesis(ctx.case_id, synthesis, ios);
  if (synthErr.error) return { error: synthErr.error };

  // ── Layer 4 — Judgment (deterministic; reads only structured fields) ──
  const verdict = computeVerdict(signals, synthesis);
  // ── Layer 5 — Communication (deterministic; explains, never changes the verdict) ──
  buildReport(synthesis, verdict); // payload computed here; Phase H renders the PDF from it.

  // ── Institutional memory write-side (ADR-G006) — feed Track 1's real signal. SKIP when the
  // identity acquisition failed: never pollute the corpus with a "couldn't research" non-signal. ──
  if (!identityAcquisitionFailed) {
    await writeIntelligence(ctx, signals.supplier_identity ?? null);
  }

  // ── Persist case state. If the identity acquisition failed, escalate to manual_override_required
  // (distinct status) instead of awaiting_review — a human must look, not the autonomous report. ──
  const caseUpdate: Record<string, unknown> = {
    status: identityAcquisitionFailed ? "manual_override_required" : "awaiting_review",
    synthesis_status: "complete",
    verdict: verdict.verdict, confidence_score: verdict.confidence_0_15, track_0_status: "complete",
  };
  for (let n = 1; n <= 5; n++) {
    caseUpdate[`track_${n}_status`] = !included.has(n) ? "skipped"
      : (n === 1 && identityAcquisitionFailed) ? "manual_required" : "complete";
  }
  const { error } = await supabaseAdmin.from("cases").update(caseUpdate).eq("id", ctx.case_id);
  return { error: error?.message ?? null };
}
