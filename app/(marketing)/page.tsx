import {
  ShieldQuestion,
  PackageX,
  Hourglass,
  ArrowRight,
  FileSearch,
  UserCheck,
  ScrollText,
  Boxes,
  ShieldAlert,
  Database,
  Check,
} from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/marketing/reveal";
import { DecisionSnapshot } from "@/components/marketing/decision-snapshot";
import { DashboardPreview } from "@/components/marketing/dashboard-preview";
import { ReportPreview } from "@/components/marketing/report-preview";
import { VERDICTS, type Verdict } from "@/components/marketing/verdict-badge";

const PROBLEMS = [
  {
    icon: ShieldQuestion,
    title: "Authorization is invisible from outside",
    body: "A confident invoice tells you nothing about whether the brand will stand behind the sale. That gap is where the money goes.",
  },
  {
    icon: PackageX,
    title: "The bad news arrives after you own it",
    body: "Gating, IP complaints, and counterfeit holds show up once the inventory is yours — when the capital is already committed.",
  },
  {
    icon: Hourglass,
    title: "By the time a brand enforces, you're stranded",
    body: "You're not negotiating a refund at that point. You're sitting on stock you can't sell, learning a lesson a signal could have flagged.",
  },
];

const OUTCOME_COPY: Record<Verdict, string> = {
  clear:
    "All observable indicators are consistent with credible wholesale sourcing. Proceed with standard due diligence.",
  conditional:
    "The source appears credible. Collect the listed items before you commit significant capital.",
  verify:
    "Important evidence is missing or unclear. Don't go past a test order until it's resolved.",
  deny:
    "Serious gaps or contradictions surfaced. Seek alternatives until the specific issues are resolved.",
};

const STEPS = [
  {
    icon: FileSearch,
    title: "Submit the vendor",
    body: "Vendor name, the brands you're evaluating, and an invoice or LOA if you have one. About two minutes.",
  },
  {
    icon: UserCheck,
    title: "We research, then a human reviews",
    body: "An AI pipeline works 60+ public data points across five dimensions. The founder reviews and approves every finding before it ships.",
  },
  {
    icon: ScrollText,
    title: "You get a Decision Snapshot",
    body: "A one-page verdict, the evidence behind it, and a checklist of exactly what to ask your vendor before you buy.",
  },
];

const PROFILES = [
  {
    title: "New supplier, first order",
    body: "You found a promising distributor. Before the opening PO, you want a second set of expert eyes on it.",
  },
  {
    title: "Adding a brand to your catalog",
    body: "The supplier checks out. The brand's enforcement posture is the open question — and it's the one that strands inventory.",
  },
  {
    title: "Burned before, done guessing",
    body: "You've eaten a gated ASIN or a counterfeit claim once. Never again on a signal someone could have caught.",
  },
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
    body: "Invoice risk and enforcement risk are never blended into one number. They're different questions, so they get different answers.",
  },
  {
    icon: Database,
    title: "A cache that compounds",
    body: "A proprietary database of vendors and brands that gets sharper with every case we run — so your reports get faster and deeper over time.",
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

export default function Home() {
  return (
    <>
      {/* ───────────────────────── Hero ───────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-8 lg:py-24">
          <div className="hq-rise">
            <h1 className="max-w-xl text-[clamp(2.5rem,5.4vw,4rem)] font-bold leading-[1.04] text-ink">
              Know your source before you commit the capital.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-2">
              HyprrIQ investigates the vendor and brand behind your next Amazon
              wholesale buy, then hands you a one-page verdict — and the exact
              questions to ask — so you decide on evidence, not a hunch.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
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
            <p className="mt-7 text-sm text-muted">
              60+ data points · 5 research dimensions · founder-reviewed · 4
              plain-English verdicts
            </p>
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

      {/* ─────────────────────── The problem ─────────────────────── */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-24">
          <Reveal>
            <h2 className="max-w-2xl text-[clamp(1.9rem,3.5vw,2.75rem)] font-bold leading-tight text-ink">
              A bad source never announces itself.
            </h2>
            <p className="mt-4 max-w-xl text-lg text-ink-2">
              The signals are out there before you buy. Reading them is the work.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {PROBLEMS.map((p, i) => (
              <Reveal key={p.title} delay={i * 90}>
                <p.icon size={26} strokeWidth={1.75} className="text-brand" aria-hidden="true" />
                <h3 className="mt-4 text-lg font-semibold text-ink">{p.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{p.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────── The four outcomes ──────────────────── */}
      <section id="outcomes" className="scroll-mt-20">
        <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-24">
          <Reveal>
            <h2 className="max-w-2xl text-[clamp(1.9rem,3.5vw,2.75rem)] font-bold leading-tight text-ink">
              Every report ends in one of four plain-English verdicts.
            </h2>
            <p className="mt-4 max-w-xl text-lg text-ink-2">
              No scores to decode, no false certainty. Just where the evidence
              actually lands — and what to do next.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {(Object.keys(VERDICTS) as Verdict[]).map((v, i) => {
              const meta = VERDICTS[v];
              const Icon = meta.icon;
              return (
                <Reveal key={v} delay={i * 80}>
                  <div className="flex h-full gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-6">
                    <div
                      className={`flex h-11 w-11 flex-none items-center justify-center rounded-full ${meta.bg} ${meta.ink}`}
                    >
                      <Icon size={22} strokeWidth={2.25} aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className={`text-lg font-semibold ${meta.ink}`}>{meta.label}</h3>
                      <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">
                        {OUTCOME_COPY[v]}
                      </p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─────────────────────── How it works ─────────────────────── */}
      <section id="how-it-works" className="scroll-mt-20 border-y border-line bg-surface">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-20 lg:grid-cols-2 lg:px-8 lg:py-24">
          <div>
            <Reveal>
              <h2 className="max-w-xl text-[clamp(1.9rem,3.5vw,2.75rem)] font-bold leading-tight text-ink">
                Three steps. Five business days. One clear answer.
              </h2>
            </Reveal>
            <ol className="mt-10 space-y-8">
              {STEPS.map((s, i) => (
                <Reveal key={s.title} as="li" delay={i * 90} className="flex gap-5">
                  <div className="flex flex-none flex-col items-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-tint text-brand-ink">
                      <s.icon size={20} strokeWidth={2} aria-hidden="true" />
                    </div>
                    {i < STEPS.length - 1 && <div className="mt-2 w-px flex-1 bg-line" />}
                  </div>
                  <div className="pb-2">
                    <h3 className="text-lg font-semibold text-ink">{s.title}</h3>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{s.body}</p>
                  </div>
                </Reveal>
              ))}
            </ol>
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
      </section>

      {/* ─────────────────────── Who it's for ─────────────────────── */}
      <section>
        <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-24">
          <Reveal>
            <h2 className="max-w-2xl text-[clamp(1.9rem,3.5vw,2.75rem)] font-bold leading-tight text-ink">
              Built for sellers with real money on the line.
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {PROFILES.map((p, i) => (
              <Reveal key={p.title} delay={i * 90}>
                <div className="h-full rounded-[var(--radius-card)] border border-line bg-surface p-6">
                  <h3 className="text-lg font-semibold text-ink">{p.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{p.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────── The intelligence edge ─────────────────── */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-20 lg:grid-cols-2 lg:px-8 lg:py-24">
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
              <h2 className="max-w-xl text-[clamp(1.9rem,3.5vw,2.75rem)] font-bold leading-tight text-ink">
                The depth behind the one page.
              </h2>
              <p className="mt-4 max-w-md text-lg text-ink-2">
                The verdict is short on purpose. The work behind it isn&rsquo;t.
              </p>
            </Reveal>
            <div className="mt-8 space-y-7">
              {EDGE.map((e, i) => (
                <Reveal key={e.title} delay={i * 90} className="flex gap-4">
                  <e.icon size={24} strokeWidth={1.75} className="mt-0.5 flex-none text-brand" aria-hidden="true" />
                  <div>
                    <h3 className="text-base font-semibold text-ink">{e.title}</h3>
                    <p className="mt-1 text-[15px] leading-relaxed text-ink-2">{e.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────── Pricing ───────────────────────── */}
      <section id="pricing" className="scroll-mt-20">
        <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-24">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-[clamp(1.9rem,3.5vw,2.75rem)] font-bold leading-tight text-ink">
                Costs less than one bad buy.
              </h2>
              <p className="mt-4 text-lg text-ink-2">
                Subscribe for regular sourcing, or try a single report first.
                Either way, you pay for clarity before the capital moves.
              </p>
            </div>
          </Reveal>

          <div className="mx-auto mt-12 grid max-w-3xl gap-5 sm:grid-cols-2">
            {PLANS.map((plan, i) => (
              <Reveal key={plan.name} delay={i * 90}>
                <div
                  className={`flex h-full flex-col rounded-[var(--radius-card)] border bg-surface p-7 ${
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
                    href="/portal"
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
            <p className="mt-8 text-center text-[15px] text-ink-2">
              Not ready to subscribe?{" "}
              <Link href="/portal" className="font-semibold text-brand hover:text-brand-hover">
                Try a single report from $79
              </Link>
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
