import { requireOnboardedClient } from "@/lib/data/client";
import { getInvoices } from "@/lib/data/billing";
import { PortalShell } from "@/components/portal/portal-shell";
import { StripePortalButton } from "@/components/portal/stripe-portal-button";
import {
  PLAN_NAME,
  PLAN_PRICE_LABEL,
  PLAN_CADENCE,
  PLAN_CREDITS_PER_CYCLE,
  PLAN_ROLLOVER_LIMIT,
  type PlanType,
} from "@/lib/constants/plans";

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
function fmtUnix(s: number) {
  return new Date(s * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function daysUntil(iso: string | null) {
  if (!iso) return null;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-line bg-surface p-5">
      <div className="mb-3 font-display text-sm font-bold text-ink">{title}</div>
      {children}
    </div>
  );
}

export default async function BillingPage() {
  const client = await requireOnboardedClient();
  const invoices = await getInvoices(client.stripe_customer_id);
  const plan = client.plan_type as PlanType | null;
  const total = plan ? PLAN_CREDITS_PER_CYCLE[plan] : 0;
  const rollover = plan ? PLAN_ROLLOVER_LIMIT[plan] : 0;
  const renewDays = daysUntil(client.renewal_date);
  const pct = total > 0 ? Math.min(100, Math.round((client.credits_available / total) * 100)) : 0;

  return (
    <PortalShell client={client} active="billing" title="Billing & Credits">
      <div className="mx-auto max-w-3xl space-y-5">
        <Card title="Current Plan">
          {plan ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-display text-lg font-extrabold text-brand">{PLAN_NAME[plan]} Plan</div>
                  <div className="mt-0.5 text-[14px] text-muted">
                    {PLAN_PRICE_LABEL[plan]} {PLAN_CADENCE[plan]}
                    {plan !== "single_99" && client.renewal_date ? ` • renews ${fmtDate(client.renewal_date)}` : ""}
                  </div>
                </div>
                <StripePortalButton className="rounded-lg border border-line bg-surface px-4 py-2 text-[14px] font-semibold text-ink-2 hover:bg-subtle">
                  Manage subscription →
                </StripePortalButton>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-line bg-base p-3">
                  <div className="text-[12px] uppercase tracking-wide text-muted">Credits Left</div>
                  <div className="mt-0.5 font-display text-2xl font-extrabold text-ink">{client.credits_available}</div>
                  <div className="text-[12px] text-muted">of {total} this cycle</div>
                </div>
                <div className="rounded-lg border border-line bg-base p-3">
                  <div className="text-[12px] uppercase tracking-wide text-muted">Rollover</div>
                  <div className="mt-0.5 font-display text-2xl font-extrabold text-ink">{rollover}</div>
                  <div className="text-[12px] text-muted">max carry-forward</div>
                </div>
                <div className="rounded-lg border border-line bg-base p-3">
                  <div className="text-[12px] uppercase tracking-wide text-muted">Renews</div>
                  <div className="mt-0.5 font-display text-base font-extrabold text-ink">{fmtDate(client.renewal_date)}</div>
                  <div className="text-[12px] text-muted">{renewDays !== null ? `${renewDays} days` : "—"}</div>
                </div>
              </div>
              <div className="mt-4">
                <div className="mb-1.5 text-[12px] text-muted">{client.credits_available} of {total} credits remaining this cycle</div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-subtle">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </>
          ) : (
            <div className="text-center">
              <p className="text-sm text-ink-2">You don&rsquo;t have an active plan yet.</p>
              <a href="/pricing" className="mt-3 inline-block rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover">
                Choose a plan →
              </a>
            </div>
          )}
        </Card>

        <Card title="Payment Method">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[14px] text-ink-2">Manage your card and billing details securely in Stripe.</span>
            <StripePortalButton className="ml-auto rounded-lg bg-brand px-4 py-2 text-[14px] font-semibold text-white hover:bg-brand-hover">
              Manage in Stripe →
            </StripePortalButton>
          </div>
        </Card>

        <Card title="Invoice History">
          {invoices.length === 0 ? (
            <p className="py-4 text-center text-[14px] text-muted">
              No invoices yet. Past payments will appear here.
            </p>
          ) : (
            <div className="divide-y divide-line">
              <div className="grid grid-cols-[80px_1fr_100px_56px] gap-3 pb-2 text-[11px] font-bold uppercase tracking-wide text-muted">
                <span>Date</span><span>Description</span><span>Amount</span><span></span>
              </div>
              {invoices.map((inv) => (
                <div key={inv.id} className="grid grid-cols-[80px_1fr_100px_56px] items-center gap-3 py-2.5 text-[14px]">
                  <span className="text-muted">{fmtUnix(inv.date)}</span>
                  <span className="text-ink">{inv.description}</span>
                  <span className="font-semibold text-ink">${inv.amount.toFixed(2)}</span>
                  {inv.pdf ? (
                    <a href={inv.pdf} target="_blank" rel="noopener noreferrer" className="text-[13px] font-semibold text-brand hover:underline">
                      PDF
                    </a>
                  ) : (
                    <span className="text-[13px] text-muted">—</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </PortalShell>
  );
}
