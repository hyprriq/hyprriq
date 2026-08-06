// ── ADMIN FOUNDATIONS (2026-08-02) — the per-client accounting view, ONE read the UI thread
// calls ("a client asks how many credits they have; staff can see and answer"). REORGANIZES
// existing reads — invents no new money logic: credits from the clients row, per-case usage
// from cases.credits_charged, adjustments from audit_log (the credit-adjust rows), plan events
// from billing_audit, invoices/payments from the read-only Stripe views (view_billing gates
// those at the page level; STOP-3: no refund write exists anywhere). ──

import { supabaseAdmin } from "@/lib/supabase/admin";
import { listCustomerInvoices, listCustomerPayments, type BillingInvoice, type BillingPayment } from "@/lib/data/stripeBilling";
import type { PlanType } from "@/lib/constants/plans";

export interface ClientAccounting {
  client: {
    id: string; email: string; full_name: string | null; plan_type: PlanType | null;
    billing_status: string; credits_available: number; credits_used_this_cycle: number;
    renewal_date: string | null; stripe_customer_id: string | null;
  } | null;
  perCaseUsage: { case_number: string; vendor_name: string | null; credits_charged: number | null; status: string; created_at: string }[];
  creditAdjustments: { at: string; actor_id: string | null; delta: number; resulting_balance: number | null; reason: string | null }[];
  billingEvents: { at: string; event: string; old_plan: string | null; new_plan: string | null; notes: string | null }[];
  invoices: BillingInvoice[];
  payments: BillingPayment[];
  stripeError: string | null;
}

export async function getClientAccounting(clientId: string): Promise<ClientAccounting> {
  const [clientRes, casesRes, auditRes, billingRes] = await Promise.all([
    supabaseAdmin.from("clients")
      .select("id, email, full_name, plan_type, billing_status, credits_available, credits_used_this_cycle, renewal_date, stripe_customer_id")
      .eq("id", clientId).maybeSingle(),
    supabaseAdmin.from("cases")
      .select("case_number, vendor_name, credits_charged, status, created_at")
      .eq("client_id", clientId).is("deleted_at", null).order("created_at", { ascending: false }),
    supabaseAdmin.from("audit_log")
      .select("created_at, actor_id, new_value")
      .eq("table_name", "clients").eq("record_id", clientId)
      .order("created_at", { ascending: false }).limit(100),
    supabaseAdmin.from("billing_audit")
      .select("created_at, event, old_plan, new_plan, notes")
      .eq("client_id", clientId).order("created_at", { ascending: false }).limit(50),
  ]);

  const client = (clientRes.data as ClientAccounting["client"]) ?? null;

  // The credit-adjust audit rows are identified by their payload shape (credit_adjust: true) —
  // written by /api/admin/clients/[id]/credits since the admin batch.
  const creditAdjustments = (auditRes.data ?? [])
    .filter((r) => (r.new_value as { credit_adjust?: boolean } | null)?.credit_adjust === true)
    .map((r) => {
      const v = r.new_value as { delta?: number; resulting_balance?: number | null; reason?: string | null };
      return { at: r.created_at as string, actor_id: (r.actor_id as string | null) ?? null, delta: v.delta ?? 0, resulting_balance: v.resulting_balance ?? null, reason: v.reason ?? null };
    });

  const stripeId = client?.stripe_customer_id ?? null;
  const [inv, pay] = stripeId
    ? await Promise.all([listCustomerInvoices(stripeId), listCustomerPayments(stripeId)])
    : [{ invoices: [], error: null }, { payments: [], error: null }];

  return {
    client,
    perCaseUsage: (casesRes.data ?? []) as ClientAccounting["perCaseUsage"],
    creditAdjustments,
    billingEvents: ((billingRes.data ?? []) as { created_at: string; event: string; old_plan: string | null; new_plan: string | null; notes: string | null }[])
      .map((r) => ({ at: r.created_at, event: r.event, old_plan: r.old_plan, new_plan: r.new_plan, notes: r.notes })),
    invoices: inv.invoices,
    payments: pay.payments,
    stripeError: inv.error ?? pay.error ?? null,
  };
}
