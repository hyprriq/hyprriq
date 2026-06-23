import { supabaseAdmin } from "@/lib/supabase/admin";
import type { PlanType } from "@/lib/constants/plans";
import { TRACKS, TRACK_CONFIG } from "@/lib/constants/tracks";
import { runTrack0, type Track0Input } from "@/lib/research/track0";

// One fixed row shape. Every row MUST have an identical key set or PostgREST
// rejects the whole bulk upsert with PGRST102 "All object keys must match".
// Encoding it as a single type guarantees uniform keys across track_0 and the
// finding tracks (the bug that left case_track_results empty for AWI-2606-002).
export type InitialTrackRow = {
  case_id: string;
  track: string;
  track_key: string;
  track_number: number;
  source_mode: "ai_generated";
  compiled_findings_json: Record<string, unknown> | null;
  founder_review_status: "approved" | "pending";
  manual_review_required: boolean;
  manual_review_reason: string | null;
  attempt_number: number;
};

// Pure: build the initial case_track_results rows for a plan.
//  - track_0: ai_generated + 'approved' (intake, not a finding)
//  - included finding tracks: manual_required + 'pending' (G1 has no automation)
//  - excluded tracks: omitted (their cases.track_N_status is set to 'skipped')
export function buildInitialTrackRows(
  caseId: string,
  plan: PlanType,
  intake: Track0Input,
): InitialTrackRow[] {
  const included = new Set(TRACK_CONFIG[plan].tracks);
  const t0 = runTrack0(intake);
  return TRACKS
    .filter((t) => t.track_number === 0 || included.has(t.track_number))
    .map((t): InitialTrackRow =>
      t.track_number === 0
        ? {
            case_id: caseId, track: t.track, track_key: t.track_key, track_number: 0,
            source_mode: "ai_generated",
            compiled_findings_json: t0 as unknown as Record<string, unknown>,
            founder_review_status: "approved",
            manual_review_required: false,
            manual_review_reason: null,
            attempt_number: 1,
          }
        : {
            case_id: caseId, track: t.track, track_key: t.track_key, track_number: t.track_number,
            source_mode: "ai_generated",
            compiled_findings_json: null,
            founder_review_status: "pending",
            manual_review_required: true,
            manual_review_reason: "Automated research not yet enabled (G1) — enter findings manually.",
            attempt_number: 1,
          },
    );
}

// Orchestration seam (ADR-008 §5). G1 runs SYNCHRONOUSLY — no Inngest. Plain async
// function with no transport assumptions, so G2 can move Tracks 1–5 execution into
// Inngest steps WITHOUT changing this signature or the data layer.
//
// Called once at submit, AFTER the case row exists + credits are deducted.
// Idempotent via upsert on (case_id, track, attempt_number=1).
export async function initializeCaseResearch(
  caseId: string,
  plan: PlanType,
  intake: Track0Input,
): Promise<{ error: string | null }> {
  const included = new Set(TRACK_CONFIG[plan].tracks);
  const rows = buildInitialTrackRows(caseId, plan, intake);

  const { error: upErr } = await supabaseAdmin
    .from("case_track_results")
    .upsert(rows, { onConflict: "case_id,track,attempt_number" });
  if (upErr) {
    console.error("[orchestrator] case_track_results upsert failed:", upErr.message, { caseId, plan });
    return { error: upErr.message };
  }

  // Per-track status on cases + advance the case to awaiting_review (founder review).
  const caseUpdate: Record<string, unknown> = { status: "awaiting_review", track_0_status: "complete" };
  for (let n = 1; n <= 5; n++) {
    caseUpdate[`track_${n}_status`] = included.has(n) ? "manual_required" : "skipped";
  }
  const { error: caseErr } = await supabaseAdmin.from("cases").update(caseUpdate).eq("id", caseId);
  if (caseErr) console.error("[orchestrator] cases status update failed:", caseErr.message, { caseId });
  return { error: caseErr?.message ?? null };
}
