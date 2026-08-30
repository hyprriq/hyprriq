import type { Metadata } from "next";
import { Reveal } from "@/components/marketing/reveal";
import { PageHero, PageSection, Prose, LimitNote, RelatedLinks, PageCta } from "@/components/marketing/page-shell";
import { AREAS, CERTAINTY } from "@/lib/content/whatWeCheck";
import { CASE_SLA_HOURS } from "@/lib/constants/plans";
import { ASSESSMENT_AREA_KEYS } from "@/lib/constants/tracks";
import { MaskedInvoice } from "@/components/marketing/graphics/masked-invoice";

// /what-we-check — the full version of the five areas. The homepage rail is the summary, and BOTH
// render from lib/content/whatWeCheck.ts so the two cannot drift (dev brief build note 4).

export const metadata: Metadata = {
  title: "What We Check on a Wholesale Supplier | HyprrIQ",
  description:
    "The five areas in every HyprrIQ report — what each one examines, what lands in your report, and what each area honestly cannot conclude about a supplier.",
  alternates: { canonical: "/what-we-check" },
};

export default function WhatWeCheckPage() {
  return (
    <>
      <PageHero
        title="What we check on every supplier"
        lede={`${ASSESSMENT_AREA_KEYS.length} areas. The same ${ASSESSMENT_AREA_KEYS.length}, in the same order, on every supplier — whoever they are and whatever we find in the first one.`}
        ground="pale"
      />

      <PageSection tone="surface">
        <Prose>
          <p>
            Each area below states what it examines, what lands in your report, and what it cannot
            conclude. The limits are not disclaimers. They are the reason the rest is worth reading.
          </p>
        </Prose>

        <div className="mt-10 space-y-10 sm:mt-12 sm:space-y-14">
          {AREAS.map((a, i) => (
            <Reveal key={a.key} as="div">
              <article className="border-t border-line pt-6 sm:pt-8">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-[11px] text-muted">0{i + 1}</span>
                  <h2 className="text-ink">{a.name}</h2>
                </div>
                <p className="mt-2 text-[17px] font-semibold text-ink-2 sm:text-[19px]">
                  {a.question}
                </p>

                <Prose className="mt-4">
                  {a.full.map((p) => (
                    <p key={p.slice(0, 40)}>{p}</p>
                  ))}
                </Prose>

                <div className="mt-5 grid overflow-hidden rounded-card border border-line sm:grid-cols-2">
                  <div className="border-b border-line bg-surface p-4 sm:border-b-0 sm:border-r">
                    <div className="font-mono text-[9.5px] uppercase tracking-[0.13em] text-muted">
                      What the assessment examines
                    </div>
                    <p className="mt-1.5 text-[14.5px] leading-[1.5] text-ink-2">{a.examines}</p>
                  </div>
                  <div className="bg-surface p-4">
                    <div className="font-mono text-[9.5px] uppercase tracking-[0.13em] text-muted">
                      What lands in your report
                    </div>
                    <p className="mt-1.5 text-[14.5px] leading-[1.5] text-ink-2">{a.delivers}</p>
                  </div>
                </div>

                {/* THE MASKED INVOICE, under Documentation Review and nowhere else. It is the one
                    area where showing the work beats describing it — "a fourteen-point read" means
                    nothing until a reader can see and count the points. Every callout says what is
                    CHECKED, never that a field is wrong. */}
                {a.key === "documentation_review" && <MaskedInvoice className="mt-6" />}

                <div className="max-w-[68ch]">
                  <LimitNote>{a.limit}</LimitNote>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </PageSection>

      <PageSection tone="mist">
        <h2 className="text-ink">{CERTAINTY.heading}</h2>
        <Prose className="mt-3">
          <p>{CERTAINTY.intro}</p>
          <p>
            <strong>Verified</strong> {CERTAINTY.verified}
          </p>
          <p>
            <strong>Assessed</strong> {CERTAINTY.assessed}
          </p>
          <p>{CERTAINTY.closing}</p>
        </Prose>
      </PageSection>

      <PageSection tone="surface">
        <h2 className="text-ink">What happens next</h2>
        <Prose className="mt-3">
          <p>
            One verdict, in {CASE_SLA_HOURS} hours, on every plan. The same questions, asked the same
            way, every time.
          </p>
        </Prose>
        <RelatedLinks
          links={[
            { label: "How it works", href: "/how-it-works" },
            { label: "Our method and its limits", href: "/method" },
            { label: "See a real redacted report", href: "/sample-report" },
            { label: "What we don't do", href: "/what-we-dont-do" },
            { label: "Pricing", href: "/pricing" },
          ]}
        />
      </PageSection>

      <PageCta
        title="Every area states its own limit. That is the point."
        body="One supplier, one verdict, and a straight list of what we could not confirm."
        cta="See pricing"
        href="/pricing"
      />
    </>
  );
}
