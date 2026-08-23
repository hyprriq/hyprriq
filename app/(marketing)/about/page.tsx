import type { Metadata } from "next";
import { PageHero, PageSection, Prose, RelatedLinks, PageCta } from "@/components/marketing/page-shell";
import { COMPANY } from "@/lib/content/legal";

// /about — sitewide rule 8: Gautam, first name only. Fifteen years buying wholesale on Amazon, as
// the person wiring the money.
//
// BUILD NOTE 2 APPLIED: "brand behaviour" → "brand behavior". US spelling everywhere on this site.

export const metadata: Metadata = {
  title: "About | HyprrIQ",
  description:
    "HyprrIQ was built by Gautam, who spent fifteen years buying wholesale on Amazon — not as an analyst, as the person wiring the money.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        title="About"
        lede="HyprrIQ was built by Gautam, who spent fifteen years buying wholesale on Amazon. Not as an analyst. As the person wiring the money."
        ground="sand"
      />

      <PageSection tone="surface">
        <Prose>
          <h2>Where this came from</h2>
          <p>
            Fifteen years of buying wholesale teaches you things that are hard to learn any other
            way. What a distributor sounds like when the brand relationship is exactly what they say
            it is, and what they sound like when it isn&rsquo;t. Which paperwork gets questioned.
            What a listing looks like in the months before a brand decides to act.
          </p>
          <p>
            Most of that knowledge is expensive, and it is expensive in the specific sense that you
            paid for it with your own inventory.
          </p>
          <p>
            The frustrating part was that none of it was available before the decision. Everything
            useful arrived afterwards — in a rejection, a complaint, or a supplier who stopped
            replying. The checks that would have helped existed, but they were scattered across
            public records, brand behavior and paperwork nobody looks at properly, and nobody was
            doing them in one place, the same way, every time.
          </p>
          <p>That is the whole idea. There is no more to it than that.</p>
        </Prose>
      </PageSection>

      <PageSection tone="mist">
        <h2 className="text-ink">Who is here</h2>
        <Prose className="mt-3">
          <p>One person, and the people who help run it.</p>
          <p>
            There is no &ldquo;our team of experts&rdquo; section here, and no stock photographs of a
            company that does not exist. A solo operator who has spent fifteen years in this market
            is a better story than a vague &ldquo;we&rdquo;, and it is also the true one.
          </p>
          <p>
            The method is the company. Fifteen years of buying decisions, written down as a fixed set
            of questions, so that the answer no longer depends on who is having a good day.
          </p>
        </Prose>
      </PageSection>

      <PageSection tone="surface">
        <h2 className="text-ink">What we are trying to be</h2>
        <p className="mt-3 max-w-[68ch] font-display text-[22px] leading-[1.3] text-ink sm:text-[26px]">
          A research firm, not a tool.
        </p>
        <Prose className="mt-4">
          <p>
            The difference matters. A tool hands you data and leaves the judgement to you. HyprrIQ
            does the judgement, shows the evidence behind it, and tells you where the judgement runs
            out. That last part is the bit most of this market skips.
          </p>
          <p>
            The same questions, asked the same way, on every supplier. Two reports on the same
            evidence reach the same verdict. That consistency is what we are actually selling —
            everything else is the mechanism.
          </p>

          <h2>Where we are</h2>
          <p>
            HyprrIQ is a product of {COMPANY.legalName}. US clients only at launch. The suppliers can
            be anywhere in the world.
          </p>
        </Prose>
        <RelatedLinks
          links={[
            { label: "Our method", href: "/method" },
            { label: "What we don't do", href: "/what-we-dont-do" },
            { label: "See a real report", href: "/sample-report" },
            { label: "Contact", href: "/contact" },
          ]}
        />
      </PageSection>

      <PageCta
        title="The method is the company."
        body="The same questions, asked the same way, on every supplier — with the evidence shown and the gaps named."
        cta="See pricing"
        href="/pricing"
      />
    </>
  );
}
