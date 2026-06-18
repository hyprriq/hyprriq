import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Cpu, UserCheck, ScrollText, X } from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";
import { VerdictSpectrum } from "@/components/marketing/verdict-spectrum";
import { VERDICTS, type Verdict } from "@/components/marketing/verdict-badge";
import { hero, layers, dimensions, dataPoints, dontDo } from "@/lib/content/how-it-works";

export const metadata: Metadata = {
  title: "How it works — HyprrIQ source intelligence",
  description:
    "Deep AI research across five dimensions, reviewed and approved by a human expert, delivered as a one-page verdict with the questions to ask before you buy.",
};

const LAYER_ICONS = [Cpu, UserCheck, ScrollText];

const OUTCOME_COPY: Record<Verdict, string> = {
  clear: "All observable indicators are consistent with credible wholesale sourcing.",
  conditional: "The source appears credible. Collect the listed items before you commit capital.",
  verify: "Important evidence is missing or unclear. Don't go past a test order until it's resolved.",
  deny: "Serious gaps or contradictions surfaced. Seek alternatives until they're resolved.",
};

export default function HowItWorksPage() {
  return (
    <>
      {/* Hero */}
      <section
        className="border-b border-line"
        style={{ background: "linear-gradient(180deg, #FAF9F7 0%, #FFFFFF 100%)" }}
      >
        <div className="mx-auto max-w-3xl px-5 py-16 text-center lg:px-8 lg:py-20">
          <h1 className="text-[clamp(2.1rem,4.4vw,3.2rem)] font-bold leading-[1.07] text-ink">
            {hero.title}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-ink-2">{hero.subtitle}</p>
        </div>
      </section>

      {/* Three layers */}
      <section className="bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-14 lg:px-8 lg:py-16">
          <div className="grid gap-6 md:grid-cols-3">
            {layers.map((layer, i) => {
              const Icon = LAYER_ICONS[i];
              return (
                <Reveal key={layer.title} delay={i * 90}>
                  <div className="h-full rounded-[var(--radius-card)] border border-line bg-base p-6">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-tint text-brand-ink">
                      <Icon size={20} strokeWidth={2} aria-hidden="true" />
                    </div>
                    <h2 className="mt-4 text-lg font-semibold text-ink">{layer.title}</h2>
                    <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{layer.body}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Five dimensions */}
      <section className="border-y border-line bg-subtle">
        <div className="mx-auto max-w-4xl px-5 py-14 lg:px-8 lg:py-16">
          <Reveal>
            <h2 className="text-[clamp(1.7rem,3.2vw,2.4rem)] font-bold leading-tight text-ink">
              The five dimensions we research.
            </h2>
          </Reveal>
          <ol className="mt-10 space-y-px overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
            {dimensions.map((d, i) => (
              <Reveal as="li" key={d.name} delay={i * 60}>
                <div className="flex gap-4 border-b border-line p-5 last:border-0">
                  <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-brand-tint font-mono text-sm font-bold text-brand-ink">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-[17px] font-semibold text-ink">{d.name}</h3>
                    <p className="mt-1 text-[15px] leading-relaxed text-ink-2">{d.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* 60+ data points */}
      <section>
        <div className="mx-auto max-w-3xl px-5 py-14 text-center lg:px-8 lg:py-16">
          <Reveal>
            <h2 className="text-[clamp(1.7rem,3.2vw,2.4rem)] font-bold leading-tight text-ink">
              {dataPoints.title}
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-ink-2">{dataPoints.body}</p>
          </Reveal>
        </div>
      </section>

      {/* The four outcomes */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-4xl px-5 py-14 lg:px-8 lg:py-16">
          <Reveal>
            <h2 className="text-[clamp(1.7rem,3.2vw,2.4rem)] font-bold leading-tight text-ink">
              It all leads to one of four verdicts.
            </h2>
            <div className="mt-6 max-w-md">
              <VerdictSpectrum withLabels />
            </div>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {(Object.keys(VERDICTS) as Verdict[]).map((v, i) => {
              const meta = VERDICTS[v];
              const Icon = meta.icon;
              return (
                <Reveal key={v} delay={i * 70}>
                  <div className="flex h-full gap-3 rounded-[var(--radius-card)] border border-line bg-base p-5">
                    <div className={`flex h-10 w-10 flex-none items-center justify-center rounded-full ${meta.bg} ${meta.ink}`}>
                      <Icon size={20} strokeWidth={2.25} aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className={`text-base font-semibold ${meta.ink}`}>{meta.label}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-ink-2">{OUTCOME_COPY[v]}</p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* What we don't do */}
      <section>
        <div className="mx-auto max-w-4xl px-5 py-14 lg:px-8 lg:py-16">
          <Reveal>
            <h2 className="text-[clamp(1.7rem,3.2vw,2.4rem)] font-bold leading-tight text-ink">
              {dontDo.title}
            </h2>
          </Reveal>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {dontDo.items.map((item, i) => (
              <Reveal key={item.title} delay={i * 80}>
                <div className="h-full">
                  <X size={22} strokeWidth={2} className="text-deny-ink" aria-hidden="true" />
                  <h3 className="mt-3 text-base font-semibold text-ink">{item.title}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{item.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-line bg-brand-tint">
        <div className="mx-auto max-w-4xl px-5 py-16 text-center lg:px-8">
          <Reveal>
            <h2 className="text-[clamp(1.7rem,3.4vw,2.6rem)] font-bold leading-tight text-ink">
              See what we find on your next supplier.
            </h2>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-hover"
              >
                See pricing
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
