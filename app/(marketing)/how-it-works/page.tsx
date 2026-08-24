import type { Metadata } from "next";
import { Reveal } from "@/components/marketing/reveal";
import { PageHero, PageSection, Prose, RelatedLinks, PageCta } from "@/components/marketing/page-shell";
import { AREAS } from "@/lib/content/whatWeCheck";
import { VERDICT_COPY, VERDICT_SCALE_ORDER } from "@/lib/content/reportCopy";
import { CASE_SLA_HOURS, PLAN_BRAND_CAPS, PLAN_PRICE_LABEL } from "@/lib/constants/plans";
import { uploadPlanNames } from "@/lib/content/planFacts";

// /how-it-works — conversion support. The reader is close to buying and wants to know what happens.
//
// FOUNDER RULING 3 (2026-08-24) — the upload line now says what the server does. submit/route.ts
// REFUSES uploads on single_99, so a $99 buyer following an unqualified "upload it" hit a 400.
//
// THE PLAN NAMES ARE DERIVED, not typed. The ruling said "uploads are Growth and above", which is
// true of what is ON SALE but not of the predicate: planAcceptsUploads is "every plan except
// single_99", and that INCLUDES Single Deep ($149) — a one-time tier priced BELOW Growth, off sale
// only while KEEPA_LIVE is false. uploadPlanNames() intersects PLANS_ON_SALE with the predicate, so
// the sentence reads "Growth" today and gains Single Deep the day it opens, with no edit here.

export const metadata: Metadata = {
  title: "How It Works | HyprrIQ Supplier Reports",
  description:
    "Submit a supplier and the brands they claim. HyprrIQ assesses five areas and returns one written verdict within 24 hours, on every plan.",
  alternates: { canonical: "/how-it-works" },
};

export default function HowItWorksPage() {
  return (
    <>
      <PageHero
        title="How it works"
        lede={`Three steps. About two minutes of your time at the front, then ${CASE_SLA_HOURS} hours before the verdict lands.`}
        ground="pale"
      />

      <PageSection tone="surface">
        <ol className="space-y-10 sm:space-y-14">
          <Reveal as="li">
            <div className="border-t-2 border-anchor pt-5">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-anchor">
                Step one
              </span>
              <h2 className="mt-2 text-ink">You submit the supplier</h2>
              <Prose className="mt-3">
                <p>
                  Supplier name, their website, the brands they claim to carry, the marketplace you
                  sell on, and any paperwork you already have.
                </p>
                <p>
                  If you have an invoice or a quote, upload it — document review runs on{" "}
                  {uploadPlanNames().join(" and ")}. Documentation Review works from what you give
                  us.
                </p>
                <p>
                  <strong>
                    The {PLAN_PRICE_LABEL.single_99} single report takes no document upload.
                  </strong>{" "}
                  Documentation Review does not run on it, so there would be nothing to read — the
                  submit form does not accept a file on that plan.
                </p>
                <p>Takes about two minutes.</p>
              </Prose>
              <div className="mt-4 max-w-[68ch] rounded-card border border-line bg-mist p-4 sm:p-5">
                <p className="text-[15px] leading-[1.6] text-ink-2 sm:text-[16px]">
                  <b className="font-semibold text-ink">One credit, one supplier.</b> A credit is not
                  per brand. It covers one supplier, including up to your plan&rsquo;s brand limit —{" "}
                  {PLAN_BRAND_CAPS.single_99} brands on a single report, {PLAN_BRAND_CAPS.growth_279}{" "}
                  on Growth. {PLAN_BRAND_CAPS.growth_279} brands on one supplier is still one credit.
                  Two suppliers is two credits, however few brands each one has.
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal as="li">
            <div className="border-t-2 border-blue pt-5">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-blue">
                Step two
              </span>
              <h2 className="mt-2 text-ink">The work runs, and you can watch it</h2>
              <Prose className="mt-3">
                <p>
                  {AREAS.length} areas run in sequence:{" "}
                  {AREAS.map((a) => a.name).join(", ")}.
                </p>
                <p>
                  Your case page shows which area is running and which are complete, with the
                  deadline on screen. Nothing is hidden while the assessment is in progress, and you
                  never have to ask where it is.
                </p>
              </Prose>
            </div>
          </Reveal>

          <Reveal as="li">
            <div className="border-t-2 border-plum pt-5">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-plum">
                Step three
              </span>
              <h2 className="mt-2 text-ink">You get one verdict, and what sits behind it</h2>
              <Prose className="mt-3">
                <p>
                  One of {VERDICT_SCALE_ORDER.length}:{" "}
                  {VERDICT_SCALE_ORDER.map((k, i) => (
                    <span key={k}>
                      <strong>{VERDICT_COPY[k].name}</strong>
                      {i < VERDICT_SCALE_ORDER.length - 2 ? ", " : i === VERDICT_SCALE_ORDER.length - 2 ? ", or " : ""}
                    </span>
                  ))}
                  . Written out in full, so it reads the same to everyone.
                </p>
                <p>
                  With it you get the findings and every source behind them, each marked{" "}
                  <strong>Verified</strong> or <strong>Assessed</strong>. Then two sections that most
                  of this market leaves out:
                </p>
              </Prose>
              <div className="mt-4 grid max-w-[68ch] gap-3 sm:grid-cols-2">
                <div className="rounded-card border border-line bg-blue-tint p-4">
                  <h3 className="text-ink">What we could not confirm</h3>
                  <p className="mt-1.5 text-[15px] leading-[1.55] text-ink-2">
                    The specific things we could not establish, in every report, including the clean
                    ones.
                  </p>
                </div>
                <div className="rounded-card border border-line bg-cyan-tint p-4">
                  <h3 className="text-ink">Questions to put to this supplier</h3>
                  <p className="mt-1.5 text-[15px] leading-[1.55] text-ink-2">
                    Written for the supplier you actually have, not a generic checklist. Send them as
                    they are.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </ol>
      </PageSection>

      <PageSection tone="mist">
        <h2 className="text-ink">{CASE_SLA_HOURS} hours, every plan</h2>
        <Prose className="mt-3">
          <p>
            The delivery commitment is {CASE_SLA_HOURS} hours and it does not change by price. It is
            the same on a single report as on a monthly plan.
          </p>
        </Prose>
      </PageSection>

      <PageSection tone="surface">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
          <div>
            <h2 className="text-ink">What you need before you start</h2>
            <Prose className="mt-3">
              <p>
                Not much. The supplier&rsquo;s name and website is enough to begin. Brand names make
                the Brand Risk area sharper. Paperwork makes Documentation Review possible.
              </p>
              <p>You do not need to have placed an order, and it is better if you have not.</p>
            </Prose>
          </div>
          <div>
            <h2 className="text-ink">Who can buy</h2>
            <Prose className="mt-3">
              <p>
                US-based clients only at launch. The suppliers themselves can be anywhere in the
                world — that is usually the point.
              </p>
            </Prose>
          </div>
        </div>
        <RelatedLinks
          links={[
            { label: "What we check", href: "/what-we-check" },
            { label: "Pricing", href: "/pricing" },
            { label: "See a real redacted report", href: "/sample-report" },
            { label: "Our method", href: "/method" },
            { label: "Questions", href: "/faq" },
          ]}
        />
      </PageSection>

      <PageCta
        title="Two minutes in. One verdict back."
        body={`Send us a supplier and the brands they claim. The report is in your portal within ${CASE_SLA_HOURS} hours.`}
        cta="See pricing"
        href="/pricing"
      />
    </>
  );
}
