"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusBadge, VerdictBadge, CertaintyBadge, type FindingCertainty } from "@/components/portal/badges";
import type { CaseDetail, Finding } from "@/lib/data/cases";
import { findingText, findingNotes } from "@/lib/portal/finding-view";
import { isResearchInProgress, findingsVisibleToClient } from "@/lib/portal/case-status";

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

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };
const PRIORITY_CLS: Record<string, string> = {
  high: "bg-deny-bg text-deny-ink",
  medium: "bg-conditional-bg text-conditional-ink",
  low: "bg-subtle text-muted",
};

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

function extractQuestions(findings: Finding[]): { text: string; why?: string }[] {
  const out: { text: string; why?: string }[] = [];
  for (const f of findings) {
    // H5 — compiled findings only: the client Finding type no longer carries raw model output.
    const j = (f.compiled_findings_json ?? {}) as Record<string, unknown>;
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
  const router = useRouter();

  // Live progress: while research is running, re-fetch the server component every 4s so dimensions
  // flip Queued → Complete and the verdict appears without a manual refresh. Stops at terminal states.
  useEffect(() => {
    if (!isResearchInProgress(c.status)) return;
    const t = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(t);
  }, [c.status, router]);

  // Interim client guard (until Phase H): only show raw research findings/questions once the case is
  // delivered; before that the client sees a placeholder so unreviewed raw output is never exposed.
  // (The document-mismatch/scope-confirmation flow was REMOVED 2026-08-07, founder-ruled: the form
  // is authoritative; documents corroborate entity/address only. brands_from_ocr was never written.)
  const showFindings = findingsVisibleToClient(c.status);
  const entered = c.brands_submitted ?? [];
  // Track 2 rich questions (with priority); fall back to legacy compiled_findings_json questions.
  // Gated by the interim client guard — hidden until the case is delivered (raw research output).
  const richQuestions = showFindings
    ? findings.flatMap((f) => f.questions_to_ask ?? []).sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])
    : [];
  const legacyQuestions = showFindings ? extractQuestions(findings) : [];

  return (
    <div>
      <nav className="mb-4 flex items-center gap-1.5 text-[13px] text-muted">
        <Link href="/portal/cases" className="hover:text-ink">My Cases</Link>
        <span>/</span>
        <span className="font-mono">{c.case_number}</span>
      </nav>

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
          {/* PDF SEAM STUB (2026-07-30) — deliberately disabled. The report generator is the
              client-surface gate's deliverable; the named serialization seam is an admin route
              (GET /api/admin/cases/[id]/report over buildVerdictViewModel), and the CLIENT
              download will need its own client-scoped route in front of the same view-model —
              that fork is the gate's to rule. This button exists so the affordance has a home;
              it does nothing until the generator lands. */}
          {(c.status === "delivered" || c.status === "complete") && (
            <button
              type="button"
              disabled
              title="Report download is coming — your report is available on-screen below."
              className="cursor-not-allowed rounded-lg border border-line bg-subtle px-3 py-1.5 text-[13px] font-semibold text-muted"
            >
              Download PDF (coming soon)
            </button>
          )}
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
          {/* Spec-B — Identity clarification (name/website mismatch). A data-correction prompt, NOT a
              finding, so it shows as early as identity resolves (pre-delivery), regardless of status. */}
          {c.supplier_identity?.identity_discrepancy?.client_note && (
            <div className="mb-5 rounded-lg border border-conditional-ink/30 bg-conditional-bg px-4 py-3">
              <div className="text-[14px] font-semibold text-conditional-ink">⚠ Please confirm the supplier</div>
              <div className="mt-0.5 text-[13px] text-ink-2">{c.supplier_identity.identity_discrepancy.client_note}</div>
            </div>
          )}
          {c.status === "delivered" || c.status === "complete" ? (
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
          {/* H3 — honest scope note on delivered reports: which dimensions this report did not
              assess (plan-excluded or not yet available). Code-templated, client-language. */}
          {showFindings && DIMENSIONS.some((d) => String(c[d.track]) === "skipped") && (
            <p className="mt-3 text-[13px] text-muted">
              This report did not assess: {DIMENSIONS.filter((d) => String(c[d.track]) === "skipped").map((d) => d.name).join(", ")}.
              The verdict reflects only the dimensions marked Complete.
            </p>
          )}
        </div>
      )}

      {tab === "evidence" && (
        <div className="overflow-hidden rounded-card border border-line bg-surface">
          {!showFindings ? (
            <div className="p-10 text-center">
              <div className="text-sm font-semibold text-ink">Detailed research summary</div>
              <p className="mx-auto mt-1 max-w-md text-[13px] text-muted">
                Your full formatted report will be available here once your case has been completed and reviewed.
              </p>
            </div>
          ) : findings.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted">
              Evidence will appear here once research completes.
            </div>
          ) : (
            findings.map((f) => {
              const { title, detail } = findingText(f);
              const notes = findingNotes(f);
              const cert = (f.finding_certainty ?? "assessed") as FindingCertainty;
              return (
                <div key={f.id} className="flex items-start gap-3 border-b border-line p-4 last:border-b-0">
                  <div className="flex-1">
                    <div className="text-[14px] font-semibold text-ink">{title}</div>
                    {detail && <div className="mt-0.5 whitespace-pre-line text-[13px] text-ink-2">{detail}</div>}
                    {/* ADR-T2-002 — Track 2 boundary notes as separate labeled lines (decision separation) */}
                    {notes.map((n) => (
                      <div key={n.label} className="mt-2">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{n.label}</div>
                        <div className="text-[12px] text-muted">{n.text}</div>
                      </div>
                    ))}
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
          {richQuestions.length > 0 ? (
            <div className="overflow-hidden rounded-card border border-line bg-surface">
              {richQuestions.map((q, i) => (
                <div key={i} className="flex items-start gap-3 border-b border-line p-4 last:border-b-0">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-tint text-[13px] font-bold text-brand-ink">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-medium text-ink">{q.question}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PRIORITY_CLS[q.priority]}`}>{q.priority}</span>
                    </div>
                    {q.reason && <div className="mt-0.5 text-[13px] text-muted">{q.reason}</div>}
                  </div>
                </div>
              ))}
            </div>
          ) : legacyQuestions.length === 0 ? (
            <div className="rounded-card border border-line bg-surface p-10 text-center text-sm text-muted">
              Supplier questions will appear here once research completes.
            </div>
          ) : (
            <div className="overflow-hidden rounded-card border border-line bg-surface">
              {legacyQuestions.map((q, i) => (
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
