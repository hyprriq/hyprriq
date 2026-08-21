import { EmailLayout } from "@/lib/email/templates/EmailLayout";

// ── OPS ALERT (admin-inbox pager; re-skin of sendAdminAlert) ─────────────────────────────────
//
// Callers across the codebase pass a small HTML fragment (watchdog sweeps, pipeline onFailure,
// stalled-case alerts…). The fragment becomes the body INSIDE the one layout — callers are
// untouched, and the banned-language gate scans the RENDERED whole. No action button: the
// admin alert has no client action (the layout's documented optional case).

export function OpsAlert({ heading, fragmentHtml }: { heading: string; fragmentHtml: string }) {
  return (
    <EmailLayout preview={heading} heading={heading}>
      <div
        style={{ color: "#1F2A37", fontSize: 15, lineHeight: "1.65" }}
        // The fragment is authored by OUR OWN code paths (never user input verbatim) and the
        // rendered result still passes the banned-language gate before any send.
        dangerouslySetInnerHTML={{ __html: fragmentHtml }}
      />
    </EmailLayout>
  );
}
