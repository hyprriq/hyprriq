import Link from "next/link";
import { requireAdmin, getAdminDashboard } from "@/lib/data/admin";
import { AdminShell } from "@/components/admin/admin-shell";
import { ListTable } from "@/components/admin/list-table";
import { PLAN_NAME, CASE_SLA_HOURS, type PlanType } from "@/lib/constants/plans";
import { StatusBadge } from "@/components/portal/badges";
import { buildKpiTiles, type KpiTile } from "@/lib/admin/dashboard-tiles";
import type { WeekBucket } from "@/lib/admin/dashboard-charts";

// HOUR granularity since the 24h SLA ruling (2026-08-12) — day math read "1 day" for the whole
// window, useless for triage against a 24-hour deadline.
function slaText(iso: string | null) {
  if (!iso) return "—";
  const h = Math.ceil((new Date(iso).getTime() - Date.now()) / 3_600_000);
  return h <= 0 ? "Overdue" : `${h}h`;
}

// ── Dashboard charts (final admin slice, 2026-08-13) — TRUE numbers only, per the ruled chart
// language: inline SVG, navy series + one accent, mono labels, no gradients or pies, every chart
// captioned with its source. Series come from lib/admin/dashboard-charts.ts (unit-locked) and
// the same rows the KPIs read. Deliberately NOT drawn, per flag-don't-fabricate: MRR over time
// (no plan-history table — only the current value exists), %-within-SLA (deadlines before the
// 2026-08-12 ruling carry the old day-based windows; mixing regimes would mislead), new clients
// over time (needs a read of all client rows incl. churned — this page only loads active ones),
// onboarding funnel (a single onboarding_completed boolean is recorded, no per-step events),
// email activity (no sends log exists — only blocked sends write audit rows). ──

const CHART_W = 320;
const CHART_H = 96;
const PLOT_H = 64; // drawing area above the baseline; labels use the rest
const TOP_PAD = 14; // room for value labels above the tallest bar/dot

function CasesChart({ weekly }: { weekly: WeekBucket[] }) {
  const max = Math.max(...weekly.map((w) => Math.max(w.created, w.deliveredCount)), 1);
  const slot = CHART_W / weekly.length;
  const barW = 18;
  const baseline = TOP_PAD + PLOT_H;
  const yFor = (n: number) => baseline - (n / max) * PLOT_H;
  const deliveredPoints = weekly.map((w, i) => `${i * slot + slot / 2},${yFor(w.deliveredCount)}`).join(" ");
  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      className="w-full"
      role="img"
      aria-label={`Cases created versus delivered per week, last ${weekly.length} weeks: ${weekly
        .map((w) => `week of ${w.label}, ${w.created} created, ${w.deliveredCount} delivered`)
        .join("; ")}`}
    >
      {weekly.map((w, i) => {
        const h = (w.created / max) * PLOT_H;
        const x = i * slot + (slot - barW) / 2;
        return (
          <g key={w.label}>
            {w.created > 0 && (
              <>
                <rect x={x} y={baseline - h} width={barW} height={h} rx={2} className="fill-brand" />
                <text x={x + barW / 2} y={baseline - h - 3} textAnchor="middle" className="fill-ink-2 font-mono text-[9px]">
                  {w.created}
                </text>
              </>
            )}
            {i % 2 === 0 && (
              <text x={i * slot + slot / 2} y={CHART_H - 2} textAnchor="middle" className="fill-muted font-mono text-[8.5px]">
                {w.label}
              </text>
            )}
          </g>
        );
      })}
      <polyline points={deliveredPoints} fill="none" className="stroke-accent-data" strokeWidth={1.5} />
      {weekly.map((w, i) => (
        <circle key={w.label} cx={i * slot + slot / 2} cy={yFor(w.deliveredCount)} r={2.5} className="fill-accent-data">
          <title>{`Week of ${w.label}: ${w.deliveredCount} delivered`}</title>
        </circle>
      ))}
      <line x1={0} y1={baseline} x2={CHART_W} y2={baseline} className="stroke-line-strong" strokeWidth={1} />
    </svg>
  );
}

function HoursToDeliverChart({ weekly }: { weekly: WeekBucket[] }) {
  const medians = weekly.filter((w) => w.medianHours !== null).map((w) => w.medianHours as number);
  const max = Math.max(...medians, Math.ceil(CASE_SLA_HOURS * 1.25));
  // The target label owns the right gutter — dots stay out of it so a median near the target
  // can never collide with the "24h" text (caught in the geometry harness, 2026-08-13).
  const plotW = CHART_W - 32;
  const slot = plotW / weekly.length;
  const baseline = TOP_PAD + PLOT_H;
  const yFor = (hours: number) => baseline - (hours / max) * PLOT_H;
  const slaY = yFor(CASE_SLA_HOURS);
  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      className="w-full"
      role="img"
      aria-label={`Median hours from case creation to delivery, by delivery week, against the ${CASE_SLA_HOURS}-hour target: ${weekly
        .map((w) => `week of ${w.label}, ${w.medianHours === null ? "no deliveries" : `${w.medianHours} hours over ${w.deliveredCount}`}`)
        .join("; ")}`}
    >
      <line x1={0} y1={slaY} x2={plotW} y2={slaY} className="stroke-accent-data" strokeWidth={1} strokeDasharray="3 3" />
      <text x={CHART_W} y={slaY + 3} textAnchor="end" className="fill-accent-data font-mono text-[9px]">
        {CASE_SLA_HOURS}h
      </text>
      {weekly.map((w, i) => {
        const cx = i * slot + slot / 2;
        return (
          <g key={w.label}>
            {w.medianHours !== null && (
              <>
                <circle cx={cx} cy={yFor(w.medianHours)} r={3.5} className="fill-brand">
                  <title>{`Week of ${w.label}: median ${w.medianHours}h over ${w.deliveredCount} ${w.deliveredCount === 1 ? "delivery" : "deliveries"}`}</title>
                </circle>
                <text x={cx} y={yFor(w.medianHours) - 6} textAnchor="middle" className="fill-ink-2 font-mono text-[9px]">
                  {w.medianHours}h
                </text>
              </>
            )}
            {i % 2 === 0 && (
              <text x={cx} y={CHART_H - 2} textAnchor="middle" className="fill-muted font-mono text-[8.5px]">
                {w.label}
              </text>
            )}
          </g>
        );
      })}
      <line x1={0} y1={baseline} x2={CHART_W} y2={baseline} className="stroke-line-strong" strokeWidth={1} />
    </svg>
  );
}

function PlanMixChart({ planMix }: { planMix: { plan: PlanType; count: number }[] }) {
  const max = Math.max(...planMix.map((p) => p.count), 1);
  const ROW_H = 26;
  const LABEL_W = 118;
  const COUNT_W = 26;
  const barMax = 268 - LABEL_W - COUNT_W;
  const h = planMix.length * ROW_H;
  return (
    <svg
      viewBox={`0 0 268 ${h}`}
      className="w-full"
      role="img"
      aria-label={`Active clients by plan: ${planMix.map((p) => `${PLAN_NAME[p.plan]}, ${p.count}`).join("; ")}`}
    >
      {planMix.map((p, i) => {
        const y = i * ROW_H;
        const w = Math.max((p.count / max) * barMax, 3);
        return (
          <g key={p.plan}>
            <text x={0} y={y + 17} className="fill-ink-2 text-[11px]">
              {PLAN_NAME[p.plan]}
            </text>
            <rect x={LABEL_W} y={y + 8} width={w} height={11} rx={2} className="fill-brand" />
            <text x={268} y={y + 17} textAnchor="end" className="fill-ink-2 font-mono text-[11px]">
              {p.count}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Tile({ t, triage }: { t: KpiTile; triage: boolean }) {
  const figureTone =
    t.tone === "warn" ? "text-verify-ink" : t.tone === "ok" ? "text-clear-ink" : "text-brand";
  const body = (
    <>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{t.label}</div>
      <div className={`mt-1 font-mono font-semibold ${triage ? "text-[26px] leading-8" : "text-[17px] leading-6"} ${figureTone}`}>
        {t.value}
      </div>
      <div className="mt-0.5 text-[12px] text-muted">{t.sub}</div>
    </>
  );
  const cls = `rounded-card border border-line bg-surface ${triage ? "p-4" : "px-4 py-3"}`;
  return t.href ? (
    <Link href={t.href} className={`${cls} block transition-colors hover:border-brand hover:bg-subtle`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();
  const { kpis, reviewQueue, openSupport, recentClients, weekly, planMix } = await getAdminDashboard(admin.clientScope);

  // BUG-1 fix — tile destinations live in the unit-locked presenter (lib/admin/dashboard-tiles):
  // publishing drops a case from the queue below, so the Delivered tile MUST route to the
  // delivered list (whose View buttons open the review page) — no more direct-URL-only path.
  const tiles = buildKpiTiles(kpis);
  const triageTiles = tiles.filter((t) => t.group === "triage");
  const businessTiles = tiles.filter((t) => t.group === "business");
  const hasDeliveries = weekly.some((w) => w.deliveredCount > 0);
  const hasCases = weekly.some((w) => w.created > 0 || w.deliveredCount > 0);

  return (
    <AdminShell
      active="dashboard"
      title="Admin Dashboard"
      operator={admin}
      clientScope={admin.clientScope}
      user={{ initial: (admin.full_name || admin.email || "?").charAt(0).toUpperCase(), email: admin.email }}
    >
      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {triageTiles.map((t) => (
          <Tile key={t.label} t={t} triage />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {businessTiles.map((t) => (
          <Tile key={t.label} t={t} triage={false} />
        ))}
      </div>
      {/* The app/Stripe boundary, stated where the money figures sit. */}
      <p className="mb-6 mt-2 text-[11.5px] leading-4 text-muted">
        MRR and credit figures come from plan and case records. Stripe holds the dollar-accurate ledger — exact revenue and churn live there.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-7">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-[16px] font-bold text-ink">Case Queue — Quality Review</h2>
              <span className="text-[13px] text-muted">{reviewQueue.length} in queue · nearest deadline first</span>
            </div>
            {/* MIGRATED TO <ListTable> 2026-08-25. Was a 542px grid in a 328px content box behind
                overflow-hidden — at 360px the row's only link had ZERO visible pixels, the same
                defect as /admin/cases. The whole card is the link now. The SLA keeps its
                exception-only ink: an overdue case is the one thing this queue exists to surface. */}
            <ListTable
              rows={reviewQueue}
              getKey={(c) => c.id}
              href={(c) => `/admin/cases/${c.id}/review`}
              empty="No cases in the queue — new submissions appear here."
              columns={[
                { key: "case", header: "Case ID", width: "96px", card: "title",
                  cell: (c) => <span className="font-mono text-[13px] font-semibold text-brand">{c.case_number}</span> },
                { key: "stage", header: "Stage", width: "132px", card: "badge",
                  cell: (c) => <StatusBadge status={c.status} /> },
                { key: "supplier", header: "Supplier / Brands", width: "1fr", card: "body",
                  cell: (c) => (
                    <div className="min-w-0">
                      <div className="truncate text-[14px] font-semibold text-ink">{c.vendor_name ?? "—"}</div>
                      <div className="truncate text-[12px] text-muted">{(c.brands_submitted ?? []).join(" • ") || "—"}</div>
                    </div>
                  ) },
                { key: "sla", header: "SLA", width: "70px", align: "right",
                  cell: (c) => {
                    const overdue = slaText(c.sla_deadline) === "Overdue";
                    return (
                      <span className={`font-mono text-[13px] font-semibold ${overdue ? "text-deny-ink" : "text-ink-2"}`}>
                        {slaText(c.sla_deadline)}
                      </span>
                    );
                  } },
                { key: "plan", header: "Plan", width: "80px",
                  cell: (c) => <span className="text-[13px] text-ink-2">{c.plan_type ? PLAN_NAME[c.plan_type] : "—"}</span> },
                { key: "go", header: "", width: "72px", card: "hide",
                  cell: () => (
                    <span className="rounded-md bg-brand px-2.5 py-1 text-center text-[12px] font-bold text-white">
                      Review
                    </span>
                  ) },
              ]}
            />
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-[16px] font-bold text-ink">Support Queue</h2>
              <span className={`text-[13px] font-semibold ${openSupport.length > 0 ? "text-deny-ink" : "text-muted"}`}>{openSupport.length} open</span>
            </div>
            {/* MIGRATED TO <ListTable> 2026-08-25. Was a 438px grid, clipped — and this one has NO
                href by design: the support queue is read-only, so there is nowhere for a row to go.
                What the clipping destroyed here was the SUBJECT and the CLIENT, i.e. content. */}
            <ListTable
              rows={openSupport}
              getKey={(r) => r.id}
              empty="No open requests."
              columns={[
                { key: "sr", header: "SR Number", width: "140px", card: "title",
                  cell: (r) => <span className="font-mono text-[13px] font-semibold text-brand">{r.sr_number}</span> },
                { key: "type", header: "Type", width: "110px", card: "badge",
                  cell: (r) => (
                    <span className="rounded-full bg-brand-tint px-2 py-0.5 text-[11px] font-semibold capitalize text-brand-ink">
                      {r.type.replace("_", " ")}
                    </span>
                  ) },
                { key: "subject", header: "Subject", width: "1fr", card: "body",
                  cell: (r) => <span className="truncate text-[14px] text-ink">{r.subject}</span> },
                { key: "client", header: "Client", width: "120px",
                  cell: (r) => <span className="truncate text-[13px] text-ink-2">{r.clients?.full_name ?? "—"}</span> },
              ]}
            />
          </section>

          {/* Charts sit BELOW the work (founder brief 2026-08-13): the page opens on the queue. */}
          <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-card border border-line bg-surface">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <span className="font-display text-sm font-bold text-ink">Cases — Created vs Delivered</span>
                <span className="font-mono text-[10px] text-muted">
                  <span className="text-brand">■</span> created&ensp;<span className="text-accent-data">●</span> delivered
                </span>
              </div>
              <div className="px-4 pb-3 pt-4">
                {hasCases ? (
                  <CasesChart weekly={weekly} />
                ) : (
                  <p className="py-4 text-center text-[13px] text-muted">No cases in the last {weekly.length} weeks.</p>
                )}
                <p className="mt-2 text-[11px] leading-4 text-muted">Per week, counted from case records — created by creation date, delivered by delivery date.</p>
              </div>
            </div>

            <div className="rounded-card border border-line bg-surface">
              <div className="border-b border-line px-4 py-3 font-display text-sm font-bold text-ink">Time to Deliver</div>
              <div className="px-4 pb-3 pt-4">
                {hasDeliveries ? (
                  <HoursToDeliverChart weekly={weekly} />
                ) : (
                  <p className="py-4 text-center text-[13px] text-muted">No deliveries yet in the last {weekly.length} weeks.</p>
                )}
                <p className="mt-2 text-[11px] leading-4 text-muted">
                  Median hours from case creation to delivery, by delivery week, against the {CASE_SLA_HOURS}h target.
                </p>
              </div>
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

          <div className="rounded-card border border-line bg-surface">
            <div className="border-b border-line px-4 py-3 font-display text-sm font-bold text-ink">Plan Mix</div>
            <div className="px-4 pb-3 pt-4">
              {planMix.length === 0 ? (
                <p className="py-4 text-center text-[13px] text-muted">No active plans yet.</p>
              ) : (
                <PlanMixChart planMix={planMix} />
              )}
              <p className="mt-2 text-[11px] leading-4 text-muted">Active clients by plan, from the same records MRR reads.</p>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
