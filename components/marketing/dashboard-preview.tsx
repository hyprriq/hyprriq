import { VerdictBadge, type Verdict } from "./verdict-badge";
import { Wordmark } from "@/components/brand/wordmark";

// SWAP POINT (post dashboard-finalization): replace the mock panel below with a
// real <Image> screenshot of /portal/dashboard. Keep the frame + blur overlay
// wrapper so the "teaser" treatment is preserved. Mock is intentionally
// credible, not lorem.
const ROWS: { id: string; vendor: string; verdict: Verdict; when: string }[] = [
  { id: "AWI-2606-014", vendor: "Northgate Wholesale Co.", verdict: "conditional", when: "2d ago" },
  { id: "AWI-2606-011", vendor: "Cedar Supply Partners", verdict: "clear", when: "4d ago" },
  { id: "AWI-2606-009", vendor: "Atlas Trade Group", verdict: "verify", when: "5d ago" },
  { id: "AWI-2606-006", vendor: "Harbor Point Dist.", verdict: "deny", when: "1w ago" },
];

export function DashboardPreview() {
  return (
    <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-[0_1px_2px_rgba(26,25,23,0.04),0_24px_60px_-24px_rgba(26,25,23,0.22)]">
      {/* window chrome */}
      <div className="flex items-center gap-1.5 border-b border-line bg-subtle px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        <span className="ml-3 font-mono text-xs text-muted">hyprriq.com/portal</span>
      </div>

      <div className="flex">
        {/* sidebar */}
        <aside className="hidden w-44 flex-none border-r border-line bg-subtle px-3 py-4 sm:block">
          <div className="px-2"><Wordmark height={14} /></div>
          <nav className="mt-4 space-y-1 text-sm">
            <span className="block rounded-md bg-brand-tint px-2 py-1.5 font-medium text-brand-ink">
              Dashboard
            </span>
            <span className="block px-2 py-1.5 text-ink-2">Submit research</span>
            <span className="block px-2 py-1.5 text-ink-2">Cases</span>
            <span className="block px-2 py-1.5 text-ink-2">Reports</span>
            <span className="block px-2 py-1.5 text-ink-2">Settings</span>
          </nav>
        </aside>

        {/* main */}
        <div className="min-w-0 flex-1 px-5 py-5">
          {/* credit meter + kpis */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-ink-2">Welcome back, Alex</p>
              <p className="mt-0.5 font-display text-xl font-semibold text-ink">
                Research dashboard
              </p>
            </div>
            <div className="rounded-lg border border-line bg-surface px-3 py-2">
              <p className="text-xs text-muted">Credits this month</p>
              <p className="font-mono text-lg font-semibold tnum text-ink">
                8<span className="text-muted"> / 12</span>
              </p>
            </div>
          </div>

          {/* case table */}
          <div className="mt-5 overflow-hidden rounded-lg border border-line">
            <div className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-line bg-subtle px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted">
              <span>Recent cases</span>
              <span>Verdict</span>
            </div>
            {ROWS.map((r) => (
              <div
                key={r.id}
                className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-line px-4 py-3 last:border-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{r.vendor}</p>
                  <p className="font-mono text-xs tnum text-muted">
                    {r.id} · {r.when}
                  </p>
                </div>
                <VerdictBadge verdict={r.verdict} size="sm" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* partial-blur fade — crisp at top, softens into the page at the bottom */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 backdrop-blur-[3px]"
        style={{
          maskImage: "linear-gradient(to bottom, transparent, black 70%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent, black 70%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
        style={{
          background: "linear-gradient(to bottom, rgba(250,249,247,0), var(--color-base))",
        }}
      />
    </div>
  );
}
