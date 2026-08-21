import type { Metadata } from "next";
import { LegalPage, H2, P } from "@/components/marketing/legal-page";
import { COMPANY } from "@/lib/content/legal";

// ── REFUND & CANCELLATION POLICY — TRANSCRIBED VERBATIM from HyprrIQ_LEGAL_PAGES_FINAL.md
// (LOCKED copy, founder 2026-08-21). Do not author, edit, tighten or improve here.

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy — HyprrIQ",
  description: "How cancellations and refunds work at HyprrIQ, including the change-request route.",
};

export default function RefundPolicyPage() {
  return (
    <LegalPage title="Refund & Cancellation Policy">
      <P>
        We would rather fix a report than refund it. Most concerns are better answered by a change request —
        see section 4.
      </P>

      <H2>1. Cancelling a subscription</H2>
      <P>
        Cancel any time from your billing page. Cancellation stops future renewals; your plan continues to the
        end of the paid period, and your credits stay usable until then.
      </P>
      <P>
        <b>Download your reports before the account closes.</b> They are removed 30 days after closure.
      </P>

      <H2>2. Refunds — how they work</H2>
      <P>
        <b>Within 14 days of purchase</b>, you may request a refund. The amount is:
      </P>
      <blockquote className="mt-3 border-l-4 border-line-strong pl-4 text-[15px] leading-relaxed text-ink">
        <b>What you paid, minus the reports you used, charged at 30% below the single-report price.</b>
      </blockquote>
      <P>
        <b>Refunding an unused credit removes that credit from your balance.</b> Reports you have already
        received remain yours.
      </P>
      <P>
        Worked examples are shown on the billing page at the point of request, so you see the exact amount
        before confirming.
      </P>
      <P>After 14 days, refunds are not available — except in the case below.</P>

      <H2>3. If we do not deliver</H2>
      <P>
        <b>If we fail to deliver a report we accepted, you get a full refund. No time limit, no conditions.</b>{" "}
        That is our failure, not yours.
      </P>
      <P>
        If research cannot start on a case, the credit is returned to your balance automatically and no charge
        is made.
      </P>

      <H2>4. If you disagree with a verdict</H2>
      <P>
        <b>Use your change request.</b> One per report, within 7 days of delivery. We review within one
        business day and either update the report or explain why the finding stands.
      </P>
      <P>
        <b>Disagreement with a verdict is not itself grounds for a refund.</b> Our reports say what the
        evidence shows, including when the evidence is unfavourable or inconclusive — that is the service you
        are buying. A report that reaches an unwelcome conclusion has done its job.
      </P>
      <P>If a report contains a factual error, tell us. We will correct it.</P>

      <H2>5. How to request a refund</H2>
      <P>
        Email <b>{COMPANY.supportEmail}</b> with your case number or invoice reference. We respond within 2
        business days, and approved refunds return to the original payment method within 5–10 business days
        depending on your bank.
      </P>

      <H2>6. Chargebacks</H2>
      <P>
        If you believe a charge is wrong, <b>contact us first.</b> We can usually resolve it faster than your
        bank, and we keep delivery records for every report. Raising a chargeback without contacting us may
        result in account suspension while it is investigated.
      </P>

      <H2>7. Statutory rights</H2>
      <P>Nothing in this policy limits rights you have under applicable law.</P>
    </LegalPage>
  );
}
