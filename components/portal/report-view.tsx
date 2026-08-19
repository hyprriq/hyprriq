"use client";

import { useState } from "react";
import Link from "next/link";
import type { CaseDetail, Finding, ClientReport } from "@/lib/data/cases";
import { findingText, findingNotes } from "@/lib/portal/finding-view";
import { parseFindingStructure } from "@/lib/portal/findingStructure";
import { changeRequestOpen } from "@/lib/portal/changeRequest";
import type { Verdict } from "@/components/portal/badges";
import { isAssessmentArea } from "@/lib/constants/tracks";
import { splitHeadline, HEADLINE_QUALIFIER_LABEL } from "@/lib/portal/headlineParts";
import type { ClientCategoryCompliance } from "@/lib/portal/clientReport";

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
  // §2 — Track 6 is ADVISORY, not a sold assessment area (it is deliberately absent from the
  // canonical TrackKey union). Without this entry the list rendered the raw internal key
  // "category_compliance" to a paying Scale client.
  category_compliance: "Category compliance",
};

// ── §2 TRACK 6 — THE CATEGORY SECTION (founder-ruled 2026-08-18) ────────────────────────────
// TWO VISIBLY SEPARATE BLOCKS WITH SEPARATE ATTRIBUTION, AND THE BOUNDARY IS STRUCTURAL, NOT A
// DISCLAIMER: (a) what OUR RESEARCH found about this brand's categories, evidence-backed and
// confidence-qualified; (b) what OUR REFERENCE TABLE says that category generally involves —
// founder copy, code-owned, plainly not a finding about the client's product. A reader must never
// be able to mistake the second for the first, which a single block with a caveat line allows.
const CATEGORY_TABLE_LEAD = "From our category reference notes for this category:";
const CATEGORY_FOOTER =
  "Category requirements change frequently. Check the current marketplace policy before you commit inventory.";

function CategorySection({ data }: { data: ClientCategoryCompliance }) {
  return (
    <div className="mt-6">
      <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Category compliance</span>
      <div className="mt-2.5 rounded-card border border-line bg-surface p-5">
        <p className="text-[13px] text-muted">
          Advisory only — this section does not affect the verdict. It reflects the product categories our
          research associated with each brand, and what those categories generally involve.
        </p>
        {data.per_brand.map((b) => (
          <div key={b.brand} className="mt-4 border-t border-line pt-4 first:border-t-0">
            <div className="text-[14px] font-bold text-ink">{b.brand}</div>

            {/* BLOCK (a) — WHAT THE RESEARCH FOUND. */}
            {b.categories_found.length > 0 ? (
              b.categories_found.map((cat) => (
                <div key={`${b.brand}-${cat.category}-${cat.subcategory ?? ""}`} className="mt-2.5">
                  <div className="text-[13.5px] text-ink-2">
                    {cat.category}
                    {cat.subcategory ? <span className="text-muted"> · {cat.subcategory}</span> : null}
                    {cat.confidence ? (
                      <span className="ml-2 rounded-full bg-subtle px-2 py-0.5 text-[11px] font-semibold text-muted">
                        {cat.confidence} confidence
                      </span>
                    ) : null}
                  </div>
                  {/* The COUNT, never the evidence ids. */}
                  <div className="mt-0.5 text-[12px] text-muted">
                    {cat.evidence_count} {cat.evidence_count === 1 ? "source" : "sources"} considered
                  </div>

                  {/* BLOCK (b) — OUR REFERENCE TABLE. Separately attributed, visually inset. */}
                  {cat.flags.length > 0 && (
                    <div className="mt-2 rounded-card border border-line bg-subtle p-3.5">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{CATEGORY_TABLE_LEAD}</div>
                      {cat.flags.map((f) => (
                        <div key={`${f.subcategory}-${f.flag_language.slice(0, 24)}`} className="mt-2">
                          {/* flag_language is FOUNDER COPY, VERBATIM — never reworded here. */}
                          <p className="max-w-[68ch] font-reading text-[13.5px] leading-relaxed text-ink-2">{f.flag_language}</p>
                          {/* ⛔ The ATTENTION LABEL, never the raw risk_level. "HIGH" would claim
                              which category the product sits in — which, with no ASIN, we cannot know. */}
                          <div className="mt-1 text-[12px] text-muted">{f.attention}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              // EMPTY STATE — a brand our research could not place in a category. Said plainly:
              // absence is not an accusation, and it is not a gap in the report either.
              <p className="mt-2 text-[13px] text-muted">
                Our research did not associate this brand with a specific product category.
              </p>
            )}

            {b.brand_category_note ? (
              <p className="mt-2.5 max-w-[68ch] font-reading text-[13.5px] leading-relaxed text-ink-2">{b.brand_category_note}</p>
            ) : null}
          </div>
        ))}
        <p className="mt-4 border-t border-line pt-3 text-[12px] text-muted">{CATEGORY_FOOTER}</p>
      </div>
    </div>
  );
}

const CHIP_DEFS = {
  verified: "Independently corroborated — multiple independent sources confirm this.",
  assessed: "We evaluated the available evidence and formed a view, but could not independently corroborate it. A reasoned read, not an independent confirmation.",
  not_assessed: "We did not evaluate this area — for example, because no documents were provided. It neither raises nor lowers the verdict.",
} as const;

const HOW_TO_READ =
  "This report gives you one clear verdict, the single most important risk in plain language, findings across the assessment areas your plan includes, an honest split between what we confirmed and what we could not, and a short checklist to run before you commit. A few things worth knowing: the verdict is a position on a four-level scale, not a pass/fail — it reflects what the observable evidence supported at the time of research; “could not confirm” is not an accusation — it marks the limits of what public evidence shows; “not assessed” means we did not evaluate that area — it neither helps nor harms the verdict; the decision stays yours — a report is not a guarantee of an outcome; it tells you what the evidence supports.";

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
// Exported: the admin review screen renders the client text through the SAME presenter.
// §2 (readability pass): section labels are the reader's only anchor in a long finding — they
// render as real headings within the settled scale (display face, ink, hairline), not
// body-weight whispers. Sentence case via CSS so the engine's ALL-CAPS text is untouched.
export function FindingBody({ text }: { text: string }) {
  const blocks = parseFindingStructure(text);
  // Typography pass (founder-ruled 2026-08-14): finding prose reads in the reading serif at a
  // 68ch measure with open leading; section-label headings stay in the interface sans — they are
  // anchors, not prose. Sizes bumped 13→14.5 because the serif needs the reading size.
  return (
    <div className="mt-1 max-w-[68ch] space-y-2.5 font-reading">
      {blocks.map((b, i) => {
        if (b.type === "heading") {
          return (
            <div key={i} className="mt-3.5 border-b border-line pb-1 first:mt-0">
              <span className="font-sans text-[12.5px] font-bold tracking-wide text-ink">{b.text}</span>
            </div>
          );
        }
        if (b.type === "list") {
          return (
            <ul key={i} className="space-y-1.5">
              {b.items.map((item, j) => (
                <li key={j} className="flex gap-2 text-[14.5px] leading-[1.7] text-ink-2">
                  <span className="text-muted" aria-hidden>•</span>
                  <span className="min-w-0">{item}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="whitespace-pre-line text-[14.5px] leading-[1.7] text-ink-2">
            {b.text}
          </p>
        );
      })}
    </div>
  );
}

// `preview` — the admin review screen renders this component as the client-view working tool;
// portal-routed action links are hidden there (they belong to the client's session). Nothing
// else changes: preview mode is the same component over the same projection.
export function ReportView({ c, findings, report, preview = false }: { c: CaseDetail; findings: Finding[]; report: ClientReport | null; preview?: boolean }) {
  const [tab, setTab] = useState<TabKey>("findings");
  const [howtoOpen, setHowtoOpen] = useState(true);
  const meta = VERDICT_META[(c.verdict ?? "verify_before_purchase") as Verdict] ?? VERDICT_META.verify_before_purchase;
  const orderedFindings = findings; // data layer orders by area already
  // CONDITIONAL TABS (founder-approved 2026-08-14): an empty tab on a paid report is worse than
  // no tab — Checklist and Could-not-confirm render only when they carry content. Print output
  // inherits: an unrendered panel cannot print. The buttons vanish with the panels, so the tab
  // state can never reach a hidden tab.
  const hasChecklist = (report?.questions.length ?? 0) > 0;
  const hasHonesty = !!(report?.leading_interpretation || (report?.what_to_monitor.length ?? 0) > 0);
  // CLAIMS RULING 2026-08-14: the header states the ACTUAL count for this case, never hardcoded.
  // ── §2 FIX 2026-08-19: it counted RENDERED ROWS, so the moment Track 6 lands a Scale case reads
  // "The 6 assessment areas in this report" — and we sell five. Track 6 is ADVISORY and non-voting.
  // The count now derives from the canonical track registry (isAssessmentArea), which is a property
  // of the PRODUCT, not of this case: $99 → 3, $149/Growth/Scale → 5, and an advisory row never
  // moves the number at any tier.
  const areaFindings = orderedFindings.filter((f) => isAssessmentArea(f.track_key));
  const advisoryFindings = orderedFindings.filter((f) => !isAssessmentArea(f.track_key));
  // The projector emits `category_compliance` ONLY when it has real per-brand content, so a
  // missing block means "no category section" — never an empty bordered box, which on a paid
  // report reads as something that failed. Tier behaviour, checked at all four: $99 and Growth
  // have no Track 6 row at all, so this is null and nothing renders.
  const category = (advisoryFindings
    .map((f) => (f.compiled_findings_json as { category_compliance?: ClientCategoryCompliance } | null)?.category_compliance)
    .find(Boolean)) ?? null;
  const areasLabel = areaFindings.length === 5
    ? "The five assessment areas"
    : `The ${areaFindings.length} assessment areas in this report`;

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
              {/* VENDOR WEBSITE (founder-ruled 2026-08-18) — the client gave us this at submit and it
                  was never shown back. Rendered ONLY when supplied: an empty row is worse than none.
                  Not a link — the client typed it, we did not verify it, and a live anchor implies we
                  vouched for the destination. Plain text keeps the report's own attribution honest. */}
              {c.vendor_website ? (
                <div className="grid grid-cols-1 items-baseline gap-x-4 border-b border-line py-2 sm:grid-cols-[128px_minmax(0,1fr)]">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink-2">Website</span>
                  <span className="break-all text-[14px] text-ink-2">{c.vendor_website}</span>
                </div>
              ) : null}
              <div className="grid grid-cols-1 items-baseline gap-x-4 py-2 sm:grid-cols-[128px_minmax(0,1fr)]">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink-2">Delivered</span>
                <span className="font-mono text-[12.5px] text-ink">{fmt(c.delivered_at)}</span>
              </div>
            </div>
          </div>

          {/* ── §3 PART 2 — THE SUMMARY / AREAS ROW.
              WAS: equal halves with `items-stretch` (grid default), so the short column was
              stretched to the tall one and carried the difference as dead space below its last
              row. The imbalance is WORST at $99 (3 area rows against the summary) and least at
              Scale (6 rows) — a 50/50 split cannot be right at both.
              NOW: `items-start` lets each panel size to its own content at every tier, and the
              columns are weighted 1.35/1 because the summary is prose and the areas list is a
              short label column — equal halves gave the list width it never used.
              Re-looked AFTER the headline split (359a3c0) removed the run-on that was inflating
              the summary to roughly double its real length, per the ruling to fix that first. ── */}
          <div className="mt-5 grid items-start gap-5 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            {/* Summary — the engine's headline, unbounded, never truncated */}
            <div className="rounded-card border border-line bg-surface p-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Summary</span>
              {/* §3 — the headline is ONE engine string containing a claim and the condition on
                  that claim ("… — subject to verification of X"). Printed as one paragraph it
                  reads as a run-on, which is what the founder saw. Split at the engine's own seam
                  and typeset as two things. The qualifier is LOAD-BEARING — it changes the
                  meaning — so it is never dropped, only given its own line. */}
              {(() => {
                const { claim, qualifier } = splitHeadline(report?.headline ?? "");
                return (
                  <>
                    <p className="mt-2 font-display text-[16.5px] font-medium leading-relaxed text-ink">
                      {claim || "Your report is ready — the findings below carry the detail."}
                    </p>
                    {qualifier && (
                      <div className="mt-2.5 border-t border-line pt-2.5">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-muted">{HEADLINE_QUALIFIER_LABEL}</div>
                        <p className="mt-1 max-w-[68ch] font-reading text-[14px] leading-relaxed text-ink-2">{qualifier}</p>
                      </div>
                    )}
                  </>
                );
              })()}
              {hasChecklist && (
                <button type="button" onClick={() => setTab("checklist")} className="mt-3 text-[13px] font-semibold text-brand hover:text-brand-hover print:hidden">
                  What to verify first ↓
                </button>
              )}
            </div>
            {/* The five areas at a glance (the prototype's "key points" slot — see header note) */}
            <div className="rounded-card border border-line bg-surface p-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">{areasLabel}</span>
              <ul className="mt-2 space-y-1.5">
                {areaFindings.map((f) => {
                  const chip = areaChip(f);
                  return (
                    <li key={f.id} className="flex items-center justify-between gap-2 text-[13.5px] text-ink-2">
                      {AREA_NAMES[f.track_key] ?? f.track_key}
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${chip.cls}`}>{chip.label}</span>
                    </li>
                  );
                })}
                {/* ── §2: SIX ROWS, FIVE IN THE COUNT (founder-ruled). The advisory row is listed —
                    a Scale client paid for it and hiding it would make the differentiator invisible
                    — but it is visibly separated and labelled so it can never read as a sixth
                    assessment area. At $99 and Growth this list is empty and renders nothing: no
                    divider, no heading, no stray count. ── */}
                {advisoryFindings.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-2 border-t border-line pt-1.5 text-[13.5px] text-ink-2">
                    {AREA_NAMES[f.track_key] ?? f.track_key}
                    <span className="rounded-full bg-subtle px-2 py-0.5 text-[11px] font-semibold text-muted">Advisory</span>
                  </li>
                ))}
              </ul>
              {hasHonesty && (
                <button type="button" onClick={() => setTab("honesty")} className="mt-3 text-[13px] font-semibold text-brand hover:text-brand-hover print:hidden">
                  See what we could not confirm ↓
                </button>
              )}
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
          {/* Reading measure: this paragraph ran the full card width (~110+ characters a line). */}
          <p className="mt-2.5 max-w-[68ch] whitespace-pre-line font-reading text-[15px] leading-[1.7] text-ink-2">{report.the_real_risk}</p>
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
          {tabBtn("findings", "Findings", <span className="rounded-full bg-subtle px-1.5 py-0.5 text-[10.5px] font-bold text-ink-2">{areaFindings.length} areas</span>)}
          {hasHonesty && tabBtn("honesty", "Could not confirm", <span className="h-[7px] w-[7px] rounded-full bg-verify-ink" aria-hidden />)}
          {hasChecklist && tabBtn("checklist", "Checklist", <span className="rounded-full bg-subtle px-1.5 py-0.5 text-[10.5px] font-bold text-ink-2">{report!.questions.length}</span>)}
          {tabBtn("notes", "Notes")}
        </div>

        {/* FINDINGS */}
        <div role="tabpanel" className={panelCls("findings")}>
          <div className="hidden font-display text-[15px] font-semibold print:my-3 print:block">{areasLabel}</div>
          <div className="mt-3 overflow-hidden rounded-card border border-line bg-surface">
            {areaFindings.map((f) => {
              const { detail } = findingText(f);
              const notes = findingNotes(f);
              const chip = areaChip(f);
              const quiet = f.track_key === "documentation_review" || f.track_key === "sourcing_logic";
              return (
                // ── §3 PART 2 (2026-08-19) — THE DEAD RIGHT-HAND SIDE.
                // WAS: content `flex-1` (≈880px in a ~940px card) with prose capped at
                // `max-w-[68ch]` (≈520px) and the chip pinned to the far edge — so every card
                // carried ~350px of empty space between the text and the chip, on every row of
                // every report. THE MEASURE WAS NEVER THE PROBLEM; the column was.
                // NOW: an explicit two-column grid — the prose column IS the measure, and the
                // remainder is a real meta column that the chip AND the notes occupy, so the
                // space is used rather than reclaimed. Notes move out of the prose column for the
                // same reason: they are short labelled asides, not part of the reading measure.
                // Tier-independent by construction — this is per-row, so it balances identically
                // at 3 areas ($99), 5 (Growth/$149) and 5 + the advisory row (Scale).
                <div key={f.id} className="flex flex-col gap-2 border-b border-line px-5 py-3.5 last:border-b-0 sm:grid sm:grid-cols-[minmax(0,68ch)_minmax(160px,1fr)] sm:items-start sm:gap-6">
                  <div className="min-w-0">
                    <div className={`text-[14px] font-bold ${quiet ? "font-semibold text-ink-2" : "text-ink"}`}>
                      {AREA_NAMES[f.track_key] ?? f.track_key}
                      <span className="ml-1.5 cursor-help text-[12px] font-normal text-muted" title={AREA_DEFS[f.track_key] ?? ""}>ⓘ</span>
                    </div>
                    {detail && <FindingBody text={detail} />}
                  </div>
                  <div className="flex min-w-0 flex-col items-start gap-2 sm:pt-0.5">
                    <span className={`inline-flex shrink-0 cursor-help items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${chip.cls}`} title={chip.def}>
                      {chip.label}
                    </span>
                    {notes.map((n) => (
                      <div key={n.label} className="min-w-0">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{n.label}</div>
                        <div className="text-[12px] text-muted">{n.text}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[12px] text-muted">
            <b>Verified</b> — {CHIP_DEFS.verified} <b>Assessed</b> — {CHIP_DEFS.assessed} <b>Not assessed</b> — {CHIP_DEFS.not_assessed}
          </p>
          {/* §2 — Track 6 sits INSIDE the findings panel, after the five areas and after their
              chip legend: it is supporting detail on the same surface, not a peer of the verdict.
              Renders at $149/Scale only; null at $99 and Growth by construction. */}
          {category && <CategorySection data={category} />}
        </div>

        {/* COULD NOT CONFIRM — the honest split (rendered only with content; see hasHonesty) */}
        {hasHonesty && (
        <div role="tabpanel" className={panelCls("honesty")}>
          <div className="hidden font-display text-[15px] font-semibold print:my-3 print:block">What we confirmed — and what we could not</div>
          <div className="mt-3 rounded-card border border-line bg-surface p-5">
            <div className="flex items-center gap-2">
              <h4 className="text-[14px] font-bold text-ink">The reading, and its limits</h4>
              <span className="cursor-help text-[12px] text-muted" title="What we looked for but public evidence did not confirm. This marks the limits of the research — not a finding against the supplier. Absence of evidence is not evidence of a problem.">ⓘ</span>
            </div>
            {report?.leading_interpretation && (
              /* The one long unbroken block (AWI-2607-022): solved with measure (75→68ch), the
                 reading serif, and open leading — NOT by loosening the segmentation guards. */
              <p className="mt-2 max-w-[68ch] whitespace-pre-line font-reading text-[15px] leading-[1.7] text-ink-2">{report.leading_interpretation}</p>
            )}
            {report && report.what_to_monitor.length > 0 && (
              <div className="mt-4 border-t border-dashed border-line pt-3">
                <div className="text-[12px] font-semibold uppercase tracking-wide text-muted">What to monitor</div>
                <ul className="mt-1.5 max-w-[68ch] space-y-1.5">
                  {report.what_to_monitor.map((m, i) => (
                    <li key={i} className="flex gap-2 font-reading text-[14.5px] leading-[1.7] text-ink-2"><span className="text-muted">•</span>{m}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        )}

        {/* CHECKLIST — rendered only with content (see hasChecklist) */}
        {hasChecklist && (
        <div role="tabpanel" className={panelCls("checklist")}>
          <div className="hidden font-display text-[15px] font-semibold print:my-3 print:block">Verify before you commit</div>
          <div className="mt-3 rounded-card border border-line bg-surface px-5 py-2">
            <p className="py-2 text-[12.5px] text-ink-2">Put these to the supplier before you commit. Satisfactory answers do not guarantee marketplace acceptance.</p>
            <ol className="mb-2">
                {report!.questions.map((q, i) => (
                  <li key={i} className="flex items-start gap-3 border-t border-line py-2.5">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-tint text-[12.5px] font-bold text-brand-ink">{i + 1}</span>
                    <div className="min-w-0">
                      <div className="max-w-[68ch] font-reading text-[14.5px] leading-[1.7] text-ink">{q.question}</div>
                      {q.source === "additional" && (
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{QUESTION_SOURCE_LABEL.additional}</div>
                      )}
                    </div>
                  </li>
                ))}
            </ol>
          </div>
        </div>
        )}

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
        {!preview && (
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
        )}
      </div>
    </div>
  );
}
