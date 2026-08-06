import { requireAdmin } from "@/lib/data/admin";
import { canManageUsers } from "@/lib/auth/permissions";
import { AdminShell } from "@/components/admin/admin-shell";
import { UsersManager } from "@/components/admin/users-manager";

// ── ADMIN ACCESS FIX — /admin/users. SUPER-ADMIN ONLY (the role, not a capability): sub-users
// never see this page, matching the API they could not call anyway. ──
export default async function AdminUsersPage() {
  const op = await requireAdmin();
  const shellProps = {
    operator: op,
    clientScope: op.clientScope,
    user: { initial: (op.full_name || op.email || "?").charAt(0).toUpperCase(), email: op.email },
  } as const;
  if (!canManageUsers(op)) {
    return (
      <AdminShell active="users" title="Users" {...shellProps}>
        <p className="rounded-card border border-line bg-surface p-6 text-sm text-muted">
          User management is super-admin only.
        </p>
      </AdminShell>
    );
  }
  return (
    <AdminShell active="users" title="Users" {...shellProps}>
      <UsersManager selfId={op.user_id} />
    </AdminShell>
  );
}
