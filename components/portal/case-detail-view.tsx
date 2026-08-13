"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/portal/badges";
import type { CaseDetail, Finding, ClientReport } from "@/lib/data/cases";
import { isResearchInProgress } from "@/lib/portal/case-status";
import { ReportView } from "@/components/portal/report-view";

// ── CASE PAGE (full-build 2026-08-13, approved prototype structure) — two shapes:
// DELIVERED → the report (components/portal/report-view.tsx — decision-first, engine's words).
// ACTIVE → the case-active structure: head, 4-step tracker, "About this case" rows.
// NOT implemented from the prototype, BY RULING: the entire scope-confirmation flow ("Confirm
// the scope so research can continue", mismatch card, "Action needed", "SLA paused", the paused
// tracker step, every "clock pauses/resumes" sentence). Documents corroborate entity/address
// only; the form is authoritative — that flow was deliberately excised from the app and must
// not return. The old Overview/Evidence/Questions/Timeline tab set retires with this pass. ──

function fmt(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

type StepState = "done" | "now" | "todo";

function trackerSteps(c: CaseDetail): { label: string; sub: string; state: StepState }[] {
  const delivered = !!c.delivered_at || c.status === "delivered" || c.status === "complete";
  const inReview = ["awaiting_review", "manual_override_required", "qa_in_progress", "approved"].includes(c.status);
  const researching = isResearchInProgress(c.status) && !inReview;
  return [
    { label: "Submitted", sub: fmt(c.created_at), state: "done" },
    { label: "Researching", sub: "", state: delivered || inReview ? "done" : researching ? "now" : "todo" },
    { label: "In review", sub: "", state: delivered ? "done" : inReview ? "now" : "todo" },
    { label: "Delivered", sub: fmt(c.delivered_at), state: delivered ? "done" : "todo" },
  ];
}

export function CaseDetailView({ c, findings, report }: { c: CaseDetail; findings: Finding[]; report: ClientReport | null }) {
  const router = useRouter();

  // Live progress: while research runs, re-fetch so the tracker advances and the report appears
  // without a manual refresh. Stops at terminal states.
  useEffect(() => {
    if (!isResearchInProgress(c.status)) return;
    const t = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(t);
  }, [c.status, router]);

  const delivered = c.status === "delivered" || c.status === "complete";

  return (
    <div>
      <nav className="mb-4 flex items-center gap-1.5 text-[13px] text-muted" aria-label="Breadcrumb">
        <Link href="/portal/cases" className="font-medium text-ink-2 hover:text-ink">Reports</Link>
        <span aria-hidden>/</span>
        <span className="font-mono text-[12px]">{c.case_number}</span>
      </nav>

      {delivered ? (
        <ReportView c={c} findings={findings} report={report} />
      ) : (
        <ActiveCase c={c} />
      )}
    </div>
  );
}

function ActiveCase({ c }: { c: CaseDetail }) {
  const steps = trackerSteps(c);
  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-ink">{c.vendor_name ?? "—"}</h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] text-muted">
            <span>{(c.brands_submitted ?? []).join(" · ") || "—"}</span>
            <span className="h-1 w-1 rounded-full bg-line-strong" aria-hidden />
            <span className="font-mono">Submitted {fmt(c.created_at)}</span>
          </div>
        </div>
        <StatusBadge status={c.status} />
      </div>

      {/* Spec-B — identity clarification (data correction, not a finding); live behavior preserved. */}
      {c.supplier_identity?.identity_discrepancy?.client_note && (
        <div className="mt-5 rounded-lg border border-conditional-ink/30 bg-conditional-bg px-4 py-3">
          <div className="text-[14px] font-semibold text-conditional-ink">Please confirm the supplier</div>
          <div className="mt-0.5 text-[13px] text-ink-2">{c.supplier_identity.identity_discrepancy.client_note}</div>
        </div>
      )}

      <h3 className="mb-3 mt-7 font-display text-sm font-bold text-ink">Where this case stands</h3>
      <div className="rounded-card border border-line bg-surface px-5 py-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {steps.map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <span
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                  s.state === "done" ? "bg-clear-bg text-clear-ink" : s.state === "now" ? "bg-brand-tint text-brand" : "border-2 border-line bg-surface"
                }`}
              >
                {s.state === "done" && (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 6 9 17l-5-5" /></svg>
                )}
                {s.state === "now" && <span className="h-2 w-2 rounded-full bg-brand" aria-hidden />}
              </span>
              <span className={`text-[13px] font-semibold ${s.state === "todo" ? "text-muted" : "text-ink"}`}>{s.label}</span>
              {s.sub && <span className="font-mono text-[11px] text-muted">{s.sub}</span>}
            </div>
          ))}
        </div>
        <p className="mt-3 text-[13px] text-muted">
          Every report is reviewed by a human analyst before delivery, and you&rsquo;ll get an email when it&rsquo;s ready.
        </p>
      </div>

      <h3 className="mb-3 mt-7 font-display text-sm font-bold text-ink">About this case</h3>
      <div className="overflow-hidden rounded-card border border-line bg-surface">
        <Link href="/portal/help#guides" className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5 hover:bg-subtle">
          <div>
            <div className="text-[14px] font-semibold text-ink">What the report will cover</div>
            <div className="text-[13px] text-muted">The five assessment areas, in plain language</div>
          </div>
          <span className="text-muted" aria-hidden>›</span>
        </Link>
        <Link href="/portal/support" className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-subtle">
          <div>
            <div className="text-[14px] font-semibold text-ink">Question about this case?</div>
            <div className="text-[13px] text-muted">Message support — include the case ID</div>
          </div>
          <span className="text-muted" aria-hidden>›</span>
        </Link>
      </div>
    </div>
  );
}
