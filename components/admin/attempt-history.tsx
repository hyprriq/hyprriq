// ── ADMIN BATCH — OQ-CASE-RERUN's visible half: the ATTEMPT HISTORY. H1 confirmed from source:
// re-runs create NEW attempts (never overwrite — v2's "re-runs overwrite in place" note was
// stale/false), the DELIVERED attempt is pinned by cases.delivered_attempt and frozen, and a
// dispute re-run never advances the live pointer. This view makes those guarantees VISIBLE:
// every attempt listed, the delivered one marked, the engine version per attempt shown.
// (Per-attempt VERDICT is not stored per attempt today — only the live pointer and the delivered
// pin exist; shown honestly as markers rather than invented per-row verdicts.) ──

export interface AttemptRow {
  attempt_number: number;
  created_at: string | null;
  synthesis_version: string | null;
}

export function AttemptHistory({ attempts, deliveredAttempt, currentVerdict }: {
  attempts: AttemptRow[];
  deliveredAttempt: number | null;
  currentVerdict: string | null;
}) {
  if (attempts.length === 0) return null;
  const latest = Math.max(...attempts.map((a) => a.attempt_number));
  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted">
        Attempt History <span className="normal-case font-normal">— re-runs append; a delivered attempt is frozen (H1)</span>
      </div>
      <table className="w-full text-[13px]">
        <tbody>
          {[...attempts].sort((a, b) => b.attempt_number - a.attempt_number).map((a) => (
            <tr key={a.attempt_number} className="border-t border-line/60 first:border-t-0">
              <td className="py-1.5 pr-3 font-medium text-ink">#{a.attempt_number}</td>
              <td className="py-1.5 pr-3 text-muted">
                {a.created_at ? new Date(a.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
              </td>
              <td className="py-1.5 pr-3 text-muted">{a.synthesis_version ?? "—"}</td>
              <td className="py-1.5 text-right">
                {a.attempt_number === deliveredAttempt && (
                  <span className="rounded bg-clear-bg px-1.5 py-0.5 text-[11px] font-semibold text-clear-ink">DELIVERED{currentVerdict ? ` · ${currentVerdict.replaceAll("_", " ")}` : ""}</span>
                )}
                {a.attempt_number === latest && a.attempt_number !== deliveredAttempt && (
                  <span className="rounded bg-subtle px-1.5 py-0.5 text-[11px] font-semibold text-muted">LATEST</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
