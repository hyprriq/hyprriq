// ── ADMIN FOUNDATIONS (2026-08-02) — CLIENT PARTITIONING. A second axis, orthogonal to
// capabilities: capabilities = what ACTIONS an operator may take; scope = WHICH CLIENTS they
// may take them on. Rules (founder-ruled):
//   · super_admin: ALWAYS all clients (scope = null = unrestricted).
//   · sub_user default: ASSIGNED-ONLY via staff_client_assignments.
//   · view_all_clients capability = the grantable elevation to all clients.
//   · transitional legacy operators (clients.role fallback) see all — pre-partitioning behavior
//     preserved; the fallback retires at Phase I anyway.
// FAIL CLOSED: for a scoped operator, a failed/absent assignments query yields an EMPTY scope
// (sees nothing), never everything. Enforcement is APP-LAYER at the data/API seam (service-role
// bypasses RLS by design); the Phase-I RLS suite can later add DB policies keyed on the SAME
// table — no conflict, one source of truth.

import { supabaseAdmin } from "@/lib/supabase/admin";
import { can, type Operator } from "@/lib/auth/permissions";

/** null = unrestricted (sees all clients); string[] = the only client ids visible (may be empty). */
export type ClientScope = string[] | null;

export function seesAllClients(op: Operator | null): boolean {
  if (!op) return false;
  if (op.role === "super_admin") return true;
  if (op.transitional) return true; // legacy fallback keeps pre-partitioning behavior
  return can(op, "view_all_clients");
}

export async function getClientScope(op: Operator | null): Promise<ClientScope> {
  if (!op) return []; // no operator = sees nothing (callers gate before this anyway)
  if (seesAllClients(op)) return null;
  try {
    const { data, error } = await supabaseAdmin
      .from("staff_client_assignments")
      .select("client_id")
      .eq("admin_user_id", op.user_id);
    if (error) return []; // fail closed (table absent pre-migration, or query error)
    return (data ?? []).map((r) => r.client_id as string);
  } catch {
    return [];
  }
}

/** Route-level guard: may this operator act on this client's data? */
export async function clientInScope(op: Operator | null, clientId: string): Promise<boolean> {
  if (!op) return false;
  if (seesAllClients(op)) return true;
  const scope = await getClientScope(op);
  return scope === null || scope.includes(clientId);
}

/** Case-id routes: resolve the case's owning client, then apply the same scope rule.
 *  Returns false for a missing case too — routes 404/403 the same way either way. */
export async function caseInScope(op: Operator | null, caseId: string): Promise<boolean> {
  if (!op) return false;
  if (seesAllClients(op)) return true;
  const { data, error } = await supabaseAdmin.from("cases").select("client_id").eq("id", caseId).maybeSingle();
  if (error || !data) return false;
  return clientInScope(op, data.client_id as string);
}
