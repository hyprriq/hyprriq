import { Text } from "@react-email/components";
import { EmailLayout, bodyText, mutedText } from "@/lib/email/templates/EmailLayout";

// ── EMAIL #4 — PAYMENT FAILED (ADR-EMAIL-001, Stripe-driven class) ───────────────────────────
//
// Sent from the invoice.payment_failed webhook handler. Idempotency is two layers by the ADR:
// the webhook's processed-guard drops same-event retries, and dedup_key payment_failed:{invoice_id}
// absorbs distinct events for the same fact. Copy care: factual, no alarm vocabulary, one action —
// this is dunning done like a serious firm, not a nag.

export function PaymentFailed({
  name,
  billingUrl,
}: {
  name: string | null;
  billingUrl: string;
}) {
  return (
    <EmailLayout
      preview="Your subscription payment didn't go through — your card may need updating."
      heading="Your payment didn't go through"
      action={{ label: "Update your payment method", href: billingUrl }}
    >
      <Text style={bodyText}>
        {name ? `${name}, your` : "Your"} latest HyprrIQ subscription payment didn&rsquo;t go through. This is
        usually an expired or replaced card.
      </Text>
      <Text style={bodyText}>
        Your account is still here and your reports remain in your portal. To keep your plan active, update
        your payment method — the charge is retried automatically once it&rsquo;s fixed.
      </Text>
      <Text style={mutedText}>
        Already updated it? Then there&rsquo;s nothing more to do. Questions? Reply to this email.
      </Text>
    </EmailLayout>
  );
}
