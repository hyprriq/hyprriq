import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, PageSection, RelatedLinks } from "@/components/marketing/page-shell";
import { FAQ_GROUPS, FAQ_FLAT } from "@/lib/content/faq";
import { CASE_SLA_HOURS } from "@/lib/constants/plans";

// /faq — THE ONLY PAGE ON THE SITE THAT EMITS FAQPage SCHEMA (SEO ruling in the dev brief).
// Marking every FAQ-shaped block across the site puts our own pages in competition for the same
// question entities; /pricing carries its own pre-purchase questions with no schema on purpose.
//
// The answers are server-rendered as plain <dl> content — never collapsed behind JavaScript. A
// crawler and a reader with JS disabled get the full text, which is also the reason the schema and
// the visible copy cannot disagree: they are generated from the same array.

export const metadata: Metadata = {
  title: "Questions | HyprrIQ",
  description:
    "What you receive, how long it takes, what the method cannot do, and what happens to your data — answered plainly, including the questions with a No for an answer.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  // Built from the SAME array the page renders, so the structured data can never describe copy
  // that is not on the page — the failure mode Google penalises and nobody notices locally.
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_FLAT.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <PageHero
        title="Frequently asked questions"
        lede={`What you receive, how long it takes, and the questions whose honest answer is "no".`}
        ground="mist"
      />

      <PageSection tone="surface">
        <div className="space-y-11">
          {FAQ_GROUPS.map((group) => (
            <section key={group.heading}>
              <h2 className="text-ink">{group.heading}</h2>
              <dl className="mt-5 space-y-5">
                {group.items.map((f) => (
                  <div key={f.q} className="border-t border-line pt-4">
                    <dt className="text-[16px] font-semibold text-ink sm:text-[17px]">{f.q}</dt>
                    <dd className="mt-1.5 max-w-[68ch] text-[15px] leading-[1.6] text-ink-2 sm:text-[16px]">
                      {f.a}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>

        <p className="mt-9 max-w-[68ch] text-[15px] leading-[1.6] text-ink-2 sm:text-[16px]">
          More on{" "}
          <Link href="/how-we-handle-your-data" className="font-semibold text-action hover:text-anchor">
            how we handle your data
          </Link>
          . Delivery is {CASE_SLA_HOURS} hours on every plan.
        </p>

        <RelatedLinks
          links={[
            { label: "What we check", href: "/what-we-check" },
            { label: "Our method", href: "/method" },
            { label: "See a real report", href: "/sample-report" },
            { label: "What we don't do", href: "/what-we-dont-do" },
            { label: "Pricing", href: "/pricing" },
            { label: "Contact", href: "/contact" },
          ]}
        />
      </PageSection>
    </>
  );
}
