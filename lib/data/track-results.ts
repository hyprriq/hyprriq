import { supabaseAdmin } from "@/lib/supabase/admin";
import type { ConfidenceBand } from "@/lib/research/confidence";

// Read/write helpers for case_track_results — the single authoritative track table
// (ADR-G001). Service-role; callers are admin-guarded routes or the submit flow.
export type TrackResultRow = {
  id: string;
  case_id: string;
  track: string;
  track_key: string;
  track_number: number;
  source_mode: "ai_generated" | "manual_override";
  compiled_findings_json: Record<string, unknown> | null;
  confidence_score: number | null;
  confidence_band: ConfidenceBand | null;
  finding_certainty: "verified" | "inferred" | "unknown" | null;
  founder_review_status: "pending" | "approved" | "edited" | "rejected";
  manual_review_required: boolean;
  manual_review_reason: string | null;
  manual_notes: string | null;
  attempt_number: number;
};

const COLS =
  "id, case_id, track, track_key, track_number, source_mode, compiled_findings_json, confidence_score, confidence_band, finding_certainty, founder_review_status, manual_review_required, manual_review_reason, manual_notes, attempt_number";

export async function getCaseTrackResults(caseId: string): Promise<TrackResultRow[]> {
  const { data } = await supabaseAdmin
    .from("case_track_results")
    .select(COLS)
    .eq("case_id", caseId)
    .is("deleted_at", null)
    .order("track_number", { ascending: true });
  return (data as TrackResultRow[]) ?? [];
}

// Upsert a single track row on the (case_id, track, attempt_number) natural key.
// Defaults attempt_number to 1 (the active row in G1 — Tier-2 reruns arrive in G2).
export async function upsertTrackResult(
  row: Partial<TrackResultRow> & { case_id: string; track: string; track_key: string; track_number: number },
): Promise<{ error: string | null }> {
  const { error } = await supabaseAdmin
    .from("case_track_results")
    .upsert({ attempt_number: 1, ...row }, { onConflict: "case_id,track,attempt_number" });
  return { error: error?.message ?? null };
}
