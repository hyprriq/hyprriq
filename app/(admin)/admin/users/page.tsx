import { requireAdmin } from "@/lib/data/admin";
import { canManageStaff } from "@/lib/auth/permissions";
import { AdminShell } from "@/components/admin/admin-shell";
import { UsersManager } from "@/components/admin/users-manager";

// ── PERMISSION HIERARCHY (2026-08-02) — /admin/users. Staff managers only: the super admin
// manages admins AND staff; admins manage staff (subset-of-own grants, enforced by the API's
// grant core). Plain staff never reach this page, matching the APIs they cannot call. ──
export default async function AdminUsersPage() {
  const op = await requireAdmin();
  const shellProps = {
    operator: op,
    clientScope: op.clientScope,
    user: { initial: (op.full_name || op.email || "?").charAt(0).toUpperCase(), email: op.email },
  } as const;
  if (!canManageStaff(op)) {
    return (
      <AdminShell active="users" title="Users" {...shellProps}>
        <p className="rounded-card border border-line bg-surface p-6 text-sm text-muted">
          User management requires an admin role.
        </p>
      </AdminShell>
    );
  }
  return (
    <AdminShell active="users" title="Users" {...shellProps}>
      <UsersManager selfId={op.user_id} selfRole={op.role} selfCaps={[...op.capabilities]} />
    </AdminShell>
  );
}
