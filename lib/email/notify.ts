import { Resend } from "resend";
import { createElement } from "react";
import { render } from "@react-email/render";
import { scanHard } from "@/lib/utils/banned-language";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { DeliveryNotification } from "@/lib/email/templates/DeliveryNotification";
import { SubmissionConfirmation } from "@/lib/email/templates/SubmissionConfirmation";
import { AdminInvitation } from "@/lib/email/templates/AdminInvitation";
import { OpsAlert } from "@/lib/email/templates/OpsAlert";
import { BasicNotice } from "@/lib/email/templates/BasicNotice";
import { Welcome } from "@/lib/email/templates/Welcome";

// Key-safe email helper. Resend is only instantiated when RESEND_API_KEY is
// present, so the portal works in environments where email isn't configured yet
// (see SESSION_F_PROGRESS.md open question). Callers should treat a {sent:false}
// result as non-fatal — the underlying DB record is already written.
//
// ── BL FIX GATE (2026-07-24, BL2 founder-ruled): BLOCK-THE-SEND. Every outbound email passes
// the HARD banned-language scan (subject + tag-stripped html) BEFORE any send — including
// admin-only ops alerts (the scope law says NOWHERE). On a hit: no send, audit-logged,
// {sent:false, reason:"banned_language"}; the caller's already-written DB record stays the
// durable fallback. The scan runs BEFORE the key check — a violation is a violation whether
// or not email is configured. Env is read at CALL time (serverless-safe). ──
//
// ── ONE LAYOUT (ADR-EMAIL-001, design approved 2026-08-21): every sender renders a template
// that imports EmailLayout — no sender builds HTML inline, and the banned-language gate scans
// the RENDERED string (the gate-reach argument for in-repo templates). The lock test
// (emailLayout.lock.test.ts) fails this file the moment an inline paragraph-HTML template
// literal or a non-layout template appears. Founder-ruled: the emails carrying a report matter as much as
// marketing ones — transactional is NOT the lower-care lane.
//
// ── THE SEND RECORD (ADR-EMAIL-001): every successful send writes an email_log row via the one
// logSend() seam — fail-soft (a failed ledger write never un-sends the mail; it logs and moves
// on). The dedup_key idempotency belt joins when the founder runs the email_log migration;
// until then the ledger records recipient/template/time (the columns that exist today).

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

/** The one send ledger (ADR-EMAIL-001). Fail-soft by contract: the mail already went. */
async function logSend(template: string, recipient: string, caseId?: string | null): Promise<void> {
  try {
    await supabaseAdmin.from("email_log").insert({
      recipient, template, case_id: caseId ?? null, sent_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error(`[notify] email_log write failed (${template} → ${recipient}): ${e instanceof Error ? e.message : String(e)}`);
  }
}

// H2 — ops alert to the admin inbox only (watchdog sweeps, pipeline onFailure). Key-safe like
// sendDualNotification: silently no-ops when Resend or the inbox isn't configured — the audit_log
// row written by every caller is the durable record; email is the pager.
export async function sendAdminAlert(subject: string, html: string): Promise<{ sent: boolean; reason?: string }> {
  const rendered = await render(createElement(OpsAlert, { heading: subject, fragmentHtml: html }));
  if ((await emailGate("admin_alert", subject, [rendered])).length > 0) return { sent: false, reason: "banned_language" };
  if (!emailEnabled()) return { sent: false, reason: "no_api_key" };
  const inbox = adminInbox();
  if (!inbox) return { sent: false, reason: "no_admin_inbox" };
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({ from: from(), to: inbox, subject: `[HyprrIQ ops] ${subject}`, html: rendered });
    await logSend("admin_alert", inbox);
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
  const rendered = await render(createElement(AdminInvitation, {
    to: opts.to, signUpUrl: opts.signUpUrl, invitedByEmail: opts.invitedByEmail, expiresDays: 7,
  }));
  if ((await emailGate("admin_invitation", subject, [rendered])).length > 0) return { sent: false, reason: "banned_language" };
  if (!emailEnabled()) return { sent: false, reason: "no_api_key" };
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({ from: from(), to: opts.to, subject, html: rendered });
    await logSend("admin_invitation", opts.to);
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: e instanceof Error ? e.message : "send_failed" };
  }
}

// ── PRE-DESIGN BATCH (2026-08-08, gap audit 5.2, founder-ruled delivery-only): the delivery
// notification. Same gate, same key-safety as every sibling: a skipped send is non-fatal — the
// delivered case row is the durable record and the portal shows the report either way. The
// caller audit-logs {sent/reason}. ──
export async function sendDeliveryNotification(opts: {
  to: string | null;
  caseNumber: string;
  vendorName: string | null;
  caseUrl: string;
  /**
   * §4 — the PDF, when the render finished in time. NULL is a normal outcome, not an error: the
   * ruled sequencing sends this email WITHOUT the attachment if the render failed permanently,
   * rather than delaying or withholding a delivery the client has already paid for.
   * The template's attachment line is CHOSEN FROM WHAT SHIPPED — it never promises a PDF that
   * is not attached.
   */
  attachment?: { filename: string; content: Buffer } | null;
}): Promise<{ sent: boolean; reason?: string }> {
  const subject = `Your HyprrIQ report ${opts.caseNumber} is ready`;
  const rendered = await render(createElement(DeliveryNotification, {
    caseNumber: opts.caseNumber, vendorName: opts.vendorName, caseUrl: opts.caseUrl,
    hasAttachment: !!opts.attachment,
  }));
  if ((await emailGate("delivery_notification", subject, [rendered])).length > 0) return { sent: false, reason: "banned_language" };
  if (!emailEnabled()) return { sent: false, reason: "no_api_key" };
  if (!opts.to) return { sent: false, reason: "no_recipient" };
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: from(), to: opts.to, subject, html: rendered,
      ...(opts.attachment
        ? { attachments: [{ filename: opts.attachment.filename, content: opts.attachment.content }] }
        : {}),
    });
    await logSend("delivery_notification", opts.to);
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: e instanceof Error ? e.message : "send_failed" };
  }
}

// ── GAP-CLOSE BATCH (2026-08-10, founder-ruled: TWO transactional emails — delivery above and
// THIS submission confirmation). LOCKED content rules (founder): no report content, no verdict,
// no findings/risk language, NO delivery-time promise; links to the portal. The content lock is
// machine-checked in notify.test.ts. Idempotency lives at the caller (submit route: one
// audit-checked send per case). ──
export async function sendSubmissionConfirmation(opts: {
  to: string | null;
  caseNumber: string;
  vendorName: string | null;
  caseUrl: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const subject = `We received your case ${opts.caseNumber}`;
  const rendered = await render(createElement(SubmissionConfirmation, {
    caseNumber: opts.caseNumber, vendorName: opts.vendorName, caseUrl: opts.caseUrl,
  }));
  if ((await emailGate("submission_confirmation", subject, [rendered])).length > 0) return { sent: false, reason: "banned_language" };
  if (!emailEnabled()) return { sent: false, reason: "no_api_key" };
  if (!opts.to) return { sent: false, reason: "no_recipient" };
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({ from: from(), to: opts.to, subject, html: rendered });
    await logSend("submission_confirmation", opts.to);
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
  const clientRendered = await render(createElement(BasicNotice, { heading: opts.subject, fragmentHtml: opts.clientHtml }));
  const adminRendered = await render(createElement(BasicNotice, { heading: opts.subject, fragmentHtml: opts.adminHtml }));
  // BOTH bodies gated — a violation in either blocks the whole send (one gate, one behavior).
  if ((await emailGate("dual_notification", opts.subject, [clientRendered, adminRendered])).length > 0) {
    return { sent: false, reason: "banned_language" };
  }
  if (!emailEnabled()) return { sent: false, reason: "no_api_key" };
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const inbox = adminInbox();
    await Promise.allSettled([
      opts.clientEmail
        ? resend.emails.send({ from: from(), to: opts.clientEmail, subject: opts.subject, html: clientRendered })
        : Promise.resolve(null),
      inbox
        ? resend.emails.send({ from: from(), to: inbox, subject: `[Support] ${opts.subject}`, html: adminRendered })
        : Promise.resolve(null),
    ]);
    if (opts.clientEmail) await logSend("dual_notification", opts.clientEmail);
    if (inbox) await logSend("dual_notification", inbox);
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: e instanceof Error ? e.message : "send_failed" };
  }
}

// ── EMAIL #1 — WELCOME (ADR-EMAIL-001, built 2026-08-21). Fired ONLY from the clients-row
// CREATE path (getOrCreateClient's insert-returning branch) — never the every-visit upsert path.
// That create-path guard IS the idempotency; the email_log dedup_key belt joins when the founder
// runs the migration. Non-fatal like every sibling: a missed welcome never breaks provisioning. ──
export async function sendWelcomeEmail(opts: {
  to: string | null;
  name: string | null;
  portalUrl: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const subject = "Welcome to HyprrIQ — your account is ready";
  const rendered = await render(createElement(Welcome, { name: opts.name, portalUrl: opts.portalUrl }));
  if ((await emailGate("welcome", subject, [rendered])).length > 0) return { sent: false, reason: "banned_language" };
  if (!emailEnabled()) return { sent: false, reason: "no_api_key" };
  if (!opts.to) return { sent: false, reason: "no_recipient" };
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({ from: from(), to: opts.to, subject, html: rendered });
    await logSend("welcome", opts.to);
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: e instanceof Error ? e.message : "send_failed" };
  }
}
