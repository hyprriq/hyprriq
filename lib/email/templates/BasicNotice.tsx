import { EmailLayout, type EmailAction } from "@/lib/email/templates/EmailLayout";

// ── BASIC NOTICE (re-skin wrapper for sendDualNotification's two bodies) ─────────────────────
//
// The support/change-request flows compose their own small HTML bodies at the call site; this
// wraps each body in the one layout so no send bypasses it. Same dangerouslySetInnerHTML
// contract as OpsAlert: fragments are authored by our own code paths, and the rendered whole
// still passes the banned-language gate before any send.

export function BasicNotice({
  heading,
  fragmentHtml,
  action,
}: {
  heading: string;
  fragmentHtml: string;
  action?: EmailAction;
}) {
  return (
    <EmailLayout preview={heading} heading={heading} action={action}>
      <div style={{ color: "#1F2A37", fontSize: 15, lineHeight: "1.65" }} dangerouslySetInnerHTML={{ __html: fragmentHtml }} />
    </EmailLayout>
  );
}
