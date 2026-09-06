import { EmailLayout } from "@/lib/email/templates/EmailLayout";

// ── THE PARTNER GRANT INVITE (founder-ruled 2026-09-06) ──────────────────────────────────────
//
// Sent by the Approve action on /admin/acquisition — the operator's click IS the send. Before
// this existed, "yes" meant the founder creating a grant in one panel, copying a link, and
// emailing a stranger by hand; the form collected a request and then depended on memory.
//
// ⚠ WHAT THIS EMAIL MAY SAY, and the words are chosen against the banned-language gate it runs
// through like every sibling: it describes WHAT THE LINK CARRIES (one full supplier assessment,
// five areas, one report) and its mechanics (single use, expiry). It promises nothing about
// verdicts, approval, safety, or outcomes — the same posture as every client surface.
//
// ⛔ THE VALUE IS NOT NAMED IN DOLLARS AND NOT CALLED "FREE". The grant's worth is ruled
// server-side (GRANT_PLAN_TYPE/GRANT_CREDITS, lib/data/grants.ts) and this copy must never
// become a second place that states it — copy drifts, rulings don't.

export function GrantInvite({
  name,
  grantUrl,
  expiresDays,
}: {
  name: string | null;
  grantUrl: string;
  expiresDays: number;
}) {
  const heading = "Your HyprrIQ partner assessment is ready";
  return (
    <EmailLayout
      preview={heading}
      heading={heading}
      action={{ label: "Open your assessment link", href: grantUrl }}
    >
      <div style={{ color: "#1F2A37", fontSize: 15, lineHeight: "1.65" }}>
        <p style={{ margin: "0 0 12px" }}>
          {name ? `${name} — you` : "You"} asked about partner access to HyprrIQ. Here it is: the
          link below carries one full supplier assessment — the complete five-area report — to run
          on a supplier you&rsquo;re evaluating.
        </p>
        <p style={{ margin: "0 0 12px" }}>
          The link is yours alone and works once. Open it, sign in or create an account, and the
          assessment credit attaches to your account automatically.
        </p>
        <p style={{ margin: 0, color: "#5B6B7B", fontSize: 14 }}>
          It expires in {expiresDays} days. If it lapses before you use it, reply from the
          request form on our partners page and we&rsquo;ll take another look.
        </p>
      </div>
    </EmailLayout>
  );
}
