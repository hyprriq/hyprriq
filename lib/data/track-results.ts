import { supabaseAdmin } from "@/lib/supabase/admin";
import type { ConfidenceBand } from "@/lib/research/confidence";
import type { EvidenceItem, EvidenceWeight, TrackSignal, Unknown, WeightValidation, QuestionToAsk } from "@/lib/research/contracts";

// Read/write helpers for case_track_results — the single authoritative track table
// (ADR-G001 + v2.1 evidence columns). Service-role; callers are admin-guarded routes,
// the submit flow, or the Intelligence-OS pipeline.
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
  // v2.1 evidence layer (Layer 1 output). track_verdict_signal is CODE-derived (Layer 4a);
  // suggested_signal is the LLM's QA-only suggestion — never a verdict input.
  evidence_items: EvidenceItem[] | null;
  reasoning_notes: string | null;
  unknowns: Unknown[] | null;
  evidence_weights_applied: EvidenceWeight[] | null;
  track_verdict_signal: TrackSignal | null;
  suggested_signal: TrackSignal | null;
  failure_type: "soft" | "hard" | null;
  attempt_number: number;
  // Phase 5.1b — Track 1 firewall audit + classification metrics + regression artifact (optional:
  // present on Track 1 rows, absent on stub/manual rows + older read sites).
  weight_validation?: WeightValidation[] | null;
  classifications_total?: number | null;
  classifications_accepted?: number | null;
  classifications_rejected?: number | null;
  classifications_unknown?: number | null;
  acceptance_rate?: number | null;
  track_validation_report?: Record<string, unknown> | null;
  questions_to_ask?: QuestionToAsk[] | null; // Phase 5.1c — Track 2 client-facing questions
};

const COLS =
  "id, case_id, track, track_key, track_number, source_mode, compiled_findings_json, confidence_score, confidence_band, finding_certainty, founder_review_status, manual_review_required, manual_review_reason, manual_notes, evidence_items, reasoning_notes, unknowns, evidence_weights_applied, track_verdict_signal, suggested_signal, failure_type, attempt_number, weight_validation, classifications_total, classifications_accepted, classifications_rejected, classifications_unknown, acceptance_rate, track_validation_report, questions_to_ask";

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
