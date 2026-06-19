import Link from "next/link";
import { requireOnboardedClient } from "@/lib/data/client";
import { getClientCases, isActive, type CaseRow } from "@/lib/data/cases";
import { PortalShell } from "@/components/portal/portal-shell";
import { CaseTable } from "@/components/portal/case-table";
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
  tone,
}: {
  label: string;
  value: number | string;
  sub: string;
  tone?: "ok" | "accent";
}) {
  const ring =
    tone === "ok" ? "border-l-clear-ink" : tone === "accent" ? "border-l-brand" : "border-l-line";
  return (
    <div className={`rounded-card border border-line ${ring} border-l-[3px] bg-surface p-4`}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 font-display text-3xl font-extrabold leading-none text-ink">{value}</div>
      <div className="mt-1 text-[11.5px] text-muted">{sub}</div>
    </div>
  );
}

function activityFor(cases: CaseRow[]) {
  return cases.slice(0, 5).map((c) => {
    if (c.status === "delivered") {
      return { tone: "ok" as const, text: `Report ${c.case_number} is ready to download`, when: c.delivered_at };
    }
    if (c.status === "awaiting_client") {
      return { tone: "warn" as const, text: `Case ${c.case_number} — scope confirmation needed`, when: c.created_at };
    }
    return { tone: "info" as const, text: `Case ${c.case_number} submitted`, when: c.created_at };
  });
}

export default async function DashboardPage() {
  const client = await requireOnboardedClient();
  const cases = await getClientCases();

  const plan = client.plan_type as PlanType | null;
  const planTotal = plan ? PLAN_CREDITS_PER_CYCLE[plan] : 0;
  const activeCount = cases.filter(isActive).length;
  const readyCount = cases.filter((c) => c.status === "delivered").length;
  const slaRisk = cases.filter((c) => {
    if (!isActive(c) || c.status === "awaiting_client" || !c.sla_deadline) return false;
    return daysUntil(c.sla_deadline)! <= 1;
  }).length;
  const renew = daysUntil(client.renewal_date);

  const deadlines = cases
    .filter((c) => isActive(c) && c.status !== "awaiting_client" && c.sla_deadline)
    .sort((a, b) => new Date(a.sla_deadline!).getTime() - new Date(b.sla_deadline!).getTime())
    .slice(0, 3);

  const greetingName = (client.full_name ?? "").split(" ")[0] || "there";
  const activity = activityFor(cases);

  return (
    <PortalShell client={client} active="dashboard" title="Dashboard">
      <div className="mb-5">
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink">
          Good day, {greetingName} 👋
        </h2>
        <p className="mt-1 text-sm text-ink-2">
          Here&rsquo;s what&rsquo;s happening with your research today.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi
          label="Credits Left"
          value={client.credits_available}
          sub={renew !== null ? `Renews in ${renew} days` : "—"}
          tone="accent"
        />
        <Kpi label="Active Cases" value={activeCount} sub="In progress" />
        <Kpi label="Reports Ready" value={readyCount} sub="Ready to download" tone="ok" />
        <Kpi label="SLA Risk" value={slaRisk} sub={slaRisk === 0 ? "No cases at risk" : "Due soon"} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-ink">Recent Cases</h3>
            <Link href="/portal/cases" className="text-[13px] font-semibold text-brand hover:text-brand-hover">
              View all →
            </Link>
          </div>
          <CaseTable cases={cases.slice(0, 4)} emptyLabel="No cases yet — submit your first research request." />

          <h3 className="mb-3 mt-7 font-display text-base font-bold text-ink">Recent Activity</h3>
          <div className="rounded-card border border-line bg-surface">
            {activity.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted">Nothing yet.</div>
            ) : (
              activity.map((a, i) => (
                <div key={i} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      a.tone === "ok" ? "bg-clear-ink" : a.tone === "warn" ? "bg-verify-ink" : "bg-brand"
                    }`}
                  />
                  <span className="flex-1 text-[13px] text-ink-2">{a.text}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-card border border-line bg-surface">
            <div className="border-b border-line px-4 py-3 font-display text-sm font-bold text-ink">
              Upcoming Deadlines
            </div>
            {deadlines.length === 0 ? (
              <div className="p-5 text-center text-[13px] text-muted">No upcoming deadlines.</div>
            ) : (
              deadlines.map((c) => {
                const d = daysUntil(c.sla_deadline);
                return (
                  <div key={c.id} className="flex items-center gap-2 border-b border-line px-4 py-3 last:border-b-0">
                    <div className="min-w-0">
                      <div className="font-mono text-[11px] font-semibold text-brand">{c.case_number}</div>
                      <div className="truncate text-[13px] font-medium text-ink">{c.vendor_name ?? "—"}</div>
                    </div>
                    <span
                      className={`ml-auto text-[11.5px] font-semibold ${
                        d !== null && d <= 1 ? "text-verify-ink" : "text-ink-2"
                      }`}
                    >
                      {d !== null ? `${d} day${d === 1 ? "" : "s"}` : "—"}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <div className="rounded-card border border-line bg-surface">
            <div className="border-b border-line px-4 py-3 font-display text-sm font-bold text-ink">
              Quick Actions
            </div>
            <div className="grid grid-cols-2 gap-2 p-3">
              {[
                { label: "＋ New Research", href: "/portal/submit" },
                { label: "💳 Buy Credits", href: "/portal/billing" },
                { label: "🗎 View Reports", href: "/portal/cases?filter=completed" },
                { label: "💬 Get Help", href: "/portal/help" },
              ].map((q) => (
                <Link
                  key={q.label}
                  href={q.href}
                  className="rounded-lg border border-line bg-base px-3 py-2.5 text-center text-[12px] font-semibold text-ink-2 hover:bg-subtle hover:text-ink"
                >
                  {q.label}
                </Link>
              ))}
            </div>
          </div>

          {plan && (
            <div className="rounded-card border border-line bg-surface">
              <div className="border-b border-line px-4 py-3 font-display text-sm font-bold text-ink">
                Current Plan
              </div>
              <div className="p-4">
                <div className="font-display text-base font-extrabold text-brand">{PLAN_NAME[plan]} Plan</div>
                <div className="mt-0.5 text-[12px] text-muted">
                  {PLAN_PRICE_LABEL[plan]}/mo • {planTotal} credits/month • up to {PLAN_BRAND_CAPS[plan]} brands
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-subtle">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${planTotal > 0 ? Math.min(100, (client.credits_available / planTotal) * 100) : 0}%` }}
                  />
                </div>
                <div className="mt-1.5 text-[11.5px] text-muted">
                  {client.credits_available} of {planTotal} credits remaining
                </div>
                {plan !== "scale_499" && (
                  <Link
                    href="/portal/billing"
                    className="mt-3 block rounded-lg bg-brand px-3 py-2 text-center text-[13px] font-semibold text-white hover:bg-brand-hover"
                  >
                    Upgrade to Scale →
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </PortalShell>
  );
}
