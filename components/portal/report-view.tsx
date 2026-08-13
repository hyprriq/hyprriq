"use client";

import { useState } from "react";
import Link from "next/link";
import type { CaseDetail, Finding, ClientReport } from "@/lib/data/cases";
import { findingText, findingNotes } from "@/lib/portal/finding-view";
import { parseFindingStructure } from "@/lib/portal/findingStructure";
import { changeRequestOpen } from "@/lib/portal/changeRequest";
import type { Verdict } from "@/components/portal/badges";

// ── THE REPORT (full-build brief §1–§3, approved prototype public/prototype/client/report.html) —
// decision-first, engine's words. STRUCTURAL RULES (§5): the decision layer (identity, summary,
// verdict scale, the single most important risk) is NEVER tabbed; only supporting depth is tabbed
// (Findings · Could not confirm · Checklist · Notes); the four-level scale renders as a scale
// with the verdict's position; Verified/Assessed carry definitions; print is a flat document
// (all panels rendered, inactive ones hidden with CSS so print shows everything).
// CONTENT RULES: every content panel renders live engine output through the §2 projection —
// M9 headline (UNBOUNDED, never truncated), the real risk, leading interpretation, what to
// monitor, filtered M8 questions + analyst-added. Only static UI copy (definitions, how-to-read,
// disclaimer) comes from the prototype. NOT implemented from the prototype, by ruling: ASIN rows
// (KEEPA_LIVE false), working Download PDF (disabled affordance), the "Key points confirmed"
// list (no structured engine source — the five-areas-at-a-glance list renders instead). ──

type VerdictMeta = { name: string; level: number; ink: string; bg: string; means: string };
const VERDICT_META: Record<string, VerdictMeta> = {
  source_clear: {
    name: "Source Clear", level: 1, ink: "text-clear-ink", bg: "bg-clear-bg",
    means: "The evidence supported this source at the time of research. Standard diligence still applies — the decision stays yours.",
  },
  usable_with_conditions: {
    name: "Usable With Conditions", level: 2, ink: "text-conditional-ink", bg: "bg-conditional-bg",
    means: "Workable — with the stated conditions handled first. The conditions are part of the verdict, not a footnote.",
  },
  verify_before_purchase: {
    name: "Verify Before Purchase", level: 3, ink: "text-verify-ink", bg: "bg-verify-bg",
    means: "Do not place a large order — resolve the listed items first. Re-submit for an updated review once resolved.",
  },
  do_not_rely: {
    name: "Do Not Rely", level: 4, ink: "text-deny-ink", bg: "bg-deny-bg",
    means: "The evidence does not support relying on this source. The report explains what drove this.",
  },
};

const VERDICT_TOOLTIP =
  "The verdict is one of four levels, strongest to weakest: Source Clear, Usable With Conditions, Verify Before Purchase, Do Not Rely. It reflects what the observable evidence supported at the time of research — not a guarantee. The verdict is the recommendation.";

const AREA_DEFS: Record<string, string> = {
  supplier_identity: "Whether the supplier is a real, verifiable wholesale business.",
  supply_chain_relationship: "Whether the supplier credibly sources the brands in scope, and whether an authorization link could be confirmed.",
  brand_risk_assessment: "The brands' reseller environment and any enforcement signals against resellers of this profile.",
  documentation_review: "What any documents you provided corroborate. Documents can add support but never raise the verdict above what the research on its own supports.",
  sourcing_logic: "A consistency check across the assessed areas. Informational — it does not change the verdict.",
};

const AREA_NAMES: Record<string, string> = {
  supplier_identity: "Supplier Legitimacy",
  supply_chain_relationship: "Supply-Chain Relationship",
  brand_risk_assessment: "Brand Risk",
  documentation_review: "Documentation Review",
  sourcing_logic: "Sourcing Logic",
};

const CHIP_DEFS = {
  verified: "Independently corroborated — multiple independent sources confirm this.",
  assessed: "We evaluated the available evidence and formed a view, but could not independently corroborate it. A reasoned read, not an independent confirmation.",
  not_assessed: "We did not evaluate this area — for example, because no documents were provided. It neither raises nor lowers the verdict.",
} as const;

const HOW_TO_READ =
  "This report gives you one clear verdict, the single most important risk in plain language, findings across five assessment areas, an honest split between what we confirmed and what we could not, and a short checklist to run before you commit. A few things worth knowing: the verdict is a position on a four-level scale, not a pass/fail — it reflects what the observable evidence supported at the time of research; “could not confirm” is not an accusation — it marks the limits of what public evidence shows; “not assessed” means we did not evaluate that area — it neither helps nor harms the verdict; the decision stays yours — a report is not a guarantee of an outcome; it tells you what the evidence supports.";

const QUESTION_SOURCE_LABEL = { system: "From our research", additional: "From our review team" } as const;

type TabKey = "findings" | "honesty" | "checklist" | "notes";

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function areaChip(f: Finding): { label: string; cls: string; def: string } {
  if (f.track_key === "sourcing_logic") return { label: "Informational", cls: "bg-subtle text-muted", def: AREA_DEFS.sourcing_logic };
  const j = (f.compiled_findings_json ?? {}) as Record<string, unknown>;
  const notAssessed = typeof j.summary === "string" && /not (?:assessed|evaluated)|no documents were provided/i.test(j.summary) && f.track_key === "documentation_review";
  if (notAssessed || (f.track_key === "documentation_review" && !j.documentation_finding && typeof j.summary === "string" && /excluded from scoring/.test(j.summary))) {
    return { label: "Not assessed", cls: "bg-subtle text-muted", def: CHIP_DEFS.not_assessed };
  }
  return f.finding_certainty === "verified"
    ? { label: "Verified", cls: "bg-clear-bg text-clear-ink", def: CHIP_DEFS.verified }
    : { label: "Assessed", cls: "bg-conditional-bg text-conditional-ink", def: CHIP_DEFS.assessed };
}

// Item-3 readability (2026-08-13): render the structure the engine already writes — labeled
// sections as headed blocks, numbered points as lists. Presentation only; the parser is
// lossless (findingStructure.test.ts) and structureless text renders as prose unchanged.
function FindingBody({ text }: { text: string }) {
  const blocks = parseFindingStructure(text);
  return (
    <div className="mt-1 max-w-[70ch] space-y-2">
      {blocks.map((b, i) => {
        if (b.type === "heading") {
          return (
            <div key={i} className="pt-1 text-[11px] font-bold uppercase tracking-wider text-muted">
              {b.text}
            </div>
          );
        }
        if (b.type === "list") {
          return (
            <ul key={i} className="space-y-1">
              {b.items.map((item, j) => (
                <li key={j} className="flex gap-2 text-[13px] leading-relaxed text-ink-2">
                  <span className="text-muted" aria-hidden>•</span>
                  <span className="min-w-0">{item}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="whitespace-pre-line text-[13px] leading-relaxed text-ink-2">
            {b.text}
          </p>
        );
      })}
    </div>
  );
}

export function ReportView({ c, findings, report }: { c: CaseDetail; findings: Finding[]; report: ClientReport | null }) {
  const [tab, setTab] = useState<TabKey>("findings");
  const [howtoOpen, setHowtoOpen] = useState(true);
  const meta = VERDICT_META[(c.verdict ?? "verify_before_purchase") as Verdict] ?? VERDICT_META.verify_before_purchase;
  const orderedFindings = findings; // data layer orders by area already

  const tabBtn = (key: TabKey, label: string, extra?: React.ReactNode) => (
    <button
      key={key}
      type="button"
      role="tab"
      aria-selected={tab === key}
      onClick={() => setTab(key)}
      className={`inline-flex min-h-[42px] items-center gap-2 rounded-full border px-4 text-[13.5px] font-semibold print:hidden ${
        tab === key ? "border-brand bg-brand text-white" : "border-line-strong bg-surface text-ink-2 hover:bg-subtle"
      }`}
    >
      {extra}
      {label}
    </button>
  );

  const panelCls = (key: TabKey) => `${tab === key ? "" : "hidden"} print:block`;

  return (
    <div>
      {/* ════ ALWAYS VISIBLE · THE DECISION ════ */}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0">
          {/* identity panel — right report, right supplier, right products, at a glance */}
          <div className="overflow-hidden rounded-card border border-line bg-surface">
            <div className="flex items-center gap-2.5 border-b border-line bg-subtle px-5 py-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-2">Research report</span>
              <span className="ml-auto font-mono text-[12px] text-muted">{c.case_number}</span>
            </div>
            <div className="px-5 pb-3.5 pt-1.5">
              <div className="grid grid-cols-1 items-baseline gap-x-4 border-b border-line py-2 sm:grid-cols-[128px_minmax(0,1fr)]">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink-2">Supplier</span>
                <h2 className="font-display text-[21px] font-semibold tracking-tight text-ink">{c.vendor_name ?? "—"}</h2>
              </div>
              <div className="grid grid-cols-1 items-baseline gap-x-4 border-b border-line py-2 sm:grid-cols-[128px_minmax(0,1fr)]">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink-2">Brands in scope</span>
                <span className="text-[14.5px] font-semibold text-ink">{(c.brands_submitted ?? []).join(" · ") || "—"}</span>
              </div>
              <div className="grid grid-cols-1 items-baseline gap-x-4 py-2 sm:grid-cols-[128px_minmax(0,1fr)]">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink-2">Delivered</span>
                <span className="font-mono text-[12.5px] text-ink">{fmt(c.delivered_at)}</span>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {/* Summary — the engine's headline, unbounded, never truncated */}
            <div className="rounded-card border border-line bg-surface p-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Summary</span>
              <p className="mt-2 font-display text-[16.5px] font-medium leading-relaxed text-ink">
                {report?.headline || "Your report is ready — the findings below carry the detail."}
              </p>
              <button type="button" onClick={() => setTab("checklist")} className="mt-3 text-[13px] font-semibold text-brand hover:text-brand-hover print:hidden">
                What to verify first ↓
              </button>
            </div>
            {/* The five areas at a glance (the prototype's "key points" slot — see header note) */}
            <div className="rounded-card border border-line bg-surface p-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">The five assessment areas</span>
              <ul className="mt-2 space-y-1.5">
                {orderedFindings.map((f) => {
                  const chip = areaChip(f);
                  return (
                    <li key={f.id} className="flex items-center justify-between gap-2 text-[13.5px] text-ink-2">
                      {AREA_NAMES[f.track_key] ?? f.track_key}
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${chip.cls}`}>{chip.label}</span>
                    </li>
                  );
                })}
              </ul>
              <button type="button" onClick={() => setTab("honesty")} className="mt-3 text-[13px] font-semibold text-brand hover:text-brand-hover print:hidden">
                See what we could not confirm ↓
              </button>
            </div>
          </div>
        </div>

        {/* Verdict card — the four-level scale WITH position, never an isolated badge */}
        <div className="rounded-card border border-line bg-surface p-5">
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${meta.ink}`}>Verdict</span>
            <span className="cursor-help text-[12px] text-muted" title={VERDICT_TOOLTIP}>ⓘ</span>
          </div>
          <div className={`mt-2 font-display text-[25px] font-semibold leading-tight tracking-tight ${meta.ink}`}>{meta.name}</div>
          <div className="mt-1.5 text-[12.5px] text-ink-2">Level {meta.level} of 4</div>
          <div className="mt-3.5 flex gap-1" role="img" aria-label={`Verdict position: level ${meta.level} of 4 on the ranked scale`}>
            {(["source_clear", "usable_with_conditions", "verify_before_purchase", "do_not_rely"] as const).map((v) => (
              <span
                key={v}
                className={`h-[7px] flex-1 rounded ${VERDICT_META[v].bg} ${VERDICT_META[v].level === meta.level ? `opacity-100 outline outline-2 outline-offset-1 outline-ink ${VERDICT_META[v].ink}` : "opacity-40"}`}
              />
            ))}
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] text-muted"><span>Source Clear</span><span>Do Not Rely</span></div>
          <p className="mt-3 text-[13px] leading-relaxed text-ink-2">{meta.means}</p>
          <button
            type="button"
            disabled
            title="Report download is coming — your full report is on this page."
            className="mt-4 w-full cursor-not-allowed rounded-lg border border-line bg-subtle px-3 py-2 text-[13px] font-semibold text-muted print:hidden"
          >
            Download PDF (coming soon)
          </button>
        </div>
      </div>

      {/* ════ ALWAYS VISIBLE · THE SINGLE MOST IMPORTANT RISK ════ */}
      {report?.the_real_risk && (
        <div className="mt-6 rounded-card border border-line border-l-4 border-l-verify-ink bg-surface p-6">
          <h3 className="font-display text-[17px] font-bold text-ink">The single most important risk</h3>
          <p className="mt-2.5 whitespace-pre-line text-[14px] leading-relaxed text-ink-2">{report.the_real_risk}</p>
        </div>
      )}

      {/* how to read — dismissible, on every report; final founder copy */}
      <div className="mt-6 print:hidden">
        {howtoOpen ? (
          <div className="flex items-start gap-3 rounded-card border border-line bg-brand-tint/60 p-4">
            <p className="flex-1 text-[13px] leading-relaxed text-ink-2">
              <b className="text-ink">How to read this report.</b> {HOW_TO_READ}
            </p>
            <button type="button" onClick={() => setHowtoOpen(false)} className="shrink-0 rounded-lg px-2.5 py-1 text-[12.5px] font-semibold text-brand hover:bg-subtle">
              Got it — hide this
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setHowtoOpen(true)} className="text-[12.5px] font-semibold text-brand hover:text-brand-hover">
            How to read this report
          </button>
        )}
      </div>

      {/* ════ CASE PROGRESS ════ */}
      <div className="mt-6 rounded-card border border-line bg-surface px-5 py-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Submitted", sub: fmt(c.created_at) },
            { label: "Researching", sub: "" },
            { label: "In review", sub: "" },
            { label: "Delivered", sub: fmt(c.delivered_at) },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-clear-bg text-clear-ink">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 6 9 17l-5-5" /></svg>
              </span>
              <span className="text-[13px] font-semibold text-ink">{s.label}</span>
              {s.sub && <span className="font-mono text-[11px] text-muted">{s.sub}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* ════ DEPTH — TABBED (supporting detail only; print renders all) ════ */}
      <div className="mt-6">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted">The full detail</span>
        <div className="mt-2.5 flex flex-wrap gap-2" role="tablist" aria-label="Report detail">
          {tabBtn("findings", "Findings", <span className="rounded-full bg-subtle px-1.5 py-0.5 text-[10.5px] font-bold text-ink-2">{orderedFindings.length} areas</span>)}
          {tabBtn("honesty", "Could not confirm", <span className="h-[7px] w-[7px] rounded-full bg-verify-ink" aria-hidden />)}
          {tabBtn("checklist", "Checklist", report ? <span className="rounded-full bg-subtle px-1.5 py-0.5 text-[10.5px] font-bold text-ink-2">{report.questions.length}</span> : null)}
          {tabBtn("notes", "Notes")}
        </div>

        {/* FINDINGS */}
        <div role="tabpanel" className={panelCls("findings")}>
          <div className="hidden font-display text-[15px] font-semibold print:my-3 print:block">The five assessment areas</div>
          <div className="mt-3 overflow-hidden rounded-card border border-line bg-surface">
            {orderedFindings.map((f) => {
              const { detail } = findingText(f);
              const notes = findingNotes(f);
              const chip = areaChip(f);
              const quiet = f.track_key === "documentation_review" || f.track_key === "sourcing_logic";
              return (
                <div key={f.id} className="flex flex-col gap-2 border-b border-line px-5 py-3.5 last:border-b-0 sm:flex-row sm:items-start sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <div className={`text-[14px] font-bold ${quiet ? "font-semibold text-ink-2" : "text-ink"}`}>
                      {AREA_NAMES[f.track_key] ?? f.track_key}
                      <span className="ml-1.5 cursor-help text-[12px] font-normal text-muted" title={AREA_DEFS[f.track_key] ?? ""}>ⓘ</span>
                    </div>
                    {detail && <FindingBody text={detail} />}
                    {notes.map((n) => (
                      <div key={n.label} className="mt-2">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{n.label}</div>
                        <div className="text-[12px] text-muted">{n.text}</div>
                      </div>
                    ))}
                  </div>
                  <span className={`inline-flex shrink-0 cursor-help items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${chip.cls}`} title={chip.def}>
                    {chip.label}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[12px] text-muted">
            <b>Verified</b> — {CHIP_DEFS.verified} <b>Assessed</b> — {CHIP_DEFS.assessed} <b>Not assessed</b> — {CHIP_DEFS.not_assessed}
          </p>
        </div>

        {/* COULD NOT CONFIRM — the honest split */}
        <div role="tabpanel" className={panelCls("honesty")}>
          <div className="hidden font-display text-[15px] font-semibold print:my-3 print:block">What we confirmed — and what we could not</div>
          <div className="mt-3 rounded-card border border-line bg-surface p-5">
            <div className="flex items-center gap-2">
              <h4 className="text-[14px] font-bold text-ink">The reading, and its limits</h4>
              <span className="cursor-help text-[12px] text-muted" title="What we looked for but public evidence did not confirm. This marks the limits of the research — not a finding against the supplier. Absence of evidence is not evidence of a problem.">ⓘ</span>
            </div>
            {report?.leading_interpretation ? (
              <p className="mt-2 max-w-[75ch] whitespace-pre-line text-[14px] leading-relaxed text-ink-2">{report.leading_interpretation}</p>
            ) : (
              <p className="mt-2 text-[13px] text-muted">The findings above carry what was and was not confirmed for this case.</p>
            )}
            {report && report.what_to_monitor.length > 0 && (
              <div className="mt-4 border-t border-dashed border-line pt-3">
                <div className="text-[12px] font-semibold uppercase tracking-wide text-muted">What to monitor</div>
                <ul className="mt-1.5 space-y-1.5">
                  {report.what_to_monitor.map((m, i) => (
                    <li key={i} className="flex gap-2 text-[13.5px] leading-relaxed text-ink-2"><span className="text-muted">•</span>{m}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* CHECKLIST — the questions to put to the supplier */}
        <div role="tabpanel" className={panelCls("checklist")}>
          <div className="hidden font-display text-[15px] font-semibold print:my-3 print:block">Verify before you commit</div>
          <div className="mt-3 rounded-card border border-line bg-surface px-5 py-2">
            <p className="py-2 text-[12.5px] text-ink-2">Put these to the supplier before you commit. Satisfactory answers do not guarantee marketplace acceptance.</p>
            {report && report.questions.length > 0 ? (
              <ol className="mb-2">
                {report.questions.map((q, i) => (
                  <li key={i} className="flex items-start gap-3 border-t border-line py-2.5">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-tint text-[12.5px] font-bold text-brand-ink">{i + 1}</span>
                    <div className="min-w-0">
                      <div className="text-[13.5px] leading-relaxed text-ink">{q.question}</div>
                      {q.source === "additional" && (
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{QUESTION_SOURCE_LABEL.additional}</div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mb-2 border-t border-line py-3 text-[13px] text-muted">No supplier questions were recorded for this report.</p>
            )}
          </div>
        </div>

        {/* NOTES */}
        <div role="tabpanel" className={panelCls("notes")}>
          <div className="hidden font-display text-[15px] font-semibold print:my-3 print:block">Notes</div>
          <div className="mt-3 rounded-card border border-line bg-surface p-5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted">Category requirements</div>
            <p className="mt-2 max-w-[66ch] text-[14px] leading-relaxed text-ink-2">
              Selling these brands in their marketplace categories may require category approval or specific documentation before listing.
              This is a marketplace requirement independent of this report&rsquo;s verdict — confirm your category status before you commit.
            </p>
          </div>
        </div>
      </div>

      {/* ════ CLOSING ════ */}
      <div className="mt-8">
        <p className="text-[12.5px] leading-relaxed text-muted">
          This report reflects observable evidence available at the time of research. It is not a guarantee of marketplace approval,
          account safety, or brand action. The decision to purchase is yours.
        </p>
        <div className="mt-2 font-mono text-[11px] uppercase tracking-wide text-muted">
          {c.case_number} · {c.vendor_name ?? ""} {c.delivered_at ? `· delivered ${fmt(c.delivered_at)}` : ""}
        </div>
        <div className="mt-4 flex flex-wrap gap-2.5 print:hidden">
          <Link href="/portal/help" className="rounded-lg border border-line bg-surface px-4 py-2 text-[13px] font-semibold text-ink-2 hover:bg-subtle">
            Ask about this report
          </Link>
          {changeRequestOpen(c) && (
            <Link href={`/portal/cases/${c.id}/change`} className="rounded-lg border border-line bg-surface px-4 py-2 text-[13px] font-semibold text-ink-2 hover:bg-subtle">
              Request a change (one included, 7-day window)
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
