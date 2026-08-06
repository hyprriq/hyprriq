import { requireAdmin } from "@/lib/data/admin";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminPlaceholder } from "@/components/admin/admin-placeholder";

export default async function AdminPromptsPage() {
  const admin = await requireAdmin();
  return (
    <AdminShell active="prompts" title="Prompts" operator={admin} clientScope={admin.clientScope} user={{ initial: (admin.full_name || admin.email || "?").charAt(0).toUpperCase(), email: admin.email }}>
      <AdminPlaceholder title="Prompts" blurb="The research-track prompts are versioned IN CODE today (frozen engine files, changed only through the gate process) — there is deliberately nothing to manage here yet. A management surface arrives only if prompts ever move out of code." />
    </AdminShell>
  );
}
