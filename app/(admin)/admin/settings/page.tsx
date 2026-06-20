import { requireAdmin } from "@/lib/data/admin";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminPlaceholder } from "@/components/admin/admin-placeholder";

export default async function AdminSettingsPage() {
  const admin = await requireAdmin();
  return (
    <AdminShell active="settings" title="Settings" user={{ initial: (admin.full_name || admin.email || "?").charAt(0).toUpperCase(), email: admin.email }}>
      <AdminPlaceholder title="Settings" blurb="Admin configuration — SLA windows, daily case caps, category flags, and team access." />
    </AdminShell>
  );
}
