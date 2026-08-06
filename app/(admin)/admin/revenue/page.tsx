import { requireAdmin } from "@/lib/data/admin";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminPlaceholder } from "@/components/admin/admin-placeholder";

export default async function AdminRevenuePage() {
  const admin = await requireAdmin();
  return (
    <AdminShell active="revenue" title="Revenue" operator={admin} clientScope={admin.clientScope} user={{ initial: (admin.full_name || admin.email || "?").charAt(0).toUpperCase(), email: admin.email }}>
      <AdminPlaceholder title="Revenue" blurb="MRR breakdown, plan distribution, top-up sales, and churn — beyond the headline KPI on the dashboard." />
    </AdminShell>
  );
}
