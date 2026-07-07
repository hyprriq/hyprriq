import { inngest } from "@/lib/inngest/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendAdminAlert } from "@/lib/email/notify";

// H6 — outcome checkpoints (ADR-G006 ground truth; "every idle week is permanently lost learning").
// Daily sweep: any delivered case at 30/90 days with NO recorded outcome gets ONE admin digest
// mention per checkpoint (columns record the nudge — never re-nags). ADMIN-ONLY by founder ruling
// (OQ-3): client-facing outcome requests belong to the gated confirmation-loop item.

export interface OutcomeCheckpointRow {
  case_id: string; case_number: string | null; vendor_name: string | null;
  delivered_at: string; outcome_type: string | null;
  checkpoint_30_sent_at: string | null; checkpoint_90_sent_at: string | null;
}

const DAY_MS = 86_400_000;

export function checkpointsDue(rows: OutcomeCheckpointRow[], now: Date): { due30: OutcomeCheckpointRow[]; due90: OutcomeCheckpointRow[] } {
  const open = rows.filter((r) => r.outcome_type === null && r.delivered_at);
  const age = (r: OutcomeCheckpointRow) => (now.getTime() - new Date(r.delivered_at).getTime()) / DAY_MS;
  return {
    due30: open.filter((r) => age(r) >= 30 && !r.checkpoint_30_sent_at),
    due90: open.filter((r) => age(r) >= 90 && !r.checkpoint_90_sent_at),
  };
}

export async function sweepOutcomeCheckpoints(now: Date = new Date()): Promise<{ due30: number; due90: number }> {
  const { data } = await supabaseAdmin
    .from("case_outcomes")
    .select("case_id, outcome_type, checkpoint_30_sent_at, checkpoint_90_sent_at, cases!inner(case_number, vendor_name, delivered_at)")
    .is("outcome_type", null);
  const rows: OutcomeCheckpointRow[] = (data ?? []).map((r) => {
    const c = r.cases as unknown as { case_number: string | null; vendor_name: string | null; delivered_at: string | null };
    return {
      case_id: r.case_id as string, case_number: c.case_number, vendor_name: c.vendor_name,
      delivered_at: c.delivered_at ?? "", outcome_type: r.outcome_type as string | null,
      checkpoint_30_sent_at: r.checkpoint_30_sent_at as string | null,
      checkpoint_90_sent_at: r.checkpoint_90_sent_at as string | null,
    };
  }).filter((r) => r.delivered_at);
  const { due30, due90 } = checkpointsDue(rows, now);
  if (due30.length === 0 && due90.length === 0) return { due30: 0, due90: 0 };

  const line = (r: OutcomeCheckpointRow) => `${r.case_number ?? r.case_id} — ${r.vendor_name ?? "?"} (delivered ${r.delivered_at.slice(0, 10)})`;
  await sendAdminAlert(
    `Outcome check-in: ${due30.length + due90.length} delivered case(s) need a recorded outcome`,
    `<p><strong>30-day:</strong><br/>${due30.map(line).join("<br/>") || "—"}</p>
     <p><strong>90-day:</strong><br/>${due90.map(line).join("<br/>") || "—"}</p>
     <p>Record each on its admin review page (Outcome panel).</p>`,
  );
  const ts = now.toISOString();
  for (const r of due30) await supabaseAdmin.from("case_outcomes").update({ checkpoint_30_sent_at: ts }).eq("case_id", r.case_id);
  for (const r of due90) await supabaseAdmin.from("case_outcomes").update({ checkpoint_90_sent_at: ts }).eq("case_id", r.case_id);
  return { due30: due30.length, due90: due90.length };
}

// Daily at 06:00 UTC. retries:1 — tomorrow's tick is the retry.
export const outcomeCheckpoints = inngest.createFunction(
  { id: "outcome-checkpoints", name: "Outcome checkpoints (30/90-day ground-truth sweep)", retries: 1, triggers: [{ cron: "0 6 * * *" }] },
  async () => sweepOutcomeCheckpoints(),
);
