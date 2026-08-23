import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { INTEGRITY_SWEEP_AUDIT } from "@/lib/inngest/functions/integritySweep";
import type { SweepResult } from "@/lib/integrity/sweep";

// Reads the most recent recorded sweep. Returns null when the sweep has NEVER run — the admin
// page renders that as "never checked", never as green (founder ruling: green means MEASURED
// green, with a timestamp; the absence of a finding is not the presence of a check).

export async function latestSweep(): Promise<SweepResult | null> {
  const { data } = await supabaseAdmin
    .from("audit_log")
    .select("new_value, created_at")
    .eq("table_name", "cases")
    .contains("new_value", { [INTEGRITY_SWEEP_AUDIT]: true })
    .order("created_at", { ascending: false })
    .limit(1);
  const row = (data ?? [])[0] as { new_value?: { result?: SweepResult } } | undefined;
  return row?.new_value?.result ?? null;
}

/** Hours since the sweep ran — the page warns when the record is stale rather than trusting it. */
export function hoursSince(iso: string, now = Date.now()): number {
  return Math.max(0, (now - new Date(iso).getTime()) / 3_600_000);
}
