import type { TrackContext, TrackOutput, TrackSignal } from "@/lib/research/contracts";
import { type TrackKey } from "@/lib/constants/tracks";
import { tracksForPlan } from "@/lib/research/pipeline.registry";
import {
  stageResolveAttempt, stageTrack0, stageResolveIdentity, stagePersistIdentity, stageFindingTrack,
  stageSynthesis, stageVerdict, stageMemoryWrite, stageFinalize,
} from "@/lib/research/pipeline.steps";

// The Intelligence-OS pipeline — orchestrates the STAGES (lib/research/pipeline.steps) sequentially.
// Layers 1→5 reach report-ready AUTONOMOUSLY (no human gate). This synchronous caller is kept for
// the dev validation route; production submit drives the SAME stages DURABLY via Inngest
// (lib/inngest/functions/pipeline) so it is not bound by the serverless 60s cap. The stages — and
// the decision logic inside them — are identical across both callers (one source of truth).
//
//   Layer 1 Evidence → Layer 2 Normalization → (Layer 2.5 Evidence Graph, reserved seam)
//   → Layer 3 Intelligence (the ONLY adaptive layer) → Layer 4 Judgment (deterministic)
//   → Layer 5 Communication (explains, never changes the verdict)
export async function runPipeline(base: TrackContext): Promise<{ error: string | null }> {
  const plan = base.plan_type;
  const included = new Set(tracksForPlan(plan).map((t) => t.track_number)); // finding tracks for this plan

  // H1 — resolve this execution's investigation attempt ONCE, then thread it through every stage.
  const attempt = await stageResolveAttempt(base.case_id);
  const ctx: TrackContext = { ...base, attempt_number: attempt };

  // ── Layer 1 — Evidence Collection ──
  await stageTrack0(ctx);

  // ── Track 0.5 — resolve the supplier identity ONCE, then thread it onto the ctx every finding
  // track receives (Track 2+ classify against resolved_domain). Persist early so the manual-review
  // human sees it during research. ──
  const identity = await stageResolveIdentity(ctx);
  await stagePersistIdentity(ctx.case_id, identity);
  const ictx: TrackContext = { ...ctx, supplier_identity: identity };

  const trackOutputs: TrackOutput[] = [];
  const signals: Partial<Record<TrackKey, TrackSignal>> = {};
  let identityAcquisitionFailed = false;
  for (const t of tracksForPlan(plan)) {
    const r = await stageFindingTrack(ictx, t.track_number);
    trackOutputs.push(r.output);
    signals[t.track_key] = r.signal;
    if (r.acquisition_failed && t.track_key === "supplier_identity") identityAcquisitionFailed = true;
  }

  // ── Layers 2 / 2.5 / 3 — Normalization → Graph → Intelligence (memoized synthesis) ──
  let synthesis;
  try {
    ({ synthesis } = await stageSynthesis(ctx, trackOutputs));
  } catch (e) {
    return { error: e instanceof Error ? e.message : "synthesis failed" };
  }

  // ── Layer 4 Judgment + Layer 5 Communication ──
  const verdict = stageVerdict(signals, synthesis);

  // ── Institutional memory write-side (ADR-G006) ──
  await stageMemoryWrite(ictx, signals.supplier_identity ?? null, identityAcquisitionFailed);

  // ── Persist case state ──
  return stageFinalize(ictx, {
    included, identityAcquisitionFailed, identityUnconfirmed: identity.identity_unconfirmed,
    supplierIdentity: identity, verdict: verdict.verdict, confidence_0_15: verdict.confidence_0_15,
  });
}
