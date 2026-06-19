import { requireOnboardedClient } from "@/lib/data/client";
import { PortalShell } from "@/components/portal/portal-shell";
import { SubmitForm } from "@/components/portal/submit-form";

export default async function SubmitPage() {
  const client = await requireOnboardedClient();
  return (
    <PortalShell client={client} active="new" title="Submit Research">
      <SubmitForm plan={client.plan_type} creditsAvailable={client.credits_available} />
    </PortalShell>
  );
}
