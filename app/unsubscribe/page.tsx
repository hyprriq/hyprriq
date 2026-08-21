import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyUnsubscribeToken, unsubscribeSecretConfigured } from "@/lib/email/unsubscribeToken";

// ── THE PERMANENT UNSUBSCRIBE ROUTE (ADR-EMAIL-001) ──────────────────────────────────────────
//
// Campaign footers link here: /unsubscribe?email=…&token=…. The token is HMAC-per-address, so a
// link only ever unsubscribes the address it was minted for. Setting unsubscribe_status is
// IRREVERSIBLE from this route — nothing here can flip an address back to active, ever.
// Fail states are all plain sentences, never errors: a bad token, a missing table (migration
// not yet run), or an unconfigured secret each get an honest line.
//
// This page must exist at a PERMANENT url before the first campaign ever sends — an unsubscribe
// link that 404s after a tool migration is a spam complaint (and a CAN-SPAM problem), so the
// route lives in the app, not the tool.

export const dynamic = "force-dynamic";

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string }>;
}) {
  const { email: rawEmail, token } = await searchParams;
  const email = (rawEmail ?? "").trim().toLowerCase();

  let message: string;
  if (!unsubscribeSecretConfigured()) {
    message = "Unsubscribe links are not active yet. Write to support@hyprriq.com and we'll remove you by hand.";
  } else if (!email || !token || !verifyUnsubscribeToken(email, token)) {
    message = "This unsubscribe link is not valid. Use the link from your email, or write to support@hyprriq.com and we'll remove you by hand.";
  } else {
    // LIVE SCHEMA (founder-run 2026-08-21): unsubscribed = consent_status flip + unsubscribed_at
    // stamp. Irreversible from this route — nothing here (or in the signup path, which inserts
    // with ignoreDuplicates) can ever flip an unsubscribed address back to subscribed.
    const { error } = await supabaseAdmin
      .from("marketing_contacts")
      .update({ consent_status: "unsubscribed", unsubscribed_at: new Date().toISOString() })
      .eq("email", email);
    message = error
      ? "We couldn't process this right now. Write to support@hyprriq.com and we'll remove you by hand."
      : "You're unsubscribed. You won't receive marketing email from us again at this address.";
  }

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-start justify-center px-6 py-16">
      <h1 className="font-display text-2xl font-bold text-ink">Email preferences</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-ink-2">{message}</p>
      <p className="mt-6 text-[13px] text-muted">
        Emails about your paid reports and account (order confirmations, report delivery) are part of the
        service and continue either way.
      </p>
    </main>
  );
}
