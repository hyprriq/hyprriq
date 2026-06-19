import { getStripe } from "@/lib/stripe";

export type InvoiceRow = {
  id: string;
  date: number; // unix seconds
  description: string;
  amount: number; // major units
  currency: string;
  pdf: string | null;
  hostedUrl: string | null;
};

// Invoice history from Stripe. Returns [] (never throws) when Stripe isn't
// configured or the client has no Stripe customer yet.
export async function getInvoices(stripeCustomerId: string | null): Promise<InvoiceRow[]> {
  const stripe = getStripe();
  if (!stripe || !stripeCustomerId) return [];
  try {
    const res = await stripe.invoices.list({ customer: stripeCustomerId, limit: 12 });
    return res.data.map((inv) => ({
      id: inv.id ?? "",
      date: inv.created,
      description: inv.lines?.data?.[0]?.description ?? "HyprrIQ",
      amount: (inv.amount_paid ?? inv.amount_due ?? 0) / 100,
      currency: (inv.currency ?? "usd").toUpperCase(),
      pdf: inv.invoice_pdf ?? null,
      hostedUrl: inv.hosted_invoice_url ?? null,
    }));
  } catch {
    return [];
  }
}
