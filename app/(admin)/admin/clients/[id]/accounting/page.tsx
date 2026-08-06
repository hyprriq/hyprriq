import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/data/admin";
import { can } from "@/lib/auth/permissions";
import { AdminShell } from "@/components/admin/admin-shell";
import { getClientAccounting } from "@/lib/data/clientAccounting";

// ── PER-CLIENT ACCOUNTING (2026-08-02) — the founder's standard: a client asks a question and
// there is no unanswerable gap. One read (getClientAccounting) feeds everything; writes stay at
// their existing doors (credit adjust API; refunds = Stripe dashboard until the billing pass).
// Invoices/payments render only with view_billing (super admin passes by role). Function-only. ──

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default async function ClientAccountingPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  if (admin.clientScope !== null && !admin.clientScope.includes(id)) notFound();
  const a = await getClientAccounting(id);
  if (!a.client) notFound();
  const showStripe = can(admin, "view_billing") || admin.role === "super_admin";
  return (
    <AdminShell active="clients" title="Client accounting" operator={admin} clientScope={admin.clientScope} user={{ initial: (admin.full_name || admin.email || "?").charAt(0).toUpperCase(), email: admin.email }}>
      <Link href={`/admin/clients/${id}`} className="text-[13px] font-medium text-muted hover:text-ink">
        Back to client
      </Link>

      <div className="mt-3 mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-card border border-line bg-surface p-4">
          <div className="text-[12px] uppercase tracking-wide text-muted">Credits available</div>
          <div className="mt-0.5 font-display text-2xl font-extrabold text-ink">{a.client.credits_available}</div>
        </div>
        <div className="rounded-card border border-line bg-surface p-4">
          <div className="text-[12px] uppercase tracking-wide text-muted">Used this cycle</div>
          <div className="mt-0.5 font-display text-2xl font-extrabold text-ink">{a.client.credits_used_this_cycle}</div>
        </div>
        <div className="rounded-card border border-line bg-surface p-4">
          <div className="text-[12px] uppercase tracking-wide text-muted">Plan</div>
          <div className="mt-0.5 font-display text-base font-extrabold text-ink">{a.client.plan_type ?? "—"}</div>
          <div className="text-[12px] text-muted">{a.client.billing_status}</div>
        </div>
        <div className="rounded-card border border-line bg-surface p-4">
          <div className="text-[12px] uppercase tracking-wide text-muted">Renews</div>
          <div className="mt-0.5 font-display text-base font-extrabold text-ink">{fmt(a.client.renewal_date)}</div>
        </div>
      </div>

      <div className="mb-5 rounded-card border border-line bg-surface p-4">
        <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted">Which report consumed which credit</div>
        {a.perCaseUsage.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">No cases yet.</p>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-line text-left text-[12px] uppercase tracking-wide text-muted">
                <th className="py-2 pr-3">Case</th><th className="py-2 pr-3">Supplier</th>
                <th className="py-2 pr-3">Credits charged</th><th className="py-2 pr-3">Status</th><th className="py-2">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {a.perCaseUsage.map((c) => (
                <tr key={c.case_number} className="border-t border-line/60">
                  <td className="py-2 pr-3 font-mono text-ink">{c.case_number}</td>
                  <td className="py-2 pr-3 text-ink">{c.vendor_name ?? "—"}</td>
                  <td className="py-2 pr-3 text-ink-2">{c.credits_charged ?? 0}</td>
                  <td className="py-2 pr-3 text-muted">{c.status.replaceAll("_", " ")}</td>
                  <td className="py-2 text-muted">{fmt(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mb-5 rounded-card border border-line bg-surface p-4">
        <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted">Credit adjustments (audited)</div>
        {a.creditAdjustments.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">No manual adjustments.</p>
        ) : (
          <table className="w-full text-[13px]">
            <tbody>
              {a.creditAdjustments.map((r, i) => (
                <tr key={i} className="border-t border-line/60 first:border-t-0">
                  <td className="py-1.5 pr-3 text-muted">{fmt(r.at)}</td>
                  <td className={`py-1.5 pr-3 font-semibold ${r.delta > 0 ? "text-clear-ink" : "text-deny-ink"}`}>{r.delta > 0 ? `+${r.delta}` : r.delta}</td>
                  <td className="py-1.5 pr-3 text-muted">balance {r.resulting_balance ?? "—"}</td>
                  <td className="py-1.5 text-ink-2">{r.reason ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mb-5 rounded-card border border-line bg-surface p-4">
        <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted">Plan events</div>
        {a.billingEvents.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">No plan events recorded.</p>
        ) : (
          <table className="w-full text-[13px]">
            <tbody>
              {a.billingEvents.map((e, i) => (
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
      </div>

      {showStripe ? (
        <div className="rounded-card border border-line bg-surface p-4">
          <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted">Invoices and payments (Stripe, read-only)</div>
          {a.stripeError && <p className="mb-2 text-[13px] text-muted">Stripe read unavailable: {a.stripeError}</p>}
          {a.invoices.length === 0 && a.payments.length === 0 && !a.stripeError && (
            <p className="py-4 text-center text-sm text-muted">No invoices or payments on file.</p>
          )}
          {a.invoices.length > 0 && (
            <table className="mb-3 w-full text-[13px]">
              <tbody>
                {a.invoices.map((inv) => (
                  <tr key={inv.id} className="border-t border-line/60 first:border-t-0">
                    <td className="py-1.5 pr-3 font-mono text-ink">{inv.number ?? inv.id}</td>
                    <td className="py-1.5 pr-3 text-muted">{inv.status ?? "—"}</td>
                    <td className="py-1.5 pr-3 text-ink-2">{(inv.amount_paid / 100).toFixed(2)} {inv.currency.toUpperCase()}</td>
                    <td className="py-1.5 text-muted">{fmt(inv.created)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="text-[12px] text-muted">Refunds stay in the Stripe dashboard until the billing-section pass (policy locked, build deferred).</p>
        </div>
      ) : (
        <p className="text-[13px] text-muted">Invoices and payments require the view_billing capability.</p>
      )}
    </AdminShell>
  );
}
