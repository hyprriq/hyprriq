import { supabaseAdmin } from "@/lib/supabase/admin";
import type { TrackKey } from "@/lib/constants/tracks";
import type { EvidencePack, AcquisitionMetric } from "@/lib/research/acquisition/types";

// Persist the raw Evidence Pack (replay + future cache invalidation) and per-plugin metrics
// (cost optimization + calibration). Service-role; admin-guarded callers / pipeline only.
export async function persistEvidencePack(pack: EvidencePack): Promise<{ error: string | null }> {
  const { error } = await supabaseAdmin.from("case_evidence_packs").insert({
    case_id: pack.case_id, track_key: pack.track_key, pack: pack.sources, collected_at: pack.collected_at,
  });
  return { error: error?.message ?? null };
}

export async function persistAcquisitionMetrics(
  caseId: string, trackKey: TrackKey, metrics: AcquisitionMetric[],
): Promise<{ error: string | null }> {
  if (metrics.length === 0) return { error: null };
  const rows = metrics.map((m) => ({
    case_id: caseId, track_key: trackKey, plugin_id: m.plugin_id,
    latency_ms: m.latency_ms, api_cost_usd: m.api_cost_usd, tokens_used: m.tokens_used,
    evidence_items_returned: m.evidence_items_returned, evidence_items_consumed: m.evidence_items_consumed,
  }));
  const { error } = await supabaseAdmin.from("case_acquisition_metrics").insert(rows);
  return { error: error?.message ?? null };
}
