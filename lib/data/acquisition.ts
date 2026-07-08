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

// H7 (OQ-D) — replay reads the frozen input-of-record: the stored pack for a given attempt,
// reconstructed to the EvidencePack shape (the row stores sources in `pack` with hash/version/
// collected_at as columns). Returned AS STORED — whatever schema_version it froze under.
export async function getEvidencePack(
  caseId: string, trackKey: TrackKey, attempt: number,
): Promise<{ pack: EvidencePack | null; error: string | null }> {
  const { data, error } = await supabaseAdmin
    .from("case_evidence_packs")
    .select("pack, evidence_hash, schema_version, collected_at")
    .eq("case_id", caseId).eq("track_key", trackKey).eq("attempt_number", attempt)
    .maybeSingle();
  if (error) return { pack: null, error: error.message };
  if (!data) return { pack: null, error: null };
  return {
    pack: {
      schema_version: data.schema_version as string,
      case_id: caseId,
      track_key: trackKey,
      sources: (data.pack ?? []) as EvidencePack["sources"],
      evidence_hash: data.evidence_hash as string,
      collected_at: data.collected_at as string,
    },
    error: null,
  };
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
