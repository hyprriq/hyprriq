import { requireOnboardedClient, getClientProfile } from "@/lib/data/client";
import { PortalShell } from "@/components/portal/portal-shell";
import { SettingsForm } from "@/components/portal/settings-form";

export default async function SettingsPage() {
  const client = await requireOnboardedClient();
  const profile = await getClientProfile();

  return (
    <PortalShell client={client} active="settings" title="Settings">
      <p className="mb-5 max-w-3xl text-sm text-ink-2">
        Keep your contact and billing details up to date. These are saved to your
        account for your records.
      </p>
      {profile ? (
        <SettingsForm profile={profile} />
      ) : (
        <div className="rounded-card border border-line bg-surface p-8 text-center text-sm text-muted">
          Could not load your profile. Please refresh.
        </div>
      )}
    </PortalShell>
  );
}
