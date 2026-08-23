import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/marketing/reveal";
import { PageHero, PageSection, Prose, RelatedLinks } from "@/components/marketing/page-shell";
import { oneTimePlans, subscriptionPlans, comparison, comparisonColumns, COMING_SOON_LABEL } from "@/lib/content/pricing";
import { factsForPlan, areaSplitForPlan } from "@/lib/content/planFacts";
import { CASE_SLA_HOURS, PLAN_BRAND_CAPS, type PlanType } from "@/lib/constants/plans";
import { VERDICT_SCALE_ORDER } from "@/lib/content/reportCopy";

// ── /pricing ──────────────────────────────────────────────────────────────────────────────────
//
// THE ANSWERS / DOES NOT ANSWER BLOCK IS DERIVED, not written. areaSplitForPlan() reads
// TRACK_CONFIG, so the two lists move together the day a tier's tracks change. This block is the
// honest three-of-five story the product has needed since the area-composition gap was diagnosed:
// a $99 buyer gets Supplier Legitimacy, Brand Risk and Sourcing Logic, and the pair that does NOT
// run is exactly the pair answering "can this supplier actually supply this brand". The copy says
// so plainly — "the research does not happen, so there is nothing to withhold" — which is both
// true and the strongest thing this page says.
//
// ⚠ ONE QUESTION IS DELIBERATELY ABSENT: "Do unused credits roll over?" The content file marks it
// [GAUTAM TO CONFIRM] with the note that guessing at a billing term is the wrong kind of mistake.
// It is NOT guessed here. Worth knowing while ruling it: lib/constants/plans.ts already carries
// PLAN_ROLLOVER_LIMIT (singles 0, Growth 2, Scale 4) and the comparison table below — which is
// existing shipped copy — already renders a "Credit rollover" row from it. So the fact is public;
// only the FAQ answer is missing. Publishing a rollover PROMISE changes what a client is promised,
// which stops and comes to the founder.
//
// COMING-SOON TIERS HAVE NO BUY PATH. `comingSoon` derives from PLANS_ON_SALE; the checkout route
// refuses them server-side with a 403. That refusal is the control — a card that merely looks
// buyable is a broken promise even when the server says no.

export const metadata: Metadata = {
  title: "Pricing | HyprrIQ",
  description:
    "A single supplier report is $99. Growth is $279 a month for buyers assessing continuously. Every plan delivers in 24 hours, on the same fixed method.",
  alternates: { canonical: "/pricing" },
};

const FAQS = [
  {
    q: "What if the report comes back clean?",
    a: "You have paid for the answer, not for the verdict. A clean verdict on a supplier you were unsure about is worth what you paid, and it still lists what could not be confirmed.",
  },
  {
    q: "Can I buy one report and then upgrade?",
    a: "Yes. A single report does not lock you out of a monthly plan later.",
  },
  {
    q: "Who can buy?",
    a: "US-based clients at launch. The suppliers you ask us about can be anywhere.",
  },
  {
    q: `What happens if you miss ${CASE_SLA_HOURS} hours?`,
    a: "Get in touch. It is a commitment rather than a service level with a compensation table behind it, and if it is ever missed we would rather hear from you than not.",
  },
];

function PlanCard({ plan }: { plan: (typeof oneTimePlans)[number] }) {
  const soon = plan.comingSoon;
  const facts = factsForPlan(plan.id as PlanType);
  return (
    <div
      className={`grid rounded-card-lg p-5 sm:p-7 ${
        soon ? "border border-dashed border-line-strong bg-subtle" : "border border-action bg-surface"
      }`}
    >
      <div className="flex flex-wrap items-baseline gap-2">
        <h3 className={soon ? "text-ink-2" : "text-ink"}>{plan.name}</h3>
        {soon && (
          <span className="rounded-chip bg-cyan-tint px-2 py-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.13em] text-cyan">
            {COMING_SOON_LABEL}
          </span>
        )}
      </div>
      <div className={`mt-2 font-display text-[34px] font-medium tracking-[-0.035em] sm:text-[42px] ${soon ? "text-ink-2" : "text-ink"}`}>
        {plan.price}
        <span className="font-sans text-[15px] font-normal tracking-normal text-muted">
          {" "}
          {plan.cadence === "one-time" ? "once" : plan.cadence}
        </span>
      </div>
      <p className="mt-1 text-[15px] text-muted">{plan.meta}</p>
      <ul className="mt-5">
        {facts.map((f) => (
          <li key={f.label} className="flex justify-between gap-3 border-b border-line py-2.5 text-[15px] last:border-b-0">
            <span className="text-muted">{f.label}</span>
            <span className="text-right font-semibold text-ink">{f.value}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6 self-end">
        {soon ? (
          <p className="rounded-control border border-dashed border-line-strong p-3 text-center text-[14px] text-muted">
            {plan.id === "single_149"
              ? "Opens when category compliance research goes live."
              : "Opens alongside Single Deep."}
          </p>
        ) : (
          <Link
            href="/sign-up"
            className="flex min-h-11 w-full items-center justify-center rounded-control bg-action px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-anchor"
          >
            {plan.id === "single_99" ? "Vet a supplier" : `Start with ${plan.name}`}
          </Link>
        )}
      </div>
    </div>
  );
}

export default function PricingPage() {
  const onSale = [...oneTimePlans, ...subscriptionPlans].filter((p) => !p.comingSoon);
  const soon = [...oneTimePlans, ...subscriptionPlans].filter((p) => p.comingSoon);
  const split = areaSplitForPlan("single_99");

  return (
    <>
      <PageHero
        title="Pricing"
        lede="Two plans are on sale. Two more are coming and are shown here so you can see where this is going — they have no buy button because they are not ready. Selling something unbuilt is not a way to begin."
        ground="pale"
      />

      <PageSection tone="surface">
        <Prose>
          <p>
            Every plan delivers in {CASE_SLA_HOURS} hours. Every plan runs the same method — the same
            questions, asked the same way. Neither of those is a premium feature.
          </p>
        </Prose>

        <h2 className="mt-8 text-ink">On sale now</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {onSale.map((p) => (
            <PlanCard key={p.id} plan={p} />
          ))}
        </div>

        <h2 className="mt-11 text-ink">Coming soon</h2>
        <p className="mt-2 text-[16px] text-ink-2">These are on the roadmap. No buy action until they are real.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {soon.map((p) => (
            <PlanCard key={p.id} plan={p} />
          ))}
        </div>
      </PageSection>

      {/* THE THREE-OF-FIVE STORY. Derived from the track registry, both sides. */}
      <PageSection tone="mist">
        <h2 className="text-ink">What a single report answers</h2>
        <Reveal>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-card-lg border border-clear-ink/25 bg-surface p-5">
              <h3 className="text-ink">Answers, in full</h3>
              <ul className="mt-3 space-y-3">
                {split.included.map((a) => (
                  <li key={a.key}>
                    <p className="text-[15.5px] font-semibold text-ink">{a.name}</p>
                    <p className="mt-0.5 text-[14.5px] leading-[1.55] text-ink-2">{a.question}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-card-lg border border-line bg-surface p-5">
              <h3 className="text-ink">Does not answer</h3>
              <ul className="mt-3 space-y-3">
                {split.excluded.map((a) => (
                  <li key={a.key}>
                    <p className="text-[15.5px] font-semibold text-ink">{a.name}</p>
                    <p className="mt-0.5 text-[14.5px] leading-[1.55] text-ink-2">{a.question}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
        <Prose className="mt-6">
          <p>
            Those two areas do not run on a single report.{" "}
            <strong>They are not hidden behind a paywall.</strong> The research does not happen, so
            there is nothing to withhold.
          </p>
          <p>
            <strong>
              If either of those is your actual worry, a single report is the wrong purchase.
            </strong>{" "}
            Growth runs all {split.included.length + split.excluded.length} areas on every supplier.
          </p>
        </Prose>
      </PageSection>

      <PageSection tone="surface">
        <h2 className="text-ink">What a credit actually buys</h2>
        <Prose className="mt-3">
          <p>
            One credit buys one supplier. Not one brand — one supplier, including however many brands
            your plan covers.
          </p>
          <p>
            On a single report that is up to {PLAN_BRAND_CAPS.single_99} brands on that supplier. On
            Growth it is up to {PLAN_BRAND_CAPS.growth_279} brands per supplier.
          </p>
          <p>
            {PLAN_BRAND_CAPS.growth_279} brands on one supplier is still one credit. Two suppliers is
            two credits, even if each has only one brand.{" "}
            <strong>The count is suppliers, never brands.</strong>
          </p>
        </Prose>
      </PageSection>

      <PageSection tone="base">
        <h2 className="text-ink">Every plan, side by side</h2>
        <div className="mt-5 overflow-x-auto rounded-card border border-line bg-surface">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-subtle">
                <th scope="col" className="p-3 text-[13px] font-semibold text-ink">Feature</th>
                {comparisonColumns.map((c) => (
                  <th key={c} scope="col" className="p-3 text-[13px] font-semibold text-ink">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparison.map((row) => (
                <tr key={row.feature} className="border-b border-line last:border-b-0">
                  <th scope="row" className="p-3 text-[14px] font-medium text-ink-2">{row.feature}</th>
                  {row.values.map((v, i) => (
                    <td key={`${row.feature}-${i}`} className="p-3 text-[14px] text-ink">{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[13px] text-muted">Scroll the table sideways on a small screen.</p>
      </PageSection>

      <PageSection tone="surface">
        <h2 className="text-ink">Questions people ask before buying</h2>
        <dl className="mt-5 space-y-5">
          {FAQS.map((f) => (
            <div key={f.q} className="border-t border-line pt-4">
              <dt className="text-[16px] font-semibold text-ink sm:text-[17px]">{f.q}</dt>
              <dd className="mt-1.5 max-w-[68ch] text-[15px] leading-[1.6] text-ink-2 sm:text-[16px]">{f.a}</dd>
            </div>
          ))}
        </dl>

        <h2 className="mt-11 text-ink">What you get on every plan</h2>
        <Prose className="mt-3">
          <p>
            One of {VERDICT_SCALE_ORDER.length} verdicts, written out. The findings and every source
            behind them, each marked Verified or Assessed. What we could not confirm. Questions
            written for your specific supplier.
          </p>
        </Prose>
        <RelatedLinks
          links={[
            { label: "What we check", href: "/what-we-check" },
            { label: "See a real report", href: "/sample-report" },
            { label: "What we don't do", href: "/what-we-dont-do" },
            { label: "Questions", href: "/faq" },
          ]}
        />
      </PageSection>
    </>
  );
}
