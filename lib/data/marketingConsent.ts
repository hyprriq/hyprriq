import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

// ── THE ONE CONSENT WRITE (ADR-EMAIL-001) — extracted 2026-08-22 from /api/newsletter so the
// partner-request opt-in reuses the existing handling instead of growing a second one (founder-
// directed, item 1h). Semantics unchanged and load-bearing: insert with ignoreDuplicates — a
// resubmission never resets consent_at, and an UNSUBSCRIBED address stays unsubscribed
// (re-subscription is a deliberate future flow, not a side effect of typing your email twice).
// The EXPRESS-consent evidence is the row itself: a labeled surface (source) + address + consent_at.

export async function recordMarketingConsent(
  email: string,
  source: string,
): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await supabaseAdmin.from("marketing_contacts").upsert(
    {
      email,
      consent_status: "subscribed",
      consent_at: new Date().toISOString(),
      source,
    },
    { onConflict: "email", ignoreDuplicates: true },
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true, error: null };
}
