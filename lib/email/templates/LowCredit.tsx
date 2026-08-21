import { Text } from "@react-email/components";
import { EmailLayout, bodyText, mutedText } from "@/lib/email/templates/EmailLayout";

// ── EMAILS #6a/#6b — LOW CREDIT (ADR-EMAIL-001, scheduled class) ─────────────────────────────
//
// One template, two thresholds (at 1 remaining, again at 0) — the daily job can fire forever;
// dedup_key low_credit_{threshold}:{client_id}:{cycle_anchor} means one send per threshold per
// cycle BY CONSTRUCTION. Copy care: states the fact and the date; never pressures a purchase.

export function LowCredit({
  name,
  threshold,
  renewalDate,
  portalUrl,
}: {
  name: string | null;
  threshold: 0 | 1;
  /** ISO date of the plan renewal, or null when not on record. */
  renewalDate: string | null;
  portalUrl: string;
}) {
  const renewalLine = renewalDate
    ? `Your plan renews on ${new Date(renewalDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}, when your next cycle's credits are added.`
    : "Your next cycle's credits are added when your plan renews.";
  return (
    <EmailLayout
      preview={threshold === 1 ? "One report credit left this cycle." : "You've used all your report credits for this cycle."}
      heading={threshold === 1 ? "One report credit left" : "All credits used this cycle"}
      action={{ label: "Open your portal", href: portalUrl }}
    >
      <Text style={bodyText}>
        {name ? `${name}, you` : "You"}{" "}
        {threshold === 1
          ? "have one report credit left in this billing cycle."
          : "have used all of your report credits for this billing cycle."}
      </Text>
      <Text style={bodyText}>{renewalLine}</Text>
      <Text style={mutedText}>
        Your delivered reports stay available in your portal either way. Questions about your plan? Reply to
        this email.
      </Text>
    </EmailLayout>
  );
}
