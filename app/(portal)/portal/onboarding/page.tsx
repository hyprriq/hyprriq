import { redirect } from "next/navigation";
import { getOrCreateClient, getClientProfile } from "@/lib/data/client";
import { OnboardingFlow } from "@/components/portal/onboarding-flow";

// First-login onboarding. Guard: if the client has already completed it (or no
// client row could be provisioned), send them to the dashboard. Provisioning is
// lazy here — this is the first authenticated portal load after sign-up.
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const client = await getOrCreateClient();

  if (!client) {
    // Should not happen (portal layout runs auth.protect()), but fail safe.
    redirect("/sign-in");
  }
  if (client.onboarding_completed) {
    redirect("/portal/dashboard");
  }

  const { checkout } = await searchParams;
  const returnedFromCheckout = checkout === "success" || checkout === "cancelled";
  // Resume on the plan step when a plan is now set, or when returning from a
  // checkout attempt (so we don't dump the user back on step 1).
  const initialStep: 1 | 2 = client.plan_type || returnedFromCheckout ? 2 : 1;

  // Profile prefill so a Back-from-checkout keeps Step 1 values the user entered.
  const profile = await getClientProfile();

  return (
    <OnboardingFlow
      fullName={client.full_name ?? ""}
      companyName={client.company_name ?? ""}
      plan={client.plan_type}
      initialStep={initialStep}
      justCheckedOut={checkout === "success" && !client.plan_type}
      profile={profile}
    />
  );
}
