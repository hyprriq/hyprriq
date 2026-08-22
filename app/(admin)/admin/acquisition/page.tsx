import { requireAdmin } from "@/lib/data/admin";
import { canManageUsers } from "@/lib/auth/permissions";
import { AdminShell } from "@/components/admin/admin-shell";
import { GrantsManager } from "@/components/admin/grants-manager";
import { PartnerRequestsPanel } from "@/components/admin/partner-requests-panel";
import { listGrants, listAttachFailures } from "@/lib/data/grants";
import { listPartnerRequests } from "@/lib/data/partnerRequests";
import { SITE_URL } from "@/lib/constants/site";

// ── ACQUISITION (live 2026-08-21 — the shell from 2026-08-02 becomes the working feature).
// Grants as invite links or coupon codes: create, share, see who redeemed, revoke. Value is
// ruled and fixed (one free full assessment); attribution lands on clients.referred_by_grant_id
// at redemption. Super-admin only (money-adjacent), same gate as before. ──

export default async function AdminAcquisitionPage() {
  const admin = await requireAdmin();
  const shellProps = { operator: admin, clientScope: admin.clientScope, user: { initial: (admin.full_name || admin.email || "?").charAt(0).toUpperCase(), email: admin.email } } as const;
  if (!canManageUsers(admin)) {
    return (
      <AdminShell active="acquisition" title="Acquisition" {...shellProps}>
        <p className="rounded-card border border-line bg-surface p-6 text-sm text-muted">Acquisition tooling is super-admin only.</p>
      </AdminShell>
    );
  }
  const [{ grants, redemptions }, attachFailures, partnerRequests] = await Promise.all([
    listGrants(), listAttachFailures(), listPartnerRequests(),
  ]);
  return (
    <AdminShell active="acquisition" title="Acquisition" {...shellProps}>
      <div className="space-y-5">
        {/* Requests FIRST (2026-08-22, item 1d): the decide-then-grant flow reads top to bottom —
            a request lands here, saying yes means creating the grant just below. */}
        <PartnerRequestsPanel requests={partnerRequests.requests} available={partnerRequests.available} />
        <GrantsManager grants={grants} redemptions={redemptions} attachFailures={attachFailures} siteUrl={SITE_URL} />
      </div>
    </AdminShell>
  );
}
