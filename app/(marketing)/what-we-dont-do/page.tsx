import type { Metadata } from "next";
import { Reveal } from "@/components/marketing/reveal";
import { PageHero, PageSection, Prose, RelatedLinks, PageCta } from "@/components/marketing/page-shell";
import { VERDICT_SCALE_ORDER } from "@/lib/content/reportCopy";

// /what-we-dont-do — the seven refusals. Point a legal reader here first.
//
// The URL has NO APOSTROPHE, per the locked map: /what-we-dont-do.
//
// TWO OF THESE HEADINGS ARE IN THE PENDING-REFUSAL LIST in clientCopy.bannedLanguage.lock.test.ts:
// "We won't say your account is safe" trips H3, which has no negation guard. The heading is a
// REFUSAL of the exact claim the rule bans. Founder-flagged 2026-08-24, unchanged here.

export const metadata: Metadata = {
  title: "What We Don't Do | HyprrIQ",
  description:
    "The promises this product refuses to make — ungating, authorization, account safety, and a verdict on the person you are dealing with — and what the report gives you instead.",
  alternates: { canonical: "/what-we-dont-do" },
};

const REFUSALS = [
  {
    t: "We won't say you'll get ungated",
    b: [
      "Gating decisions belong to the marketplace. We can tell you what your paperwork looks like, which fields would need correcting, and what a brand's posture appears to be from the outside.",
      "Nobody honest can tell you the outcome. There is no pre-approval process, no list of distributors that improves your odds, and no service — ours included — that changes how that decision is made.",
    ],
  },
  {
    t: "We won't say a supplier is authorized",
    b: [
      "Authorization lives in private agreements between a brand and a distributor. They are not filed anywhere public and no one outside those two companies can confirm them.",
      "The report states what could be seen from outside, records a claim as a claim, and gives you the questions that get proof from the only two parties who have it.",
    ],
  },
  {
    t: "We won't say your account is safe",
    b: [
      "A clean invoice and a brand IP complaint are independent risks. Good paperwork does not protect you from enforcement.",
      "The report keeps those two apart rather than letting a good result in one stand in for the other. Blurring them would be selling reassurance, not research.",
    ],
  },
  {
    t: "We won't tell you a supplier is dishonest",
    b: [
      "This one runs the other way, and it matters just as much.",
      "Where we cannot confirm something, that is a gap in evidence. It is not a finding against the supplier. Plenty of entirely legitimate suppliers cannot be corroborated, usually because the brand they work with does not discuss distribution with third parties.",
      "The report tells you what is missing so you can go and ask for it. It will not tell you what the absence means about the person you are dealing with — and neither will we.",
    ],
    weight: true,
  },
  {
    t: "We won't tell you a deal is good",
    b: [
      "The report tells you whether the deal is what it appears to be. Whether it is worth doing is a commercial judgement about your margins, your category and your risk appetite, and it is yours.",
    ],
  },
  {
    t: "We don't do appeals",
    b: [
      "We do not write appeals or plans of action, we do not review suspensions, and we are not lawyers. If you need that, get a specialist.",
    ],
  },
  {
    t: "We don't publish how we weigh things",
    b: [
      `You get every source behind every finding and our reasoning in plain English. You do not get a scoring system, because there isn't one — there are ${VERDICT_SCALE_ORDER.length} written verdicts.`,
      "How signals combine is the part that took fifteen years to learn, and it is the one thing we keep.",
    ],
  },
];

export default function WhatWeDontDoPage() {
  return (
    <>
      <PageHero
        title="What we don't do"
        lede="Every competitor in this market over-promises. So the refusals get their own page, where you can read them before you buy rather than finding them in a footer afterwards."
        ground="sand"
      />

      <PageSection tone="surface">
        <p className="max-w-[68ch] font-display text-[22px] leading-[1.3] text-ink sm:text-[26px]">
          If we would not say it to you across a table, it is not on this site.
        </p>

        <ul className="mt-9 space-y-8 sm:mt-12 sm:space-y-11">
          {REFUSALS.map((r, i) => (
            <Reveal as="li" key={r.t}>
              <article
                className={`border-t pt-5 sm:pt-6 ${r.weight ? "border-plum" : "border-line"}`}
              >
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-[11px] text-muted">0{i + 1}</span>
                  <h2 className="text-ink">{r.t}</h2>
                </div>
                <Prose className="mt-3">
                  {r.b.map((p) => (
                    <p key={p.slice(0, 40)}>{p}</p>
                  ))}
                </Prose>
              </article>
            </Reveal>
          ))}
        </ul>
      </PageSection>

      <PageSection tone="mist">
        <h2 className="text-ink">What&rsquo;s left</h2>
        <Prose className="mt-3">
          <p>
            What is left is the part we can stand behind: the same questions, asked the same way, on
            every supplier, with the evidence shown and the gaps named.
          </p>
        </Prose>
        <RelatedLinks
          links={[
            { label: "What we check", href: "/what-we-check" },
            { label: "Our method", href: "/method" },
            { label: "See a real report", href: "/sample-report" },
            { label: "Pricing", href: "/pricing" },
          ]}
        />
      </PageSection>

      <PageCta
        title="The refusals are the reason the rest is worth reading."
        body="One supplier, one verdict, and a straight list of what we could not confirm."
        cta="See pricing"
        href="/pricing"
      />
    </>
  );
}
