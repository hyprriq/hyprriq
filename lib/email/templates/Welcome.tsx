import { Text } from "@react-email/components";
import { EmailLayout, bodyText, mutedText } from "@/lib/email/templates/EmailLayout";

// ── EMAIL #1 — WELCOME (ADR-EMAIL-001; founder-approved layout, 2026-08-21 build) ────────────
//
// Sent ONCE, on the clients-row CREATE path only (never the upsert's every-visit path) — the
// ADR's welcome idempotency; the email_log dedup_key belt joins when the founder runs the
// migration. Content rules: transactional relationship email — what the account is and where
// to start. NO promises, no delivery times, no report vocabulary; the same care as the emails
// that carry a report (founder-ruled: transactional is not the lower-care lane).

export function Welcome({
  name,
  portalUrl,
}: {
  name: string | null;
  portalUrl: string;
}) {
  return (
    <EmailLayout
      preview="Your HyprrIQ account is ready — here's where to start."
      heading={name ? `Welcome, ${name}` : "Welcome to HyprrIQ"}
      action={{ label: "Open your portal", href: portalUrl }}
    >
      <Text style={bodyText}>
        Your account is ready. HyprrIQ researches the suppliers you&rsquo;re considering — who they are, how
        they connect to the brands they sell, and how those brands treat marketplace sellers — and turns it
        into a report you can act on.
      </Text>
      <Text style={bodyText}>
        To start, open your portal and submit the supplier you want researched. You&rsquo;ll get an email when
        your report is ready to read.
      </Text>
      <Text style={mutedText}>
        Questions at any point? Reply to this email or use the support page in your portal.
      </Text>
    </EmailLayout>
  );
}
