import { supabaseAdmin } from "@/lib/supabase/admin";
import type { PlanType } from "@/lib/constants/plans";
import { TRACKS, TRACK_CONFIG } from "@/lib/constants/tracks";
import { runTrack0, type Track0Input } from "@/lib/research/track0";

// Orchestration seam (ADR-008 §5). G1 runs SYNCHRONOUSLY — no Inngest. This is a
// plain async function with no transport assumptions, so G2 can move Tracks 1–5
// execution into Inngest steps WITHOUT changing this signature or the data layer.
//
// Called once at submit, AFTER the case row exists + credits are deducted. Runs
// Track 0 (deterministic), then writes one case_track_results row per included track:
//  - track_0: ai_generated + founder_review_status 'approved' (intake, not a finding)
//  - included finding tracks: manual_required + 'pending' (G1 has no automation)
//  - excluded tracks: no row; cases.track_N_status set to 'skipped'
// Idempotent via upsert on (case_id, track, attempt_number=1).
export async function initializeCaseResearch(
  caseId: string,
  plan: PlanType,
  intake: Track0Input,
): Promise<{ error: string | null }> {
  const included = new Set(TRACK_CONFIG[plan].tracks);
  const t0 = runTrack0(intake);

  const rows = TRACKS.map((t) => {
    if (t.track_number === 0) {
      return {
        case_id: caseId, track: t.track, track_key: t.track_key, track_number: 0,
        source_mode: "ai_generated" as const,
        compiled_findings_json: t0 as unknown as Record<string, unknown>,
        founder_review_status: "approved" as const,
        manual_review_required: false,
        attempt_number: 1,
      };
    }
    if (!included.has(t.track_number)) return null; // skipped track → no row
    return {
      case_id: caseId, track: t.track, track_key: t.track_key, track_number: t.track_number,
      source_mode: "ai_generated" as const,
      compiled_findings_json: null,
      founder_review_status: "pending" as const,
      manual_review_required: true,
      manual_review_reason: "Automated research not yet enabled (G1) — enter findings manually.",
      attempt_number: 1,
    };
  }).filter((r): r is NonNullable<typeof r> => r !== null);

  const { error: upErr } = await supabaseAdmin
    .from("case_track_results")
    .upsert(rows, { onConflict: "case_id,track,attempt_number" });
  if (upErr) return { error: upErr.message };

  // Per-track status on cases + advance the case to awaiting_review (founder review).
  const caseUpdate: Record<string, unknown> = { status: "awaiting_review", track_0_status: "complete" };
  for (let n = 1; n <= 5; n++) {
    caseUpdate[`track_${n}_status`] = included.has(n) ? "manual_required" : "skipped";
  }
  const { error: caseErr } = await supabaseAdmin.from("cases").update(caseUpdate).eq("id", caseId);
  return { error: caseErr?.message ?? null };
}
