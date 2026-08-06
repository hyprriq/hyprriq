import { requireAdmin } from "@/lib/data/admin";
import { canManageUsers } from "@/lib/auth/permissions";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminPlaceholder } from "@/components/admin/admin-placeholder";

// ── ACQUISITION SHELL (2026-08-02) — blank-but-present by founder ruling. The working feature
// (grant creation, invite-link/coupon redemption through Stripe + credits, affiliate linkage)
// is DEFERRED backend (DEFERRED_acquisition_system_spec.md); the data model is design-final in
// docs/ADMIN_FOUNDATIONS.md section 7a (acquisition_grants + grant_redemptions — tables NOT yet
// migrated, so this shell deliberately queries nothing). Super-admin only (money-adjacent). ──

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
  return (
    <AdminShell active="acquisition" title="Acquisition" {...shellProps}>
      <AdminPlaceholder
        title="Acquisition — invite links, coupons, affiliate"
        blurb="One redeemable-grant mechanism, two delivery modes: invite links (auto-apply, zero friction) and coupon codes (broadcastable). Create-and-track lives here when the deferred backend builds; the grants/redemptions data model is design-final in ADMIN_FOUNDATIONS section 7a, tables land with that build."
      />
    </AdminShell>
  );
}
