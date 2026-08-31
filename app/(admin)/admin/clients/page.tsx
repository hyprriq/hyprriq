import { requireAdmin, getAdminClients } from "@/lib/data/admin";
import { AdminShell } from "@/components/admin/admin-shell";
import { ListTable } from "@/components/admin/list-table";
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
      {/* MIGRATED TO <ListTable> 2026-08-25. Was a 378px grid behind overflow-hidden: only 50px over
          at 360px, and the ROW WAS ALREADY A <Link>, so this one still navigated — which is exactly
          why it was POOR and not BROKEN. What it lost was the trailing CREDITS column, clipped off
          the right edge. Credits are the number an operator opens this list to read. */}
      <ListTable
        rows={clients}
        getKey={(c) => c.id}
        href={(c) => `/admin/clients/${c.id}`}
        empty="No clients yet."
        columns={[
          { key: "client", header: "Client", width: "1fr", card: "title",
            cell: (c) => (
              <div className="min-w-0">
                <div className="truncate text-[14px] font-semibold text-ink">
                  {c.full_name ?? "Unnamed"}
                  {c.role !== "client" && <span className="ml-2 rounded bg-ink px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">{c.role}</span>}
                </div>
                <div className="truncate text-[12px] text-muted">{c.email}{c.company_name ? ` · ${c.company_name}` : ""}</div>
              </div>
            ) },
          { key: "status", header: "Status", width: "110px", card: "badge",
            cell: (c) => (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${BILLING_CLS[c.billing_status] ?? BILLING_CLS.cancelled}`}>
                {c.billing_status.replace("_", " ")}
              </span>
            ) },
          { key: "plan", header: "Plan", width: "120px",
            cell: (c) => <span className="text-[13px] text-ink-2">{c.plan_type ? PLAN_NAME[c.plan_type as PlanType] : "No plan"}</span> },
          { key: "credits", header: "Credits", width: "80px",
            cell: (c) => <span className="text-[14px] font-semibold text-ink">{c.credits_available}</span> },
        ]}
      />
    </AdminShell>
  );
}
