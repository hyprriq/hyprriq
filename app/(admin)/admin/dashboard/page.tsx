import Link from "next/link";
import { requireAdmin, getAdminDashboard } from "@/lib/data/admin";
import { AdminShell } from "@/components/admin/admin-shell";
import { PLAN_NAME, type PlanType } from "@/lib/constants/plans";
import { StatusBadge } from "@/components/portal/badges";

function slaText(iso: string | null) {
  if (!iso) return "—";
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  return d <= 0 ? "Overdue" : `${d} day${d === 1 ? "" : "s"}`;
}

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();
  const { kpis, reviewQueue, openSupport, recentClients } = await getAdminDashboard();

  const tiles = [
    { label: "MRR", value: `$${kpis.mrr.toLocaleString()}`, sub: "active subscriptions", tone: "" },
    { label: "Credits Sold", value: kpis.creditsSold, sub: "charged to date", tone: "" },
    { label: "Cases Created", value: kpis.casesCreated, sub: "all time", tone: "" },
    { label: "Pending Review", value: kpis.pendingReview, sub: "awaiting founder", tone: "warn" },
    { label: "Delivered", value: kpis.delivered, sub: "reports", tone: "ok" },
    { label: "Open Requests", value: kpis.openRequests, sub: "support queue", tone: "warn" },
  ];

  return (
    <AdminShell
      active="dashboard"
      title="Admin Dashboard"
      user={{ initial: (admin.full_name || admin.email || "?").charAt(0).toUpperCase(), email: admin.email }}
      topRight={<span className="text-[13px] text-muted">Last 30 days</span>}
    >
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-card border border-line bg-surface p-3.5">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{t.label}</div>
            <div className={`mt-1 font-display text-xl font-extrabold ${t.tone === "warn" ? "text-verify-ink" : t.tone === "ok" ? "text-clear-ink" : "text-ink"}`}>
              {t.value}
            </div>
            <div className="mt-0.5 text-[12px] text-muted">{t.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-7">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-ink">Case Queue — Quality Review</h2>
              <span className="text-[13px] text-muted">{reviewQueue.length} in queue</span>
            </div>
            <div className="overflow-hidden rounded-card border border-line bg-surface">
              <div className="grid grid-cols-[96px_1fr_80px_132px_70px_72px] gap-3 border-b border-line bg-subtle px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide text-muted">
                <span>Case ID</span><span>Supplier / Brands</span><span>Plan</span><span>Stage</span><span>SLA</span><span></span>
              </div>
              {reviewQueue.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted">No cases in the queue — new submissions appear here.</div>
              ) : (
                reviewQueue.map((c) => (
                  <div key={c.id} className="grid grid-cols-[96px_1fr_80px_132px_70px_72px] items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
                    <span className="font-mono text-[13px] font-semibold text-brand">{c.case_number}</span>
                    <div className="min-w-0">
                      <div className="truncate text-[14px] font-semibold text-ink">{c.vendor_name ?? "—"}</div>
                      <div className="truncate text-[12px] text-muted">{(c.brands_submitted ?? []).join(" • ") || "—"}</div>
                    </div>
                    <span className="text-[13px] text-ink-2">{c.plan_type ? PLAN_NAME[c.plan_type] : "—"}</span>
                    <span><StatusBadge status={c.status} /></span>
                    <span className="text-[13px] font-semibold text-verify-ink">{slaText(c.sla_deadline)}</span>
                    <Link href={`/admin/cases/${c.id}/review`} className="rounded-md bg-brand px-2.5 py-1 text-center text-[12px] font-bold text-white hover:bg-brand-hover">
                      Review
                    </Link>
                  </div>
                ))
              )}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-ink">Support Queue</h2>
              <span className="text-[13px] font-semibold text-deny-ink">{openSupport.length} open</span>
            </div>
            <div className="overflow-hidden rounded-card border border-line bg-surface">
              <div className="grid grid-cols-[140px_110px_1fr_120px] gap-3 border-b border-line bg-subtle px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide text-muted">
                <span>SR Number</span><span>Type</span><span>Subject</span><span>Client</span>
              </div>
              {openSupport.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted">No open requests. 🎉</div>
              ) : (
                openSupport.map((r) => (
                  <div key={r.id} className="grid grid-cols-[140px_110px_1fr_120px] items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
                    <span className="font-mono text-[13px] font-semibold text-brand">{r.sr_number}</span>
                    <span className="rounded-full bg-brand-tint px-2 py-0.5 text-[11px] font-semibold capitalize text-brand-ink">{r.type.replace("_", " ")}</span>
                    <span className="truncate text-[14px] text-ink">{r.subject}</span>
                    <span className="truncate text-[13px] text-ink-2">{r.clients?.full_name ?? "—"}</span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <div className="rounded-card border border-line bg-surface">
            <div className="border-b border-line px-4 py-3 font-display text-sm font-bold text-ink">Active Clients</div>
            {recentClients.length === 0 ? (
              <div className="p-5 text-center text-[14px] text-muted">No active clients yet.</div>
            ) : (
              recentClients.map((c) => (
                <div key={c.id} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-brand-tint text-[13px] font-bold text-brand-ink">
                    {(c.full_name ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-medium text-ink">{c.full_name ?? "Unnamed"}</div>
                    <div className="text-[12px] text-muted">
                      {c.plan_type ? PLAN_NAME[c.plan_type as PlanType] : "No plan"} • {c.credits_available} credits
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
