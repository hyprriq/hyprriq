import { redirect } from "next/navigation";
import { requireOnboardedClient, type Client } from "@/lib/data/client";

// Single source of truth for plan-state gating (see ADR-005). Pure derivation off
// the already-fetched client row — no extra DB calls. Every gated route + the
// sidebar read from this; no per-page copy-pasted checks.

export type AccessState = "no_plan" | "active" | "expired";

export type Access = {
  state: AccessState;
  canSubmit: boolean; // create new cases / reach Submit
  canViewActive: boolean; // active/in-progress cases list
  canViewCompleted: boolean; // completed reports + past case detail
  canRequestChange: boolean; // change request on a delivered case
};

export function deriveAccess(client: Client): Access {
  if (!client.plan_type) {
    return { state: "no_plan", canSubmit: false, canViewActive: false, canViewCompleted: false, canRequestChange: false };
  }
  if (client.billing_status === "cancelled" || client.billing_status === "past_due") {
    // Read-only: they keep access to what they already paid for, nothing new.
    return { state: "expired", canSubmit: false, canViewActive: false, canViewCompleted: true, canRequestChange: false };
  }
  // active or trialling
  return { state: "active", canSubmit: true, canViewActive: true, canViewCompleted: true, canRequestChange: true };
}

// Convenience: onboarded client + derived access in one call for gated pages.
export async function getClientWithAccess(): Promise<{ client: Client; access: Access }> {
  const client = await requireOnboardedClient();
  return { client, access: deriveAccess(client) };
}

// Route guard for create/submit actions. no_plan/expired → Billing (choose/reactivate).
export async function requireSubmitAccess(): Promise<{ client: Client; access: Access }> {
  const { client, access } = await getClientWithAccess();
  if (!access.canSubmit) redirect("/portal/billing");
  return { client, access };
}
