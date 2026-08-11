import { requireAdmin, getAdminClients, getAllStaffAssignments } from "@/lib/data/admin";
import { canManageStaff, canManageUsers } from "@/lib/auth/permissions";
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
  // CLOSE-OUT item 5 (2026-08-11): client assignment is user management — super admin only (the
  // assignments API enforces the same). Data comes server-side; mutations go through the API and
  // the client calls router.refresh() to re-read.
  const isSuper = canManageUsers(op);
  const assignableClients = isSuper
    ? (await getAdminClients(null)).map((c) => ({ id: c.id, label: c.full_name || c.company_name || c.email }))
    : [];
  const assignments = isSuper ? await getAllStaffAssignments() : [];
  return (
    <AdminShell active="users" title="Users" {...shellProps}>
      <UsersManager
        selfId={op.user_id}
        selfRole={op.role}
        selfCaps={[...op.capabilities]}
        assignableClients={assignableClients}
        assignments={assignments}
      />
    </AdminShell>
  );
}
