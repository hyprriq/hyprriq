import Link from "next/link";
import { redirect } from "next/navigation";
import { getClientWithAccess } from "@/lib/data/access";
import { getClientCases, filterCases, type CaseFilter } from "@/lib/data/cases";
import { PortalShell } from "@/components/portal/portal-shell";
import { CaseTable } from "@/components/portal/case-table";

const TABS: { key: CaseFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "action", label: "Action Required" },
];

function normalize(raw: string | undefined): CaseFilter {
  if (raw === "active" || raw === "completed" || raw === "action") return raw;
  return "all";
}

export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { client, access } = await getClientWithAccess();
  // no-plan users have no cases and no list access — send them to the dashboard.
  if (access.state === "no_plan") redirect("/portal/dashboard");

  const { filter } = await searchParams;
  // Expired = read-only Completed only; force the filter regardless of the query.
  const active: CaseFilter = access.canViewActive ? normalize(filter) : "completed";
  const cases = await getClientCases();
  const actionCount = cases.filter((c) => c.status === "awaiting_client").length;
  const shown = filterCases(cases, active);

  return (
    <PortalShell client={client} active={access.canViewActive ? "cases" : "completed"} title="My Cases">
      {!access.canViewActive && (
        <div className="mb-5 rounded-card border border-line bg-conditional-bg px-4 py-3 text-[14px] text-conditional-ink">
          Your plan is inactive — showing your completed reports in read-only mode.{" "}
          <Link href="/portal/billing" className="font-semibold underline">Reactivate plan →</Link>
        </div>
      )}
      {access.canViewActive && (
      <div className="mb-5 flex flex-wrap gap-1 rounded-lg border border-line bg-surface p-1">
        {TABS.map((t) => {
          const isOn = t.key === active;
          return (
            <Link
              key={t.key}
              href={t.key === "all" ? "/portal/cases" : `/portal/cases?filter=${t.key}`}
              className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-[14px] font-semibold transition-colors ${
                isOn ? "bg-brand text-white" : "text-ink-2 hover:bg-subtle"
              }`}
            >
              {t.label}
              {t.key === "action" && actionCount > 0 && (
                <span
                  className={`rounded-full px-1.5 text-[11px] font-bold ${
                    isOn ? "bg-white/25 text-white" : "bg-deny-bg text-deny-ink"
                  }`}
                >
                  {actionCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>
      )}

      <CaseTable
        cases={shown}
        showAction={access.canViewActive}
        emptyLabel={
          active === "action"
            ? "Nothing needs your attention right now."
            : active === "completed"
              ? "No completed reports yet."
              : "No cases yet — submit your first research request."
        }
      />
    </PortalShell>
  );
}
