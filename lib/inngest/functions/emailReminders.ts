import { inngest } from "@/lib/inngest/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendLowCreditEmail, sendRenewalReminderEmail } from "@/lib/email/notify";
import { SITE_URL } from "@/lib/constants/site";

// ── SCHEDULED EMAIL REMINDERS (ADR-EMAIL-001, the "dangerous class" — emails 6a/6b/7) ────────
//
// A daily sweep that can fire forever BECAUSE it decides nothing about idempotency: every send
// goes through reserve-then-send on (template, dedup_key), so "one per threshold per cycle" and
// "one per renewal" hold BY CONSTRUCTION, not by cooldown arithmetic here. This function only
// selects candidates; the unique index is the law.
//
// Scope: subscription clients with an ACTIVE billing status. past_due clients get the
// payment-failed email (webhook-driven), not credit nags; cancelled clients get nothing.
// The renewal reminder is the founder-ruled pre-charge courtesy ONLY — sent when the renewal
// date falls within the next 3 days.

const RENEWAL_WINDOW_DAYS = 3;

export const emailReminders = inngest.createFunction(
  { id: "email-reminders", name: "Scheduled email reminders (low-credit, renewal)", retries: 1, triggers: [{ cron: "0 13 * * *" }] },
  async () => {
    const out = { low_credit_sent: 0, renewal_sent: 0, skipped_duplicate: 0, errors: 0 };

    const { data: clients, error } = await supabaseAdmin
      .from("clients")
      .select("id, email, full_name, credits_available, renewal_date, billing_status, plan_category")
      .eq("plan_category", "subscription")
      .eq("billing_status", "active");
    if (error) throw new Error(`email-reminders: clients read failed: ${error.message}`);

    const now = Date.now();
    const windowEnd = now + RENEWAL_WINDOW_DAYS * 86_400_000;

    for (const c of clients ?? []) {
      const name = (c.full_name as string | null) ?? null;
      const email = (c.email as string | null) ?? null;
      const renewal = (c.renewal_date as string | null) ?? null;

      // Low credit — at 1, again at 0. The dedup key carries the cycle anchor so the same
      // threshold fires once per cycle and re-arms when renewal_date moves.
      const credits = (c.credits_available as number | null) ?? null;
      if (credits !== null && credits <= 1) {
        const threshold = credits <= 0 ? 0 : 1;
        const r = await sendLowCreditEmail({
          to: email, name, threshold: threshold as 0 | 1, clientId: c.id as string,
          cycleAnchor: renewal ?? "none", renewalDate: renewal, portalUrl: `${SITE_URL}/portal`,
        });
        if (r.sent) out.low_credit_sent++;
        else if (r.reason === "duplicate") out.skipped_duplicate++;
        else if (r.reason !== "no_api_key" && r.reason !== "no_recipient") out.errors++;
      }

      // Renewal reminder — the pre-charge courtesy, inside the window only.
      if (renewal) {
        const t = new Date(renewal).getTime();
        if (Number.isFinite(t) && t >= now && t <= windowEnd) {
          const r = await sendRenewalReminderEmail({
            to: email, name, clientId: c.id as string, renewalDate: renewal,
            billingUrl: `${SITE_URL}/portal/billing`,
          });
          if (r.sent) out.renewal_sent++;
          else if (r.reason === "duplicate") out.skipped_duplicate++;
          else if (r.reason !== "no_api_key" && r.reason !== "no_recipient") out.errors++;
        }
      }
    }

    return out;
  },
);
