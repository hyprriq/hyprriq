import { Resend } from "resend";
import { scanHard } from "@/lib/utils/banned-language";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Key-safe email helper. Resend is only instantiated when RESEND_API_KEY is
// present, so the portal works in environments where email isn't configured yet
// (see SESSION_F_PROGRESS.md open question). Callers should treat a {sent:false}
// result as non-fatal — the underlying DB record is already written.
//
// ── BL FIX GATE (2026-07-24, BL2 founder-ruled): BLOCK-THE-SEND. Every outbound email passes
// the HARD banned-language scan (subject + tag-stripped html) BEFORE any send — including
// admin-only ops alerts (the scope law says NOWHERE). On a hit: no send, audit-logged,
// {sent:false, reason:"banned_language"}; the caller's already-written DB record stays the
// durable fallback. Closes the ADR-G004 spec-vs-built divergence ("email notifications must
// pass compliance validation… enforced by the banned language scanner, not by editorial
// discipline alone"). The scan runs BEFORE the key check — a violation is a violation whether
// or not email is configured. Env is read at CALL time (serverless-safe). ──

const from = () => process.env.RESEND_FROM ?? "HyprrIQ <support@hyprriq.com>";
const adminInbox = () => process.env.SUPPORT_INBOX ?? null;

export function emailEnabled(): boolean {
  return !!process.env.RESEND_API_KEY;
}

const stripTags = (html: string) => html.replace(/<[^>]*>/g, " ");

async function emailGate(kind: string, subject: string, htmls: string[]): Promise<string[]> {
  const violations = [...new Set([subject, ...htmls].flatMap((t) => scanHard(stripTags(t))))];
  if (violations.length > 0) {
    // POST-FREEZE HUNT (2026-07-24): the block stands even if the audit write fails — the gate's
    // reporter can never become a caller-facing throw (notify's contract is non-throwing).
    try {
      await supabaseAdmin.from("audit_log").insert({
        table_name: "audit_log", record_id: null, action: "INSERT",
        actor_id: "system", actor_type: "system",
        new_value: { blocked: "banned_language_email", kind, subject, violations },
      });
    } catch (e) {
      console.error(`[notify] audit-log write failed while recording a blocked email (${violations.join(",")}): ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return violations;
}

// H2 — ops alert to the admin inbox only (watchdog sweeps, pipeline onFailure). Key-safe like
// sendDualNotification: silently no-ops when Resend or the inbox isn't configured — the audit_log
// row written by every caller is the durable record; email is the pager.
export async function sendAdminAlert(subject: string, html: string): Promise<{ sent: boolean; reason?: string }> {
  if ((await emailGate("admin_alert", subject, [html])).length > 0) return { sent: false, reason: "banned_language" };
  if (!emailEnabled()) return { sent: false, reason: "no_api_key" };
  const inbox = adminInbox();
  if (!inbox) return { sent: false, reason: "no_admin_inbox" };
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({ from: from(), to: inbox, subject: `[HyprrIQ ops] ${subject}`, html });
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
  // BOTH bodies gated — a violation in either blocks the whole send (one gate, one behavior).
  if ((await emailGate("dual_notification", opts.subject, [opts.clientHtml, opts.adminHtml])).length > 0) {
    return { sent: false, reason: "banned_language" };
  }
  if (!emailEnabled()) return { sent: false, reason: "no_api_key" };
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const inbox = adminInbox();
    await Promise.allSettled([
      opts.clientEmail
        ? resend.emails.send({ from: from(), to: opts.clientEmail, subject: opts.subject, html: opts.clientHtml })
        : Promise.resolve(null),
      inbox
        ? resend.emails.send({ from: from(), to: inbox, subject: `[Support] ${opts.subject}`, html: opts.adminHtml })
        : Promise.resolve(null),
    ]);
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: e instanceof Error ? e.message : "send_failed" };
  }
}
