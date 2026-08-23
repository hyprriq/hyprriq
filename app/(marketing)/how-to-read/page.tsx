import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/marketing/reveal";
import {
  HOW_TO_READ, VERDICT_COPY, VERDICT_SCALE_ORDER, AREA_NAMES, AREA_DEFS, CHIP_DEFS, CLOSING_STATEMENT,
} from "@/lib/content/reportCopy";
import { verdicts, verdictDisclaimer } from "@/lib/content/help";
import { VERDICT_CLASSES } from "@/lib/design/palette";

export const metadata: Metadata = {
  title: "How to read your report — HyprrIQ",
  description:
    "What the four verdicts mean, what each assessment area covers, and how to read Verified vs Assessed — the same guidance every delivered report ships with.",
};

// ── HOW TO READ YOUR REPORT — the PUBLIC page (tracker §E: "the one marketing-site blocker;
// content already exists"). EVERY sentence here is IMPORTED from the canonical copy modules
// (lib/content/reportCopy.ts + lib/content/help.ts) — the surfaces that render the paid
// deliverable — never re-typed. A prospect reading this page and a client reading their report
// see the same words; that is the point, and the reportCopy lock keeps it true.

// VERDICT COLOUR COMES FROM THE REGISTRY. This map used to be hand-written here and three of its
// four entries were wrong: source_clear wore the VERIFY orange, usable_with_conditions wore the
// brand navy (not a verdict colour at all), and verify_before_purchase wore `amber-600` from
// Tailwind's default palette, outside the design system. On the page whose entire job is teaching
// a client to read the verdict. palette.lock.test.ts now fails any file that builds its own map.
//
// FOUNDER RULING 2 (2026-08-24): the 4px side-stripes are gone. A coloured left border is a weak
// carrier for the single most important signal on the page — it is easy to miss, it reads as
// decoration, and at 360px it competes with the text for the same edge. The verdict now wears its
// own filled chip, which is the treatment the report and the homepage already use, so a client
// learns the badge here and recognises the same badge in their report.

export default function HowToReadPage() {
  return (
    <>
      {/* FOUNDER RULING 2: the hardcoded #FAF9F7 cream gradient is gone. It was a warm off-white
          inlined in JSX — off-system twice over, since the base is cool now and standing rule 7
          forbids per-component hex values. --pale is the ruled tinted ground. */}
      <section className="border-b border-line bg-pale">
        <div className="mx-auto max-w-3xl px-5 py-12 text-center sm:py-16 lg:px-8 lg:py-20">
          <h1 className="text-ink">How to read your report</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-2">{HOW_TO_READ}</p>
        </div>
      </section>

      <section className="bg-surface">
        <div className="mx-auto max-w-3xl px-5 py-14 lg:px-8">
          <Reveal>
            <h2 className="text-2xl font-bold text-ink">The four verdicts</h2>
            <p className="mt-2 text-[15px] text-ink-2">
              A verdict is a position on a four-level scale, not a pass/fail.
            </p>
            <div className="mt-6 space-y-4">
              {VERDICT_SCALE_ORDER.map((key) => {
                const v = VERDICT_COPY[key];
                const help = verdicts.find((h) => h.key === key);
                return (
                  <div key={key} className="rounded-card border border-line bg-base p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={`rounded-chip px-2.5 py-1 text-[13px] font-semibold ${VERDICT_CLASSES[key].bg} ${VERDICT_CLASSES[key].ink}`}>
                        {v.name}
                      </span>
                      <span className="shrink-0 font-mono text-[12px] text-muted">
                        level {v.level} of {VERDICT_SCALE_ORDER.length}
                      </span>
                    </div>
                    <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{v.means}</p>
                    {help && <p className="mt-2 text-[13px] font-semibold text-muted">{help.action}</p>}
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-[13px] text-muted">{verdictDisclaimer}</p>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-line bg-base">
        <div className="mx-auto max-w-3xl px-5 py-14 lg:px-8">
          <Reveal>
            <h2 className="text-2xl font-bold text-ink">The assessment areas</h2>
            <p className="mt-2 text-[15px] text-ink-2">
              Findings are organized by area; your plan determines which areas your report includes.
            </p>
            <dl className="mt-6 space-y-4">
              {(["supplier_identity", "supply_chain_relationship", "brand_risk_assessment", "documentation_review", "sourcing_logic"] as const).map((k) => (
                <div key={k} className="rounded-card border border-line bg-surface p-5">
                  <dt className="text-[15px] font-bold text-ink">{AREA_NAMES[k]}</dt>
                  <dd className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{AREA_DEFS[k]}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-3xl px-5 py-14 lg:px-8">
          <Reveal>
            <h2 className="text-2xl font-bold text-ink">Verified, Assessed, Not assessed</h2>
            <p className="mt-2 text-[15px] text-ink-2">
              Every finding tells you how firm the ground is under it.
            </p>
            <dl className="mt-6 space-y-4">
              {([["Verified", CHIP_DEFS.verified], ["Assessed", CHIP_DEFS.assessed], ["Not assessed", CHIP_DEFS.not_assessed]] as const).map(([label, def]) => (
                <div key={label} className="rounded-card border border-line bg-base p-5">
                  <dt className="text-[15px] font-bold text-ink">{label}</dt>
                  <dd className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{def}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 max-w-2xl text-[13px] leading-relaxed text-muted">{CLOSING_STATEMENT}</p>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-line bg-base">
        <div className="mx-auto max-w-3xl px-5 py-14 text-center lg:px-8">
          <h2 className="text-2xl font-bold text-ink">See it on a real report</h2>
          <p className="mx-auto mt-2 max-w-xl text-[15px] text-ink-2">
            The sample report shows the whole deliverable — the verdict, the evidence behind it, and the
            questions to put to your supplier.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link href="/sample-report" className="rounded-lg bg-ink px-5 py-2.5 text-[14px] font-semibold text-surface hover:opacity-90">
              See a real report
            </Link>
            <Link href="/pricing" className="rounded-lg border border-line bg-surface px-5 py-2.5 text-[14px] font-semibold text-ink-2 hover:bg-subtle">
              Pricing
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
