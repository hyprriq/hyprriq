import { inngest } from "@/lib/inngest/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendAdminAlert } from "@/lib/email/notify";

// H2 — pipeline watchdog (ADR-G007 fail-loud). A case must never wedge silently: any case sitting
// in a pre-terminal pipeline state past the cutoff has lost its Inngest run (send failed, retries
// exhausted pre-onFailure-era, or a crashed dev run). Sweep → research_failed + audit + alert.
// Terminal states (delivered/complete/cancelled/awaiting_*) are never touched — awaiting_client /
// awaiting_review legitimately wait on humans.
export const WEDGE_STATUSES = ["pending_intake", "queued", "research_running"] as const;
export const WEDGE_MAX_AGE_MINUTES = 30;

export async function sweepWedgedCases(now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - WEDGE_MAX_AGE_MINUTES * 60_000).toISOString();
  const { data } = await supabaseAdmin
    .from("cases")
    .select("id, case_number, status, updated_at")
    .in("status", [...WEDGE_STATUSES])
    .lt("updated_at", cutoff)
    .is("deleted_at", null);
  const wedged = (data ?? []) as { id: string; case_number: string | null; status: string; updated_at: string }[];
  if (wedged.length === 0) return 0;

  for (const c of wedged) {
    await supabaseAdmin.from("cases").update({ status: "research_failed" }).eq("id", c.id);
    await supabaseAdmin.from("audit_log").insert({
      table_name: "cases", record_id: c.id, action: "UPDATE",
      actor_id: "system", actor_type: "system",
      new_value: { watchdog: "stuck_case", prior_status: c.status, stuck_since: c.updated_at },
    });
  }
  await sendAdminAlert(
    `Watchdog: ${wedged.length} stuck case(s) marked research_failed`,
    `<p>${wedged.map((c) => `${c.case_number ?? c.id} (${c.status} since ${c.updated_at})`).join("<br/>")}</p>`,
  );
  return wedged.length;
}

// Every 15 minutes. retries:1 — the next tick is the retry.
export const pipelineWatchdog = inngest.createFunction(
  { id: "pipeline-watchdog", name: "Pipeline watchdog (stuck-case sweep)", retries: 1, triggers: [{ cron: "*/15 * * * *" }] },
  async () => ({ swept: await sweepWedgedCases() }),
);
