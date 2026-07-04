import { supabaseAdmin } from "@/lib/supabase/admin";
import type { TrackKey } from "@/lib/constants/tracks";
import type { EvidencePack, AcquisitionMetric } from "@/lib/research/acquisition/types";

// Persist the raw Evidence Pack (replay + future cache invalidation) and per-plugin metrics
// (cost optimization + calibration). Service-role; admin-guarded callers / pipeline only.
// H1 — packs are the frozen input-of-record, one per (case, track, attempt). Upsert (not insert):
// an Inngest step retry re-gathers and REPLACES its own attempt's pack (keeping the stored pack
// consistent with what was actually scored) — it can never touch another attempt's pack.
export async function persistEvidencePack(pack: EvidencePack, attemptNumber: number): Promise<{ error: string | null }> {
  const { error } = await supabaseAdmin.from("case_evidence_packs").upsert({
    case_id: pack.case_id, track_key: pack.track_key, pack: pack.sources,
    evidence_hash: pack.evidence_hash, schema_version: pack.schema_version,
    collected_at: pack.collected_at, attempt_number: attemptNumber,
  }, { onConflict: "case_id,track_key,attempt_number" });
  return { error: error?.message ?? null };
}

export async function persistAcquisitionMetrics(
  caseId: string, trackKey: TrackKey, metrics: AcquisitionMetric[],
): Promise<{ error: string | null }> {
  if (metrics.length === 0) return { error: null };
  const rows = metrics.map((m) => ({
    case_id: caseId, track_key: trackKey, plugin_id: m.plugin_id,
    latency_ms: m.latency_ms, api_cost_usd: m.api_cost_usd,
    evidence_items_returned: m.evidence_items_returned,
    retry_count: m.retry_count, final_status: m.final_status,
  }));
  const { error } = await supabaseAdmin.from("case_acquisition_metrics").insert(rows);
  return { error: error?.message ?? null };
}
