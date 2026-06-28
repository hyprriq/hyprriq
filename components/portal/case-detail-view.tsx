"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusBadge, VerdictBadge, CertaintyBadge, type FindingCertainty } from "@/components/portal/badges";
import type { CaseDetail, Finding } from "@/lib/data/cases";
import { isResearchInProgress } from "@/lib/portal/case-status";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "evidence", label: "Evidence" },
  { key: "questions", label: "Questions to Ask" },
  { key: "timeline", label: "Timeline" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const DIMENSIONS: { track: keyof CaseDetail; name: string }[] = [
  { track: "track_1_status", name: "Supplier Identity" },
  { track: "track_2_status", name: "Supply Chain Relationship" },
  { track: "track_3_status", name: "Brand Risk Assessment" },
  { track: "track_4_status", name: "Documentation Review" },
  { track: "track_5_status", name: "Sourcing Logic" },
];

function dimStatus(s: string): { label: string; cls: string } {
  switch (s) {
    case "complete":
      return { label: "Complete", cls: "bg-clear-bg text-clear-ink" };
    case "manual_required":
      return { label: "In Review", cls: "bg-conditional-bg text-conditional-ink" };
    case "failed":
      return { label: "Unavailable", cls: "bg-deny-bg text-deny-ink" };
    case "skipped":
      return { label: "Skipped", cls: "bg-subtle text-muted" };
    default:
      return { label: "Queued", cls: "bg-subtle text-ink-2" };
  }
}

function fmt(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function findingText(f: Finding): { title: string; detail: string } {
  const j = (f.compiled_findings_json ?? f.ai_output_json ?? {}) as Record<string, unknown>;
  const title =
    (typeof j.title === "string" && j.title) ||
    (typeof j.heading === "string" && j.heading) ||
    f.track.replace("track_", "Dimension ");
  const detail =
    (typeof j.summary === "string" && j.summary) ||
    (typeof j.detail === "string" && j.detail) ||
    f.manual_notes ||
    "";
  return { title, detail };
}

function extractQuestions(findings: Finding[]): { text: string; why?: string }[] {
  const out: { text: string; why?: string }[] = [];
  for (const f of findings) {
    const j = (f.compiled_findings_json ?? f.ai_output_json ?? {}) as Record<string, unknown>;
    const qs = j.questions;
    if (Array.isArray(qs)) {
      for (const q of qs) {
        if (typeof q === "string") out.push({ text: q });
        else if (q && typeof q === "object") {
          const obj = q as Record<string, unknown>;
          if (typeof obj.text === "string") out.push({ text: obj.text, why: typeof obj.why === "string" ? obj.why : undefined });
          else if (typeof obj.question === "string") out.push({ text: obj.question, why: typeof obj.reason === "string" ? obj.reason : undefined });
        }
      }
    }
  }
  return out;
}

export function CaseDetailView({ c, findings }: { c: CaseDetail; findings: Finding[] }) {
  const [tab, setTab] = useState<TabKey>("overview");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // Live progress: while research is running, re-fetch the server component every 4s so dimensions
  // flip Queued → Complete and the verdict appears without a manual refresh. Stops at terminal states.
  useEffect(() => {
    if (!isResearchInProgress(c.status)) return;
    const t = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(t);
  }, [c.status, router]);

  const awaiting = c.status === "awaiting_client";
  const entered = c.brands_submitted ?? [];
  const detected = c.brands_from_ocr ?? [];
  const hasMismatch = detected.length > 0 && detected.join("|") !== entered.join("|");
  const questions = extractQuestions(findings);

  function confirmScope(brands: string[]) {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/cases/${c.id}/confirm-scope`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brands }),
      });
      if (!res.ok) {
        setError("Could not confirm scope. Please refresh and try again.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <nav className="mb-4 flex items-center gap-1.5 text-[13px] text-muted">
        <Link href="/portal/cases" className="hover:text-ink">My Cases</Link>
        <span>/</span>
        <span className="font-mono">{c.case_number}</span>
      </nav>

      {awaiting && (
        <div className="mb-6 flex gap-3 rounded-card border border-verify-ink/40 bg-verify-bg p-4">
          <div className="text-lg text-verify-ink" aria-hidden>⚠</div>
          <div className="flex-1">
            <div className="text-sm font-bold text-verify-ink">
              Action Required — {hasMismatch ? "Brand Mismatch Detected" : "Scope Confirmation Needed"}
            </div>
            <p className="mt-1 text-[14px] text-ink-2">
              {hasMismatch
                ? "We found a difference between the brands you entered and the brands detected in your uploaded document. Please confirm which brands to research."
                : "Please confirm the brand scope so we can begin research."}
            </p>
            {hasMismatch && (
              <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface p-3 text-[14px]">
                <div>
                  <div className="text-[12px] uppercase tracking-wide text-muted">You entered</div>
                  <div className="font-semibold text-ink">{entered.join(" • ") || "—"}</div>
                </div>
                <span className="text-muted" aria-hidden>→</span>
                <div>
                  <div className="text-[12px] uppercase tracking-wide text-muted">Document detected</div>
                  <div className="font-semibold text-ink">{detected.join(" • ") || "—"}</div>
                </div>
              </div>
            )}
            {error && <p className="mt-3 text-[14px] text-deny-ink">{error}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => confirmScope(entered)}
                className="rounded-lg bg-clear-ink px-3.5 py-2 text-[14px] font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                {pending ? "Confirming…" : `✓ Confirm ${entered.join(" & ") || "scope"} (original)`}
              </button>
              {hasMismatch && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => confirmScope(detected)}
                  className="rounded-lg border border-line bg-surface px-3.5 py-2 text-[14px] font-semibold text-ink-2 hover:bg-subtle disabled:opacity-60"
                >
                  Use document list ({detected.join(" & ")})
                </button>
              )}
            </div>
            <div className="mt-3 text-[13px] text-muted">⏱ SLA timer paused • Restarts once you confirm</div>
          </div>
        </div>
      )}

      <div className="mb-5">
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink">{c.vendor_name ?? "—"}</h2>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] text-muted">
          <span className="font-mono">{c.case_number}</span>
          <span className="h-1 w-1 rounded-full bg-line-strong" />
          <span>{fmt(c.created_at)}</span>
          {entered.length > 0 && (
            <>
              <span className="h-1 w-1 rounded-full bg-line-strong" />
              <span>{entered.join(", ")}</span>
            </>
          )}
        </div>
        <div className="mt-2 flex items-center gap-3">
          <StatusBadge status={c.status} />
          <VerdictBadge verdict={c.verdict} />
        </div>
      </div>

      <div className="mb-5 flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            aria-current={tab === t.key ? "true" : undefined}
            className={`-mb-px border-b-2 px-3.5 py-2.5 text-[14px] font-semibold transition-colors ${
              tab === t.key ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div>
          {awaiting ? (
            <div className="mb-5 rounded-lg border border-brand/30 bg-brand-tint px-4 py-3">
              <div className="text-[14px] font-semibold text-brand-ink">🔍 Research queued — confirm scope above to begin</div>
              <div className="mt-0.5 text-[13px] text-ink-2">All 5 dimensions will be researched once you confirm the brand list.</div>
            </div>
          ) : c.status === "delivered" || c.status === "complete" ? (
            <div className="mb-5 rounded-lg border border-clear-ink/30 bg-clear-bg px-4 py-3">
              <div className="text-[14px] font-semibold text-clear-ink">
                ✓ Report delivered{c.delivered_at ? ` on ${fmt(c.delivered_at)}` : ""}.
              </div>
              <div className="mt-0.5 text-[13px] text-ink-2">
                Your full verdict and evidence are below. Downloadable PDF export is coming soon.
              </div>
            </div>
          ) : null}
          <h3 className="mb-3 font-display text-sm font-bold text-ink">Research Dimensions</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {DIMENSIONS.map((d) => {
              const st = dimStatus(String(c[d.track]));
              return (
                <div key={d.name} className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3">
                  <span className="text-[14px] font-medium text-ink">{d.name}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${st.cls}`}>{st.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "evidence" && (
        <div className="overflow-hidden rounded-card border border-line bg-surface">
          {findings.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted">
              Evidence will appear here once research completes.
            </div>
          ) : (
            findings.map((f) => {
              const { title, detail } = findingText(f);
              const cert = (f.finding_certainty ?? "unknown") as FindingCertainty;
              return (
                <div key={f.id} className="flex items-start gap-3 border-b border-line p-4 last:border-b-0">
                  <div className="flex-1">
                    <div className="text-[14px] font-semibold text-ink">{title}</div>
                    {detail && <div className="mt-0.5 text-[13px] text-ink-2">{detail}</div>}
                  </div>
                  <CertaintyBadge certainty={cert} />
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === "questions" && (
        <div>
          <div className="mb-4 rounded-lg border border-brand/30 bg-brand-tint px-4 py-3 text-[14px] text-brand-ink">
            💬 Ask your supplier these before placing an order. Satisfactory answers do not guarantee invoice acceptance.
          </div>
          {questions.length === 0 ? (
            <div className="rounded-card border border-line bg-surface p-10 text-center text-sm text-muted">
              Supplier questions will appear here once research completes.
            </div>
          ) : (
            <div className="overflow-hidden rounded-card border border-line bg-surface">
              {questions.map((q, i) => (
                <div key={i} className="flex items-start gap-3 border-b border-line p-4 last:border-b-0">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-tint text-[13px] font-bold text-brand-ink">
                    {i + 1}
                  </span>
                  <div>
                    <div className="text-[14px] font-medium text-ink">{q.text}</div>
                    {q.why && <div className="mt-0.5 text-[13px] text-muted">{q.why}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "timeline" && (
        <Timeline c={c} />
      )}
    </div>
  );
}

function Timeline({ c }: { c: CaseDetail }) {
  const steps: { title: string; time: string; done: boolean; active?: boolean }[] = [
    { title: "Case submitted", time: fmt(c.created_at), done: true },
    { title: "Intake check complete", time: c.status === "pending_intake" ? "Pending" : fmt(c.created_at), done: c.status !== "pending_intake" },
  ];
  if (c.status === "awaiting_client") {
    steps.push({ title: "Scope confirmation requested", time: "SLA paused", done: false, active: true });
  }
  steps.push(
    { title: "Research", time: c.status === "research_running" ? "In progress" : c.delivered_at ? "Complete" : "Pending", done: !!c.delivered_at, active: c.status === "research_running" },
    { title: "Founder review", time: c.delivered_at ? "Complete" : "Pending", done: !!c.delivered_at },
    { title: "Report delivered", time: c.delivered_at ? fmt(c.delivered_at) : "Pending", done: !!c.delivered_at },
  );

  return (
    <div className="rounded-card border border-line bg-surface p-5">
      {steps.map((s, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span
              className={`mt-1 h-3 w-3 rounded-full ${
                s.done ? "bg-clear-ink" : s.active ? "bg-verify-ink" : "border-2 border-line bg-surface"
              }`}
            />
            {i < steps.length - 1 && <span className={`w-px flex-1 ${s.done ? "bg-clear-ink/40" : "bg-line"}`} />}
          </div>
          <div className={`pb-5 ${s.done || s.active ? "" : "opacity-60"}`}>
            <div className="text-[14px] font-semibold text-ink">{s.title}</div>
            <div className="text-[13px] text-muted">{s.time}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
