import Link from "next/link";
import { requireAdmin, getAdminClients } from "@/lib/data/admin";
import { AdminShell } from "@/components/admin/admin-shell";
import { PLAN_NAME, type PlanType } from "@/lib/constants/plans";

const BILLING_CLS: Record<string, string> = {
  active: "bg-clear-bg text-clear-ink",
  trialling: "bg-brand-tint text-brand-ink",
  past_due: "bg-verify-bg text-verify-ink",
  cancelled: "bg-subtle text-muted",
};

export default async function AdminClientsPage() {
  const admin = await requireAdmin();
  const clients = await getAdminClients(admin.clientScope);

  return (
    <AdminShell
      active="clients"
      title="Clients"
      operator={admin}
      clientScope={admin.clientScope}
      user={{ initial: (admin.full_name || admin.email || "?").charAt(0).toUpperCase(), email: admin.email }}
    >
      {clients.length === 0 ? (
        <div className="rounded-card border border-line bg-surface p-10 text-center text-sm text-muted">
          No clients yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-card border border-line bg-surface">
          <div className="grid grid-cols-[1fr_120px_110px_80px] gap-3 border-b border-line bg-subtle px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide text-muted">
            <span>Client</span><span>Plan</span><span>Status</span><span>Credits</span>
          </div>
          {clients.map((c) => (
            <Link key={c.id} href={`/admin/clients/${c.id}`} className="grid grid-cols-[1fr_120px_110px_80px] items-center gap-3 border-b border-line px-4 py-3 transition-colors last:border-b-0 hover:bg-subtle">
              <div className="min-w-0">
                <div className="truncate text-[14px] font-semibold text-ink">
                  {c.full_name ?? "Unnamed"}
                  {c.role !== "client" && <span className="ml-2 rounded bg-ink px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">{c.role}</span>}
                </div>
                <div className="truncate text-[12px] text-muted">{c.email}{c.company_name ? ` · ${c.company_name}` : ""}</div>
              </div>
              <span className="text-[13px] text-ink-2">{c.plan_type ? PLAN_NAME[c.plan_type as PlanType] : "No plan"}</span>
              <span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${BILLING_CLS[c.billing_status] ?? BILLING_CLS.cancelled}`}>
                  {c.billing_status.replace("_", " ")}
                </span>
              </span>
              <span className="text-[14px] font-semibold text-ink">{c.credits_available}</span>
            </Link>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
