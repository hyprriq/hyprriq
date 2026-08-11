import { requireAdmin } from "@/lib/data/admin";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminPlaceholder } from "@/components/admin/admin-placeholder";

export default async function AdminSettingsPage() {
  const admin = await requireAdmin();
  return (
    <AdminShell active="settings" title="Settings" operator={admin} clientScope={admin.clientScope} user={{ initial: (admin.full_name || admin.email || "?").charAt(0).toUpperCase(), email: admin.email }}>
      {/* REWORDED 2026-08-12 (close-out follow-up): the old blurb named settings that do not
          exist (SLA windows, daily case caps, category flags). State the truth; invent nothing. */}
      <AdminPlaceholder title="Settings" blurb="There are no editable settings here. Team access and permissions live under Users. Email keys, Stripe prices, and the support inbox are environment configuration; business rules — pricing, brand caps, the 24-hour case SLA — are founder-ruled constants in code. No settings storage is being built." />
    </AdminShell>
  );
}
