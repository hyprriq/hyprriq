import { Text } from "@react-email/components";
import { EmailLayout, bodyText, mutedText } from "@/lib/email/templates/EmailLayout";

// ── EMAIL #7 — RENEWAL REMINDER (ADR-EMAIL-001, scheduled class; founder-ruled: KEEP, but only
// as the pre-charge courtesy) ────────────────────────────────────────────────────────────────
//
// The CAN-SPAM-adjacent "you are about to be charged" note that cuts disputes — never a generic
// engagement nudge. dedup_key renewal:{client_id}:{renewal_date} = one send per renewal, ever.
// No amount is stated (the source of truth for the charge is Stripe, and a wrong number in an
// email is worse than none) — the billing page carries the specifics.

export function RenewalReminder({
  name,
  renewalDate,
  billingUrl,
}: {
  name: string | null;
  renewalDate: string;
  billingUrl: string;
}) {
  const dateText = new Date(renewalDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  return (
    <EmailLayout
      preview={`Your HyprrIQ subscription renews on ${dateText}.`}
      heading="Your subscription renews soon"
      action={{ label: "Review your plan", href: billingUrl }}
    >
      <Text style={bodyText}>
        {name ? `${name}, a` : "A"} quick heads-up: your HyprrIQ subscription renews on <b>{dateText}</b>, and
        your saved payment method will be charged then.
      </Text>
      <Text style={bodyText}>
        Nothing to do if that&rsquo;s what you expect. If you want to change or cancel your plan first, your
        billing page has everything.
      </Text>
      <Text style={mutedText}>Questions? Reply to this email and a person reads it.</Text>
    </EmailLayout>
  );
}
