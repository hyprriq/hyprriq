import { Text } from "@react-email/components";
import { EmailLayout, bodyText, mutedText } from "@/lib/email/templates/EmailLayout";

// ── OPERATOR INVITATION (re-skin of the 2026-08-02 admin-foundations sender) ─────────────────
// Same words, the one layout. The sign-up link is the ONE action button.

export function AdminInvitation({
  to,
  signUpUrl,
  invitedByEmail,
  expiresDays,
}: {
  to: string;
  signUpUrl: string;
  invitedByEmail: string;
  expiresDays: number;
}) {
  return (
    <EmailLayout
      preview="You're invited to the HyprrIQ operator console."
      heading="Operator console invitation"
      action={{ label: "Create your login", href: signUpUrl }}
    >
      <Text style={bodyText}>
        {invitedByEmail} invited you to the HyprrIQ operator console.
      </Text>
      <Text style={bodyText}>
        Create your login using this email address ({to}) — your access is attached to it.
      </Text>
      <Text style={mutedText}>
        This invitation expires in {expiresDays} days. If you weren&rsquo;t expecting it, ignore this email.
      </Text>
    </EmailLayout>
  );
}
