import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, H2, P, UL } from "@/components/marketing/legal-page";
import { COMPANY } from "@/lib/content/legal";

// ── TERMS OF SERVICE — TRANSCRIBED VERBATIM from HyprrIQ_LEGAL_PAGES_FINAL.md (LOCKED copy,
// founder 2026-08-21). Do not author, edit, tighten or improve here — wording concerns go in
// reports. The two solicitor-review placeholders were removed per the founder's build note;
// the draft clauses they annotated remain. PERMANENT PATH: /terms (Stripe points at it).

export const metadata: Metadata = {
  title: "Terms of Service — HyprrIQ",
  description: "The terms governing use of HyprrIQ, the wholesale supplier research service from Hyprr Retail LLC.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <H2>1. Who we are</H2>
      <P>
        HyprrIQ is a product of <b>{COMPANY.legalName}</b>, a limited liability company registered in Wyoming,
        United States, with a mailing address at <b>{COMPANY.addressShort}</b>. HyprrIQ operates under the{" "}
        <b>HyprrX</b> brand.
      </P>
      <P>
        In these Terms, &ldquo;we&rdquo;, &ldquo;us&rdquo; and &ldquo;HyprrIQ&rdquo; mean Hyprr Retail LLC.
        &ldquo;You&rdquo; means the person or business using the service.
      </P>
      <P>
        <b>Contact:</b> {COMPANY.legalEmail} · <b>Support:</b> {COMPANY.supportEmail}
      </P>

      <H2>2. What the service is</H2>
      <P>
        HyprrIQ researches wholesale suppliers and the brands they claim to supply, and delivers a written
        report. Each report covers one supplier and the brands you name, and includes:
      </P>
      <UL>
        <li>
          a verdict on a four-level scale — <b>Source Clear</b>, <b>Usable With Conditions</b>,{" "}
          <b>Verify Before Purchase</b>, or <b>Do Not Rely</b>
        </li>
        <li>findings across the assessment areas included in your plan</li>
        <li>an explicit account of what we could <b>not</b> confirm</li>
        <li>a checklist of questions to put to the supplier before you commit</li>
      </UL>

      <H2>2A. Who may use HyprrIQ</H2>
      <P>
        HyprrIQ is offered to <b>businesses located in the United States</b>. By creating an account you
        confirm you are acting on behalf of a US-based business.
      </P>
      <P>
        <b>You may research suppliers anywhere in the world.</b> The restriction is on where your business is,
        not where your suppliers are.
      </P>
      <P>We may decline or close accounts that do not meet this requirement.</P>

      <H2>3. What the service is not — read this carefully</H2>
      <P>
        <b>
          A verdict is a reading of observable evidence at the time of research. It is not a guarantee, a
          certification, or a warranty of any kind.
        </b>
      </P>
      <P>We do not and cannot:</P>
      <UL>
        <li>
          <b>guarantee that a supplier is authorised</b> by any brand. We report what the evidence shows and
          what it does not. Absence of confirmation is not proof of either authorisation or its absence
        </li>
        <li>
          <b>guarantee marketplace approval.</b> Amazon, Walmart, eBay and others apply seller-history,
          category, regional and brand-specific review that we cannot see or predict
        </li>
        <li>
          <b>guarantee the safety of your selling account.</b> Suspensions, listing removals and enforcement
          actions are decisions made by marketplaces and brand owners, not by us
        </li>
        <li>
          <b>verify that goods you receive are genuine.</b> We assess the supplier and the brand relationship,
          not physical inventory
        </li>
        <li>
          <b>provide legal, financial, or professional advice.</b> A report is commercial research
        </li>
      </UL>
      <P>
        <b>
          A &ldquo;Source Clear&rdquo; verdict does not mean a supplier is safe. It means we found consistency
          and no significant gaps in the evidence available at the time.
        </b>
      </P>
      <P>
        <b>The decision to purchase is yours, and the consequences of that decision are yours.</b> You are
        expected to apply your own commercial judgement and standard due diligence.
      </P>

      <H2>4. Accuracy and the limits of research</H2>
      <P>
        Our research draws on publicly available sources, any documents you provide, and automated analysis.
        It is limited by what those sources contain at the time we look.
      </P>
      <P>You accept that:</P>
      <UL>
        <li>public records are incomplete, out of date, and vary by country</li>
        <li>
          <b>a supplier not appearing in a brand&rsquo;s public listing is not evidence of wrongdoing.</b> Many
          legitimate distributors operate under private agreements that never appear publicly
        </li>
        <li>research reflects a moment in time; circumstances change after delivery</li>
        <li>automated analysis, including the use of large language models, forms part of our method</li>
      </UL>
      <P>
        We take care to distinguish what is confirmed from what is not, and to say so plainly in every report.
      </P>

      <H2>5. Plans, credits and delivery</H2>
      <P>
        <b>One credit buys one report:</b> one supplier and up to your plan&rsquo;s brand limit, researched
        together and delivered as one report.
      </P>
      <UL>
        <li>
          <b>Credits are deducted when you submit a case.</b> If research cannot start, the credit is returned
          automatically
        </li>
        <li>
          <b>Unused subscription credits roll over</b> up to your plan&rsquo;s limit. Credits beyond that limit
          expire at renewal
        </li>
        <li>
          <b>Top-up credits join the same balance</b> and follow the same rollover rule
        </li>
        <li>
          <b>Delivery target: within 24 hours of submission</b>, all plans
        </li>
        <li>
          <b>Submitting new research requires an active plan or an available credit</b>
        </li>
      </UL>
      <P>
        Current plans, prices, brand limits and included assessment areas are shown on our{" "}
        <Link href="/pricing" className="underline">pricing page</Link> and form part of these Terms.
      </P>

      <H2>6. Your submission is what we research</H2>
      <P>
        <b>The supplier and brand names you enter are what we research.</b> Use the supplier&rsquo;s full legal
        name.
      </P>
      <P>
        Any document you upload helps us confirm the supplier&rsquo;s entity and address.{" "}
        <b>It does not determine what we research</b>, and it cannot raise a verdict above what independent
        research supports.
      </P>
      <P>
        You confirm that you have the right to share any document you upload, and that it contains no
        information you are not permitted to disclose.
      </P>

      <H2>7. Change requests</H2>
      <P>
        <b>One change request per report, within 7 days of delivery.</b>
      </P>
      <P>
        Use it if you believe part of the research is wrong or incomplete. We will review within one business
        day and either update the report or explain why the current finding stands.
      </P>
      <P>
        <b>A change request is not a refund</b>, and disagreement with a verdict is not by itself grounds for
        one. See the <Link href="/refund-policy" className="underline">Refund &amp; Cancellation Policy</Link>.
      </P>

      <H2>8. Acceptable use</H2>
      <P>You may not:</P>
      <UL>
        <li>
          resell, republish or redistribute reports as your own work, or to parties other than your own
          business
        </li>
        <li>
          use a report to defame, harass or make public allegations against a supplier.{" "}
          <b>A verdict is a reading of evidence, not an accusation</b>
        </li>
        <li>attempt to access another client&rsquo;s data, or circumvent access controls</li>
        <li>use automated means to extract data from the service</li>
        <li>share account credentials</li>
      </UL>
      <P>We may suspend or close an account for breach of this section.</P>

      <H2>9. Your account</H2>
      <P>
        You are responsible for your account and anything done through it. Tell us promptly at{" "}
        {COMPANY.supportEmail} if you believe it has been accessed without your permission.
      </P>

      <H2>10. Payment</H2>
      <P>
        Payments are processed by <b>Stripe</b>. We do not receive, hold or store your card details.
        Subscriptions renew automatically until cancelled. Taxes are calculated and applied at checkout where
        applicable. See the <Link href="/payment-policy" className="underline">Payment Policy</Link> for full
        terms.
      </P>

      <H2>11. Cancellation and termination</H2>
      <P>
        You may cancel a subscription at any time. Cancellation stops future renewals; your plan runs to the
        end of the paid period.
      </P>
      <P>
        <b>Download your reports before your account closes.</b> Reports are removed within 30 days after
        your account closes — see the <Link href="/data-policy" className="underline">Data Protection &amp;
        Retention Policy</Link>.
      </P>
      <P>
        We may suspend or terminate an account for breach of these Terms, non-payment, or where required by
        law.
      </P>

      <H2>12. Intellectual property</H2>
      <P>
        <b>We own the report format, method, engine and platform.</b> Nothing in these Terms transfers
        ownership of any of it.
      </P>
      <P>
        <b>You own the content of reports delivered to you</b> — you may use them freely within your own
        business, subject to section 8.
      </P>
      <P>
        Third-party names and marks appearing in a report belong to their owners. Their appearance is
        descriptive and implies no relationship with us.
      </P>

      <H2>13. Limitation of liability</H2>
      <P>To the fullest extent permitted by law:</P>
      <UL>
        <li>
          our total liability arising from the service is{" "}
          <b>limited to the amount you paid us in the 12 months preceding the claim</b>
        </li>
        <li>
          we are not liable for lost profits, lost inventory, marketplace suspensions, enforcement actions,
          business interruption, or indirect or consequential loss
        </li>
        <li>we are not liable for decisions you take on the basis of a report</li>
      </UL>
      <P>Nothing here excludes liability for fraud, or for anything that cannot lawfully be excluded.</P>

      <H2>14. Changes</H2>
      <P>
        We may update these Terms. Material changes will be notified by email at least 14 days before taking
        effect. The current version and its effective date are always on this page.
      </P>

      <H2>15. Governing law</H2>
      <P>
        These Terms are governed by the laws of the State of Wyoming, United States, without regard to
        conflict-of-law principles. Nothing here removes protections available to you under the mandatory law
        of your place of residence.
      </P>
    </LegalPage>
  );
}
