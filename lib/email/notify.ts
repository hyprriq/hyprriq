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

// ── ADMIN FOUNDATIONS (2026-08-02) — staff invitation email. Same gate, same key-safety: a
// blocked or unsent email is non-fatal (the admin_invitations row is the durable record and the
// API returns the sign-up link for manual sharing). ──
export async function sendAdminInvitation(opts: {
  to: string;
  signUpUrl: string;
  invitedByEmail: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const subject = "You're invited to the HyprrIQ operator console";
  const html = `<p>${opts.invitedByEmail} invited you to the HyprrIQ operator console.</p>
<p><a href="${opts.signUpUrl}">Create your login here</a> using this email address (${opts.to}) — your access is attached to it.</p>
<p>This invitation expires in ${7} days. If you weren't expecting it, ignore this email.</p>`;
  if ((await emailGate("admin_invitation", subject, [html])).length > 0) return { sent: false, reason: "banned_language" };
  if (!emailEnabled()) return { sent: false, reason: "no_api_key" };
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({ from: from(), to: opts.to, subject, html });
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: e instanceof Error ? e.message : "send_failed" };
  }
}

// ── PRE-DESIGN BATCH (2026-08-08, gap audit 5.2, founder-ruled delivery-only): the delivery
// notification. Same gate, same key-safety as every sibling: a skipped send is non-fatal — the
// delivered case row is the durable record and the portal shows the report either way. The
// caller audit-logs {sent/reason}. Resend account + RESEND_API_KEY/RESEND_FROM env are the
// founder's setup step; until then this returns {sent:false, reason:"no_api_key"} silently. ──
export async function sendDeliveryNotification(opts: {
  to: string | null;
  caseNumber: string;
  vendorName: string | null;
  caseUrl: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const subject = `Your HyprrIQ report ${opts.caseNumber} is ready`;
  const html = `<p>Your source intelligence report${opts.vendorName ? ` for ${opts.vendorName}` : ""} (case ${opts.caseNumber}) has been delivered.</p>
<p><a href="${opts.caseUrl}">View your report</a> — the verdict, the evidence behind it, and the questions to ask your supplier are ready in your portal.</p>
<p>Questions about the report? Use the support page in your portal and we&rsquo;ll pick it up.</p>`;
  if ((await emailGate("delivery_notification", subject, [html])).length > 0) return { sent: false, reason: "banned_language" };
  if (!emailEnabled()) return { sent: false, reason: "no_api_key" };
  if (!opts.to) return { sent: false, reason: "no_recipient" };
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({ from: from(), to: opts.to, subject, html });
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: e instanceof Error ? e.message : "send_failed" };
  }
}

// ── GAP-CLOSE BATCH (2026-08-10, founder-ruled: TWO transactional emails — delivery above and
// THIS submission confirmation). LOCKED content rules (founder): no report content, no verdict,
// no findings/risk language, NO delivery-time promise; links to the portal. The content lock is
// machine-checked in notify.test.ts. Same gate + key-safety as every sibling; the caller
// audit-logs {sent/reason} and NEVER records a failed send as sent. Idempotency lives at the
// caller (submit route: one audit-checked send per case). ──
export async function sendSubmissionConfirmation(opts: {
  to: string | null;
  caseNumber: string;
  vendorName: string | null;
  caseUrl: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const subject = `We received your case ${opts.caseNumber}`;
  const html = `<p>Your research request${opts.vendorName ? ` for ${opts.vendorName}` : ""} (case ${opts.caseNumber}) has been submitted and is now in the queue.</p>
<p><a href="${opts.caseUrl}">Track your case</a> in your portal — its status updates as the work progresses.</p>
<p>You&rsquo;ll get another email when your report is delivered. Questions in the meantime? Use the support page in your portal.</p>`;
  if ((await emailGate("submission_confirmation", subject, [html])).length > 0) return { sent: false, reason: "banned_language" };
  if (!emailEnabled()) return { sent: false, reason: "no_api_key" };
  if (!opts.to) return { sent: false, reason: "no_recipient" };
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({ from: from(), to: opts.to, subject, html });
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
