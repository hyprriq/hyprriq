import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, ShieldQuestion } from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";
import { VerdictSpectrum } from "@/components/marketing/verdict-spectrum";
import {
  sampleMeta, sampleHeadline, sampleRealRisk, sampleInterpretation,
  sampleChecklist, sampleAreas, sampleLimits,
} from "@/lib/content/sample-report";

export const metadata: Metadata = {
  title: "See a real report — HyprrIQ",
  description:
    "The whole deliverable, start to finish: the verdict, the evidence behind it, the questions to put to your vendor, and what we deliberately do not claim.",
};

// ── THE SAMPLE REPORT PAGE (tracker 1.8 — "the highest-converting page not yet built: a $499
// prospect wants to see the deliverable"). Structure and voice come from the delivered corpus;
// the vendor identity is anonymized (see lib/content/sample-report.ts for the flagged reasoning).
export default function SampleReportPage() {
  return (
    <>
      <section className="border-b border-line" style={{ background: "linear-gradient(180deg, #FAF9F7 0%, #FFFFFF 100%)" }}>
        <div className="mx-auto max-w-3xl px-5 py-16 text-center lg:px-8 lg:py-20">
          <h1 className="text-[clamp(2.1rem,4.4vw,3.2rem)] font-bold leading-[1.07] text-ink">
            This is the whole thing.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-ink-2">
            Not a teaser. A real report&rsquo;s structure, voice and checklist, start to finish — including
            the parts where we tell you what we could not establish.
          </p>
          <p className="mx-auto mt-3 max-w-xl text-[13px] text-muted">
            The vendor identity is anonymized; everything else is exactly what a client receives.
          </p>
        </div>
      </section>

      {/* The report itself */}
      <section className="bg-surface">
        <div className="mx-auto max-w-3xl px-5 py-14 lg:px-8 lg:py-16">
          <Reveal>
            <article className="overflow-hidden rounded-card border border-line bg-base shadow-[0_1px_2px_rgba(26,25,23,0.04),0_24px_60px_-24px_rgba(26,25,23,0.22)]">
              {/* Cover */}
              <div className="bg-brand-ink px-7 py-8 text-white">
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/70">
                  Source Intelligence Report
                </p>
                <p className="mt-3 font-mono text-[13px] tnum text-white/80">
                  {sampleMeta.caseNumber} · {sampleMeta.vendor} · {sampleMeta.brands.join(" · ")}
                </p>
                <div className="mt-6 rounded-lg border border-white/15 bg-white/5 p-4">
                  <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-white/60">
                    Verdict · {sampleMeta.verdictLevel}
                  </p>
                  <p className="mt-1 font-display text-2xl font-bold">{sampleMeta.verdict}</p>
                  <p className="mt-2 text-[14px] leading-relaxed text-white/85">{sampleHeadline}</p>
                </div>
                <p className="mt-4 text-[12px] text-white/60">
                  {sampleMeta.plan} · {sampleMeta.delivered}
                </p>
              </div>

              <div className="px-7 py-8">
                {/* The single most important risk */}
                <div className="rounded-card border border-line border-l-4 border-l-verify-ink bg-surface p-5">
                  <h2 className="font-display text-[17px] font-bold text-ink">The single most important risk</h2>
                  <p className="mt-2.5 max-w-[68ch] font-reading text-[15px] leading-[1.7] text-ink-2">{sampleRealRisk}</p>
                </div>

                {/* Leading interpretation */}
                <div className="mt-6">
                  <h2 className="font-display text-[17px] font-bold text-ink">Our reading of the evidence</h2>
                  <p className="mt-2.5 max-w-[68ch] font-reading text-[15px] leading-[1.7] text-ink-2">{sampleInterpretation}</p>
                </div>

                {/* The checklist — the value */}
                <div className="mt-7 rounded-card border border-brand/25 bg-brand-tint/50 p-5">
                  <h2 className="font-display text-[17px] font-bold text-ink">What to ask before you commit</h2>
                  <p className="mt-1 text-[13px] text-ink-2">
                    Put these to the vendor. The answers — or the silence — resolve the verdict faster than
                    any amount of further research.
                  </p>
                  <ul className="mt-4 space-y-3">
                    {sampleChecklist.map((q) => (
                      <li key={q} className="flex gap-2.5">
                        <Check size={16} className="mt-0.5 flex-none text-brand" aria-hidden />
                        <span className="max-w-[68ch] font-reading text-[14.5px] leading-[1.65] text-ink-2">{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Areas */}
                <div className="mt-7">
                  <h2 className="font-display text-[17px] font-bold text-ink">The assessment areas</h2>
                  <div className="mt-3 space-y-4">
                    {sampleAreas.map((a) => (
                      <div key={a.name} className="rounded-card border border-line bg-surface p-5">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="font-display text-[15px] font-bold text-ink">{a.name}</h3>
                          <span className="rounded-full border border-line bg-base px-2.5 py-0.5 text-[11.5px] font-semibold text-muted">
                            {a.state}
                          </span>
                        </div>
                        <p className="mt-2 max-w-[68ch] font-reading text-[14.5px] leading-[1.65] text-ink-2">{a.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          </Reveal>
        </div>
      </section>

      {/* The scale */}
      <section className="border-y border-line bg-base">
        <div className="mx-auto max-w-4xl px-5 py-14 lg:px-8">
          <h2 className="text-center font-display text-[clamp(1.5rem,2.6vw,2rem)] font-bold text-ink">
            Four verdicts, and we commit to one
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-[15px] text-ink-2">
            The verdict is our reading of what the evidence supports — never a recommendation to buy or
            not buy. That decision stays yours; our job is to make sure you make it with the questions
            answered.
          </p>
          <div className="mt-8">
            <VerdictSpectrum />
          </div>
        </div>
      </section>

      {/* What we don't claim */}
      <section className="bg-surface">
        <div className="mx-auto max-w-3xl px-5 py-14 lg:px-8">
          <div className="flex items-center gap-2.5">
            <ShieldQuestion size={20} className="text-brand" aria-hidden />
            <h2 className="font-display text-[clamp(1.4rem,2.4vw,1.8rem)] font-bold text-ink">
              What this report deliberately does not claim
            </h2>
          </div>
          <p className="mt-3 max-w-[68ch] text-[15px] text-ink-2">
            A report that overclaims is worth less than one that tells you exactly where its evidence
            stops. These limits are printed in every report we deliver.
          </p>
          <ul className="mt-5 space-y-3">
            {sampleLimits.map((l) => (
              <li key={l} className="max-w-[68ch] border-l-2 border-line pl-4 font-reading text-[14.5px] leading-[1.65] text-ink-2">
                {l}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-line bg-base">
        <div className="mx-auto max-w-3xl px-5 py-16 text-center lg:px-8">
          <h2 className="font-display text-[clamp(1.6rem,3vw,2.2rem)] font-bold text-ink">
            Run this on your next supplier.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-[16px] text-ink-2">
            One supplier, your plan&rsquo;s brands, delivered to your portal. Before a dollar moves.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-brand px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              See pricing <ArrowRight size={16} aria-hidden />
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex items-center justify-center rounded-full border border-line-strong bg-surface px-6 py-3 text-base font-semibold text-ink transition-colors hover:bg-subtle"
            >
              How it works
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
