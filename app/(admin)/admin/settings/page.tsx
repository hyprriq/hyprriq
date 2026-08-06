import { requireAdmin } from "@/lib/data/admin";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminPlaceholder } from "@/components/admin/admin-placeholder";

export default async function AdminSettingsPage() {
  const admin = await requireAdmin();
  return (
    <AdminShell active="settings" title="Settings" operator={admin} clientScope={admin.clientScope} user={{ initial: (admin.full_name || admin.email || "?").charAt(0).toUpperCase(), email: admin.email }}>
      <AdminPlaceholder title="Settings" blurb="Admin configuration — SLA windows, daily case caps, and category flags. Team access already lives under Users." />
    </AdminShell>
  );
}
