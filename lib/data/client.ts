import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
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
};

// Lazy idempotent provisioning. There is no Clerk user.created webhook, so the
// clients row is created on first authenticated portal load. Idempotent on the
// PK (id = Clerk user id) — safe under concurrent first-loads. Never overwrites
// plan/credits on an existing row.
export async function getOrCreateClient(): Promise<Client | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const supa = createServerClient();
  const select = "id, email, full_name, company_name, plan_type, plan_category, credits_available, credits_used_this_cycle, renewal_date, billing_status, stripe_customer_id, onboarding_completed, role";

  let { data } = await supa
    .from("clients")
    .select(select)
    .eq("id", userId)
    .maybeSingle();

  if (!data) {
    const user = await currentUser();
    const email =
      user?.primaryEmailAddress?.emailAddress ??
      user?.emailAddresses?.[0]?.emailAddress ??
      "";
    const full_name =
      [user?.firstName, user?.lastName].filter(Boolean).join(" ") || null;

    await supa
      .from("clients")
      .upsert(
        { id: userId, email, full_name, last_active_at: new Date().toISOString() },
        { onConflict: "id", ignoreDuplicates: true },
      );

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

// Read-only fetch of the current client (no provisioning). Returns null if the
// row doesn't exist yet.
export async function getCurrentClient(): Promise<Client | null> {
  const { userId } = await auth();
  if (!userId) return null;
  const supa = createServerClient();
  const { data } = await supa
    .from("clients")
    .select(
      "id, email, full_name, company_name, plan_type, plan_category, credits_available, credits_used_this_cycle, renewal_date, billing_status, stripe_customer_id, onboarding_completed, role",
    )
    .eq("id", userId)
    .maybeSingle();
  return (data as Client) ?? null;
}
