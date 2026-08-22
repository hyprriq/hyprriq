import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, H2, P } from "@/components/marketing/legal-page";
import { COMPANY } from "@/lib/content/legal";

// ── PAYMENT POLICY — TRANSCRIBED VERBATIM from HyprrIQ_LEGAL_PAGES_FINAL.md (LOCKED copy,
// founder 2026-08-21). Do not author, edit, tighten or improve here.
// TOP-UP LANGUAGE REMOVED (founder-ruled 2026-08-22, item 2): top-ups are not for sale at
// launch — the "Top-up credits are charged once" paragraph described a product nobody can buy
// and is gone, not hedged (same ruling as Terms §5).

export const metadata: Metadata = {
  title: "Payment Policy — HyprrIQ",
  description: "How payments, invoices, renewals and plan changes work at HyprrIQ.",
};

export default function PaymentPolicyPage() {
  return (
    <LegalPage title="Payment Policy">
      <H2>How payment works</H2>
      <P>
        All payments are processed by <b>Stripe</b>, a PCI-DSS Level 1 certified payment processor.{" "}
        <b>We never see, receive, or store your card details</b> — they go directly to Stripe.
      </P>

      <H2>What you are charged</H2>
      <P>
        <b>One-time reports</b> are charged once, at the price shown at checkout.
      </P>
      <P>
        <b>Subscriptions</b> are charged at the start of each billing period and renew automatically until
        cancelled. The price and billing date are shown before you confirm, and on your billing page
        thereafter.
      </P>
      <P>
        Prices are in <b>US dollars</b>. Applicable taxes are calculated and shown at checkout.
      </P>

      <H2>Invoices and receipts</H2>
      <P>
        <b>Stripe issues an invoice or receipt for every payment</b>, sent to your account email and available
        from your billing page. These are your records for accounting and tax.
      </P>

      <H2>Renewals</H2>
      <P>
        Subscriptions renew automatically on the same date each period.{" "}
        <b>We email you before a renewal is charged.</b> Cancel any time before that date to avoid the next
        charge.
      </P>

      <H2>Failed payments</H2>
      <P>
        If a payment fails we tell you by email, and the charge is retried. Your account moves to a past-due
        state and new research submissions are paused until payment succeeds — your credits are preserved,
        nothing is forfeited.{" "}
        <b>Reports you have already received stay available</b> throughout.
      </P>

      <H2>Changing plans</H2>
      <P>
        You can change plan from your billing page through the Stripe customer portal. Upgrades take effect
        immediately with the difference charged at once; downgrades take effect at the end of your current
        period.
      </P>

      <H2>Refunds</H2>
      <P>
        See the <Link href="/refund-policy" className="underline">Refund &amp; Cancellation Policy</Link>.
      </P>

      <H2>Disputes</H2>
      <P>
        If a charge looks wrong, <b>email {COMPANY.supportEmail} before raising a dispute with your bank.</b>{" "}
        We keep delivery records for every report and can usually resolve it within a day.
      </P>
    </LegalPage>
  );
}
