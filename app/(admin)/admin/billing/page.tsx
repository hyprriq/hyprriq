import Link from "next/link";
import { requireAdmin, getAdminClients } from "@/lib/data/admin";
import { can } from "@/lib/auth/permissions";
import { AdminShell } from "@/components/admin/admin-shell";
import { PLAN_NAME, PLAN_CATEGORY, type PlanType } from "@/lib/constants/plans";

// ── BILLING — ALL-CLIENTS OVERVIEW (admin design pass 2026-08-12). Per-client accounting was
// fully built but reachable from exactly one link on client detail; this is its front door.
// The morning screen: who's on what plan, credits held, who's running low — each row links to
// the existing per-client accounting page (credits used, per-credit consumption, invoices,
// payments, plan events, adjustments with reasons).
//
// Flag, don't fabricate: cycle usage, payment feeds, and dollar totals exist only per-client
// today; a rolled-up cross-client feed and Stripe-accurate revenue need a data pass this
// design deliberately does not invent. Refund actions land on the per-client page with the
// locked policy (refund = max(0, paid − credits_used × tier_list_price × 0.70), 14-day window;
// SLA-breach unconditional) — a later dev pass wires the logic; money + credit move together.
//
// Capability: view_billing (same gate as Revenue) — absent from nav without it; a direct URL
// hit sees one plain line, per the absent-not-disabled rule.

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default async function AdminBillingPage() {
  const admin = await requireAdmin();
  const shellProps = {
    operator: admin,
    clientScope: admin.clientScope,
    user: { initial: (admin.full_name || admin.email || "?").charAt(0).toUpperCase(), email: admin.email },
  } as const;

  if (!can(admin, "view_billing")) {
    return (
      <AdminShell active="billing" title="Billing" {...shellProps}>
        <p className="rounded-card border border-line bg-surface p-6 text-sm text-muted">
          Billing access isn&rsquo;t granted on this account.
        </p>
      </AdminShell>
    );
  }

  const clients = (await getAdminClients(admin.clientScope)).filter((c) => c.role === "client");
  const subscribers = clients.filter((c) => c.plan_type && PLAN_CATEGORY[c.plan_type as PlanType] === "subscription");
  const lowCredit = subscribers.filter((c) => c.credits_available <= 1);

  return (
    <AdminShell active="billing" title="Billing" {...shellProps}>
      {/* the three numbers that drive a decision this morning */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="rounded-card border border-line bg-surface px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Paying clients</div>
          <div className="mt-1 font-mono text-2xl font-medium text-ink">{clients.filter((c) => c.plan_type).length}</div>
          <div className="mt-0.5 text-[12px] text-ink-2">{subscribers.length} on subscriptions</div>
        </div>
        <div className="rounded-card border border-line bg-surface px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Credits held</div>
          <div className="mt-1 font-mono text-2xl font-medium text-ink">
            {clients.reduce((n, c) => n + c.credits_available, 0)}
          </div>
          <div className="mt-0.5 text-[12px] text-ink-2">across all clients in scope</div>
        </div>
        <div className="rounded-card border border-line bg-surface px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Running low</div>
          <div className={`mt-1 font-mono text-2xl font-medium ${lowCredit.length > 0 ? "text-verify-ink" : "text-ink"}`}>
            {lowCredit.length}
          </div>
          <div className="mt-0.5 text-[12px] text-ink-2">subscribers at ≤1 credit</div>
        </div>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-card border border-line bg-surface p-10 text-center text-sm text-muted">
          No clients in your scope yet. Client accounting appears here as soon as one exists.
        </div>
      ) : (
        <div className="overflow-hidden rounded-card border border-line bg-surface">
          <div className="grid grid-cols-[minmax(180px,1.4fr)_120px_110px_90px_110px_90px] items-center gap-3 border-b border-line bg-subtle px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
            <span>Client</span>
            <span>Plan</span>
            <span>Billing status</span>
            <span className="text-right">Credits</span>
            <span className="text-right">Since</span>
            <span />
          </div>
          {clients.map((c) => {
            const plan = c.plan_type as PlanType | null;
            const low = plan && PLAN_CATEGORY[plan] === "subscription" && c.credits_available <= 1;
            return (
              <div
                key={c.id}
                className="grid grid-cols-[minmax(180px,1.4fr)_120px_110px_90px_110px_90px] items-center gap-3 border-b border-line px-4 py-2 last:border-b-0"
              >
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-ink">
                    {c.full_name || c.company_name || "—"}
                  </div>
                  <div className="truncate font-mono text-[11px] text-muted">{c.email}</div>
                </div>
                <span className="text-[12.5px] font-medium text-ink-2">{plan ? PLAN_NAME[plan] : "No plan"}</span>
                <span className="text-[12px] text-ink-2">{c.billing_status ?? "—"}</span>
                <span className={`text-right font-mono text-[12.5px] font-medium ${low ? "text-verify-ink" : "text-ink"}`}>
                  {c.credits_available}
                </span>
                <span className="text-right font-mono text-[11.5px] text-muted">{fmt(c.created_at)}</span>
                <Link
                  href={`/admin/clients/${c.id}/accounting`}
                  className="justify-self-end rounded-md border border-line bg-subtle px-2.5 py-1 text-[12px] font-semibold text-ink-2 hover:bg-line"
                >
                  Accounting
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* honest boundary — nothing invented to fill the space */}
      <p className="mt-4 max-w-[72ch] text-[12.5px] leading-relaxed text-muted">
        Cycle usage, payments, plan events, and adjustments live on each client&rsquo;s accounting page —
        a cross-client feed needs a data pass that hasn&rsquo;t been built. Dollar-accurate revenue totals
        and churn need Stripe-side data the app doesn&rsquo;t hold; see Revenue for what&rsquo;s real today.
        Refunds will be actioned from the per-client page when the refund pass lands: money and credit
        move together, with a reason recorded, and a partial refund shows its resolved amount before
        confirmation.
      </p>
    </AdminShell>
  );
}
