import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";
import { PricingPlans } from "@/components/marketing/pricing-plans";
import { FAQ } from "@/components/marketing/faq";
import { pricingHero, comparison, comparisonColumns } from "@/lib/content/pricing";

export const metadata: Metadata = {
  title: "Pricing — HyprrIQ source intelligence",
  description:
    "Subscribe monthly or buy a single supplier-intelligence report. Plans for Amazon and Walmart wholesale sellers, from $99.",
};

export default function PricingPage() {
  return (
    <>
      {/* Hero */}
      <section
        className="border-b border-line"
        style={{ background: "linear-gradient(180deg, #FAF9F7 0%, #FFFFFF 100%)" }}
      >
        <div className="mx-auto max-w-3xl px-5 py-16 text-center lg:px-8 lg:py-20">
          <h1 className="text-[clamp(2.2rem,4.6vw,3.4rem)] font-bold leading-[1.06] text-ink">
            {pricingHero.title}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-ink-2">{pricingHero.subtitle}</p>
        </div>
      </section>

      {/* Plans */}
      <section className="bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-14 lg:px-8 lg:py-16">
          <PricingPlans />
        </div>
      </section>

      {/* Comparison */}
      <section className="border-y border-line bg-subtle">
        <div className="mx-auto max-w-5xl px-5 py-14 lg:px-8 lg:py-16">
          <Reveal>
            <h2 className="text-center text-[clamp(1.6rem,3vw,2.2rem)] font-bold text-ink">
              Compare every plan
            </h2>
          </Reveal>
          <Reveal>
            <div className="mt-10 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr>
                    <th className="border-b border-line py-3 pr-4 text-sm font-semibold text-ink-2">
                      Feature
                    </th>
                    {comparisonColumns.map((col, i) => (
                      <th
                        key={col}
                        className={`border-b border-line px-4 py-3 text-sm font-bold ${
                          i >= 1 ? "text-brand-ink" : "text-ink"
                        }`}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((row) => (
                    <tr key={row.feature}>
                      <td className="border-b border-line py-3 pr-4 text-sm font-medium text-ink">
                        {row.feature}
                      </td>
                      {row.values.map((v, i) => (
                        <td
                          key={i}
                          className={`border-b border-line px-4 py-3 text-sm ${
                            v === "—" ? "text-muted" : "text-ink-2"
                          } ${i >= 1 ? "bg-brand-tint/40" : ""}`}
                        >
                          {v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section>
        <div className="mx-auto max-w-6xl px-5 py-14 lg:px-8 lg:py-16">
          <Reveal>
            <h2 className="text-center text-[clamp(1.6rem,3vw,2.2rem)] font-bold text-ink">
              Questions, answered straight
            </h2>
          </Reveal>
          <Reveal>
            <div className="mt-10">
              <FAQ />
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-line bg-brand-tint">
        <div className="mx-auto max-w-4xl px-5 py-16 text-center lg:px-8">
          <Reveal>
            <h2 className="text-[clamp(1.7rem,3.4vw,2.6rem)] font-bold leading-tight text-ink">
              Run the check before you run the risk.
            </h2>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-hover"
              >
                Get started
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link
                href="/how-it-works"
                className="inline-flex items-center justify-center rounded-full border border-line-strong bg-surface px-6 py-3 text-base font-semibold text-ink transition-colors hover:bg-subtle"
              >
                See how it works
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
