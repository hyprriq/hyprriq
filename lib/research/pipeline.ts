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
  for (const n of [1, 2, 3, 4, 5]) {
    if (!included.has(n)) continue; // skipped for this plan
    const def = trackByNumber(n);
    const out = await TRACK_FNS[n](ctx);
    trackOutputs.push(out);

    // ── Layer 4a — CODE-derived signal (the LLM never decides PASS/FAIL) ──
    const foundTypes = out.evidence_items.map((e) => e.weight_key).filter((k): k is string => !!k);
    const sig = deriveTrackSignal(def.track_key, foundTypes);
    signals[def.track_key] = sig.signal;

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

  // ── Institutional memory write-side (ADR-G006 seam) ──
  await writeIntelligence(ctx);

  // ── Persist case state — report-ready, reached autonomously ──
  const caseUpdate: Record<string, unknown> = {
    status: "awaiting_review", synthesis_status: "complete",
    verdict: verdict.verdict, confidence_score: verdict.confidence_0_15, track_0_status: "complete",
  };
  for (let n = 1; n <= 5; n++) caseUpdate[`track_${n}_status`] = included.has(n) ? "complete" : "skipped";
  const { error } = await supabaseAdmin.from("cases").update(caseUpdate).eq("id", ctx.case_id);
  return { error: error?.message ?? null };
}
