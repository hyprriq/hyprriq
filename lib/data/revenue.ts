// ── REVENUE SUMMARY (2026-08-02) — honest function-only read for /admin/revenue: everything
// here is derived from REAL rows (clients + billing_audit); nothing is projected or invented.
// Prices come from constants (MONTHLY_PRICE, the same map the dashboard MRR uses). Scope-
// partitioned like every admin read — a scoped operator sees the revenue of their clients only
// (flagged as the conservative default; business-wide totals are a super/view-all read).

import { supabaseAdmin } from "@/lib/supabase/admin";
import { OPERATOR_HOUSE_CLIENT_ID } from "@/lib/data/operatorCase";
import type { ClientScope } from "@/lib/auth/clientScope";
import { MONTHLY_PRICE } from "@/lib/data/admin";
import type { PlanType } from "@/lib/constants/plans";

export interface RevenueSummary {
  mrr: number;
  activeSubscribers: number;
  planCounts: Record<string, number>;
  billingStatusCounts: Record<string, number>;
  recentBillingEvents: { at: string; event: string; old_plan: string | null; new_plan: string | null; notes: string | null }[];
  eventCounts: Record<string, number>;
}

export async function getRevenueSummary(scope: ClientScope): Promise<RevenueSummary> {
  const empty: RevenueSummary = { mrr: 0, activeSubscribers: 0, planCounts: {}, billingStatusCounts: {}, recentBillingEvents: [], eventCounts: {} };
  if (scope !== null && scope.length === 0) return empty; // fail closed

  // Data honesty 2026-08-11: the operator house row (fake scale_499/active, exists only for case
  // attribution) must never count toward MRR, plan distribution, or billing-status counts.
  let clientsQ = supabaseAdmin
    .from("clients")
    .select("id, plan_type, billing_status")
    .neq("id", OPERATOR_HOUSE_CLIENT_ID)
    .is("deleted_at", null);
  let eventsQ = supabaseAdmin
    .from("billing_audit")
    .select("client_id, created_at, event, old_plan, new_plan, notes")
    .order("created_at", { ascending: false })
    .limit(100);
  if (scope !== null) {
    clientsQ = clientsQ.in("id", scope);
    eventsQ = eventsQ.in("client_id", scope);
  }
  const [clientsRes, eventsRes] = await Promise.all([clientsQ, eventsQ]);
  const clients = (clientsRes.data ?? []) as { id: string; plan_type: PlanType | null; billing_status: string }[];
  const events = (eventsRes.data ?? []) as { created_at: string; event: string; old_plan: string | null; new_plan: string | null; notes: string | null }[];

  const planCounts: Record<string, number> = {};
  const billingStatusCounts: Record<string, number> = {};
  let mrr = 0, activeSubscribers = 0;
  for (const c of clients) {
    billingStatusCounts[c.billing_status] = (billingStatusCounts[c.billing_status] ?? 0) + 1;
    if (c.plan_type) planCounts[c.plan_type] = (planCounts[c.plan_type] ?? 0) + 1;
    if (c.billing_status === "active" && c.plan_type) {
      mrr += MONTHLY_PRICE[c.plan_type] ?? 0;
      if ((MONTHLY_PRICE[c.plan_type] ?? 0) > 0) activeSubscribers++;
    }
  }
  const eventCounts: Record<string, number> = {};
  for (const e of events) eventCounts[e.event] = (eventCounts[e.event] ?? 0) + 1;

  return {
    mrr, activeSubscribers, planCounts, billingStatusCounts,
    recentBillingEvents: events.slice(0, 25).map((e) => ({ at: e.created_at, event: e.event, old_plan: e.old_plan, new_plan: e.new_plan, notes: e.notes })),
    eventCounts,
  };
}
