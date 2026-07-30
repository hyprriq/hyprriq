import { supabaseAdmin } from "@/lib/supabase/admin";
import type { AttemptRow } from "@/components/admin/attempt-history";

// ── ADMIN BATCH — the ops view read: per-track status columns (incl. track_6_status), the
// delivered-attempt pin, provenance (origin/operator_meta), and the attempt list. Reads only.
// track_6_status/origin/operator_meta may be absent pre-migration — degrade to nulls, never throw. ──

export interface CaseOpsView {
  statuses: {
    status: string;
    track_0_status: string | null; track_1_status: string | null; track_2_status: string | null;
    track_3_status: string | null; track_4_status: string | null; track_5_status: string | null;
    track_6_status: string | null;
  };
  delivered_attempt: number | null;
  origin: string | null;
  operator_meta: { operator_id?: string; client_name?: string | null; company_name?: string | null } | null;
  attempts: AttemptRow[];
}

export async function getCaseOpsView(caseId: string): Promise<CaseOpsView | null> {
  const cols = "status, track_0_status, track_1_status, track_2_status, track_3_status, track_4_status, track_5_status, delivered_attempt";
  // Try the post-migration shape first; fall back without the new columns.
  let row: Record<string, unknown> | null = null;
  const withNew = await supabaseAdmin.from("cases").select(`${cols}, track_6_status, origin, operator_meta`).eq("id", caseId).maybeSingle();
  if (!withNew.error && withNew.data) row = withNew.data as Record<string, unknown>;
  if (!row) {
    const base = await supabaseAdmin.from("cases").select(cols).eq("id", caseId).maybeSingle();
    if (base.error || !base.data) return null;
    row = base.data as Record<string, unknown>;
  }
  const { data: synths } = await supabaseAdmin
    .from("case_synthesis").select("attempt_number, created_at, synthesis_version")
    .eq("case_id", caseId).is("deleted_at", null).order("attempt_number", { ascending: true });
  return {
    statuses: {
      status: String(row.status ?? "pending_intake"),
      track_0_status: (row.track_0_status as string | null) ?? null,
      track_1_status: (row.track_1_status as string | null) ?? null,
      track_2_status: (row.track_2_status as string | null) ?? null,
      track_3_status: (row.track_3_status as string | null) ?? null,
      track_4_status: (row.track_4_status as string | null) ?? null,
      track_5_status: (row.track_5_status as string | null) ?? null,
      track_6_status: (row.track_6_status as string | null) ?? null,
    },
    delivered_attempt: (row.delivered_attempt as number | null) ?? null,
    origin: (row.origin as string | null) ?? null,
    operator_meta: (row.operator_meta as CaseOpsView["operator_meta"]) ?? null,
    attempts: (synths ?? []) as AttemptRow[],
  };
}
