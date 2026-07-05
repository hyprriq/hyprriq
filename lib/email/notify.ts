import { Resend } from "resend";

// Key-safe email helper. Resend is only instantiated when RESEND_API_KEY is
// present, so the portal works in environments where email isn't configured yet
// (see SESSION_F_PROGRESS.md open question). Callers should treat a {sent:false}
// result as non-fatal — the underlying DB record is already written.

const FROM = process.env.RESEND_FROM ?? "HyprrIQ <support@hyprriq.com>";
const ADMIN_INBOX = process.env.SUPPORT_INBOX ?? null;

export function emailEnabled(): boolean {
  return !!process.env.RESEND_API_KEY;
}

// H2 — ops alert to the admin inbox only (watchdog sweeps, pipeline onFailure). Key-safe like
// sendDualNotification: silently no-ops when Resend or the inbox isn't configured — the audit_log
// row written by every caller is the durable record; email is the pager.
export async function sendAdminAlert(subject: string, html: string): Promise<{ sent: boolean; reason?: string }> {
  if (!emailEnabled()) return { sent: false, reason: "no_api_key" };
  if (!ADMIN_INBOX) return { sent: false, reason: "no_admin_inbox" };
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({ from: FROM, to: ADMIN_INBOX, subject: `[HyprrIQ ops] ${subject}`, html });
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: e instanceof Error ? e.message : "send_failed" };
  }
}

export async function sendDualNotification(opts: {
  clientEmail: string | null;
  subject: string;
  clientHtml: string;
  adminHtml: string;
}): Promise<{ sent: boolean; reason?: string }> {
  if (!emailEnabled()) return { sent: false, reason: "no_api_key" };
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await Promise.allSettled([
      opts.clientEmail
        ? resend.emails.send({ from: FROM, to: opts.clientEmail, subject: opts.subject, html: opts.clientHtml })
        : Promise.resolve(null),
      ADMIN_INBOX
        ? resend.emails.send({ from: FROM, to: ADMIN_INBOX, subject: `[Support] ${opts.subject}`, html: opts.adminHtml })
        : Promise.resolve(null),
    ]);
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: e instanceof Error ? e.message : "send_failed" };
  }
}
