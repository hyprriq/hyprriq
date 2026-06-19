import { redirect } from "next/navigation";
import { getOrCreateClient } from "@/lib/data/client";
import { OnboardingFlow } from "@/components/portal/onboarding-flow";

// First-login onboarding. Guard: if the client has already completed it (or no
// client row could be provisioned), send them to the dashboard. Provisioning is
// lazy here — this is the first authenticated portal load after sign-up.
export default async function OnboardingPage() {
  const client = await getOrCreateClient();

  if (!client) {
    // Should not happen (portal layout runs auth.protect()), but fail safe.
    redirect("/sign-in");
  }
  if (client.onboarding_completed) {
    redirect("/portal/dashboard");
  }

  return (
    <OnboardingFlow
      fullName={client.full_name ?? ""}
      companyName={client.company_name ?? ""}
      plan={client.plan_type}
    />
  );
}
