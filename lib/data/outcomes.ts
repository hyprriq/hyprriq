import { supabaseAdmin } from "@/lib/supabase/admin";
import { OUTCOME_TYPES, type OutcomeType, type CaseOutcome } from "@/lib/constants/outcomes";

// H6 — case_outcomes is the moat's ground truth (audit Area 4: zero rows, zero code until now).
// Seeded at every delivery with the verdict the client actually received; the outcome fields are
// filled later by whoever learns what happened (founder via admin UI in H6; client path belongs to
// the gated confirmation-loop item). Enum + labels live in lib/constants/outcomes (client-safe).
export { OUTCOME_TYPES } from "@/lib/constants/outcomes";
export type { OutcomeType, CaseOutcome } from "@/lib/constants/outcomes";

export async function seedCaseOutcome(caseId: string, verdictAtDelivery: string): Promise<{ error: string | null }> {
  // Upsert: a re-publish after re-investigation refreshes verdict_at_delivery (the outcome is
  // judged against what the client last received); recorded outcome fields are never touched here.
  const { error } = await supabaseAdmin.from("case_outcomes")
    .upsert({ case_id: caseId, verdict_at_delivery: verdictAtDelivery }, { onConflict: "case_id" });
  return { error: error?.message ?? null };
}

export async function recordCaseOutcome(caseId: string, o: {
  outcome_type: OutcomeType; outcome_notes?: string | null; prediction_correct?: boolean | null;
  reported_by: "client" | "founder" | "system";
}): Promise<{ error: string | null }> {
  if (!OUTCOME_TYPES.includes(o.outcome_type)) return { error: `invalid outcome_type: ${o.outcome_type}` };
  const { data, error } = await supabaseAdmin.from("case_outcomes")
    .update({
      outcome_type: o.outcome_type, outcome_notes: o.outcome_notes ?? null,
      prediction_correct: o.prediction_correct ?? null,
      outcome_reported_at: new Date().toISOString(), reported_by: o.reported_by,
    })
    .eq("case_id", caseId)
    .select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: "no outcome row — case was never delivered" };
  return { error: null };
}

// ── OUTCOMES AGGREGATE (2026-08-02) — the roll-up the placeholder promised. Capture is live on
// every delivered review page; this is the read across cases. Scope-partitioned like every
// admin read (fail closed: empty scope = zero rows, no query). ──
export interface OutcomeAggregateRow {
  verdict_at_delivery: string | null;
  outcome_type: string | null;
  prediction_correct: boolean | null;
  outcome_reported_at: string | null;
  cases: { case_number: string; vendor_name: string | null; client_id: string } | null;
}

export async function getOutcomesAggregate(scope: string[] | null): Promise<{
  rows: OutcomeAggregateRow[];
  totals: { delivered: number; recorded: number; byType: Record<string, number>; predictionCorrect: number; predictionWrong: number };
}> {
  const empty = { rows: [], totals: { delivered: 0, recorded: 0, byType: {}, predictionCorrect: 0, predictionWrong: 0 } };
  if (scope !== null && scope.length === 0) return empty; // fail closed
  let q = supabaseAdmin
    .from("case_outcomes")
    .select("verdict_at_delivery, outcome_type, prediction_correct, outcome_reported_at, cases!inner(case_number, vendor_name, client_id)")
    .order("outcome_reported_at", { ascending: false, nullsFirst: false });
  if (scope !== null) q = q.in("cases.client_id", scope);
  const { data } = await q;
  const rows = (data as unknown as OutcomeAggregateRow[]) ?? [];
  const byType: Record<string, number> = {};
  let predictionCorrect = 0, predictionWrong = 0, recorded = 0;
  for (const r of rows) {
    if (r.outcome_type) { recorded++; byType[r.outcome_type] = (byType[r.outcome_type] ?? 0) + 1; }
    if (r.prediction_correct === true) predictionCorrect++;
    if (r.prediction_correct === false) predictionWrong++;
  }
  return { rows, totals: { delivered: rows.length, recorded, byType, predictionCorrect, predictionWrong } };
}

export async function getCaseOutcome(caseId: string): Promise<CaseOutcome | null> {
  const { data } = await supabaseAdmin.from("case_outcomes")
    .select("outcome_type, outcome_notes, prediction_correct, outcome_reported_at, verdict_at_delivery, checkpoint_30_sent_at, checkpoint_90_sent_at")
    .eq("case_id", caseId).maybeSingle();
  return (data as CaseOutcome | null) ?? null;
}
