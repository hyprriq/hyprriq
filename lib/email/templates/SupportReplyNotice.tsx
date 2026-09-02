import { EmailLayout } from "@/lib/email/templates/EmailLayout";

// ── "WE'VE REPLIED — READ IT IN YOUR PORTAL" (founder-ruled 2026-09-01) ──────────────────────
//
// ⛔ THIS EMAIL DOES NOT CONTAIN THE REPLY, AND THAT IS THE WHOLE POINT.
//
// The founder's ruling: "EMAIL IS THE ALERT, NEVER THE CHANNEL. It tells me something needs
// answering; the answer happens in the product." And the reason, which is the part worth keeping:
// "email has no state. A ticket answered by email is answered nowhere — nothing shows what is
// open, what is waiting on me, or what is resolved, and a second operator would never see it."
//
// Putting the answer here would also walk the client straight back into the defect this batch
// closed: they would read it in their inbox, hit Reply, and land at support@hyprriq.com, which
// has no inbound path. So this says an answer exists, and where to read it, and nothing else.
//
// ⚠ IT ALSO DOES NOT INVITE A REPLY. The acknowledgement that preceded it promised "we typically
// respond within 1 business day" from a From address that could not receive one — the obvious
// action it invited was the one that silently failed.

export function SupportReplyNotice({
  srNumber,
  subject,
  portalUrl,
}: {
  srNumber: string;
  subject: string;
  portalUrl: string;
}) {
  const heading = `We've replied to ${srNumber}`;
  return (
    <EmailLayout
      preview={heading}
      heading={heading}
      action={{ label: "Read our reply", href: portalUrl }}
    >
      <div style={{ color: "#1F2A37", fontSize: 15, lineHeight: "1.65" }}>
        <p style={{ margin: "0 0 12px" }}>
          We&rsquo;ve answered your request <strong>{srNumber}</strong> &mdash; &ldquo;{subject}&rdquo;.
        </p>
        <p style={{ margin: "0 0 12px" }}>
          The reply is in your portal, where the request, our answer and its status live together.
        </p>
        <p style={{ margin: 0, color: "#5B6B7B", fontSize: 14 }}>
          Need to add something? Open a new request from the same page &mdash; that keeps everything
          on one thread we can see.
        </p>
      </div>
    </EmailLayout>
  );
}
