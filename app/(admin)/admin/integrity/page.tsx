import { requireAdmin } from "@/lib/data/admin";
import { AdminShell } from "@/components/admin/admin-shell";
import { CHECKS, CHECK_BY_ID } from "@/lib/integrity/checks";
import { latestSweep, hoursSince } from "@/lib/integrity/latest";

// ── SYSTEM HEALTH (founder-locked 2026-08-22, item 2) — the one place to look ────────────────
//
// Every standing check, when it last ran, what it found, and which cases are implicated. Plain
// English: the founder does not read code and must not need SQL to know whether the system is
// healthy.
//
// ⛔ GREEN MEANS MEASURED GREEN, WITH A TIMESTAMP. "Never checked" is its own state and is NEVER
// rendered as healthy — the absence of a finding is not the presence of a check. A stale record
// says so rather than being trusted. This is the whole point of the page: the failure mode it
// exists to prevent is a dashboard that looks calm because nothing ran.
//
// Function-only; the design lane restyles. Legible in ten seconds is the bar.

export const dynamic = "force-dynamic";

const STALE_AFTER_HOURS = 36; // the sweep is daily; a day and a half means it stopped running.

function fmtWhen(iso: string): string {
  const h = hoursSince(iso);
  const when = new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  if (h < 1) return `${when} (under an hour ago)`;
  if (h < 48) return `${when} (${Math.round(h)} hours ago)`;
  return `${when} (${Math.round(h / 24)} days ago)`;
}

export default async function AdminIntegrityPage() {
  const admin = await requireAdmin();
  const sweep = await latestSweep();
  const shell = {
    operator: admin,
    clientScope: admin.clientScope,
    user: { initial: (admin.full_name || admin.email || "?").charAt(0).toUpperCase(), email: admin.email },
  };

  const stale = sweep ? hoursSince(sweep.ran_at) > STALE_AFTER_HOURS : false;
  const corpusChecks = sweep?.checks ?? [];
  const totalFindings = corpusChecks.reduce((n, c) => n + c.findings.length, 0);
  const totalUneval = corpusChecks.reduce((n, c) => n + c.notEvaluated.length, 0);

  // The one-line answer, in the founder's terms.
  const headline = !sweep
    ? { tone: "unknown", text: "Never checked — the nightly sweep has not recorded a run yet." }
    : stale
      ? { tone: "unknown", text: `Last measured ${fmtWhen(sweep.ran_at)} — that is older than expected, so this page may not reflect today.` }
      : totalFindings === 0
        ? { tone: "clear", text: `All corpus checks measured clean across ${sweep.cases_total} cases, ${fmtWhen(sweep.ran_at)}.` }
        : { tone: "attention", text: `${totalFindings} finding(s) across ${sweep.cases_total} cases, measured ${fmtWhen(sweep.ran_at)}.` };

  const toneCls =
    headline.tone === "clear" ? "border-clear-ink/30 bg-clear-bg text-clear-ink"
      : headline.tone === "attention" ? "border-conditional-ink/40 bg-conditional-bg text-conditional-ink"
        : "border-line bg-subtle text-ink-2";

  return (
    <AdminShell active="integrity" title="System health" {...shell}>
      <div className={`rounded-card border p-5 ${toneCls}`}>
        <div className="font-display text-lg font-bold">{headline.text}</div>
        {totalUneval > 0 && (
          <p className="mt-1.5 text-[13px] opacity-90">
            {totalUneval} case-check(s) could not be evaluated. They are listed below and are NOT counted as clean.
          </p>
        )}
      </div>

      <div className="mt-5 space-y-4">
        {CHECKS.map((spec) => {
          const result = corpusChecks.find((c) => c.checkId === spec.id);
          const isBuildOnly = !spec.shapes.includes("ALERT");
          const findings = result?.findings ?? [];
          const state = isBuildOnly
            ? { label: "Enforced at build", cls: "text-ink-2" }
            : !sweep
              ? { label: "Never checked", cls: "text-muted" }
              : findings.length === 0
                ? { label: "Clean", cls: "text-clear-ink" }
                : { label: `${findings.length} finding(s)`, cls: "text-conditional-ink" };

          return (
            <div key={spec.id} className="rounded-card border border-line bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-display text-[15px] font-bold text-ink">{spec.title}</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {spec.shapes.map((s) => (
                      <span key={s} className="rounded-full border border-line bg-canvas px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                        {s === "BLOCK" ? "Blocks it happening" : "Alerts on drift"}
                      </span>
                    ))}
                  </div>
                </div>
                <div className={`shrink-0 font-display text-sm font-bold ${state.cls}`}>{state.label}</div>
              </div>

              <p className="mt-3 text-[13px] leading-relaxed text-ink-2">{spec.meaning}</p>
              <p className="mt-2 text-[12px] text-muted">{spec.where}</p>
              <p className="mt-1 text-[12px] text-muted">When it shipped: {spec.measured}</p>

              {findings.length > 0 && (
                <div className="mt-3 rounded-lg border border-conditional-ink/30 bg-conditional-bg p-3">
                  <div className="text-[12px] font-bold uppercase tracking-wide text-conditional-ink">Cases implicated</div>
                  <ul className="mt-1.5 space-y-1">
                    {findings.map((f) => (
                      <li key={f.key} className="text-[13px] text-ink">
                        <span className="font-mono text-[12px]">{f.case_number}</span> — {f.detail}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(result?.notEvaluated.length ?? 0) > 0 && (
                <div className="mt-3 rounded-lg border border-line bg-canvas p-3">
                  <div className="text-[12px] font-bold uppercase tracking-wide text-muted">Could not be evaluated (not counted as clean)</div>
                  <ul className="mt-1.5 space-y-1">
                    {result!.notEvaluated.map((n) => (
                      <li key={n} className="text-[13px] text-ink-2">{n}</li>
                    ))}
                  </ul>
                </div>
              )}

              {!isBuildOnly && sweep && findings.length === 0 && (
                <p className="mt-3 text-[13px] text-clear-ink">
                  Measured clean across {result?.casesScanned ?? sweep.cases_total} case(s) at {fmtWhen(sweep.ran_at)}.
                </p>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-5 text-[12px] leading-relaxed text-muted">
        Checks marked <b>Blocks it happening</b> refuse the action at the moment it would occur — a publish is
        refused, or the build fails. Checks marked <b>Alerts on drift</b> run nightly across every case and email
        you once per NEW finding; a finding you have already been told about stays listed here but does not page
        you again. A finding is never removed to make this page green — see the divergence law in
        docs/goldenCases.md.
      </p>
      {CHECK_BY_ID.size !== CHECKS.length && <p className="sr-only">registry mismatch</p>}
    </AdminShell>
  );
}
