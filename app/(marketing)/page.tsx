import Link from "next/link";
import {
  ArrowRight,
  Gavel,
  Lock,
  PackageX,
  ShieldQuestion,
  Boxes,
  ShieldAlert,
  Database,
  Check,
  ScanEye,
  FileText,
} from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";
import { Counter } from "@/components/marketing/counter";
import { DecisionSnapshot } from "@/components/marketing/decision-snapshot";
import { DashboardPreview } from "@/components/marketing/dashboard-preview";
import { ReportPreview } from "@/components/marketing/report-preview";
import { VerdictSpectrum } from "@/components/marketing/verdict-spectrum";
import { VERDICTS, type Verdict } from "@/components/marketing/verdict-badge";
import { HowItWorksScroll } from "@/components/marketing/how-it-works-scroll";
import { FAQ, FAQ_ITEMS } from "@/components/marketing/faq";

const PAIN_MODES = [
  {
    icon: Gavel,
    title: "IP & counterfeit complaints",
    body: "A brand reports your listing as inauthentic. The strike lands on your account — not the supplier's.",
  },
  {
    icon: Lock,
    title: "The “authorized” distributor who wasn’t",
    body: "A confident invoice is not proof the brand will stand behind the sale. Plenty don’t.",
  },
  {
    icon: PackageX,
    title: "Capital stranded in dead stock",
    body: "Gated brand, frozen payout, inventory you can’t sell — money already spent before you knew.",
  },
];

const OUTCOME_COPY: Record<Verdict, string> = {
  clear:
    "All observable indicators are consistent with credible wholesale sourcing. Proceed with standard due diligence.",
  conditional:
    "The source appears credible. Collect the listed items before you commit significant capital.",
  verify:
    "Important evidence is missing or unclear. Don’t go past a test order until it’s resolved.",
  deny:
    "Serious gaps or contradictions surfaced. Seek alternatives until the specific issues are resolved.",
};

const EDGE_STATS = [
  { value: 60, suffix: "+", label: "public data points per case" },
  { value: 5, suffix: "", label: "research dimensions" },
  { value: 14, suffix: "", label: "documentation standards checked" },
];

const EDGE = [
  {
    icon: Boxes,
    title: "Five research dimensions",
    body: "Supplier identity, supply-chain relationship, brand risk, document review, and sourcing logic — each reported on its own terms.",
  },
  {
    icon: ShieldAlert,
    title: "Risk, separated honestly",
    body: "Invoice risk and enforcement risk are never blended into one score. They’re different questions, so they get different answers.",
  },
  {
    icon: Database,
    title: "A cache that compounds",
    body: "A proprietary database of vendors and brands that sharpens with every case — so your reports get faster and deeper over time.",
  },
];

const PROFILES = [
  {
    title: "New supplier, first order",
    body: "You found a promising distributor. Before the opening PO, you want a second set of expert eyes on it.",
  },
  {
    title: "Adding a brand to your catalog",
    body: "The supplier checks out. The brand’s enforcement posture is the open question — and it’s the one that strands inventory.",
  },
  {
    title: "Burned before, done guessing",
    body: "You’ve eaten a gated ASIN or a counterfeit claim once. Never again on a signal someone could have caught.",
  },
];

const PLANS = [
  {
    name: "Growth",
    price: "$249",
    cadence: "/mo",
    credits: "5 research credits a month",
    points: ["Up to 3 brands per case", "Full five-dimension review", "Case history & report archive"],
    popular: false,
  },
  {
    name: "Scale",
    price: "$499",
    cadence: "/mo",
    credits: "12 research credits a month",
    points: ["Up to 5 brands per case", "Deep analysis + contradiction checks", "3-business-day priority SLA"],
    popular: true,
  },
];

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "HyprrIQ",
  description:
    "Pre-purchase source-intelligence reports for Amazon and Walmart wholesale sellers.",
  url: "https://hyprriq.com",
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* ───────────────────────── Hero ───────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(180deg, #FAF9F7 0%, #FFFFFF 100%)" }}
      >
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14 lg:px-8 lg:py-16">
          <div className="hq-rise">
            <span className="inline-block rounded-full bg-brand-tint px-3 py-1.5 text-xs font-semibold text-brand-ink">
              Pre-purchase source intelligence
            </span>
            <h1 className="mt-5 max-w-xl text-[clamp(2.4rem,5.2vw,3.9rem)] font-bold leading-[1.05] text-ink">
              Know what you&rsquo;re really buying &mdash; before you wire the
              money.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-2">
              Every wholesale buy is a bet on a supplier you can&rsquo;t fully
              see and a brand that can pull your listing. We investigate both,
              then hand you a one-page verdict and the exact questions to ask.
              We don&rsquo;t promise &ldquo;safe&rdquo; &mdash; we help you decide.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-hover"
              >
                See how it works
                <ArrowRight size={18} aria-hidden="true" />
              </a>
              <a
                href="#pricing"
                className="inline-flex items-center justify-center rounded-full border border-line-strong bg-surface px-6 py-3 text-base font-semibold text-ink transition-colors hover:bg-subtle"
              >
                See pricing
              </a>
            </div>
            <div className="mt-9 max-w-xs">
              <VerdictSpectrum />
              <p className="mt-2 text-sm text-muted">
                Four plain-English verdicts &mdash; from Source Clear to Do Not
                Rely
              </p>
            </div>
          </div>

          <div className="relative flex justify-center lg:justify-end">
            <div
              aria-hidden="true"
              className="absolute inset-0 -z-10"
              style={{
                backgroundImage:
                  "radial-gradient(circle, var(--color-line) 1px, transparent 1px)",
                backgroundSize: "16px 16px",
                maskImage:
                  "radial-gradient(ellipse 80% 80% at 60% 40%, black, transparent 75%)",
                WebkitMaskImage:
                  "radial-gradient(ellipse 80% 80% at 60% 40%, black, transparent 75%)",
              }}
            />
            <DecisionSnapshot />
          </div>
        </div>
      </section>

      {/* ─────────────────── Where sellers lose money ─────────────────── */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-12 lg:px-8 lg:py-16">
          <Reveal>
            <h2 className="mx-auto max-w-2xl text-center text-[clamp(1.75rem,3vw,2.4rem)] font-bold leading-tight text-ink">
              Where wholesale sellers actually lose money.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-lg text-ink-2">
              It&rsquo;s rarely the price. It&rsquo;s the things you couldn&rsquo;t
              see before you bought.
            </p>
          </Reveal>

          <div className="mt-10 grid items-start gap-10 lg:grid-cols-2 lg:gap-14">
            <Reveal>
              <figure className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-base">
                <figcaption className="flex items-center gap-2.5 bg-[#232F3E] px-5 py-3">
                  <span className="h-2 w-2 rounded-full bg-deny-ink" />
                  <span className="text-sm font-semibold text-white">Account Health</span>
                  <span className="ml-auto rounded border border-white/25 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/70">
                    Illustrative example
                  </span>
                </figcaption>
                <div className="p-6">
                  <p className="text-base font-bold text-deny-ink">
                    Your account has been deactivated
                  </p>
                  <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
                    We received a report that a product you listed may be
                    inauthentic. Funds may be withheld for up to 90 days while
                    your account is under review.
                  </p>
                  <p className="mt-4 border-t border-line pt-3 text-sm text-muted">
                    By the time this email arrives, the inventory is already
                    yours.
                  </p>
                </div>
              </figure>
            </Reveal>

            <ul>
              {PAIN_MODES.map((p, i) => (
                <Reveal
                  key={p.title}
                  as="li"
                  delay={i * 90}
                  className="flex gap-4 border-b border-line py-5 last:border-0"
                >
                  <p.icon
                    size={24}
                    strokeWidth={1.75}
                    className="mt-0.5 flex-none text-deny-ink"
                    aria-hidden="true"
                  />
                  <div>
                    <h3 className="text-[17px] font-semibold text-ink">{p.title}</h3>
                    <p className="mt-1 text-[15px] leading-relaxed text-ink-2">{p.body}</p>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>

          <Reveal>
            <div className="mt-10 flex gap-3 rounded-[var(--radius-card)] bg-brand-tint px-6 py-5">
              <ShieldQuestion size={22} className="mt-0.5 flex-none text-brand-ink" aria-hidden="true" />
              <p className="text-[15px] leading-relaxed text-brand-ink">
                <span className="font-bold">HyprrIQ can&rsquo;t undo any of this.</span>{" "}
                What it can do is surface the signals before you buy &mdash; so
                you decide with your eyes open, not after the email arrives.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─────────────────────── The stakes ─────────────────────── */}
      <section className="bg-subtle">
        <div className="mx-auto max-w-6xl px-5 py-12 lg:px-8 lg:py-16">
          <Reveal>
            <h2 className="mx-auto max-w-2xl text-center text-[clamp(1.75rem,3vw,2.4rem)] font-bold leading-tight text-ink">
              The math nobody runs before they buy.
            </h2>
          </Reveal>
          <div className="mt-10 grid items-stretch gap-5 md:grid-cols-[1fr_auto_1fr]">
            <Reveal className="flex">
              <div className="flex w-full flex-col rounded-[var(--radius-card)] border border-line bg-surface p-7">
                <p className="text-sm font-semibold uppercase tracking-wide text-clear-ink">
                  Checking first
                </p>
                <p className="mt-3 font-display text-3xl font-bold text-ink">From $79</p>
                <p className="mt-2 text-[15px] text-ink-2">
                  One report. Five business days. A clear verdict and the
                  questions to ask — before a dollar moves.
                </p>
              </div>
            </Reveal>
            <div className="hidden items-center justify-center md:flex">
              <span className="font-display text-lg font-bold text-muted">vs</span>
            </div>
            <Reveal delay={90} className="flex">
              <div className="flex w-full flex-col rounded-[var(--radius-card)] border border-deny-ink/25 bg-deny-bg p-7">
                <p className="text-sm font-semibold uppercase tracking-wide text-deny-ink">
                  Not checking
                </p>
                <p className="mt-3 font-display text-3xl font-bold text-deny-ink">
                  The whole buy
                </p>
                <p className="mt-2 text-[15px] text-ink-2">
                  Gated brand, payout held 90 days, inventory you can&rsquo;t
                  sell — and sometimes the account itself.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ─────────────────────── How it works ─────────────────────── */}
      <section id="how-it-works" className="scroll-mt-20 border-y border-line">
        <div className="mx-auto max-w-6xl px-5 py-12 lg:px-8 lg:py-16">
          <Reveal>
            <h2 className="mx-auto max-w-2xl text-center text-[clamp(1.75rem,3vw,2.4rem)] font-bold leading-tight text-ink">
              Three steps. Five business days. One clear answer.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-lg text-ink-2">
              Watch a case go from a vendor name to a verdict.
            </p>
          </Reveal>
          <div className="mt-10">
            <HowItWorksScroll />
          </div>
        </div>
      </section>

      {/* ──────────────────── The four outcomes ──────────────────── */}
      <section id="outcomes" className="scroll-mt-20 bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-12 lg:px-8 lg:py-16">
          <Reveal>
            <h2 className="mx-auto max-w-2xl text-center text-[clamp(1.75rem,3vw,2.4rem)] font-bold leading-tight text-ink">
              Every report ends in one of four plain-English verdicts.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-lg text-ink-2">
              No scores to decode, no false certainty. Just where the evidence
              lands — and what to do next.
            </p>
            <div className="mx-auto mt-7 max-w-md">
              <VerdictSpectrum withLabels />
            </div>
          </Reveal>

          <div className="mt-10 grid items-start gap-10 lg:grid-cols-[1fr_0.85fr] lg:gap-14">
            <div className="grid gap-4 sm:grid-cols-2">
              {(Object.keys(VERDICTS) as Verdict[]).map((v, i) => {
                const meta = VERDICTS[v];
                const Icon = meta.icon;
                return (
                  <Reveal key={v} delay={i * 80}>
                    <div className="flex h-full flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-base p-5 transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_10px_28px_-12px_rgba(26,25,23,0.18)]">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${meta.bg} ${meta.ink}`}>
                        <Icon size={20} strokeWidth={2.25} aria-hidden="true" />
                      </div>
                      <h3 className={`text-base font-semibold ${meta.ink}`}>{meta.label}</h3>
                      <p className="text-sm leading-relaxed text-ink-2">{OUTCOME_COPY[v]}</p>
                    </div>
                  </Reveal>
                );
              })}
            </div>
            <Reveal delay={120}>
              <div>
                <ReportPreview />
                <p className="mt-3 text-center text-sm text-muted">
                  A real Source Intelligence Report — anonymized.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ─────────────────── The depth / intelligence edge ─────────────────── */}
      <section className="bg-subtle">
        <div className="mx-auto max-w-6xl px-5 py-12 lg:px-8 lg:py-16">
          <div className="grid items-center gap-14 lg:grid-cols-2">
            <Reveal>
              <div>
                <DashboardPreview />
                <p className="mt-3 text-center text-sm text-muted">
                  Every case, verdict, and report in one place.
                </p>
              </div>
            </Reveal>
            <div>
              <Reveal>
                <h2 className="max-w-xl text-[clamp(1.75rem,3vw,2.4rem)] font-bold leading-tight text-ink">
                  The depth behind the one page.
                </h2>
                <p className="mt-4 max-w-md text-lg text-ink-2">
                  The verdict is short on purpose. The work behind it isn&rsquo;t.
                </p>
              </Reveal>

              <Reveal>
                <dl className="mt-8 grid grid-cols-3 gap-4 border-y border-line py-6">
                  {EDGE_STATS.map((s) => (
                    <div key={s.label}>
                      <dt className="font-display text-3xl font-bold text-brand">
                        <Counter value={s.value} suffix={s.suffix} />
                      </dt>
                      <dd className="mt-1 text-xs leading-snug text-ink-2">{s.label}</dd>
                    </div>
                  ))}
                </dl>
              </Reveal>

              <div className="mt-8 space-y-6">
                {EDGE.map((e, i) => (
                  <Reveal key={e.title} delay={i * 90} className="flex gap-4">
                    <e.icon size={22} strokeWidth={1.75} className="mt-0.5 flex-none text-accent-data" aria-hidden="true" />
                    <div>
                      <h3 className="text-base font-semibold text-ink">{e.title}</h3>
                      <p className="mt-1 text-[15px] leading-relaxed text-ink-2">{e.body}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── Honesty manifesto (brand drench) ─────────────────── */}
      <section className="bg-brand-ink">
        <div className="mx-auto max-w-4xl px-5 py-16 text-center lg:px-8 lg:py-20">
          <Reveal>
            <ScanEye size={30} strokeWidth={1.75} className="mx-auto text-white/75" aria-hidden="true" />
            <h2 className="mx-auto mt-5 max-w-3xl text-[clamp(1.9rem,3.6vw,2.8rem)] font-bold leading-tight text-white">
              We will never tell you a source is safe.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-[17px] leading-relaxed text-white/80">
              Authorization and authenticity can&rsquo;t be confirmed from the
              outside — and anyone who promises otherwise is guessing with your
              money. We show you what&rsquo;s observable, say plainly what we
              couldn&rsquo;t confirm, and give you the questions to verify it
              yourself. That honesty is the entire product.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ─────────────────────── Who it's for ─────────────────────── */}
      <section>
        <div className="mx-auto max-w-6xl px-5 py-12 lg:px-8 lg:py-16">
          <Reveal>
            <h2 className="mx-auto max-w-2xl text-center text-[clamp(1.75rem,3vw,2.4rem)] font-bold leading-tight text-ink">
              Built for sellers with real money on the line.
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {PROFILES.map((p, i) => (
              <Reveal key={p.title} delay={i * 90}>
                <div className="h-full rounded-[var(--radius-card)] border border-line bg-surface p-6 transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_10px_28px_-12px_rgba(26,25,23,0.18)]">
                  <h3 className="text-lg font-semibold text-ink">{p.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{p.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── Pricing ───────────────────────── */}
      <section id="pricing" className="scroll-mt-20 border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-12 lg:px-8 lg:py-16">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-[clamp(1.75rem,3vw,2.4rem)] font-bold leading-tight text-ink">
                Costs less than one bad buy.
              </h2>
              <p className="mt-4 text-lg text-ink-2">
                Subscribe for regular sourcing, or try a single report first.
                Either way, you pay for clarity before the capital moves.
              </p>
            </div>
          </Reveal>

          <div className="mx-auto mt-10 grid max-w-3xl gap-5 sm:grid-cols-2">
            {PLANS.map((plan, i) => (
              <Reveal key={plan.name} delay={i * 90}>
                <div
                  className={`flex h-full flex-col rounded-[var(--radius-card)] border bg-base p-7 ${
                    plan.popular ? "border-brand shadow-[0_0_0_1px_var(--color-brand)]" : "border-line"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-xl font-bold text-ink">{plan.name}</h3>
                    {plan.popular && (
                      <span className="rounded-full bg-brand-tint px-2.5 py-1 text-xs font-semibold text-brand-ink">
                        Most popular
                      </span>
                    )}
                  </div>
                  <p className="mt-4 flex items-baseline gap-1">
                    <span className="font-display text-4xl font-bold text-ink">{plan.price}</span>
                    <span className="text-ink-2">{plan.cadence}</span>
                  </p>
                  <p className="mt-1 text-sm text-ink-2">{plan.credits}</p>
                  <ul className="mt-6 space-y-3">
                    {plan.points.map((pt) => (
                      <li key={pt} className="flex gap-2.5 text-[15px] text-ink-2">
                        <Check size={18} strokeWidth={2.25} className="mt-0.5 flex-none text-brand" aria-hidden="true" />
                        {pt}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/sign-up"
                    className={`mt-7 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-base font-semibold transition-colors ${
                      plan.popular
                        ? "bg-brand text-white hover:bg-brand-hover"
                        : "border border-line-strong bg-surface text-ink hover:bg-subtle"
                    }`}
                  >
                    Get started
                    <ArrowRight size={18} aria-hidden="true" />
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <p className="mt-8 flex items-center justify-center gap-2 text-center text-[15px] text-ink-2">
              <FileText size={17} className="text-muted" aria-hidden="true" />
              Not ready to subscribe?{" "}
              <Link href="/sign-up" className="font-semibold text-brand hover:text-brand-hover">
                Try a single report from $79
              </Link>
            </p>
          </Reveal>
        </div>
      </section>

      {/* ───────────────────────── FAQ ───────────────────────── */}
      <section id="faq" className="scroll-mt-20">
        <div className="mx-auto max-w-6xl px-5 py-12 lg:px-8 lg:py-16">
          <Reveal>
            <h2 className="text-center text-[clamp(1.75rem,3vw,2.4rem)] font-bold leading-tight text-ink">
              Questions, answered straight.
            </h2>
          </Reveal>
          <Reveal>
            <div className="mt-10">
              <FAQ />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ───────────────────────── Final CTA ───────────────────────── */}
      <section className="border-t border-line bg-brand-tint">
        <div className="mx-auto max-w-4xl px-5 py-20 text-center lg:px-8">
          <Reveal>
            <h2 className="text-[clamp(1.75rem,3vw,2.4rem)] font-bold leading-tight text-ink">
              Run the check before you run the risk.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-ink-2">
              Your next wholesale decision is worth five minutes and a clear
              verdict.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <a
                href="#pricing"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-hover"
              >
                Get started
                <ArrowRight size={18} aria-hidden="true" />
              </a>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center rounded-full border border-line-strong bg-surface px-6 py-3 text-base font-semibold text-ink transition-colors hover:bg-subtle"
              >
                See how it works
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
