import { supabaseAdmin } from "@/lib/supabase/admin";

// ── ADMIN BATCH (2026-07-30) — the role hierarchy: ONE super admin + sub-users with CHECKED
// CAPABILITIES (never hardcoded ids/emails). Rows live in `admin_permissions` (founder-run
// migration; roles live on their OWN identities — never on client rows, per the identity ruling:
// super admin = g@hyprriq.com when the mailbox exists; gautamnaidu.p@gmail.com = full-access
// sub-user; no role is ever assigned to an existing clients row).
//
// TRANSITIONAL FALLBACK (until the migration + super-admin seed run): a clients row with
// role='founder' operates as super-admin-equivalent, role='admin' as a full-access sub-user —
// existing admin access keeps working the moment this ships, and dies naturally once the real
// rows exist. FAIL CLOSED everywhere else: no row (or a query error, or the table not existing
// yet) means NO capabilities.
//
// NO SELF-ESCALATION, structurally: manage_users is NOT a grantable capability — it is the
// super_admin ROLE itself. The users API additionally refuses to touch the caller's own row. ──

// Constants live in the dependency-free capabilities.ts (client-importable — the /admin/users
// crash was this module's supabaseAdmin import reaching the browser bundle via a client
// component that only wanted CAPABILITIES). Re-exported here so server callsites are unchanged.
export { CAPABILITIES, FULL_ACCESS, SUPER_ADMIN_ONLY_CAPS, GRANTABLE_CAPABILITIES, type Capability } from "@/lib/auth/capabilities";
import { CAPABILITIES, FULL_ACCESS, SUPER_ADMIN_ONLY_CAPS, type Capability } from "@/lib/auth/capabilities";

export interface Operator {
  user_id: string;
  // PERMISSION HIERARCHY (founder-ruled 2026-08-02): super_admin > admin > sub_user. Admins
  // manage STAFF (create sub_users, grant a subset of their OWN capabilities); only the super
  // admin manages admins. The 'admin' role value needs the founder-run role-CHECK migration.
  role: "super_admin" | "admin" | "sub_user";
  capabilities: readonly Capability[];
  transitional?: boolean; // true when derived from the legacy clients.role fallback
}

export async function getOperator(userId: string): Promise<Operator | null> {
  try {
    const { data: row, error } = await supabaseAdmin
      .from("admin_permissions")
      .select("user_id, role, capabilities, disabled")
      .eq("user_id", userId)
      .maybeSingle();
    if (!error && row && !row.disabled) {
      // READ-TIME STRIP (containment, 2026-08-02): the super-only pair (money + scope-breaker)
      // is exercised through the super_admin ROLE only — even a hand-edited row cannot carry it
      // onto an admin/sub_user operator. Grant-time filtering (lib/auth/grants) is the other half.
      const caps = (Array.isArray(row.capabilities) ? row.capabilities : []).filter(
        (c): c is Capability =>
          (CAPABILITIES as readonly string[]).includes(c) && !SUPER_ADMIN_ONLY_CAPS.includes(c as Capability),
      );
      if (row.role === "super_admin") return { user_id: userId, role: "super_admin", capabilities: FULL_ACCESS };
      if (row.role === "admin") return { user_id: userId, role: "admin", capabilities: caps };
      return { user_id: userId, role: "sub_user", capabilities: caps };
    }
    if (!error && row?.disabled) return null; // disabled beats every fallback
  } catch {
    /* table may not exist pre-migration — fall through to the transitional check */
  }
  // Transitional: legacy clients.role keeps the founder working pre-seed.
  const { data: c } = await supabaseAdmin.from("clients").select("role").eq("id", userId).maybeSingle();
  if (c?.role === "founder") return { user_id: userId, role: "super_admin", capabilities: FULL_ACCESS, transitional: true };
  if (c?.role === "admin") return { user_id: userId, role: "sub_user", capabilities: FULL_ACCESS, transitional: true };
  return null; // fail closed
}

export function can(op: Operator | null, cap: Capability): boolean {
  if (!op) return false;
  if (op.role === "super_admin") return true;
  return op.capabilities.includes(cap);
}

export function canManageUsers(op: Operator | null): boolean {
  return op?.role === "super_admin"; // manages ADMINS + the super-only powers — never grantable
}

// PERMISSION HIERARCHY (2026-08-02): staff management — super admin AND admins. Admins create
// sub_users only, with a subset of their own capabilities (lib/auth/grants enforces both).
export function canManageStaff(op: Operator | null): boolean {
  return op?.role === "super_admin" || op?.role === "admin";
}
