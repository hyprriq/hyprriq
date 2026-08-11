import Link from "next/link";
import { requireAdmin, getAllCasesAdmin, type AdminCaseListFilter } from "@/lib/data/admin";
import { can } from "@/lib/auth/permissions";
import { AdminShell, type AdminNavKey } from "@/components/admin/admin-shell";
import { StatusBadge, VerdictBadge } from "@/components/portal/badges";
import { PLAN_NAME } from "@/lib/constants/plans";

const TABS: { key: AdminCaseListFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "queue", label: "In Queue" },
  { key: "delivered", label: "Delivered" },
  { key: "action", label: "Action Required" },
];

function normalize(raw: string | undefined): AdminCaseListFilter {
  if (raw === "queue" || raw === "delivered" || raw === "action") return raw;
  return "all";
}

// Active sidebar key: Delivered nav highlights for the delivered filter, else All Cases.
function navKeyFor(filter: AdminCaseListFilter): AdminNavKey {
  if (filter === "delivered") return "delivered";
  if (filter === "queue") return "review";
  return "all";
}

export default async function AdminCasesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const admin = await requireAdmin();
  const filter = normalize((await searchParams).filter);
  // PAGE GATE (2026-08-11, close-out item 7): nav filtering is UX; this is the rule.
  if (!can(admin, "view_cases")) {
    return (
      <AdminShell active={navKeyFor(filter)} title="Cases" operator={admin} clientScope={admin.clientScope} user={{ initial: (admin.full_name || admin.email || "?").charAt(0).toUpperCase(), email: admin.email }}>
        <p className="rounded-card border border-line bg-surface p-6 text-sm text-muted">
          Viewing cases requires the <span className="font-semibold">Can view cases</span> permission.
        </p>
      </AdminShell>
    );
  }
  const cases = await getAllCasesAdmin(filter, admin.clientScope);

  return (
    <AdminShell
      active={navKeyFor(filter)}
      title="Cases"
      operator={admin}
      clientScope={admin.clientScope}
      user={{ initial: (admin.full_name || admin.email || "?").charAt(0).toUpperCase(), email: admin.email }}
    >
      <div className="mb-5 flex flex-wrap gap-1 rounded-lg border border-line bg-surface p-1">
        {TABS.map((t) => {
          const isOn = t.key === filter;
          return (
            <Link
              key={t.key}
              href={t.key === "all" ? "/admin/cases" : `/admin/cases?filter=${t.key}`}
              className={`rounded-md px-3.5 py-1.5 text-[14px] font-semibold transition-colors ${
                isOn ? "bg-brand text-white" : "text-ink-2 hover:bg-subtle"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {cases.length === 0 ? (
        <div className="rounded-card border border-line bg-surface p-10 text-center text-sm text-muted">
          No cases in this view.
        </div>
      ) : (
        <div className="overflow-hidden rounded-card border border-line bg-surface">
          <div className="grid grid-cols-[96px_1fr_90px_130px_140px_72px] gap-3 border-b border-line bg-subtle px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide text-muted">
            <span>Case ID</span><span>Supplier / Brands</span><span>Plan</span><span>Stage</span><span>Verdict</span><span></span>
          </div>
          {cases.map((c) => (
            <div key={c.id} className="grid grid-cols-[96px_1fr_90px_130px_140px_72px] items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
              <span className="font-mono text-[13px] font-semibold text-brand">{c.case_number}</span>
              <div className="min-w-0">
                <div className="truncate text-[14px] font-semibold text-ink">{c.vendor_name ?? "—"}</div>
                <div className="truncate text-[12px] text-muted">
                  {c.clients?.full_name ? `${c.clients.full_name} · ` : ""}{(c.brands_submitted ?? []).join(" • ") || "—"}
                </div>
              </div>
              <span className="text-[13px] text-ink-2">{c.plan_type ? PLAN_NAME[c.plan_type] : "—"}</span>
              <span><StatusBadge status={c.status} /></span>
              <span><VerdictBadge verdict={c.verdict} /></span>
              {/* Always the ADMIN review page. The old delivered→/portal/cases/:id link 404'd
                  (portal data layer scopes by client_id — the admin doesn't own the case) and hid
                  the H6 Outcome panel, which lives on the review page for delivered cases. */}
              <Link
                href={`/admin/cases/${c.id}/review`}
                className="rounded-md bg-brand px-2.5 py-1 text-center text-[12px] font-bold text-white hover:bg-brand-hover"
              >
                {c.status === "delivered" || c.status === "complete" ? "View" : "Review"}
              </Link>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
