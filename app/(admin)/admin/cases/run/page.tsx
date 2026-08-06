import { requireAdmin } from "@/lib/data/admin";
import { can } from "@/lib/auth/permissions";
import { AdminShell } from "@/components/admin/admin-shell";
import { RunCaseForm } from "@/components/admin/run-case-form";

export default async function RunCasePage() {
  const op = await requireAdmin();
  const shellProps = {
    operator: op,
    clientScope: op.clientScope,
    user: { initial: (op.full_name || op.email || "?").charAt(0).toUpperCase(), email: op.email },
  } as const;
  if (!can(op, "run_case")) {
    return (
      <AdminShell active="run" title="Run a Case" {...shellProps}>
        <p className="rounded-card border border-line bg-surface p-6 text-sm text-muted">
          Requires the <span className="font-semibold">run_case</span> capability.
        </p>
      </AdminShell>
    );
  }
  return (
    <AdminShell active="run" title="Run a Case" {...shellProps}>
      <RunCaseForm />
    </AdminShell>
  );
}
