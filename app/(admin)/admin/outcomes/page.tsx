import { requireAdmin } from "@/lib/data/admin";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminPlaceholder } from "@/components/admin/admin-placeholder";

export default async function AdminOutcomesPage() {
  const admin = await requireAdmin();
  return (
    <AdminShell active="outcomes" title="Outcomes" user={{ initial: (admin.full_name || admin.email || "?").charAt(0).toUpperCase(), email: admin.email }}>
      <AdminPlaceholder title="Outcomes" blurb="Track real-world results of delivered verdicts — enforcement actions, vendor changes, and case outcomes." />
    </AdminShell>
  );
}
