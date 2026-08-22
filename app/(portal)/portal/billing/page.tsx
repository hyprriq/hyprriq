import Link from "next/link";
import { requireOnboardedClient } from "@/lib/data/client";
import { getInvoices } from "@/lib/data/billing";
import { PortalShell } from "@/components/portal/portal-shell";
import { StripePortalButton } from "@/components/portal/stripe-portal-button";
import { CheckoutButton } from "@/components/portal/checkout-button";
import { CancelSubscription } from "@/components/portal/cancel-subscription";
import { GrantCodeBox } from "@/components/portal/grant-code-box";
import {
  PLAN_NAME,
  PLAN_PRICE_LABEL,
  PLAN_CADENCE,
  PLAN_CATEGORY,
  PLAN_CREDITS_PER_CYCLE,
  PLAN_ROLLOVER_LIMIT,
  PLANS_ON_SALE,
  planOnSale,
  TOPUPS_ON_SALE,
  type PlanType,
} from "@/lib/constants/plans";
import { creditsView } from "@/lib/portal/creditsDisplay";

// Credit top-up packs (one-time). Both subscription plans can buy either the
// 3-credit ($99) or 6-credit ($179) pack — no reason to restrict by plan.
// ⛔ OFF SALE (founder-locked 2026-08-22): the card renders ONLY while TOPUPS_ON_SALE — kept
// wired (webhook lands top-ups as protected purchased_credits) so the return to sale is the
// one-flag ruling in lib/constants/plans.ts, not a rebuild. The checkout route refuses top-ups
// regardless of this card (the route is the control).
const TOPUP_PACKS = [
  { id: "growth_topup", label: "Buy 3 credits — $99" },
  { id: "scale_topup", label: "Buy 6 credits — $179" },
];
const TOPUPS_FOR_PLAN: Partial<Record<PlanType, { id: string; label: string }[]>> = {
  growth_279: TOPUP_PACKS,
  scale_499: TOPUP_PACKS,
};

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
  const rollover = plan ? PLAN_ROLLOVER_LIMIT[plan] : 0;
  const renewDays = daysUntil(client.renewal_date);
  // BUG-2 fix — held credits vs plan allotment are distinct quantities (lib/portal/creditsDisplay).
  const cv = creditsView(client.credits_available, plan, client.credits_used_this_cycle);

  return (
    <PortalShell client={client} active="billing" title="Billing & Credits">
      <div className="mx-auto max-w-3xl space-y-5">
        {client.billing_status === "cancelling" && (
          <div className="rounded-card border border-conditional-ink/40 bg-conditional-bg px-4 py-3 text-[14px] text-conditional-ink">
            Your plan cancels on <span className="font-semibold">{fmtDate(client.renewal_date)}</span> — you keep full access until then.
          </div>
        )}
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
                {client.plan_category === "subscription" ? (
                  <StripePortalButton className="rounded-lg border border-line bg-surface px-4 py-2 text-[14px] font-semibold text-ink-2 hover:bg-subtle">
                    Manage subscription →
                  </StripePortalButton>
                ) : planOnSale(plan) ? (
                  /* Gap audit 5.3 (2026-08-08): rebuy the client's OWN one-time tier — the
                     hardcoded single_99 charged a Single Deep Report ($149) client $99 AND
                     activatePlan downgraded their plan_type.
                     Sale gate (2026-08-22): an off-sale tier gets no rebuy button — the route
                     would refuse it; the upgrade card below offers what IS buyable. */
                  <CheckoutButton
                    plan={plan}
                    className="rounded-lg border border-line bg-surface px-4 py-2 text-[14px] font-semibold text-ink-2 hover:bg-subtle"
                  >
                    Buy another report →
                  </CheckoutButton>
                ) : null}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-line bg-base p-3">
                  <div className="text-[12px] uppercase tracking-wide text-muted">Credits Available</div>
                  <div className="mt-0.5 font-display text-2xl font-extrabold text-ink">{cv.available}</div>
                  <div className="text-[12px] text-muted">{cv.perCycle > 0 ? `plan renews to ${cv.perCycle}/cycle` : "—"}</div>
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
                <div className="mb-1.5 text-[12px] text-muted">{cv.headline}{cv.detail ? ` · ${cv.detail}` : ""}</div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-subtle">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${cv.pct}%` }} />
                </div>
              </div>
              {client.plan_category === "subscription" && (
                <div className="mt-4 flex justify-end border-t border-line pt-3">
                  <CancelSubscription
                    renewalLabel={fmtDate(client.renewal_date)}
                    cancelling={client.billing_status === "cancelling"}
                  />
                </div>
              )}
            </>
          ) : (
            <div>
              <p className="text-center text-sm text-ink-2">You don&rsquo;t have an active plan yet — choose one to start.</p>
              {/* Coupon-mode grant redemption (2026-08-21) — plan-less accounts only; the RPC
                  refuses plan-holders regardless (defense in depth on both sides). */}
              <GrantCodeBox />
              {/* ON-SALE ONLY (founder-locked 2026-08-22): the portal picker offers what can be
                  bought — the coming-soon roadmap lives on the marketing pricing page, and the
                  checkout route refuses off-sale tiers regardless of what any UI shows. */}
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {PLANS_ON_SALE.map((p) => (
                  <div key={p} className="flex flex-col rounded-lg border border-line bg-base p-4">
                    <div className="font-display text-base font-extrabold text-brand">{PLAN_NAME[p]}</div>
                    <div className="mt-0.5 text-[13px] text-muted">
                      {PLAN_PRICE_LABEL[p]} {PLAN_CADENCE[p]}
                    </div>
                    <div className="mt-2 text-[13px] text-ink-2">
                      {PLAN_CREDITS_PER_CYCLE[p]} {p === "single_99" ? "report" : "credits / mo"}
                    </div>
                    <CheckoutButton
                      plan={p}
                      className="mt-4 w-full rounded-lg bg-brand px-3 py-2 text-center text-[13px] font-semibold text-white hover:bg-brand-hover"
                    >
                      Choose {PLAN_NAME[p]} →
                    </CheckoutButton>
                  </div>
                ))}
              </div>
              {/* Acceptance at checkout (legal build, 2026-08-21): stated beside the purchase
                  action, links working — standard, unobtrusive, honest. */}
              <p className="mt-3 text-center text-[12px] text-muted">
                Purchases are subject to the{" "}
                <Link href="/terms" className="underline hover:text-ink">Terms of Service</Link>,{" "}
                <Link href="/payment-policy" className="underline hover:text-ink">Payment Policy</Link> and{" "}
                <Link href="/refund-policy" className="underline hover:text-ink">Refund &amp; Cancellation Policy</Link>.
              </p>
            </div>
          )}
        </Card>

        {TOPUPS_ON_SALE && plan && TOPUPS_FOR_PLAN[plan] && (
          <Card title="Top-Up Credits">
            <p className="mb-3 text-[14px] text-ink-2">Need more this cycle? Add credits without changing your plan.</p>
            <div className="flex flex-wrap gap-2">
              {TOPUPS_FOR_PLAN[plan]!.map((t) => (
                <CheckoutButton
                  key={t.id}
                  topup={t.id}
                  className="rounded-lg bg-brand px-4 py-2 text-[14px] font-semibold text-white hover:bg-brand-hover"
                >
                  {t.label}
                </CheckoutButton>
              ))}
            </div>
          </Card>
        )}

        {/* "Change Plan" card REMOVED (founder-locked 2026-08-22): its only function was the
            Growth↔Scale switch via the Stripe customer portal, and Scale is off sale — offering
            the switch was the same off-sale door through a different frame. NOTE the door itself
            is STRIPE PORTAL CONFIG, not code: if the portal's update-subscription list still
            carries the Scale price, a client can reach it without any button here — founder
            dashboard item, flagged in the 2026-08-22 session deliverable. */}

        {plan && client.plan_category === "one_time" && (
          <Card title="Upgrade to a subscription">
            <p className="mb-3 text-[14px] text-ink-2">
              Ready for more? Move to a monthly plan for recurring reports and credit rollover.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {/* On-sale subscriptions only (2026-08-22) — derived, never a second list. */}
              {PLANS_ON_SALE.filter((p) => PLAN_CATEGORY[p] === "subscription").map((p) => (
                <div key={p} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-base p-4">
                  <div>
                    <div className="font-display text-base font-extrabold text-brand">{PLAN_NAME[p]}</div>
                    <div className="text-[13px] text-muted">
                      {PLAN_PRICE_LABEL[p]} {PLAN_CADENCE[p]} • {PLAN_CREDITS_PER_CYCLE[p]} credits/mo
                    </div>
                  </div>
                  <CheckoutButton
                    plan={p}
                    className="shrink-0 rounded-lg bg-brand px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-brand-hover"
                  >
                    Upgrade →
                  </CheckoutButton>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card title="Payment Method">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[14px] text-ink-2">
              {client.stripe_customer_id
                ? "Manage your card, receipts, and billing details securely in Stripe."
                : "No payment method on file yet — it'll appear here after your first purchase."}
            </span>
            {client.stripe_customer_id && (
              <StripePortalButton className="ml-auto rounded-lg bg-brand px-4 py-2 text-[14px] font-semibold text-white hover:bg-brand-hover">
                Manage in Stripe →
              </StripePortalButton>
            )}
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
