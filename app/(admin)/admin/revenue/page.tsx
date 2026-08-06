import { requireAdmin } from "@/lib/data/admin";
import { AdminShell } from "@/components/admin/admin-shell";
import { getRevenueSummary } from "@/lib/data/revenue";
import { PLAN_NAME, type PlanType } from "@/lib/constants/plans";

// ── REVENUE (2026-08-02) — honest function-only screen over real rows (clients +
// billing_audit). Every number is derived, none invented; prices from constants. Deeper
// analytics (churn, cohort, top-up totals in dollars) need Stripe-side aggregation — stated
// plainly below rather than faked. UI thread restyles. ──

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default async function AdminRevenuePage() {
  const admin = await requireAdmin();
  const s = await getRevenueSummary(admin.clientScope);
  return (
    <AdminShell active="revenue" title="Revenue" operator={admin} clientScope={admin.clientScope} user={{ initial: (admin.full_name || admin.email || "?").charAt(0).toUpperCase(), email: admin.email }}>
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-card border border-line bg-surface p-4">
          <div className="text-[12px] uppercase tracking-wide text-muted">MRR</div>
          <div className="mt-0.5 font-display text-2xl font-extrabold text-ink">${s.mrr}</div>
        </div>
        <div className="rounded-card border border-line bg-surface p-4">
          <div className="text-[12px] uppercase tracking-wide text-muted">Active subscribers</div>
          <div className="mt-0.5 font-display text-2xl font-extrabold text-ink">{s.activeSubscribers}</div>
        </div>
        {Object.entries(s.planCounts).map(([plan, n]) => (
          <div key={plan} className="rounded-card border border-line bg-surface p-4">
            <div className="text-[12px] uppercase tracking-wide text-muted">{PLAN_NAME[plan as PlanType] ?? plan}</div>
            <div className="mt-0.5 font-display text-2xl font-extrabold text-ink">{n}</div>
          </div>
        ))}
      </div>

      <div className="mb-5 rounded-card border border-line bg-surface p-4">
        <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted">Billing status</div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(s.billingStatusCounts).map(([st, n]) => (
            <span key={st} className="rounded-lg bg-subtle px-2.5 py-1 text-[13px] text-ink-2">
              {st.replaceAll("_", " ")}: <span className="font-semibold text-ink">{n}</span>
            </span>
          ))}
          {Object.keys(s.billingStatusCounts).length === 0 && <span className="text-sm text-muted">No clients yet.</span>}
        </div>
      </div>

      <div className="rounded-card border border-line bg-surface p-4">
        <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted">Recent billing events</div>
        {s.recentBillingEvents.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">No billing events recorded yet.</p>
        ) : (
          <table className="w-full text-[13px]">
            <tbody>
              {s.recentBillingEvents.map((e, i) => (
                <tr key={i} className="border-t border-line/60 first:border-t-0">
                  <td className="py-1.5 pr-3 text-muted">{fmt(e.at)}</td>
                  <td className="py-1.5 pr-3 font-medium text-ink">{e.event.replaceAll("_", " ")}</td>
                  <td className="py-1.5 pr-3 text-muted">{e.old_plan ?? "—"} {e.new_plan && e.new_plan !== e.old_plan ? `to ${e.new_plan}` : ""}</td>
                  <td className="py-1.5 text-ink-2">{e.notes ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="mt-3 text-[12px] text-muted">
          Dollar-accurate charge/top-up totals and churn analysis need Stripe-side aggregation — not built yet; the Stripe dashboard is the source of truth for cash amounts today.
        </p>
      </div>
    </AdminShell>
  );
}
