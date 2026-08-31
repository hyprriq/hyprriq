import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * CRON HEARTBEATS — a row on every run, clean or not.
 *
 * ⚠ WHY THIS EXISTS (founder-ruled 2026-08-31, and it matters more than the bug that exposed it).
 * Six of the seven crons wrote to the database ONLY when they had something to report. The seventh —
 * the integrity sweep — wrote unconditionally, which is the only reason anyone discovered it had
 * been failing for six days on a NOT NULL violation. For the other six, "no evidence" and "never
 * ran" were the same observation, and no query could tell them apart.
 *
 * That is standing rule 14 at the infrastructure level: an instrument must prove it LOOKED, never
 * that it FOUND. A watchdog that is silent when clean is indistinguishable from a watchdog that is
 * dead, and the silence is most convincing exactly when you most want to trust it.
 *
 * ⚠ THE HEARTBEAT IS WRITTEN AT THE END OF A RUN, NOT THE START, AND THAT IS DELIBERATE. A cron that
 * runs and THROWS produces no heartbeat, so the health page reports it exactly as it reports one
 * that never fired — which is the honest reading: both mean "this check is not protecting you".
 * A start-of-run heartbeat would have shown the integrity sweep as healthy for all six days it was
 * failing.
 *
 * ⚠ AND THE WRITE IS BEST-EFFORT, NOT FATAL. A heartbeat that can fail the job it monitors is worse
 * than no heartbeat. If the write fails, no row lands, and the page reports the cron as overdue — a
 * FALSE ALARM rather than a false calm. That is the correct direction for a health signal: crying
 * wolf is recoverable, going quiet is not. It is also the exact failure the sweep suffered, so this
 * one is written so that failing produces noise instead of silence.
 */

export const CRON_HEARTBEAT_AUDIT = "cron_heartbeat";

/** Audit rows for system-wide records use these; `cases` is for rows about ONE case. */
export const SYSTEM_TABLE = "system";
export const SYSTEM_RECORD_ID = "corpus";

/**
 * THE REGISTRY — every scheduled function, its cadence, and what to call it on the health page.
 *
 * `intervalHours` is the DECLARED cadence, taken from the function's own cron expression. The health
 * page reports a cron as overdue at TWICE this, per the founder's ruling: one missed run is a blip,
 * two is a pattern.
 *
 * ⚠ THIS OBJECT IS THE SINGLE SOURCE, AND A LOCK HOLDS IT TO THE ROUTE. `cronHeartbeat.lock.test.ts`
 * asserts that every function registered with a cron trigger in app/api/inngest/route.ts appears
 * here AND calls recordHeartbeat — because a registry that silently omits a cron would recreate the
 * blind spot this whole mechanism exists to close.
 */
export const CRON_REGISTRY = {
  "pipeline-watchdog": { intervalHours: 0.25, label: "Pipeline watchdog", does: "sweeps cases stuck mid-run" },
  "stalled-case-alarm": { intervalHours: 1, label: "Stalled-case alarm", does: "flags cases waiting on a human too long" },
  "retention-sweep": { intervalHours: 24, label: "Retention sweep", does: "warns then deletes expired source documents" },
  "outcome-checkpoints": { intervalHours: 24, label: "Outcome checkpoints", does: "30/90-day ground-truth sweep" },
  "degraded-writes-watchdog": { intervalHours: 24, label: "Degraded-write sweep", does: "tripwire for silently dropped writes" },
  "integrity-sweep": { intervalHours: 24, label: "Nightly integrity sweep", does: "every corpus-wide standing check" },
  "email-reminders": { intervalHours: 24, label: "Scheduled email reminders", does: "low-credit and renewal notices" },
} as const;

export type CronId = keyof typeof CRON_REGISTRY;

export type Heartbeat = {
  cron_id: string;
  ran_at: string;
  /** A short, plain-English result — shown verbatim on /admin/integrity. */
  summary: string;
};

/**
 * Record that a cron completed. Call it as the LAST step of the function.
 * Never throws: see the note at the top of this file.
 */
export async function recordHeartbeat(cronId: CronId, summary: string): Promise<void> {
  try {
    const beat: Heartbeat = { cron_id: cronId, ran_at: new Date().toISOString(), summary };
    const { error } = await supabaseAdmin.from("audit_log").insert({
      table_name: SYSTEM_TABLE,
      record_id: SYSTEM_RECORD_ID,
      action: "INSERT",
      actor_id: "system",
      actor_type: "system",
      new_value: { [CRON_HEARTBEAT_AUDIT]: true, ...beat },
    });
    if (error) console.error(`[heartbeat] ${cronId}: ${error.message}`);
  } catch (e) {
    console.error(`[heartbeat] ${cronId}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export type CronHealth = {
  id: CronId;
  label: string;
  does: string;
  intervalHours: number;
  lastRun: string | null;
  hoursSince: number | null;
  /** `overdue` at more than twice the declared interval; `never` when no run was ever recorded. */
  state: "ok" | "overdue" | "never";
  summary: string | null;
};

/** Pure, so the staleness rule is testable without a database. */
export function assessCron(
  id: CronId,
  beat: Heartbeat | null,
  now = Date.now(),
): CronHealth {
  const spec = CRON_REGISTRY[id];
  if (!beat) {
    return { id, ...spec, lastRun: null, hoursSince: null, state: "never", summary: null };
  }
  const hours = Math.max(0, (now - new Date(beat.ran_at).getTime()) / 3_600_000);
  return {
    id,
    ...spec,
    lastRun: beat.ran_at,
    hoursSince: hours,
    // TWICE the interval, founder-ruled: one missed run is a blip, two is a pattern.
    state: hours > spec.intervalHours * 2 ? "overdue" : "ok",
    summary: beat.summary,
  };
}

/** The latest heartbeat for every registered cron, newest first per cron. */
export async function latestHeartbeats(now = Date.now()): Promise<CronHealth[]> {
  const { data } = await supabaseAdmin
    .from("audit_log")
    .select("new_value, created_at")
    .eq("table_name", SYSTEM_TABLE)
    .contains("new_value", { [CRON_HEARTBEAT_AUDIT]: true })
    .order("created_at", { ascending: false })
    .limit(500);

  const newest = new Map<string, Heartbeat>();
  for (const row of (data ?? []) as { new_value: Heartbeat }[]) {
    const id = row.new_value?.cron_id;
    if (id && !newest.has(id)) newest.set(id, row.new_value);
  }
  // EVERY registered cron is returned, including ones with no row — a cron missing from the page
  // would be the blind spot again, so absence is rendered rather than omitted.
  return (Object.keys(CRON_REGISTRY) as CronId[]).map((id) => assessCron(id, newest.get(id) ?? null, now));
}
