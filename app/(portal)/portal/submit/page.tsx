import { requireSubmitAccess } from "@/lib/data/access";
import { PortalShell } from "@/components/portal/portal-shell";
import { SubmitForm } from "@/components/portal/submit-form";

export default async function SubmitPage() {
  // Gate at the route: no-plan / expired users are redirected to Billing and
  // never reach the form (root cause of the old "-1 credits at Step 3" dead-end).
  const { client } = await requireSubmitAccess();
  return (
    <PortalShell client={client} active="new" title="Submit Research">
      <SubmitForm plan={client.plan_type} creditsAvailable={client.credits_available} />
    </PortalShell>
  );
}
