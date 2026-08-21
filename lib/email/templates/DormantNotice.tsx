import { Text } from "@react-email/components";
import { EmailLayout, bodyText, mutedText } from "@/lib/email/templates/EmailLayout";

// ── DORMANT ONE-TIME ACCOUNT NOTICE (founder-ruled retention schedule, 2026-08-21) ───────────
//
// A $99 buyer has no subscription to cancel, so their retention clock never starts on its own.
// After 24 months of no activity this notice goes out ONCE (dedup dormant_24m:{client_id});
// signing in is the "keep it" action. Closure after the 30-day window is a deliberate,
// founder-run step until the closure machinery ships — this email states the policy, the
// system does not yet act on it automatically.

export function DormantNotice({
  name,
  portalUrl,
}: {
  name: string | null;
  portalUrl: string;
}) {
  return (
    <EmailLayout
      preview="Your HyprrIQ account has been inactive for 24 months — sign in to keep it."
      heading="Is this account still needed?"
      action={{ label: "Sign in to keep your account", href: portalUrl }}
    >
      <Text style={bodyText}>
        {name ? `${name}, your` : "Your"} HyprrIQ account hasn&rsquo;t been used in 24 months. Under our data
        policy, inactive accounts are closed and their data removed on the published retention schedule.
      </Text>
      <Text style={bodyText}>
        To keep your account and everything in it, just sign in within the next 30 days — that&rsquo;s all it
        takes. If you&rsquo;d like to keep copies of your delivered reports either way, download them from your
        portal now.
      </Text>
      <Text style={mutedText}>
        If you do nothing, the account will be closed after 30 days and data removed per the Data Policy.
        Transaction records are retained as required by law.
      </Text>
    </EmailLayout>
  );
}
