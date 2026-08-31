import { inngest } from "@/lib/inngest/client";
import { recordHeartbeat } from "@/lib/inngest/heartbeat";
import { skipOutsideProduction } from "@/lib/inngest/productionOnly";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendAdminAlert } from "@/lib/email/notify";
import { CASE_SLA_HOURS } from "@/lib/constants/plans";

// ── STALLED-CASE ALARM (founder-ruled 2026-08-18, audit P0-2 / P1-9) — the SECOND sweep.
//
// WHY IT IS SEPARATE FROM THE WATCHDOG, and why the watchdog's exemption STAYS: `sweepWedgedCases`
// does not alert, it MUTATES — it sets `research_failed`. Adding `awaiting_review` to its
// WEDGE_STATUSES would mark every case legitimately waiting on a human as FAILED, including a
// paying client's live case. Those are two different questions with two different right answers:
//   "this run is dead"            → watchdog: change the status, tell someone.
//   "nobody has LOOKED at this"   → here:     change NOTHING, tell someone.
// This function never writes to `cases`. That is the whole point of it existing separately.
//
// THE AGE FALLBACK, and why it is not optional: `cases.sla_deadline` is NULL on 37 of 39 cases —
// not a bug in today's code (both intake paths stamp it) but a backfill gap, because the column
// was only ever written from the 2026-08-12 SLA ruling onward. An SLA-only trigger would therefore
// watch 2 cases and ignore 37. Effective deadline = sla_deadline ?? created_at + CASE_SLA_HOURS,
// so the alarm is correct on every case without backfilling history (which would have instantly
// marked 37 June/July fixtures overdue).

export const STALLED_STATUSES = ["awaiting_review", "manual_override_required"] as const;
/** Don't re-page about the same case more than once a day — the first sweep names a 53-day backlog. */
export const STALL_REALERT_HOURS = 24;

export type StalledCandidate = {
  id: string;
  case_number: string | null;
  status: string;
  sla_deadline: string | null;
  created_at: string;
};

export type StalledCase = StalledCandidate & { effectiveDeadline: string; hoursOverdue: number };

/** PURE — the selection rule, testable without a DB. */
export function selectStalled(rows: StalledCandidate[], now: Date): StalledCase[] {
  return rows
    .map((r) => {
      const effective = r.sla_deadline
        ? new Date(r.sla_deadline)
        : new Date(new Date(r.created_at).getTime() + CASE_SLA_HOURS * 3_600_000);
      return {
        ...r,
        effectiveDeadline: effective.toISOString(),
        hoursOverdue: Math.floor((now.getTime() - effective.getTime()) / 3_600_000),
      };
    })
    .filter((r) => r.hoursOverdue > 0)
    .sort((a, b) => b.hoursOverdue - a.hoursOverdue);
}

export async function sweepStalledCases(now: Date = new Date()): Promise<number> {
  const { data } = await supabaseAdmin
    .from("cases")
    .select("id, case_number, status, sla_deadline, created_at")
    .in("status", [...STALLED_STATUSES])
    .is("deleted_at", null);

  const overdue = selectStalled((data ?? []) as StalledCandidate[], now);
  if (overdue.length === 0) return 0;

  // De-dupe against our own prior pages (same windowed-audit_log idiom as degradedWrites).
  const since = new Date(now.getTime() - STALL_REALERT_HOURS * 3_600_000).toISOString();
  const { data: recent } = await supabaseAdmin
    .from("audit_log")
    .select("record_id, new_value, created_at")
    .eq("actor_type", "system")
    .gte("created_at", since)
    .limit(500);
  const alreadyPaged = new Set(
    ((recent ?? []) as { record_id: string | null; new_value: Record<string, unknown> | null }[])
      .filter((r) => r.new_value && "stalled_alert" in r.new_value)
      .map((r) => String(r.record_id)),
  );

  const fresh = overdue.filter((c) => !alreadyPaged.has(c.id));
  if (fresh.length === 0) return 0;

  const line = (c: StalledCase) =>
    `${c.case_number ?? c.id} — ${c.status}, ${c.hoursOverdue}h past ${c.sla_deadline ? "its SLA" : "24h from submission"}`;
  const notified = await sendAdminAlert(
    `${fresh.length} case(s) stalled past the ${CASE_SLA_HOURS}h SLA`,
    `<p>These cases are waiting on a human and nothing has moved them. No status was changed.</p>
<p>${fresh.map(line).join("<br/>")}</p>`,
  );

  // One row per paged case (this is what the next sweep de-dupes against), plus the pager's OWN
  // outcome — P1-10: every other sendAdminAlert call site discards {sent, reason}, so a pager that
  // silently fails to send looks identical to a quiet system. This one records which it was.
  for (const c of fresh) {
    await supabaseAdmin.from("audit_log").insert({
      table_name: "cases", record_id: c.id, action: "UPDATE",
      actor_id: "system", actor_type: "system",
      new_value: {
        stalled_alert: true,
        status: c.status,
        hours_overdue: c.hoursOverdue,
        effective_deadline: c.effectiveDeadline,
        deadline_source: c.sla_deadline ? "sla_deadline" : "created_at+CASE_SLA_HOURS",
        alert_sent: notified.sent,
        alert_reason: notified.reason ?? null,
      },
    });
  }
  return fresh.length;
}

// Hourly. A 24h SLA does not need the watchdog's 15-minute cadence, and the per-case de-dupe
// window is a day — a tighter cron would only add empty runs.
export const stalledCaseAlarm = inngest.createFunction(
  { id: "stalled-case-alarm", name: "Stalled-case alarm (human-wait states, no status writes)", retries: 1, triggers: [{ cron: "0 * * * *" }] },
  async () => {
    // ⚠ PRODUCTION ONLY: writes audit rows and pages the founder. Two environments would double
    // every alert — and "an alarm that fires twice is an alarm I will learn to ignore" is the same
    // ruling that shaped the one-alert-per-NEW-finding rule on the integrity sweep.
    // ⚠ PRODUCTION ONLY — see lib/inngest/productionOnly.ts. Both environments' schedulers fire
    // against the SAME database; without this the job runs twice a day from two deployments.
    const skip = skipOutsideProduction();
    if (skip) return skip;
    const out = { paged: await sweepStalledCases() };
    await recordHeartbeat("stalled-case-alarm", out.paged === 0 ? "nothing newly stalled" : `paged on ${out.paged} case(s)`);
    return out;
  },
);
