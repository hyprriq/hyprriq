import type { Metadata } from "next";
import Link from "next/link";
import { PageSection, RelatedLinks } from "@/components/marketing/page-shell";
import { VERDICT_COPY, VERDICT_SCALE_ORDER, AREA_NAMES, CHIP_DEFS } from "@/lib/content/reportCopy";
import { VERDICT_CLASSES } from "@/lib/design/palette";
import { SAMPLE_CASE_ID } from "@/lib/content/sampleIdentifiers";
import { areaSplitForPlan } from "@/lib/content/planFacts";
import { PLAN_NAME, PLAN_PRICE_LABEL } from "@/lib/constants/plans";
import {
  SAMPLE_PLAN, sampleMeta, sampleSummary, sampleRisk, sampleAreas, sampleNonVerdictArea,
  sampleInterpretation, sampleMonitor, sampleChecklist, sampleChecklistIntro, sampleNotes,
  sampleScopeNotes,
} from "@/lib/content/sampleReport";

// ── /sample-report — A REAL DELIVERED CASE, MASKED (founder ruling 1, 2026-08-24) ─────────────
//
// The page reads as THE DOCUMENT, not as web copy written about a document. Source, masking policy
// and the one flagged residual risk are all documented in lib/content/sampleReport.ts.
//
// THE CASE REFERENCE IS SAMPLE_CASE_ID, never the real one — the reserved AWI-SAMPLE-* series
// cannot collide with a generated case number by construction, and the build lock enforces it.
//
// THE PLAN LINE IS DERIVED. The founder asked for one line saying this is a Growth report showing
// all five areas while a single report answers three. Both numbers come from areaSplitForPlan()
// reading TRACK_CONFIG, so the sentence cannot drift from the ladder.

const VERDICT_KEY = "verify_before_purchase" as const;

export const metadata: Metadata = {
  title: "A Real Report, With the Names Taken Out | HyprrIQ",
  description:
    "A delivered HyprrIQ report with the supplier and brands masked — the verdict, every finding, what could not be confirmed, and the questions written for that supplier.",
  alternates: { canonical: "/sample-report" },
};

function Chip({ label }: { label: string }) {
  const tone =
    label === "Verified"
      ? "border-clear-ink/30 bg-clear-bg text-clear-ink"
      : label === "Not assessed"
        ? "border-line bg-subtle text-muted"
        : "border-line-strong bg-surface text-ink-2";
  return (
    <span className={`shrink-0 rounded-chip border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] ${tone}`}>
      {label}
    </span>
  );
}

export default function SampleReportPage() {
  const verdict = VERDICT_COPY[VERDICT_KEY];
  const v = VERDICT_CLASSES[VERDICT_KEY];
  const growth = areaSplitForPlan(SAMPLE_PLAN);
  const single = areaSplitForPlan("single_99");
  const totalAreas = growth.included.length + growth.excluded.length;

  return (
    <>
      <header className="border-b border-line bg-pale">
        <div className="mx-auto max-w-[1180px] px-5 py-12 sm:py-16 lg:px-10">
          <h1 className="max-w-[22ch] text-ink">A real report, with the names taken out</h1>
          <p className="mt-4 max-w-[62ch] text-[17px] leading-[1.55] text-ink-2 sm:text-[19px]">
            This is a report we delivered. The supplier and both brands are masked, and the case
            reference is illustrative. Nothing else has been changed — not the verdict, not a
            finding, and not the section listing what we could not confirm.
          </p>

          {/* The plan line the founder asked for. Both counts derived from the track registry. */}
          <p className="mt-5 max-w-[62ch] rounded-r-card border-l-2 border-action bg-mist px-4 py-3.5 text-[15px] leading-[1.6] text-ink-2 sm:text-[16px]">
            This is a <b className="font-semibold text-ink">{PLAN_NAME[SAMPLE_PLAN]}</b> report, so
            it shows all {totalAreas} assessment areas. A {PLAN_PRICE_LABEL.single_99}{" "}
            {PLAN_NAME.single_99.toLowerCase()} answers {single.included.length} of them.{" "}
            <Link href="/pricing" className="font-semibold text-action hover:text-anchor">
              See what each plan covers →
            </Link>
          </p>
        </div>
      </header>

      <PageSection tone="surface">
        {/* ── THE DOCUMENT ─────────────────────────────────────────────────────────────────── */}
        <article className="overflow-hidden rounded-card-lg border border-line bg-surface">
          <div className="flex flex-wrap gap-x-4 gap-y-1 border-b border-line bg-subtle px-4 py-3 font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted sm:px-6">
            <span>{SAMPLE_CASE_ID}</span>
            <span className="ml-auto">Delivered {sampleMeta.delivered}</span>
          </div>

          <div className="px-4 py-6 sm:px-6 sm:py-8">
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Supplier", sampleMeta.supplier],
                ["Brands in scope", sampleMeta.brands],
                ["Website", sampleMeta.website],
                ["Marketplace", sampleMeta.marketplace],
              ].map(([k, val]) => (
                <div key={k}>
                  <dt className="font-mono text-[9.5px] uppercase tracking-[0.13em] text-muted">{k}</dt>
                  <dd className="mt-1 text-[15px] font-semibold text-ink">{val}</dd>
                </div>
              ))}
            </dl>

            {/* Verdict */}
            <div className={`mt-7 rounded-card-lg p-5 ${v.bg}`}>
              <div className={`font-mono text-[10px] uppercase tracking-[0.14em] ${v.ink}`}>
                Level {verdict.level} of {VERDICT_SCALE_ORDER.length}
              </div>
              <p className={`mt-1.5 font-display text-[26px] font-medium leading-[1.1] tracking-[-0.02em] sm:text-[30px] ${v.ink}`}>
                {verdict.name}
              </p>
              <p className={`mt-2.5 max-w-[62ch] text-[15px] leading-[1.55] ${v.ink}`}>{verdict.means}</p>
            </div>

            <h2 className="mt-8 text-ink">Summary</h2>
            <p className="mt-2 max-w-[68ch] text-[16px] leading-[1.65] text-ink-2">{sampleSummary}</p>

            <h2 className="mt-8 text-ink">The single most important risk</h2>
            <p className="mt-2 max-w-[68ch] text-[16px] leading-[1.65] text-ink-2">{sampleRisk}</p>

            {/* Areas */}
            <h2 className="mt-9 text-ink">The {totalAreas} assessment areas</h2>
            <div className="mt-4 space-y-5">
              {sampleAreas.map((area) => (
                <section key={area.key} className="rounded-card border border-line p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-ink">{AREA_NAMES[area.key] ?? area.key}</h3>
                    <Chip label={area.chip} />
                  </div>
                  {area.blocks.map((b, i) => (
                    <div key={i} className="mt-3">
                      {b.heading && (
                        <p className="font-mono text-[9.5px] uppercase tracking-[0.13em] text-muted">
                          {b.heading}
                        </p>
                      )}
                      {b.body && (
                        <p className="mt-1.5 max-w-[68ch] text-[15px] leading-[1.62] text-ink-2">{b.body}</p>
                      )}
                      {b.bullets && (
                        <ul className="mt-1.5 max-w-[68ch] list-disc space-y-1.5 pl-5 text-[15px] leading-[1.62] text-ink-2">
                          {b.bullets.map((t) => (
                            <li key={t.slice(0, 40)}>{t}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                  {area.key === "supply_chain_relationship" && (
                    <div className="mt-4 space-y-2 border-t border-line pt-3">
                      {[sampleScopeNotes.identity, sampleScopeNotes.authorization, sampleScopeNotes.marketplace].map((n) => (
                        <p key={n.slice(0, 30)} className="max-w-[68ch] text-[13.5px] leading-[1.55] text-muted">
                          {n}
                        </p>
                      ))}
                    </div>
                  )}
                </section>
              ))}

              {/* The ruled non-voting emitter, under its own subhead — correct by design. */}
              <section className="rounded-card border border-line bg-canvas p-4 sm:p-5">
                <p className="font-mono text-[9.5px] uppercase tracking-[0.13em] text-muted">
                  Checks that don&rsquo;t affect the verdict
                </p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-ink">{AREA_NAMES[sampleNonVerdictArea.key]}</h3>
                  <Chip label={sampleNonVerdictArea.chip} />
                </div>
                <p className="mt-2 max-w-[68ch] text-[15px] leading-[1.62] text-ink-2">
                  {sampleNonVerdictArea.body}
                </p>
              </section>
            </div>

            {/* Certainty key */}
            <div className="mt-8 grid gap-3 rounded-card border border-line bg-canvas p-4 sm:grid-cols-3 sm:p-5">
              {([["Verified", CHIP_DEFS.verified], ["Assessed", CHIP_DEFS.assessed], ["Not assessed", CHIP_DEFS.not_assessed]] as const).map(
                ([label, def]) => (
                  <div key={label}>
                    <Chip label={label} />
                    <p className="mt-1.5 text-[13.5px] leading-[1.5] text-ink-2">{def}</p>
                  </div>
                ),
              )}
            </div>

            <h2 className="mt-9 text-ink">What we confirmed — and what we could not</h2>
            <p className="mt-2 max-w-[68ch] text-[16px] leading-[1.65] text-ink-2">{sampleInterpretation}</p>

            <h3 className="mt-6 text-ink">What to monitor</h3>
            <ul className="mt-2 max-w-[68ch] list-disc space-y-1.5 pl-5 text-[15px] leading-[1.62] text-ink-2">
              {sampleMonitor.map((m) => (
                <li key={m.slice(0, 40)}>{m}</li>
              ))}
            </ul>

            <h2 className="mt-9 text-ink">Verify before you commit</h2>
            <p className="mt-2 max-w-[68ch] text-[15px] text-ink-2">{sampleChecklistIntro}</p>
            <ol className="mt-4 max-w-[74ch] space-y-3">
              {sampleChecklist.map((q, i) => (
                <li key={q.slice(0, 40)} className="flex gap-3 border-b border-line pb-3 last:border-b-0">
                  <span className="mt-0.5 shrink-0 font-mono text-[12px] text-action">{i + 1}</span>
                  <span className="text-[15px] leading-[1.6] text-ink-2">{q}</span>
                </li>
              ))}
            </ol>

            <h3 className="mt-8 text-ink">{sampleNotes.heading}</h3>
            <p className="mt-2 max-w-[68ch] text-[15px] leading-[1.62] text-ink-2">{sampleNotes.body}</p>
            <p className="mt-4 max-w-[68ch] border-t border-line pt-4 text-[14px] leading-[1.6] text-muted">
              {sampleNotes.closing}
            </p>

            <p className="mt-6 font-mono text-[11.5px] text-muted">
              Masked demonstration of a delivered report. Supplier and brand names removed; the case
              reference is illustrative.
            </p>
          </div>
        </article>
      </PageSection>

      <PageSection tone="mist">
        <h2 className="text-ink">Why the masked parts are still readable</h2>
        <p className="mt-3 max-w-[68ch] text-[16px] leading-[1.65] text-ink-2">
          Every name is replaced consistently — the same supplier is{" "}
          <b className="font-semibold text-ink">[Supplier]</b> in all {sampleChecklist.length}{" "}
          questions and in every finding. What survives is the part you are buying: what was checked,
          what came back, what could not be established, and what to ask.
        </p>
        <RelatedLinks
          links={[
            { label: "How to read a report", href: "/how-to-read" },
            { label: "What we check", href: "/what-we-check" },
            { label: "Our method", href: "/method" },
            { label: "Pricing", href: "/pricing" },
          ]}
        />
      </PageSection>
    </>
  );
}
