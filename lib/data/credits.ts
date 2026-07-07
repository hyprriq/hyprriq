import { supabaseAdmin } from "@/lib/supabase/admin";
import { PLAN_CREDITS_PER_CYCLE, PLAN_ROLLOVER_LIMIT, type PlanType } from "@/lib/constants/plans";

// H6 (audit N6) — ALL credit arithmetic lives in atomic SQL RPCs (mirrors deduct_client_credits).
// Plan numbers are passed as parameters: lib/constants/plans.ts stays the single source of truth
// (plan names hardcoded in SQL is the drift that killed reset_client_credits).
// Money-path errors are returned LOUD — callers decide throw/retry; nothing is swallowed (B2).

export async function addClientCredits(clientId: string, amount: number): Promise<{ balance: number | null; error: string | null }> {
  const { data, error } = await supabaseAdmin.rpc("add_client_credits", { p_client_id: clientId, p_amount: amount });
  if (error) return { balance: null, error: error.message };
  if (data === null || data === undefined) return { balance: null, error: `add_client_credits: no client row for ${clientId}` };
  return { balance: data as number, error: null };
}

export async function rolloverClientCredits(stripeCustomerId: string, plan: PlanType): Promise<{ balance: number | null; error: string | null }> {
  const { data, error } = await supabaseAdmin.rpc("rollover_client_credits", {
    p_stripe_customer_id: stripeCustomerId,
    p_rollover_cap: PLAN_ROLLOVER_LIMIT[plan],
    p_cycle_credits: PLAN_CREDITS_PER_CYCLE[plan],
  });
  if (error) return { balance: null, error: error.message };
  if (data === null || data === undefined) return { balance: null, error: `rollover_client_credits: no client row for customer ${stripeCustomerId}` };
  return { balance: data as number, error: null };
}
