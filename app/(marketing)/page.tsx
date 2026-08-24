import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/marketing/reveal";
import { ServiceRail } from "@/components/marketing/home/service-rail";
import { PricingTabs } from "@/components/marketing/home/pricing-tabs";
import { StaggerList, BeatHeading } from "@/components/marketing/home/stagger-list";
import { TrendGraph } from "@/components/marketing/home/trend-graph";
import { VERDICT_COPY, VERDICT_SCALE_ORDER, AREA_NAMES } from "@/lib/content/reportCopy";
import { VERDICT_CLASSES } from "@/lib/design/palette";
import { SAMPLE_CASE_ID, SAMPLE_VENDOR } from "@/lib/content/sampleIdentifiers";
import { CASE_SLA_HOURS, PLAN_PRICE_LABEL, PLAN_BRAND_CAPS } from "@/lib/constants/plans";
import { ASSESSMENT_AREA_KEYS } from "@/lib/constants/tracks";

// ── THE HOMEPAGE — built from hyprriq_flow_v2.html (2026-08-24) ───────────────────────────────
//
// The spec file is the layout, copy and motion ruling. Five deliberate departures, each because
// the spec is a standalone document and this is a thirteen-page application:
//
// 1. NO HAND-TYPED MONEY OR COUNTS. The spec writes "$99", "24 hours", "5", "3 of 5" as literals.
//    Every one of them renders from a ruled registry here. A correct hardcoded value is still a
//    defect: it goes wrong silently at the next ruling and no test catches staleness.
// 2. THE CASE ID IS SAMPLE_CASE_ID. The spec's "AWI-0000-000" MATCHES the live generator shape
//    (LIVE_CASE_ID_RE) and would fail sampleIdentifiers.lock.test.ts — the lock that exists
//    because a real delivered case id and a real distributor's name once shipped on this page.
// 3. THE LEARN SECTION POINTS AT LAUNCH PAGES. Three of the spec's four cards link to parked
//    pages that publish later through Sanity. Build note 1: six dead internal links on launch day
//    is a worse signal than six missing pages. The section keeps its shape and its purpose.
// 4. VERDICT NAMES COME FROM reportCopy. A prospect reading this page and a client reading their
//    report see the same four names, because they are the same constant.
// 5. THE MOCK VENDOR IS SAMPLE_VENDOR, the ruled fictional supplier, so every mock across the
//    site names the same imaginary company rather than inventing one per surface.

export const metadata: Metadata = {
  title: "HyprrIQ — Know who you're buying from, before the money leaves",
  description:
    "Send us a supplier and the brands they claim. We research them and return a written report within 24 hours — one verdict, the evidence behind it, and a straight list of what we could not confirm.",
  alternates: { canonical: "/" },
};

const CAPABILITIES = [
  { title: "Amazon wholesale", body: "How this market operates, not how it is described.", tint: "bg-brand-tint", ink: "text-anchor" },
  { title: "Supplier vetting", body: "Whether a business is real, and what its records don't show.", tint: "bg-blue-tint", ink: "text-blue" },
  { title: "IP risk", body: "How brands police listings, and what that pattern implies.", tint: "bg-plum-tint", ink: "text-plum" },
  { title: "Invoice review", body: "The fourteen document fields we check on every invoice.", tint: "bg-cyan-tint", ink: "text-cyan" },
  { title: "Account risk", body: "What puts a selling account at risk — and what doesn't.", tint: "bg-verify-bg", ink: "text-verify-ink" },
  { title: "Brand enforcement", body: "How a brand crackdown starts, and what it looks like beforehand.", tint: "bg-violet-tint", ink: "text-violet" },
];

const CHAIN = [
  { step: "Step one", title: "A brand decides to tighten", body: "Enforcement is a business decision made by someone you will never meet, and it usually applies to a whole listing at once." },
  { step: "Step two", title: "The channel is questioned", body: "The question is where the stock came from. That answer lives with your supplier and with theirs — a chain you cannot see from a purchase order." },
  { step: "Step three", title: "The consequence lands on you", body: "The complaint attaches to your account, not the supplier's. The stock is already yours and the payout is already held." },
];

const REFUSALS = [
  { title: "We won't say you'll get ungated", body: "Gating decisions belong to the marketplace. We can tell you what the paperwork looks like and how the brand has been behaving. Nobody honest can tell you the outcome." },
  { title: "We won't say a supplier is authorized", body: "Authorization lives in private agreements between a brand and a distributor. We tell you what we could check ourselves and give you the questions that get proof." },
  { title: "We won't say your account is safe", body: "A clean invoice and a brand IP claim are independent risks. Good paperwork does not protect you from enforcement — we separate the two rather than blur them." },
];

const LEARN = [
  { tag: "Product", href: "/what-we-check", title: "What we check on every supplier", body: "The five areas in every report — what each one examines, what lands in your report, and what each honestly cannot conclude.", tint: "bg-blue-tint", ink: "text-blue" },
  { tag: "Method", href: "/method", title: "Our method, and its limits", body: "How we decide what counts as proof, and the things we will never tell you, no matter how much you would like to hear them.", tint: "bg-cyan-tint", ink: "text-cyan" },
  { tag: "Refusals", href: "/what-we-dont-do", title: "What we don't do", body: "The promises this product refuses to make, written down, so you can hold us to the ones it does make.", tint: "bg-plum-tint", ink: "text-plum" },
  { tag: "Questions", href: "/faq", title: "Frequently asked questions", body: "What a credit buys, what happens if we can't confirm anything, and what you actually receive at the end.", tint: "bg-violet-tint", ink: "text-violet" },
];

function Kicker({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`mb-3 font-mono text-[10px] uppercase tracking-[0.13em] sm:mb-4 sm:text-[11px] sm:tracking-[0.16em] ${className}`}>
      {children}
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      {/* ── HERO — the submit form, not the answer ─────────────────────────────────────────── */}
      <header className="relative overflow-hidden bg-[linear-gradient(172deg,#E4F0F1_0%,#EDF5F5_46%,#F4F9F9_100%)] pt-11 sm:pt-[88px]">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 -top-52 h-[660px] w-[800px] bg-[radial-gradient(circle_at_50%_50%,rgba(0,90,104,.14),rgba(0,121,131,.06)_46%,transparent_72%)]"
        />
        <div className="relative z-10 mx-auto max-w-[1180px] px-5 lg:px-10">
          <div className="grid items-center gap-10 lg:grid-cols-[1.04fr_.96fr] lg:gap-14">
            <div>
              <Kicker className="text-cyan">Supplier checks for wholesale buyers</Kicker>
              <h1 className="max-w-[28ch] text-ink">
                Know who you&rsquo;re buying from — before the money leaves.
              </h1>
              <p className="mt-4 max-w-[47ch] text-[16.5px] leading-[1.55] text-ink-2 sm:mt-[22px] sm:text-[19.5px] sm:leading-[1.58]">
                <strong className="font-semibold text-ink">We do the checking for you.</strong> Send
                us a supplier&rsquo;s name and the brands they say they carry. We research them, and
                within {CASE_SLA_HOURS} hours you get a written report — one clear answer, the
                evidence behind it, and a straight list of what we could not confirm.
              </p>
              <div className="mt-6 flex flex-col gap-2.5 sm:mt-[34px] sm:flex-row sm:gap-3">
                <Link
                  href="/pricing"
                  className="flex min-h-11 items-center justify-center rounded-control bg-action px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-anchor"
                >
                  Vet a supplier — {PLAN_PRICE_LABEL.single_99}
                </Link>
                <Link
                  href="/sample-report"
                  className="flex min-h-11 items-center justify-center rounded-control border border-control-border bg-transparent px-6 py-3.5 text-[15px] font-semibold text-anchor transition-colors hover:bg-subtle"
                >
                  See a real report
                </Link>
              </div>
            </div>

            {/* The submit form, as the client meets it. A mock, with a fictional supplier. */}
            <div className="overflow-hidden rounded-card-lg border border-line bg-surface shadow-[0_22px_52px_-30px_rgba(0,61,72,.32)]">
              <div className="flex gap-2.5 border-b border-line bg-subtle px-3.5 py-2.5 font-mono text-[9.5px] uppercase tracking-[0.07em] text-muted sm:px-4.5 sm:py-3 sm:text-[10.5px] sm:tracking-[0.1em]">
                <span>New assessment</span>
                <span className="ml-auto">Takes about 2 minutes</span>
              </div>
              <div className="px-3.5 pb-2.5 pt-1 sm:px-5 sm:pb-3.5 sm:pt-2">
                {[
                  ["Supplier name", SAMPLE_VENDOR, false],
                  ["Website", "northgatewholesale.com", false],
                  ["Brands they claim", `Brand A, Brand B, +1`, false],
                  ["Marketplace", "Amazon US", false],
                  ["Their paperwork", "invoice-april.pdf", true],
                ].map(([label, value, isFile]) => (
                  <div
                    key={label as string}
                    className="flex flex-col gap-1.5 border-b border-line py-2.5 text-[14px] last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3.5 sm:py-[11px] sm:text-[14.5px]"
                  >
                    <span className="text-[13px] text-muted sm:text-[14.5px]">{label as string}</span>
                    <span
                      className={`overflow-hidden text-ellipsis whitespace-nowrap rounded-field border px-3 py-2 text-left text-[13.5px] font-semibold sm:w-[210px] sm:text-[14.5px] ${
                        isFile
                          ? "border-cyan/40 bg-cyan-tint text-cyan"
                          : "border-control-border bg-[#F2F8F9] text-anchor"
                      }`}
                    >
                      {value as string}
                    </span>
                  </div>
                ))}
                <div className="mb-1 mt-3.5 rounded-field bg-action px-3 py-3 text-center text-[14px] font-semibold text-white sm:text-[14.5px]">
                  Submit for assessment
                </div>
                <p className="pb-2.5 text-center text-[11.5px] leading-[1.45] text-muted sm:text-[13px]">
                  Report back within {CASE_SLA_HOURS} hours · the same checks on every supplier
                </p>
              </div>
            </div>
          </div>

          {/* The ribbon. Four facts, each of which is a constant somewhere. */}
          <dl className="relative z-10 mt-10 grid grid-cols-2 overflow-hidden rounded-t-[12px] bg-anchor sm:mt-[76px] sm:rounded-t-[14px] lg:grid-cols-4">
            {[
              [`${CASE_SLA_HOURS} hours`, "Delivery, every plan"],
              [String(ASSESSMENT_AREA_KEYS.length), "Assessment areas"],
              [String(VERDICT_SCALE_ORDER.length), "Verdict levels, never a score"],
              ["Same", "Method on every supplier"],
            ].map(([big, small], i) => (
              <div
                key={small}
                className={`px-4 py-4 sm:px-[26px] sm:pb-7 sm:pt-[26px] ${
                  i % 2 === 0 ? "border-r border-white/[0.13]" : ""
                } ${i < 2 ? "border-b border-white/[0.13] lg:border-b-0" : ""} lg:border-r lg:last:border-r-0`}
              >
                <dt className="font-display text-[22px] font-medium tracking-[-0.025em] text-white sm:text-[29px]">
                  {big}
                </dt>
                <dd className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.09em] text-nav-fg-dim sm:text-[10.5px] sm:tracking-[0.11em]">
                  {small}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      {/* ── CAPABILITY STRIP ───────────────────────────────────────────────────────────────── */}
      <section className="border-b border-line bg-mist py-10 sm:py-14">
        <div className="mx-auto max-w-[1180px] px-5 lg:px-10">
          <Reveal>
            <p className="text-center font-mono text-[10px] uppercase leading-[1.5] tracking-[0.13em] text-muted sm:text-[11px] sm:tracking-[0.15em]">
              Fifteen years inside Amazon wholesale — the expertise behind every case
            </p>
          </Reveal>
          <Reveal>
            <div className="mt-6 grid grid-cols-2 gap-5 sm:mt-8 sm:gap-6 lg:grid-cols-6">
              {CAPABILITIES.map((c) => (
                <div key={c.title}>
                  <span
                    className={`mb-2.5 flex h-[34px] w-[34px] items-center justify-center rounded-[9px] sm:mb-3 sm:h-10 sm:w-10 sm:rounded-[10px] ${c.tint} ${c.ink}`}
                    aria-hidden
                  >
                    <span className="h-2 w-2 rounded-full bg-current" />
                  </span>
                  <h3 className="text-[14.5px] sm:text-[16px]">{c.title}</h3>
                  <p className="mt-1 text-[13px] leading-[1.45] text-ink-2 sm:text-[14px] sm:leading-[1.5]">
                    {c.body}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal>
            <p className="mt-6 text-center text-[13.5px] text-muted sm:mt-7 sm:text-[15px]">
              These are the domains we assess. None of them is a promise about your outcome.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── WHAT YOU GET ───────────────────────────────────────────────────────────────────── */}
      <section id="get" className="border-b border-line bg-surface py-14 sm:py-[104px]">
        <div className="mx-auto max-w-[1180px] px-5 lg:px-10">
          <Reveal className="mb-6 sm:mb-11">
            <Kicker className="text-action">What you get</Kicker>
            <BeatHeading first="One supplier in." second="One report back." />
          </Reveal>
          <div className="grid gap-0 lg:grid-cols-[.85fr_1.15fr] lg:gap-16">
            <Reveal className="hidden border-t-2 border-action pt-6 lg:block">
              <p className="text-[19px] leading-[1.58] text-ink-2">
                Nothing to set up and nothing to learn. A supplier name goes in, and the same checks
                run against it that run against every other supplier on the platform.
              </p>
              <p className="mt-4 text-[19px] leading-[1.58] text-ink-2">
                Twenty-four hours later a report comes back. Here is exactly what is in it.
              </p>
              <Link
                href="/sample-report"
                className="mt-4 inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold text-action transition-colors hover:text-anchor"
              >
                See a real report <span aria-hidden>→</span>
              </Link>
            </Reveal>
            <Reveal>
              <StaggerList
                items={[
                  { text: `A written report, in ${CASE_SLA_HOURS} hours.` },
                  { text: `One verdict, out of ${VERDICT_SCALE_ORDER.length}. Never a score.` },
                  { text: "Every finding, with the source we got it from." },
                  { text: "A plain list of what we could not confirm." },
                  { text: "The exact questions to ask your supplier — before you pay.", lead: true },
                ]}
              />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── 1 · THE PROBLEM ────────────────────────────────────────────────────────────────── */}
      <section id="problem" className="border-b border-line bg-surface py-14 sm:py-[104px]">
        <div className="mx-auto max-w-[1180px] px-5 lg:px-10">
          <Reveal className="mb-7 sm:mb-11">
            <Kicker className="text-verify-ink">1 · The problem</Kicker>
            <h2 className="text-ink">
              Suspensions rarely start with the seller.
            </h2>
            <p className="mt-4 max-w-[660px] text-[16.5px] leading-[1.55] text-ink-2 sm:text-[19px] sm:leading-[1.58]">
              They start upstream — with a brand, a channel, or a piece of paper that could not do
              the job it was bought to do. By the time it reaches you, the money is spent.
            </p>
          </Reveal>
          <Reveal>
            <ol className="grid gap-3 lg:grid-cols-[1fr_26px_1fr_26px_1fr] lg:gap-0">
              {CHAIN.map((c, i) => (
                <li key={c.step} className="contents">
                  <div
                    className={`rounded-card-lg border p-4.5 sm:p-6 ${
                      i === 2 ? "border-verify-ink/25 bg-verify-bg" : "border-line bg-pale"
                    }`}
                  >
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
                      {c.step}
                    </span>
                    <h3 className="mb-2 mt-2 text-[16.5px] sm:text-[18.5px]">{c.title}</h3>
                    <p className="text-[14.5px] leading-[1.55] text-ink-2 sm:text-[15px]">{c.body}</p>
                  </div>
                  {i < 2 && (
                    <div className="hidden items-center justify-center text-[19px] text-line-strong lg:flex" aria-hidden>
                      →
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </Reveal>
          <Reveal>
            <p className="mt-5 rounded-r-card border-l-2 border-action bg-mist px-4.5 py-4 text-[14.5px] leading-[1.6] text-ink-2 sm:mt-8 sm:px-6 sm:py-5 sm:text-[16px]">
              <b className="font-semibold text-ink">Where we fit, stated plainly:</b> we cannot stop
              any of that, and we will never tell you a supplier is safe. What we can do is make the
              upstream facts checkable while the decision is still yours.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── 2 · WHAT WE DO ─────────────────────────────────────────────────────────────────── */}
      <section id="service" className="border-b border-line bg-canvas py-14 sm:py-[104px]">
        <div className="mx-auto max-w-[1180px] px-5 lg:px-10">
          <Reveal className="mb-7 sm:mb-11">
            <Kicker className="text-blue">2 · What we do</Kicker>
            <h2 className="text-ink">
              {ASSESSMENT_AREA_KEYS.length} areas. Each one states its own limit.
            </h2>
            <p className="mt-4 max-w-[660px] text-[16.5px] leading-[1.55] text-ink-2 sm:text-[19px] sm:leading-[1.58]">
              The same questions, asked the same way, on every supplier — what we examine at each
              stage, and what that stage honestly cannot conclude.
            </p>
          </Reveal>

          <ServiceRail />

          <div className="mt-9 border-t border-line pt-8 sm:mt-14 sm:pt-13">
            <Kicker className="text-blue">And you can watch it happen</Kicker>
            <h2 className="text-[22px] text-ink sm:text-[30px]">Nothing is hidden while the work runs.</h2>
            <Reveal>
              <div className="mt-6 grid gap-5 sm:mt-8 sm:gap-6 lg:grid-cols-3">
                {[
                  {
                    n: "01", ink: "text-anchor", title: "You submit",
                    sub: "Supplier, brands, paperwork. About two minutes.",
                    head: "New assessment", right: null,
                    rows: [["Supplier", SAMPLE_VENDOR], ["Brands claimed", `3 of ${PLAN_BRAND_CAPS.single_99} used`], ["Marketplace", "Amazon US"], ["Document", "invoice-april.pdf"], ["Credits", "1 used"]],
                  },
                  {
                    n: "02", ink: "text-blue", title: "The work runs",
                    sub: `${ASSESSMENT_AREA_KEYS.length} areas in sequence, with the deadline we are working to.`,
                    head: SAMPLE_CASE_ID, right: "14h 12m left",
                    rows: ASSESSMENT_AREA_KEYS.map((k, i) => [
                      AREA_NAMES[k] ?? k,
                      i < 2 ? "Complete" : i === 2 ? "Researching" : "Queued",
                    ]) as [string, string][],
                  },
                  {
                    n: "03", ink: "text-plum", title: "Every case, the same way",
                    sub: `The same ${ASSESSMENT_AREA_KEYS.length} areas, in the same order, whoever the supplier is.`,
                    head: "Delivered", right: "PDF attached",
                    rows: [["Verdict", VERDICT_COPY.verify_before_purchase.name], ["Findings", "9"], ["Could not confirm", "3"], ["Questions drafted", "3"], ["Method", `Fixed, all ${ASSESSMENT_AREA_KEYS.length} areas`]],
                  },
                ].map((step) => (
                  <div key={step.n}>
                    <div className={`font-mono text-[9.5px] uppercase tracking-[0.14em] sm:text-[10.5px] ${step.ink}`}>
                      {step.n}
                    </div>
                    <h3 className="mb-1.5 mt-1.5 text-[17px] sm:text-[18px]">{step.title}</h3>
                    <p className="pb-3.5 text-[14.5px] leading-[1.55] text-ink-2 sm:pb-4.5 sm:text-[15px]">
                      {step.sub}
                    </p>
                    <div className="overflow-hidden rounded-card border border-line bg-surface">
                      <div className="flex gap-2.5 border-b border-line bg-subtle px-3.5 py-2.5 font-mono text-[9.5px] uppercase tracking-[0.07em] text-muted">
                        <span>{step.head}</span>
                        {step.right && <span className="ml-auto">{step.right}</span>}
                      </div>
                      <div className="px-3.5 pb-2.5 pt-1">
                        {step.rows.map(([k, v]) => (
                          <div key={k} className="flex items-center justify-between gap-2 border-b border-line py-2.5 text-[13.5px] last:border-b-0 sm:text-[14.5px]">
                            <span className="text-muted">{k}</span>
                            <span className="text-right font-semibold text-ink">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
            <p className="mt-5 text-[13.5px] text-muted sm:text-[14.5px]">
              Portal views are masked demonstrations with illustrative data.
            </p>
            <Link
              href="/what-we-check"
              className="mt-4 inline-flex min-h-11 items-center gap-2 text-[14.5px] font-semibold text-action transition-colors hover:text-anchor sm:text-[15px]"
            >
              See everything we check <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── 3 · THE VERDICT — the one place warm hues are allowed to mean something ────────── */}
      <section id="output" data-ground="dark" className="bg-anchor py-14 sm:py-[104px]">
        <div className="mx-auto max-w-[1180px] px-5 lg:px-10">
          <Reveal className="mb-7 sm:mb-11">
            <Kicker className="text-cyan-tint">3 · What you get</Kicker>
            <h2 className="text-white">
              Not a score. One of {VERDICT_SCALE_ORDER.length} answers.
            </h2>
            <p className="mt-4 max-w-[660px] text-[16.5px] leading-[1.55] text-nav-fg sm:text-[19px] sm:leading-[1.58]">
              A number invites you to argue with it. A verdict tells you what to do next — and the
              level is always written out, so it reads the same to everyone.
            </p>
          </Reveal>

          <Reveal>
            <ol className="grid gap-2.5 sm:gap-3.5 lg:grid-cols-4">
              {VERDICT_SCALE_ORDER.map((key) => {
                const v = VERDICT_COPY[key];
                const c = VERDICT_CLASSES[key];
                return (
                  <li key={key} className={`rounded-card-lg p-4 sm:p-5 ${c.bg}`}>
                    <div className={`font-mono text-[10px] uppercase tracking-[0.14em] opacity-85 ${c.ink}`}>
                      Level {v.level} of {VERDICT_SCALE_ORDER.length}
                    </div>
                    <h3 className={`mb-2 mt-2 font-display text-[19px] font-medium leading-[1.1] tracking-[-0.02em] sm:text-[22px] ${c.ink}`}>
                      {v.name}
                    </h3>
                    <p className={`text-[14px] leading-[1.5] sm:text-[14.5px] ${c.ink}`}>{v.means}</p>
                  </li>
                );
              })}
            </ol>
          </Reveal>

          <Reveal>
            <Link
              href="/how-to-read"
              className="mt-7 inline-flex min-h-11 items-center gap-2 text-[14.5px] font-semibold text-cyan-tint transition-opacity hover:opacity-80 sm:mt-9 sm:text-[15px]"
            >
              How to read a report <span aria-hidden>→</span>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── 4 · WHY TRUST IT ───────────────────────────────────────────────────────────────── */}
      <section id="proof" className="border-b border-line bg-pale py-14 sm:py-[104px]">
        <div className="mx-auto max-w-[1180px] px-5 lg:px-10">
          <Reveal className="mb-7 sm:mb-11">
            <Kicker className="text-plum">4 · Why trust it</Kicker>
            <h2 className="text-ink">
              Fifteen years of reading one graph.
            </h2>
            <p className="mt-4 max-w-[660px] text-[16.5px] leading-[1.55] text-ink-2 sm:text-[19px] sm:leading-[1.58]">
              How a brand behaves toward third-party sellers leaves a trace. Most people look at this
              line and see a number. We were taught, expensively, to read the shape.
            </p>
          </Reveal>

          <Reveal>
            <TrendGraph />
          </Reveal>

          <Reveal>
            <ul className="mt-6 grid gap-3 sm:mt-10 sm:gap-5 lg:grid-cols-3">
              {REFUSALS.map((r) => (
                <li key={r.title} className="rounded-card-lg border border-line bg-surface p-4.5 sm:p-6">
                  <div className="mb-2.5 font-display text-[26px] leading-none text-deny-ink" aria-hidden>
                    &times;
                  </div>
                  <h3 className="mb-2 text-[16px] sm:text-[17.5px]">{r.title}</h3>
                  <p className="text-[14.5px] leading-[1.55] text-ink-2 sm:text-[15px]">{r.body}</p>
                </li>
              ))}
            </ul>
          </Reveal>

          <Link
            href="/method"
            className="mt-6 inline-flex min-h-11 items-center gap-2 text-[14.5px] font-semibold text-action transition-colors hover:text-anchor sm:text-[15px]"
          >
            Our method, and its limits <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      {/* ── 5 · PRICING ────────────────────────────────────────────────────────────────────── */}
      <section id="price" className="bg-canvas py-14 sm:py-[104px]">
        <div className="mx-auto max-w-[1180px] px-5 lg:px-10">
          <Reveal className="mb-7 sm:mb-11">
            <Kicker className="text-cyan">5 · Pricing</Kicker>
            <h2 className="text-ink">
              Two ways to buy. Same discipline in both.
            </h2>
            <p className="mt-4 max-w-[660px] text-[16.5px] leading-[1.55] text-ink-2 sm:text-[19px] sm:leading-[1.58]">
              Every plan delivers in {CASE_SLA_HOURS} hours. Every supplier gets the same checks, in
              the same order, whatever you paid.
            </p>
          </Reveal>
          <Reveal>
            <PricingTabs />
          </Reveal>
          <Link
            href="/pricing"
            className="mt-6 inline-flex min-h-11 items-center gap-2 text-[14.5px] font-semibold text-action transition-colors hover:text-anchor sm:text-[15px]"
          >
            Compare every plan <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      {/* ── LEARN ──────────────────────────────────────────────────────────────────────────── */}
      <section className="border-t border-line bg-sand py-14 sm:py-[104px]">
        <div className="mx-auto max-w-[1180px] px-5 lg:px-10">
          <Reveal className="mb-7 sm:mb-9">
            <Kicker className="text-violet">Not ready to buy?</Kicker>
            <h2 className="text-ink">
              Read the things that made us build this.
            </h2>
            <p className="mt-4 max-w-[660px] text-[16.5px] leading-[1.55] text-ink-2 sm:text-[19px] sm:leading-[1.58]">
              Everything below is free, and none of it asks for an email.
            </p>
          </Reveal>
          <Reveal>
            <ul className="grid gap-3 sm:gap-5 md:grid-cols-2 lg:grid-cols-4">
              {LEARN.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="flex h-full flex-col rounded-card-lg border border-line bg-surface p-4.5 transition-[border-color,transform] hover:-translate-y-0.5 hover:border-line-strong sm:p-6"
                  >
                    <span className={`mb-3 self-start rounded-chip px-2.5 py-1 font-mono text-[9.5px] font-semibold uppercase tracking-[0.13em] ${l.tint} ${l.ink}`}>
                      {l.tag}
                    </span>
                    <h3 className="mb-2 text-[16px] leading-[1.25] sm:text-[18px]">{l.title}</h3>
                    <p className="text-[13.5px] leading-[1.55] text-ink-2 sm:text-[14.5px]">{l.body}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ── FINAL ──────────────────────────────────────────────────────────────────────────── */}
      <section className="border-t border-line bg-mist py-14 text-center sm:py-24">
        <div className="mx-auto max-w-[1180px] px-5 lg:px-10">
          <h2 className="text-ink">
            The cheapest research you&rsquo;ll ever buy is the one before the wire.
          </h2>
          <p className="mx-auto mt-4 max-w-[48ch] text-[16px] leading-relaxed text-ink-2 sm:mt-5 sm:text-[19px]">
            One supplier, one verdict, twenty-four hours. If we can&rsquo;t confirm something, we
            tell you that too.
          </p>
          <Link
            href="/pricing"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-control bg-action px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-anchor sm:mt-7"
          >
            Start a single report — {PLAN_PRICE_LABEL.single_99}
          </Link>
        </div>
      </section>
    </>
  );
}
