import { requireAdmin } from "@/lib/data/admin";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminPlaceholder } from "@/components/admin/admin-placeholder";

export default async function AdminOutcomesPage() {
  const admin = await requireAdmin();
  return (
    <AdminShell active="outcomes" title="Outcomes" operator={admin} clientScope={admin.clientScope} user={{ initial: (admin.full_name || admin.email || "?").charAt(0).toUpperCase(), email: admin.email }}>
      <AdminPlaceholder title="Outcomes" blurb="The aggregate view of recorded outcomes. Outcome capture is already live on each delivered case's review page — this page adds the roll-up across cases." />
    </AdminShell>
  );
}
