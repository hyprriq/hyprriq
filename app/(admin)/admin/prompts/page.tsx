import { requireAdmin } from "@/lib/data/admin";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminPlaceholder } from "@/components/admin/admin-placeholder";

export default async function AdminPromptsPage() {
  const admin = await requireAdmin();
  return (
    <AdminShell active="prompts" title="Prompts" user={{ initial: (admin.full_name || admin.email || "?").charAt(0).toUpperCase(), email: admin.email }}>
      <AdminPlaceholder title="Prompts" blurb="Version and manage the research-track prompts. Ships with the automated research pipeline." />
    </AdminShell>
  );
}
