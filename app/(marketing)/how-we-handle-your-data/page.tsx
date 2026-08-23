import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, PageSection, Prose, RelatedLinks } from "@/components/marketing/page-shell";

// /how-we-handle-your-data — the plain-English companion to /data-policy.
//
// THE PRECEDENCE LINE IS LOAD-BEARING and stays first: "Where the two disagree, the policy is the
// one that binds." /data-policy is FROZEN legal copy under a truth-audit ruling; this page is a
// readable restatement and must never be mistaken for the instrument. Both routes are in the
// locked URL map and both launch — they are not duplicates of each other.

export const metadata: Metadata = {
  title: "How We Handle Your Data | HyprrIQ",
  description:
    "Plain English: what HyprrIQ collects, what it does with the supplier details and documents you send, who sees them, how long they are kept, and what we will never do.",
  alternates: { canonical: "/how-we-handle-your-data" },
};

const NEVER = [
  {
    t: "We will not sell your data.",
    b: "Not to brands, not to marketplaces, not to anyone.",
  },
  {
    t: "We will not tell a supplier that you checked them.",
    b: "A supplier assessment is not something the supplier knows about.",
  },
  {
    t: "We will not use your case to build a product we sell to the people you are assessing.",
    b: "The obvious version of that business — selling seller intelligence to brands — is the opposite of who we work for. We will not sit on both sides of that.",
  },
];

export default function HowWeHandleYourDataPage() {
  return (
    <>
      <PageHero
        title="How we handle your data"
        lede="This is the plain-English version. The legal version is in our data policy, and where the two disagree, the policy is the one that binds."
        ground="pale"
      />

      <PageSection tone="surface">
        <Prose>
          <h2>What we collect</h2>
          <p>Two kinds of thing.</p>
          <p>
            <strong>Account details</strong> — your name, email, business name, and what you have
            bought. Standard.
          </p>
          <p>
            <strong>Case details</strong> — the supplier name, website, brands and marketplace you
            submit, plus any document you upload.
          </p>

          <h2>What we do with the supplier details you send</h2>
          <p>HyprrIQ researches them. That is the product.</p>
          <p>
            The research uses public and commercial sources. We do not contact your supplier, and we
            do not tell them you asked. A supplier assessment is not something the supplier knows
            about.
          </p>

          <h2>What we do with documents you upload</h2>
          <p>
            They are read as part of Documentation Review, and stored against your case so the report
            can cite them.
          </p>
          <p>We do not send your documents to your supplier, to a brand, or to a marketplace.</p>

          <h2>Who sees it</h2>
          <p>The people who produce and review your report. Nobody else.</p>
          <p>
            Your cases are separated from every other client&rsquo;s at the database level, and that
            separation fails closed. More detail on <Link href="/security">security</Link>.
          </p>

          <h2>How long we keep it</h2>
          <p>
            We keep your cases so you can go back to them, and because a report you bought is a report
            you should still be able to read next year. Retention periods are set out in the{" "}
            <Link href="/data-policy">data policy</Link>.
          </p>
          <p>If you want your data deleted, ask us and we will do it.</p>
        </Prose>
      </PageSection>

      <PageSection tone="mist">
        <h2 className="text-ink">What we will never do</h2>
        <ul className="mt-5 space-y-3">
          {NEVER.map((n) => (
            <li key={n.t} className="rounded-card border border-line bg-surface p-4 sm:p-5">
              <h3 className="text-ink">{n.t}</h3>
              <p className="mt-1.5 max-w-[68ch] text-[15px] leading-[1.6] text-ink-2 sm:text-[16px]">
                {n.b}
              </p>
            </li>
          ))}
        </ul>
        <RelatedLinks
          links={[
            { label: "Security", href: "/security" },
            { label: "Data policy", href: "/data-policy" },
            { label: "Privacy", href: "/privacy" },
            { label: "Contact", href: "/contact" },
          ]}
        />
      </PageSection>
    </>
  );
}
