import { inngest } from "@/lib/inngest/client";
import { recordHeartbeat } from "@/lib/inngest/heartbeat";
import { isVercelProduction } from "@/lib/inngest/productionOnly";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendAdminAlert } from "@/lib/email/notify";

// ── ADR-G006 ITEM-4 TRIPWIRE (founder-ruled 2026-07-28). The ruling ratified loud-but-non-fatal
// intelligence writes as SUPERSEDING the ADR's blocking rule (a memory-write outage must never
// hold a paying client's report hostage — the report is the product, the corpus is the moat, and
// a moat tolerates a gap a customer cannot). THE CONDITION: non-fatal is correct; non-fatal and
// UNNOTICED is not. This sweep surfaces the degraded-write audit families daily — the corpus and
// extension erosion record stops being write-only. ──

export const DEGRADED_WRITE_KEYS = [
  "memory_write_failed",            // G006/G007 corpus writes (writeIntelligence)
  "synthesis_extension_dropped",    // the S-1f extension persist (pre-migration or outage)
  "category_compliance_dropped",    // Track 6's advisory persist (pre-migration or outage)
] as const;

export interface DegradedAuditRow { record_id: string | null; created_at: string; new_value: Record<string, unknown> | null }

// The pure brain — which audit rows are degraded-write records.
export function pickDegradedWrites(rows: DegradedAuditRow[]): DegradedAuditRow[] {
  return rows.filter((r) => r.new_value && DEGRADED_WRITE_KEYS.some((k) => k in r.new_value!));
}

// Sweep the last 25 hours (one-hour overlap so a slow tick never leaves a blind spot; the digest
// may repeat a row across two days — repetition beats a gap). Empty sweeps send NOTHING.
export async function sweepDegradedWrites(now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - 25 * 60 * 60_000).toISOString();
  const { data } = await supabaseAdmin
    .from("audit_log")
    .select("record_id, created_at, new_value")
    .gte("created_at", cutoff)
    .eq("actor_type", "system")
    .order("created_at", { ascending: false })
    .limit(500);
  const hits = pickDegradedWrites((data ?? []) as DegradedAuditRow[]);
  if (hits.length === 0) return 0;
  const lines = hits.map((h) => {
    const family = DEGRADED_WRITE_KEYS.find((k) => k in (h.new_value ?? {}));
    const reason = String((h.new_value as Record<string, unknown>)[family ?? ""] ?? (h.new_value as Record<string, unknown>).reason ?? "");
    return `${h.record_id ?? "(no record id)"} · ${family} · ${h.created_at}${reason && reason !== "true" ? ` · ${reason}` : ""}`;
  });
  // ⚠ THE CHECK RUNS IN BOTH ENVIRONMENTS — it is READ-ONLY, and the founder's rule is that
  // read-only checks may. ONLY THE ALERT IS GATED, and that is an interpretation rather than a
  // mechanical application of the rule, so it is written down: two environments both paging the
  // founder daily is alert fatigue, and "an alarm that fires every day is an alarm I will learn to
  // ignore" is his own standing ruling. Running the check everywhere proves it works on staging;
  // alerting only from production keeps the alarm meaningful. Raised for a ruling either way.
  if (!isVercelProduction()) return hits.length;

  await sendAdminAlert(
    `${hits.length} degraded write(s) in the last day — corpus/extension data is dropping`,
    `<p>Non-fatal by ruling, but never unnoticed (G006 item-4 tripwire):</p><p>${lines.join("<br/>")}</p>`,
  );
  return hits.length;
}

// Daily, morning. retries:1 — tomorrow's tick is the retry, and the 25h window covers the seam.
export const degradedWritesWatchdog = inngest.createFunction(
  { id: "degraded-writes-watchdog", name: "Degraded-write sweep (G006 item-4 tripwire)", retries: 1, triggers: [{ cron: "0 7 * * *" }] },
  async () => {
    const out = { surfaced: await sweepDegradedWrites() };
    await recordHeartbeat(
      "degraded-writes-watchdog",
      out.surfaced === 0 ? "no degraded writes in the last day" : `${out.surfaced} degraded write(s) surfaced`,
    );
    return out;
  },
);
