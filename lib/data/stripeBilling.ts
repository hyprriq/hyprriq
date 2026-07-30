import { getStripe } from "@/lib/stripe";

// ── ADMIN BATCH — READ-ONLY Stripe billing views (permission: view_billing). Reads only:
// invoices + payments for a customer. Refunds/partial refunds are DESCRIBED-AND-STOPPED
// (STOP-3): financial writes against live customers are a founder ruling — in-app vs
// dashboard-only — and NO write call exists in this module by design. ──

export interface BillingInvoice {
  id: string; number: string | null; status: string | null; amount_due: number; amount_paid: number;
  currency: string; created: string; hosted_invoice_url: string | null;
}
export interface BillingPayment {
  id: string; amount: number; currency: string; status: string; created: string; description: string | null;
}

export async function listCustomerInvoices(stripeCustomerId: string, limit = 10): Promise<{ invoices: BillingInvoice[]; error: string | null }> {
  try {
    const stripe = getStripe();
    if (!stripe) return { invoices: [], error: "stripe_not_configured" };
    const res = await stripe.invoices.list({ customer: stripeCustomerId, limit });
    return {
      invoices: res.data.map((i) => ({
        id: i.id ?? "", number: i.number ?? null, status: i.status ?? null,
        amount_due: i.amount_due, amount_paid: i.amount_paid, currency: i.currency,
        created: new Date(i.created * 1000).toISOString(), hosted_invoice_url: i.hosted_invoice_url ?? null,
      })),
      error: null,
    };
  } catch (e) {
    return { invoices: [], error: e instanceof Error ? e.message : "stripe_error" };
  }
}

export async function listCustomerPayments(stripeCustomerId: string, limit = 10): Promise<{ payments: BillingPayment[]; error: string | null }> {
  try {
    const stripe = getStripe();
    if (!stripe) return { payments: [], error: "stripe_not_configured" };
    const res = await stripe.paymentIntents.list({ customer: stripeCustomerId, limit });
    return {
      payments: res.data.map((p) => ({
        id: p.id, amount: p.amount, currency: p.currency, status: p.status,
        created: new Date(p.created * 1000).toISOString(), description: p.description ?? null,
      })),
      error: null,
    };
  } catch (e) {
    return { payments: [], error: e instanceof Error ? e.message : "stripe_error" };
  }
}
