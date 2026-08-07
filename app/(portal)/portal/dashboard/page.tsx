import Link from "next/link";
import { getClientWithAccess } from "@/lib/data/access";
import { getClientCases, isActive, type CaseRow } from "@/lib/data/cases";
import { PortalShell } from "@/components/portal/portal-shell";
import { CaseTable } from "@/components/portal/case-table";
import { creditsView } from "@/lib/portal/creditsDisplay";
import {
  PLAN_NAME,
  PLAN_PRICE_LABEL,
  PLAN_CREDITS_PER_CYCLE,
  PLAN_BRAND_CAPS,
  type PlanType,
} from "@/lib/constants/plans";

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

function Kpi({
  label,
  value,
  sub,
  icon,
  chip,
  valueCls = "text-ink",
}: {
  label: string;
  value: number | string;
  sub: string;
  icon: string;
  chip: string;
  valueCls?: string;
}) {
  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[12px] font-semibold uppercase tracking-wide text-muted">{label}</div>
        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-sm ${chip}`} aria-hidden>
          {icon}
        </span>
      </div>
      <div className={`mt-2 font-display text-3xl font-extrabold leading-none ${valueCls}`}>{value}</div>
      <div className="mt-1 text-[13px] text-muted">{sub}</div>
    </div>
  );
}

function activityFor(cases: CaseRow[]) {
  return cases.slice(0, 5).map((c) => {
    if (c.status === "delivered") return { tone: "ok" as const, text: `Report ${c.case_number} is ready to download` };
    if (c.status === "awaiting_client") return { tone: "warn" as const, text: `Case ${c.case_number} — needs your attention` };
    return { tone: "info" as const, text: `Case ${c.case_number} submitted` };
  });
}

// ---- no-plan state: a single, unmissable activation prompt (ADR-005) ----
function NoPlanDashboard() {
  return (
    <div className="mx-auto mt-6 max-w-xl rounded-card border border-line bg-surface p-10 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-tint text-2xl">🔍</div>
      <h2 className="mt-5 font-display text-2xl font-bold tracking-tight text-ink">
        Choose a plan to start vetting suppliers
      </h2>
      <p className="mx-auto mt-2 max-w-md text-[16px] text-ink-2">
        Pick a plan to submit your first research request. You&rsquo;ll get a structured,
        five-dimension verdict on your supplier before you wire any money.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/portal/billing" className="rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brand-hover">
          Choose a plan →
        </Link>
        <Link href="/portal/help" className="rounded-lg border border-line bg-surface px-5 py-3 text-sm font-semibold text-ink-2 hover:bg-subtle">
          How it works
        </Link>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const { client, access } = await getClientWithAccess();
  const firstName = (client.full_name ?? "").trim().split(" ")[0];

  // No plan → single activation prompt, never "0" KPI cards.
  if (access.state === "no_plan") {
    return (
      <PortalShell client={client} active="dashboard" title="Dashboard">
        <div className="mb-1">
          <h2 className="font-display text-2xl font-bold tracking-tight text-ink">
            {firstName ? `Welcome, ${firstName}` : "Welcome to HyprrIQ"}
          </h2>
          <p className="mt-1 text-sm text-ink-2">Let&rsquo;s get your first supplier vetted.</p>
        </div>
        <NoPlanDashboard />
      </PortalShell>
    );
  }

  const cases = await getClientCases();
  const plan = client.plan_type as PlanType;
  const planTotal = PLAN_CREDITS_PER_CYCLE[plan];
  const cv = creditsView(client.credits_available, plan, client.credits_used_this_cycle);

  // Expired → read-only completed reports + reactivate.
  if (access.state === "expired") {
    const completed = cases.filter((c) => c.status === "delivered" || c.status === "complete");
    return (
      <PortalShell client={client} active="completed" title="Dashboard">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-conditional-bg px-5 py-4">
          <div>
            <div className="text-sm font-bold text-conditional-ink">Your plan is inactive</div>
            <div className="text-[14px] text-ink-2">Your completed reports stay available. Reactivate to submit new research.</div>
          </div>
          <Link href="/portal/billing" className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover">
            Reactivate plan →
          </Link>
        </div>
        <h3 className="mb-3 font-display text-base font-bold text-ink">Completed Reports</h3>
        <CaseTable cases={completed} emptyLabel="No completed reports." />
      </PortalShell>
    );
  }

  // Active → full dashboard.
  const activeCount = cases.filter(isActive).length;
  const readyCount = cases.filter((c) => c.status === "delivered").length;
  const slaRisk = cases.filter((c) => isActive(c) && c.status !== "awaiting_client" && c.sla_deadline && daysUntil(c.sla_deadline)! <= 1).length;
  const renew = daysUntil(client.renewal_date);
  const deadlines = cases
    .filter((c) => isActive(c) && c.status !== "awaiting_client" && c.sla_deadline)
    .sort((a, b) => new Date(a.sla_deadline!).getTime() - new Date(b.sla_deadline!).getTime())
    .slice(0, 3);
  const activity = activityFor(cases);
  const empty = cases.length === 0;

  return (
    <PortalShell client={client} active="dashboard" title="Dashboard">
      <div className="mb-5">
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink">
          {firstName ? `Good day, ${firstName} 👋` : "Welcome to HyprrIQ 👋"}
        </h2>
        <p className="mt-1 text-sm text-ink-2">
          {empty
            ? "Ready to start? Submit your first research request."
            : "Here’s what’s happening with your research today."}
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Credits Left" value={client.credits_available} sub={renew !== null ? `Renews in ${renew} days` : "—"} icon="🪙" chip="bg-brand-tint text-brand" valueCls="text-brand" />
        <Kpi label="Active Cases" value={activeCount} sub="In progress" icon="🗂" chip="bg-accent-data-tint text-accent-data" />
        <Kpi label="Reports Ready" value={readyCount} sub="Ready to download" icon="✓" chip="bg-clear-bg text-clear-ink" valueCls="text-clear-ink" />
        <Kpi label="SLA Risk" value={slaRisk} sub={slaRisk === 0 ? "No cases at risk" : "Due soon"} icon="⏱" chip={slaRisk > 0 ? "bg-verify-bg text-verify-ink" : "bg-subtle text-muted"} valueCls={slaRisk > 0 ? "text-verify-ink" : "text-ink"} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-ink">Recent Cases</h3>
            <Link href="/portal/cases" className="text-[14px] font-semibold text-brand hover:text-brand-hover">View all →</Link>
          </div>
          <CaseTable cases={cases.slice(0, 4)} emptyLabel="No cases yet — submit your first research request." />

          <h3 className="mb-3 mt-7 font-display text-base font-bold text-ink">Recent Activity</h3>
          <div className="rounded-card border border-line bg-surface">
            {activity.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted">Nothing yet.</div>
            ) : (
              activity.map((a, i) => (
                <div key={i} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${a.tone === "ok" ? "bg-clear-ink" : a.tone === "warn" ? "bg-verify-ink" : "bg-brand"}`} />
                  <span className="flex-1 text-[14px] text-ink-2">{a.text}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-card border border-line bg-surface">
            <div className="border-b border-line px-4 py-3 font-display text-sm font-bold text-ink">Upcoming Deadlines</div>
            {deadlines.length === 0 ? (
              <div className="p-5 text-center text-[14px] text-muted">No upcoming deadlines.</div>
            ) : (
              deadlines.map((c) => {
                const d = daysUntil(c.sla_deadline);
                return (
                  <div key={c.id} className="flex items-center gap-2 border-b border-line px-4 py-3 last:border-b-0">
                    <div className="min-w-0">
                      <div className="font-mono text-[12px] font-semibold text-brand">{c.case_number}</div>
                      <div className="truncate text-[14px] font-medium text-ink">{c.vendor_name ?? "—"}</div>
                    </div>
                    <span className={`ml-auto text-[13px] font-semibold ${d !== null && d <= 1 ? "text-verify-ink" : "text-ink-2"}`}>
                      {d !== null ? `${d} day${d === 1 ? "" : "s"}` : "—"}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <div className="rounded-card border border-line bg-surface">
            <div className="border-b border-line px-4 py-3 font-display text-sm font-bold text-ink">Quick Actions</div>
            <div className="grid grid-cols-2 gap-2 p-3">
              {[
                { label: "＋ New Research", href: "/portal/submit" },
                { label: "💳 Buy Credits", href: "/portal/billing" },
                { label: "🗎 View Reports", href: "/portal/cases?filter=completed" },
                { label: "💬 Get Help", href: "/portal/help" },
              ].map((q) => (
                <Link key={q.label} href={q.href} className="rounded-lg border border-line bg-base px-3 py-2.5 text-center text-[13px] font-semibold text-ink-2 hover:bg-subtle hover:text-ink">
                  {q.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-card border border-line bg-surface">
            <div className="border-b border-line px-4 py-3 font-display text-sm font-bold text-ink">Current Plan</div>
            <div className="p-4">
              <div className="font-display text-base font-extrabold text-brand">{PLAN_NAME[plan]} Plan</div>
              <div className="mt-0.5 text-[13px] text-muted">
                {PLAN_PRICE_LABEL[plan]}/mo • {planTotal} credits/month • up to {PLAN_BRAND_CAPS[plan]} brands
              </div>
              {/* BUG-2 fix — honest framing; a balance above the plan allotment never reads "7 of 5". */}
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-subtle">
                <div className="h-full rounded-full bg-brand" style={{ width: `${cv.pct}%` }} />
              </div>
              <div className="mt-1.5 text-[13px] text-muted">{cv.headline}{cv.detail ? ` · ${cv.detail}` : ""}</div>
              {plan !== "scale_499" && (
                <Link href="/portal/billing" className="mt-3 block rounded-lg bg-brand px-3 py-2 text-center text-[14px] font-semibold text-white hover:bg-brand-hover">
                  Upgrade to Scale →
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </PortalShell>
  );
}
