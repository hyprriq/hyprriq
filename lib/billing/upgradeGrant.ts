// ── OPTION A (founder-ruled 2026-07-30) — the upgrade credit grant, extracted for testability.
// On a tier upgrade, credits_available is raised UP TO the new plan's allotment via the atomic
// raise_credits_to_allotment RPC (GREATEST — idempotent by construction; replays are no-ops).
//
// RIDER 1 (REQUIRED — kills the up/down farm): at most ONE grant per billing period. The guard
// key is a billing_audit 'upgrade' row whose notes START WITH GRANT_NOTE_PREFIX, created since
// the subscription's current_period_start. Plan-change rows WITHOUT the prefix (downgrades,
// pre-migration upgrades, guard-skipped upgrades) never block a future grant. GREATEST alone
// does NOT close the farm — spending drops the balance below the floor; the once-per-cycle
// guard is what closes it.
//
// RIDER 2 lives in the webhook wording: downgrade = NO immediate clawback; the renewal
// rollover clamp applies unchanged.
//
// FAIL-CLOSED on money: missing period start or a failed guard query grants NOTHING.
// Pre-migration (RPC absent): loud log, no grant, plan change unaffected.

import { supabaseAdmin } from "@/lib/supabase/admin";
import { PLAN_CREDITS_PER_CYCLE, type PlanType } from "@/lib/constants/plans";

export const PLAN_RANK: Record<PlanType, number> = { single_99: 0, growth_279: 1, scale_499: 2 };

export function isUpgrade(oldPlan: string | null | undefined, newPlan: PlanType): boolean {
  return (PLAN_RANK[newPlan] ?? 0) > (PLAN_RANK[(oldPlan ?? "") as PlanType] ?? 0);
}

// The rider-1 guard key. A grant row's notes ALWAYS start with this; nothing else may use it.
export const GRANT_NOTE_PREFIX = "upgrade credit grant:";

export interface GrantResult {
  granted: boolean;
  balance: number | null;
  note: string; // becomes the billing_audit notes — starts with GRANT_NOTE_PREFIX iff granted
}

export async function grantUpgradeCredits(args: {
  clientId: string;
  newPlan: PlanType;
  periodStartIso: string | null;
}): Promise<GrantResult> {
  const floor = PLAN_CREDITS_PER_CYCLE[args.newPlan];

  if (!args.periodStartIso) {
    return { granted: false, balance: null, note: "no grant — event carried no current_period_start (rider-1 needs the cycle boundary; fail-closed)" };
  }

  const { data: priorGrant, error: guardErr } = await supabaseAdmin
    .from("billing_audit")
    .select("id")
    .eq("client_id", args.clientId)
    .eq("event", "upgrade")
    .ilike("notes", `${GRANT_NOTE_PREFIX}%`)
    .gte("created_at", args.periodStartIso)
    .limit(1);
  if (guardErr) {
    return { granted: false, balance: null, note: `no grant — rider-1 guard query failed (${guardErr.message}); fail-closed` };
  }
  if ((priorGrant ?? []).length > 0) {
    return { granted: false, balance: null, note: "no grant — already granted this billing period (rider 1)" };
  }

  const { data: balance, error } = await supabaseAdmin.rpc("raise_credits_to_allotment", {
    p_client_id: args.clientId,
    p_floor: floor,
  });
  if (error) {
    console.error("[billing] raise_credits_to_allotment failed (migration pending?):", error.message, { client: args.clientId });
    return { granted: false, balance: null, note: `no grant — raise_credits_to_allotment unavailable (${error.message})` };
  }
  return { granted: true, balance: (balance as number | null) ?? null, note: `${GRANT_NOTE_PREFIX} raised to allotment ${floor} → balance ${balance}` };
}
