import type { Metadata } from "next";
import { LegalPage, H2, P } from "@/components/marketing/legal-page";
import { COMPANY } from "@/lib/content/legal";
import { PLAN_TYPES, PLAN_NAME, PLAN_PRICE_LABEL, PLAN_CADENCE, PLAN_CREDITS_PER_CYCLE, type PlanType } from "@/lib/constants/plans";

// ── REFUND & CANCELLATION POLICY — REWRITTEN UNDER THE 2026-08-22 TRUTH-AUDIT RULING (the code
// wins; the drafted copy is no longer authoritative). §2 carries the FOUNDER-LOCKED formula:
// deduction per used report = plan price ÷ plan credits × 0.70; refund = max(0, paid − used ×
// deduction), rounded to the nearest cent at the final step. The per-report table DERIVES from
// lib/constants/plans.ts — the one price source — so this page can never disagree with pricing.
// NO refund code exists anywhere (verified: refunds are Stripe-dashboard-only, STOP-3); this
// page is the formula's only encoding.

// Plan prices come from the registry's own labels ("$279" → 279) — never a second copy.
function planPriceNumber(p: PlanType): number {
  return Number(PLAN_PRICE_LABEL[p].replace(/[^0-9.]/g, ""));
}
const usd = (n: number) => `$${n.toFixed(2)}`;

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
        <b>Download your reports before the account closes.</b> They are removed within 30 days after
        closure.
      </P>

      <H2>2. Refunds — how they work</H2>
      <P>
        <b>Within 14 days of purchase</b>, you may request a refund. The amount is what you paid, minus a
        deduction for each report you used.
      </P>
      <P>
        <b>The deduction per used report</b> is your plan&rsquo;s price divided by the number of credits that
        plan includes, times 0.70 — a 30% discount on the per-report value:
      </P>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-left text-[14px]">
          <thead>
            <tr className="border-b border-line-strong">
              <th className="py-2 pr-4 font-semibold text-ink">Plan</th>
              <th className="py-2 pr-4 font-semibold text-ink">Per-report value</th>
              <th className="py-2 pr-4 font-semibold text-ink">Deduction per used report</th>
            </tr>
          </thead>
          <tbody>
            {PLAN_TYPES.map((p) => {
              const price = planPriceNumber(p);
              const perReport = price / PLAN_CREDITS_PER_CYCLE[p];
              return (
                <tr key={p} className="border-b border-line align-top">
                  <td className="py-2.5 pr-4 text-ink-2">{PLAN_NAME[p]} ({PLAN_PRICE_LABEL[p]}{PLAN_CADENCE[p] === "/mo" ? "/mo" : ""}, {PLAN_CREDITS_PER_CYCLE[p]} {PLAN_CREDITS_PER_CYCLE[p] === 1 ? "credit" : "credits"})</td>
                  <td className="py-2.5 pr-4 tabular-nums text-ink-2">{usd(perReport)}</td>
                  <td className="py-2.5 pr-4 tabular-nums text-ink-2">{usd(perReport * 0.7)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <P>
        Your refund is <b>what you paid, minus (reports used × the deduction for your plan)</b> — never less
        than zero. Amounts are rounded to the nearest cent at the final step.
      </P>
      <P>
        <b>Worked example:</b> on Growth ($279) with one report used, the deduction is $279 ÷ 5 × 0.70 =
        $39.06, so your refund is $279 − $39.06 = <b>$239.94</b>.
      </P>
      <P>
        <b>Refunding an unused credit removes that credit from your balance.</b> Reports you have already
        received remain yours.
      </P>
      <P>
        To request a refund, email us — section 5 has the details. After 14 days, refunds are not available —
        except in the case below.
      </P>

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
