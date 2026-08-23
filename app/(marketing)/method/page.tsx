import type { Metadata } from "next";
import { PageHero, PageSection, Prose, RelatedLinks, PageCta } from "@/components/marketing/page-shell";
import { AREAS } from "@/lib/content/whatWeCheck";
import { VERDICT_SCALE_ORDER } from "@/lib/content/reportCopy";

// /method — the sceptic's page and the acquirer's page. Deliberately NOT search-optimised
// (SEO note in the brief: it supports conversion and would only compete with /what-we-check).
//
// TWO BUILD-NOTE FIXES APPLIED, both instructed:
//   · build note 2 — "behaviour" → "behavior". US spelling everywhere on this site.
//   · build note 3 — the `or "inferred"` clause is CUT. Ruled and not applied in the content file;
//     the sentence works without it, and naming the banned word on a client surface is exactly
//     what the locked vocabulary (Verified / Assessed, never "Inferred") exists to prevent.

export const metadata: Metadata = {
  title: "Our Method, and Its Limits | HyprrIQ",
  description:
    "The same questions, asked the same way, on every supplier. The evidence standards, what counts as confirmation, and the four things this method structurally cannot do.",
  alternates: { canonical: "/method" },
};

const STANDARDS = [
  { t: "A claim by the supplier is a claim.", b: "It is recorded as one, and never promoted to a finding because it was said confidently or arrived on letterhead." },
  { t: "Confirmation has to come from outside.", b: "A brand's own published list. A state registry. An unrelated commercial listing. A document the supplier did not produce. One independent source counts. The supplier repeating themselves in a different format does not." },
  { t: "One source is never settled.", b: "A single registry entry proves a filing exists. It takes more than that to say a business trades." },
  { t: "Absence of evidence is a gap.", b: "Where we cannot confirm something, we say we could not confirm it. We do not convert a gap into a suspicion, and we do not let a missing record become an accusation about a supplier who may be entirely legitimate." },
];

const CANNOT = [
  { t: "It cannot confirm authorization.", b: "Distribution agreements are private contracts. They are not filed anywhere public, and no method reaches them." },
  { t: "It cannot predict a brand's behavior.", b: "The report shows how a brand has acted. What it decides next quarter is a decision inside a company neither of us can see into." },
  { t: "It cannot make a document acceptable to a marketplace.", b: "The report names which fields would need correcting. The acceptance decision belongs to the marketplace and happens after you have bought." },
  { t: "It cannot tell you a deal is good.", b: "It tells you whether the deal is what it appears to be. What you do about that is a commercial judgement, and it is yours." },
];

export default function MethodPage() {
  return (
    <>
      <PageHero
        title="Our method, and its limits"
        lede="Most supplier checks are somebody's judgement on the day. This one is a fixed method — the same questions, in the same order, to the same evidence standards, whoever the supplier is."
        ground="mist"
      />

      <PageSection tone="surface">
        <Prose>
          <p>
            That is not an insult to the people doing them. It is what happens when the same person
            assesses a supplier they like on a quiet Tuesday and a supplier they need on a deadline.
            The attention is different. The standard moves. Nobody notices, because there is nothing
            to compare it against.
          </p>
          <p>
            HyprrIQ runs a fixed method. Two reports on the same evidence reach the same verdict.
          </p>
          <p>
            <strong>That consistency is the product.</strong> Everything else is downstream of it.
          </p>

          <h2>What &ldquo;the same questions&rdquo; actually means</h2>
          <p>
            {AREAS.length} areas, always in the same sequence: {AREAS.map((a) => a.name).join(", ")}.
          </p>
          <p>
            Every area runs on every case. A supplier who fails the first area still gets the other
            four, because a report that stopped early would tell you less than you paid for, and
            because the order in which things are discovered would start changing the conclusion.
          </p>
          <p>
            Areas are not skipped for cheap cases or added for interesting ones. There is no
            judgement call about what gets looked at — that decision was made once, in the method,
            and it does not get made again.
          </p>
        </Prose>
      </PageSection>

      <PageSection tone="base">
        <h2 className="text-ink">Our evidence standards</h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {STANDARDS.map((s) => (
            <li key={s.t} className="rounded-card border border-line bg-surface p-4 sm:p-5">
              <h3 className="text-ink">{s.t}</h3>
              <p className="mt-1.5 text-[15px] leading-[1.6] text-ink-2 sm:text-[16px]">{s.b}</p>
            </li>
          ))}
        </ul>
      </PageSection>

      <PageSection tone="surface">
        <h2 className="text-ink">Two certainty words, and only two</h2>
        <Prose className="mt-3">
          <p>
            <strong>Verified</strong> — confirmed by a source independent of the supplier.
          </p>
          <p>
            <strong>Assessed</strong> — a reading of the evidence available, with that evidence set
            out so you can check it.
          </p>
          <p>
            There is no third level. We do not publish anything as &ldquo;likely&rdquo; or
            &ldquo;probable&rdquo;, because those words let a reader hear more certainty than the
            evidence carries. If it is not Verified and it is not Assessed, it goes in the section
            headed <strong>what we could not confirm</strong> — which appears in every report,
            including the ones that come back clean.
          </p>

          <h2>What we do not publish</h2>
          <p>
            What the assessment examines is published. How it weighs what it finds is not.
          </p>
          <p>
            That is a deliberate line, and it is worth being straight about why it sits there. The
            evidence standards above are the part you need in order to judge whether the conclusions
            are worth anything. How signals combine is the part that took fifteen years to learn, and
            publishing it would mean the next person could copy the output without the discipline
            that produces it.
          </p>
          <p>
            So: you get every source behind every finding, and the reasoning stated in plain English.
            You do not get a scoring system, because there is no score. There are{" "}
            {VERDICT_SCALE_ORDER.length} written verdicts, and a verdict tells you what to do next in
            a way a number never does.
          </p>
        </Prose>
      </PageSection>

      <PageSection tone="pale">
        <h2 className="text-ink">What the method cannot do</h2>
        <p className="mt-2 max-w-[68ch] text-[16px] text-ink-2 sm:text-[17px]">
          The limits are structural, not modesty.
        </p>
        <ul className="mt-5 space-y-3">
          {CANNOT.map((c) => (
            <li key={c.t} className="rounded-card border border-line bg-surface p-4 sm:p-5">
              <h3 className="text-ink">{c.t}</h3>
              <p className="mt-1.5 max-w-[68ch] text-[15px] leading-[1.6] text-ink-2 sm:text-[16px]">
                {c.b}
              </p>
            </li>
          ))}
        </ul>
      </PageSection>

      <PageSection tone="surface">
        <h2 className="text-ink">Why consistency is the point</h2>
        <Prose className="mt-3">
          <p>
            A method you cannot vary is a method you can be held to. Submit the same supplier twice,
            on different days, and the verdict comes back the same — not because anyone remembered,
            but because the questions did not move.
          </p>
        </Prose>
        <RelatedLinks
          links={[
            { label: "What we check", href: "/what-we-check" },
            { label: "What we don't do", href: "/what-we-dont-do" },
            { label: "See a real redacted report", href: "/sample-report" },
            { label: "About", href: "/about" },
          ]}
        />
      </PageSection>

      <PageCta
        title="A method you cannot vary is a method you can be held to."
        body="One supplier, one verdict, and every source behind it."
        cta="See pricing"
        href="/pricing"
      />
    </>
  );
}
