import { requireAdmin } from "@/lib/data/admin";
import { can } from "@/lib/auth/permissions";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminPlaceholder } from "@/components/admin/admin-placeholder";

// ── BULK UPLOAD SHELL (2026-08-02) — blank-but-present by founder ruling. The working feature
// (10-50 supplier/brand batch intake + scan) is DEFERRED; the model is design-final in
// docs/ADMIN_FOUNDATIONS.md section 7b (bulk_batches + cases.batch_id — a batch is a grouping
// over ORDINARY cases; pipeline, credits and H1 apply per-case unchanged). Tables not yet
// migrated, so this shell deliberately queries nothing. Gated run_case (it drives intake). ──

export default async function AdminBulkPage() {
  const admin = await requireAdmin();
  const shellProps = { operator: admin, clientScope: admin.clientScope, user: { initial: (admin.full_name || admin.email || "?").charAt(0).toUpperCase(), email: admin.email } } as const;
  if (!can(admin, "run_case")) {
    return (
      <AdminShell active="bulk" title="Bulk Upload" {...shellProps}>
        <p className="rounded-card border border-line bg-surface p-6 text-sm text-muted">Requires the run_case capability.</p>
      </AdminShell>
    );
  }
  return (
    <AdminShell active="bulk" title="Bulk Upload" {...shellProps}>
      <AdminPlaceholder
        title="Bulk Upload"
        blurb="Batch intake for 10-50 suppliers/brands at once. A batch is a grouping over ordinary cases (per-case pipeline, credits and attempt integrity unchanged). Ships with the deferred bulk build; the bulk_batches model is design-final in ADMIN_FOUNDATIONS section 7b."
      />
    </AdminShell>
  );
}
