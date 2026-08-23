import type { Metadata } from "next";
import { PageHero, PageSection, RelatedLinks } from "@/components/marketing/page-shell";
import { ContactForm } from "@/components/marketing/contact-form";
import { beforeYouWrite, contactCopy } from "@/lib/content/contact";
import { COMPANY } from "@/lib/content/legal";

// /contact — NO POSTAL ADDRESS HERE, on purpose (dev brief build note 5). The footer and the legal
// pages carry it; adding it back is the instruction this page exists to not follow.

export const metadata: Metadata = {
  title: "Contact | HyprrIQ",
  description:
    "One form, and a person reads it. Ask about a supplier you are assessing, a report you have already had, billing, or partner access.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <PageHero title={contactCopy.title} lede={contactCopy.lede} ground="pale" />

      <PageSection tone="surface">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_.9fr] lg:gap-16">
          <div>
            <ContactForm />
          </div>

          <aside>
            <h2 className="text-ink">Before you write</h2>
            <ul className="mt-4 space-y-3">
              {beforeYouWrite.map((b) => (
                <li key={b.lead} className="rounded-card border border-line bg-base p-4">
                  <p className="text-[15px] leading-[1.6] text-ink-2 sm:text-[16px]">
                    <b className="font-semibold text-ink">{b.lead}</b>, {b.body}
                  </p>
                </li>
              ))}
            </ul>

            <h2 className="mt-8 text-ink">Company</h2>
            <p className="mt-2 text-[15px] leading-[1.6] text-ink-2 sm:text-[16px]">
              HyprrIQ is a product of {COMPANY.legalName}, a Wyoming company.
            </p>
          </aside>
        </div>

        <RelatedLinks
          links={[
            { label: "Questions", href: "/faq" },
            { label: "Pricing", href: "/pricing" },
            { label: "Security", href: "/security" },
          ]}
        />
      </PageSection>
    </>
  );
}
