import { inngest } from "@/lib/inngest/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendAdminAlert } from "@/lib/email/notify";
import { runIntegritySweep, type SweepResult } from "@/lib/integrity/sweep";
import { CHECK_BY_ID } from "@/lib/integrity/checks";

// ── THE NIGHTLY INTEGRITY SWEEP (founder-locked 2026-08-22) ──────────────────────────────────
//
// Runs every corpus-wide check over every case, records the result, and pages the founder ONLY
// for findings that are NEW since the previous run.
//
// ⛔ ONE ALERT PER NEW FINDING, NEVER A DAILY DIGEST (founder ruling 3a, in his words: "an alarm
// that fires every day is an alarm I will learn to ignore"). The dedup is by finding KEY against
// the previous run's stored result — so the known AWI-2607-022 divergence, which is real and
// stays real until investigated, pages ONCE and then goes quiet while remaining visible on
// /admin/integrity. A finding that DISAPPEARS is not alerted either; it simply stops showing.
//
// WHERE THE RESULT LIVES: audit_log, not a new table. The row shape is
// {integrity_sweep: true, result: SweepResult} — deliberately NO migration, because the founder
// runs those by hand and a health dashboard that waits on a migration is a dashboard that says
// "never checked" for a week. audit_log already carries system records of exactly this kind
// (grant_link_fail_open, verdict_absent_at_render, stripe_price_unmapped).
//
// COST: zero external spend — no LLM, no Serper, no WHOIS. DB reads plus pure replays.
// CADENCE: daily at 06:20 UTC, deliberately AFTER the 13:00 email cron is irrelevant to it and
// before a UK working day starts. Drift of this kind is measured in days, not minutes; hourly
// would multiply DB reads for no faster answer, and the BLOCK checks already stop the same
// defects at the moment they would happen. This sweep exists for what BLOCK cannot see:
// already-delivered reports and corpus-wide divergence.

export const INTEGRITY_SWEEP_AUDIT = "integrity_sweep";

/** PURE — which findings are new since the previous run? Kept testable, out of the step body. */
export function newFindings(current: SweepResult, previous: SweepResult | null): { checkId: string; key: string; case_number: string; detail: string }[] {
  const seen = new Set<string>();
  for (const c of previous?.checks ?? []) for (const f of c.findings) seen.add(f.key);
  const out: { checkId: string; key: string; case_number: string; detail: string }[] = [];
  for (const c of current.checks) {
    for (const f of c.findings) {
      if (!seen.has(f.key)) out.push({ checkId: c.checkId, ...f });
    }
  }
  return out;
}

interface InngestStep { run<T>(id: string, fn: () => T | Promise<T>): Promise<T> }

export const integritySweep = inngest.createFunction(
  {
    id: "integrity-sweep",
    name: "Nightly integrity sweep (corpus-wide standing checks)",
    retries: 1,
    triggers: [{ cron: "20 6 * * *" }],
  },
  async ({ step }: { step: InngestStep }) => {
    const previous = await step.run("load-previous", async () => {
      const { data } = await supabaseAdmin
        .from("audit_log")
        .select("new_value")
        .eq("table_name", "cases")
        .contains("new_value", { [INTEGRITY_SWEEP_AUDIT]: true })
        .order("created_at", { ascending: false })
        .limit(1);
      const row = (data ?? [])[0] as { new_value?: { result?: SweepResult } } | undefined;
      return row?.new_value?.result ?? null;
    });

    const result = await step.run("sweep", () => runIntegritySweep());

    await step.run("record", async () => {
      // The record is what /admin/integrity reads. If this write fails the sweep is worthless,
      // so it is NOT swallowed — a failed record must retry.
      const { error } = await supabaseAdmin.from("audit_log").insert({
        table_name: "cases", record_id: null, action: "INSERT",
        actor_id: "system", actor_type: "system",
        new_value: { [INTEGRITY_SWEEP_AUDIT]: true, result },
      });
      if (error) throw new Error(`integrity sweep record failed: ${error.message}`);
    });

    const fresh = newFindings(result, previous);
    if (fresh.length > 0) {
      await step.run("alert", async () => {
        const lines = fresh.map((f) => {
          const spec = CHECK_BY_ID.get(f.checkId);
          return `<li><b>${f.case_number}</b> — ${spec?.title ?? f.checkId}<br/><span style="color:#43494F">${f.detail}</span></li>`;
        }).join("");
        const meanings = [...new Set(fresh.map((f) => f.checkId))]
          .map((id) => { const s = CHECK_BY_ID.get(id); return s ? `<p><b>${s.title}:</b> ${s.meaning}</p>` : ""; })
          .join("");
        await sendAdminAlert(
          `Integrity sweep — ${fresh.length} NEW finding(s)`,
          `<p>The nightly sweep found <b>${fresh.length}</b> finding(s) that were not present in the previous run.</p>
<ul>${lines}</ul>
${meanings}
<p>Full state, including findings already known: <b>/admin/integrity</b>.</p>
<p style="color:#43494F">You are seeing this because it is NEW. Findings already reported stay visible on the page but do not page you again.</p>`,
        );
      });
    }

    const totals = Object.fromEntries(result.checks.map((c) => [c.checkId, c.findings.length]));
    return { ran_at: result.ran_at, cases: result.cases_total, new_findings: fresh.length, totals };
  },
);
