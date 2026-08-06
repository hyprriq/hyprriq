import { requireAdmin } from "@/lib/data/admin";
import { AdminShell } from "@/components/admin/admin-shell";
import { getOutcomesAggregate } from "@/lib/data/outcomes";
import { OUTCOME_LABELS } from "@/lib/constants/outcomes";

// ── OUTCOMES AGGREGATE (2026-08-02) — the roll-up over recorded case outcomes. Capture stays
// where it always was (each delivered case's review page); this page only reads across cases.
// Function-only; the UI thread restyles. ──

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default async function AdminOutcomesPage() {
  const admin = await requireAdmin();
  const { rows, totals } = await getOutcomesAggregate(admin.clientScope);
  const recordedRows = rows.filter((r) => r.outcome_type);
  return (
    <AdminShell active="outcomes" title="Outcomes" operator={admin} clientScope={admin.clientScope} user={{ initial: (admin.full_name || admin.email || "?").charAt(0).toUpperCase(), email: admin.email }}>
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-card border border-line bg-surface p-4">
          <div className="text-[12px] uppercase tracking-wide text-muted">Delivered cases</div>
          <div className="mt-0.5 font-display text-2xl font-extrabold text-ink">{totals.delivered}</div>
        </div>
        <div className="rounded-card border border-line bg-surface p-4">
          <div className="text-[12px] uppercase tracking-wide text-muted">Outcomes recorded</div>
          <div className="mt-0.5 font-display text-2xl font-extrabold text-ink">{totals.recorded}</div>
        </div>
        <div className="rounded-card border border-line bg-surface p-4">
          <div className="text-[12px] uppercase tracking-wide text-muted">Prediction correct</div>
          <div className="mt-0.5 font-display text-2xl font-extrabold text-clear-ink">{totals.predictionCorrect}</div>
        </div>
        <div className="rounded-card border border-line bg-surface p-4">
          <div className="text-[12px] uppercase tracking-wide text-muted">Prediction wrong</div>
          <div className="mt-0.5 font-display text-2xl font-extrabold text-deny-ink">{totals.predictionWrong}</div>
        </div>
      </div>

      {Object.keys(totals.byType).length > 0 && (
        <div className="mb-5 rounded-card border border-line bg-surface p-4">
          <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted">By outcome type</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(totals.byType).map(([t, n]) => (
              <span key={t} className="rounded-lg bg-subtle px-2.5 py-1 text-[13px] text-ink-2">
                {(OUTCOME_LABELS as Record<string, string>)[t] ?? t}: <span className="font-semibold text-ink">{n}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-card border border-line bg-surface p-4">
        <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted">Recorded outcomes</div>
        {recordedRows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            No outcomes recorded yet. Outcome capture lives on each delivered case&rsquo;s review page.
          </p>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-line text-left text-[12px] uppercase tracking-wide text-muted">
                <th className="py-2 pr-3">Case</th>
                <th className="py-2 pr-3">Supplier</th>
                <th className="py-2 pr-3">Verdict at delivery</th>
                <th className="py-2 pr-3">Outcome</th>
                <th className="py-2 pr-3">Prediction</th>
                <th className="py-2">Recorded</th>
              </tr>
            </thead>
            <tbody>
              {recordedRows.map((r, i) => (
                <tr key={i} className="border-t border-line/60">
                  <td className="py-2 pr-3 font-mono text-ink">{r.cases?.case_number ?? "—"}</td>
                  <td className="py-2 pr-3 text-ink">{r.cases?.vendor_name ?? "—"}</td>
                  <td className="py-2 pr-3 text-muted">{r.verdict_at_delivery?.replaceAll("_", " ") ?? "—"}</td>
                  <td className="py-2 pr-3 text-ink-2">{(OUTCOME_LABELS as Record<string, string>)[r.outcome_type ?? ""] ?? r.outcome_type}</td>
                  <td className="py-2 pr-3">
                    {r.prediction_correct === true && <span className="font-semibold text-clear-ink">correct</span>}
                    {r.prediction_correct === false && <span className="font-semibold text-deny-ink">wrong</span>}
                    {r.prediction_correct === null && <span className="text-muted">—</span>}
                  </td>
                  <td className="py-2 text-muted">{fmt(r.outcome_reported_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}
