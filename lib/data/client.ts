import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { sendWelcomeEmail } from "@/lib/email/notify";
import { SITE_URL } from "@/lib/constants/site";
import type { PlanType } from "@/lib/constants/plans";

// ADR-006: admin access is a role enum, not a boolean. Only 'client' and
// 'founder' are in use today; 'admin' (staff) is reserved for a future hire.
export type Role = "client" | "admin" | "founder";
export function isElevated(role: Role): boolean {
  return role !== "client";
}

// Shape of a clients row (subset we read in the portal). The server Supabase
// client uses the service-role key (bypasses RLS), so every query here MUST be
// explicitly scoped by the Clerk user id — see lib/supabase/server.ts.
export type Client = {
  id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  plan_type: PlanType | null;
  plan_category: "one_time" | "subscription" | null;
  credits_available: number;
  credits_used_this_cycle: number;
  renewal_date: string | null;
  billing_status: "active" | "past_due" | "cancelled" | "trialling" | "cancelling";
  stripe_customer_id: string | null;
  onboarding_completed: boolean;
  role: Role;
  last_active_at: string | null;
};

// ── DATA HONESTY (2026-08-11, admin close-out item 4): last_active_at was written ONCE at row
// creation and never again, so "Active Clients" ordering was meaningless. It now refreshes on a
// REAL signal — every client-authenticated portal load — throttled so a browsing session writes
// at most once per window, and non-fatal (a failed touch never breaks a page). ──
const LAST_ACTIVE_THROTTLE_MS = 15 * 60_000;

function lastActiveStale(last: string | null): boolean {
  return !last || Date.now() - new Date(last).getTime() > LAST_ACTIVE_THROTTLE_MS;
}

// Lazy idempotent provisioning. There is no Clerk user.created webhook, so the
// clients row is created on first authenticated portal load. Idempotent on the
// PK (id = Clerk user id) — safe under concurrent first-loads. Never overwrites
// plan/credits on an existing row.
export async function getOrCreateClient(): Promise<Client | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const supa = createServerClient();
  const select = "id, email, full_name, company_name, plan_type, plan_category, credits_available, credits_used_this_cycle, renewal_date, billing_status, stripe_customer_id, onboarding_completed, role, last_active_at";

  let { data } = await supa
    .from("clients")
    .select(select)
    .eq("id", userId)
    .maybeSingle();

  if (data && lastActiveStale((data as { last_active_at?: string | null }).last_active_at ?? null)) {
    try {
      await supa.from("clients").update({ last_active_at: new Date().toISOString() }).eq("id", userId);
    } catch { /* the touch is telemetry, never a gate */ }
  }

  if (!data) {
    const user = await currentUser();
    const email =
      user?.primaryEmailAddress?.emailAddress ??
      user?.emailAddresses?.[0]?.emailAddress ??
      "";
    const full_name =
      [user?.firstName, user?.lastName].filter(Boolean).join(" ") || null;

    // ── WELCOME EMAIL (ADR-EMAIL-001, email #1): `.select()` on the ignore-duplicates upsert
    // returns rows ONLY for an actual insert — the CREATE path — so under concurrent first-loads
    // exactly one request sees a row back and exactly one welcome sends. Never the every-visit
    // path. Non-fatal by contract: a failed send never breaks provisioning.
    const { data: created } = await supa
      .from("clients")
      .upsert(
        { id: userId, email, full_name, last_active_at: new Date().toISOString() },
        { onConflict: "id", ignoreDuplicates: true },
      )
      .select("id");

    if (created && created.length > 0 && email) {
      try {
        await sendWelcomeEmail({ to: email, name: full_name, portalUrl: `${SITE_URL}/portal` });
      } catch { /* the welcome is a courtesy, never a gate */ }
    }

    ({ data } = await supa
      .from("clients")
      .select(select)
      .eq("id", userId)
      .maybeSingle());
  }

  return (data as Client) ?? null;
}

// Portal guard for non-onboarding pages: provision the client, bounce to
// sign-in if somehow unauthenticated, and bounce to onboarding until it's done.
// Returns a guaranteed non-null client. No loop risk — the onboarding page
// redirects the other way only once onboarding_completed is true.
export async function requireOnboardedClient(): Promise<Client> {
  const client = await getOrCreateClient();
  if (!client) redirect("/sign-in");
  if (!client.onboarding_completed) redirect("/portal/onboarding");
  return client;
}

// Editable client profile (Item 1). Selected for the Settings page and the
// onboarding profile step. Deliberately EXCLUDES internal_notes/notes_updated_at
// — those are admin-only and must never be read by a client-facing query.
export type ClientProfile = {
  full_name: string | null;
  company_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  primary_marketplace: string | null;
  marketplace_other_name: string | null;
  sells_on_amazon: boolean | null;
  sells_on_walmart: boolean | null;
  amazon_store_name: string | null;
  walmart_store_name: string | null;
  billing_company_name: string | null;
  billing_address_line1: string | null;
  billing_address_line2: string | null;
  billing_city: string | null;
  billing_state: string | null;
  billing_zip: string | null;
  billing_country: string | null;
  vat_number: string | null;
  ein_number: string | null;
  tax_id: string | null;
};

const PROFILE_COLUMNS =
  "full_name, company_name, contact_name, contact_email, contact_phone, primary_marketplace, marketplace_other_name, sells_on_amazon, sells_on_walmart, amazon_store_name, walmart_store_name, billing_company_name, billing_address_line1, billing_address_line2, billing_city, billing_state, billing_zip, billing_country, vat_number, ein_number, tax_id";

export async function getClientProfile(): Promise<ClientProfile | null> {
  const { userId } = await auth();
  if (!userId) return null;
  const supa = createServerClient();
  const { data } = await supa
    .from("clients")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();
  return (data as ClientProfile) ?? null;
}

// Read-only fetch of the current client (no provisioning). Returns null if the
// row doesn't exist yet.
export async function getCurrentClient(): Promise<Client | null> {
  const { userId } = await auth();
  if (!userId) return null;
  const supa = createServerClient();
  const { data } = await supa
    .from("clients")
    .select(
      "id, email, full_name, company_name, plan_type, plan_category, credits_available, credits_used_this_cycle, renewal_date, billing_status, stripe_customer_id, onboarding_completed, role, last_active_at",
    )
    .eq("id", userId)
    .maybeSingle();
  return (data as Client) ?? null;
}
