// ── ADMIN SUPPORT QUEUE reads (founder-ruled 2026-08-02) — READ-ONLY BY LAW. A list is not
// ticketing: no reply, no assign, no status change; helpdesk stays email-only at launch, so
// this module deliberately contains ZERO write calls (the moment it gains one, it violates
// that ruling). Client-partitioned INCLUDING the badge count — an unscoped open-count would
// leak the existence of out-of-scope client requests, same leak as a list, just quieter.
// FAIL CLOSED: an empty scope short-circuits to nothing WITHOUT querying.
// NEW FILE by standing rule 7 — lib/data/support.ts is the CLIENT portal's own-requests read
// and stays untouched.

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { ClientScope } from "@/lib/auth/clientScope";

export interface AdminSupportRow {
  id: string;
  sr_number: string;
  type: string;
  subject: string;
  body: string;
  status: string;             // open | in_progress | resolved | closed (schema CHECK)
  admin_response: string | null;
  case_id: string | null;
  created_at: string;
  resolved_at: string | null;
  clients: { full_name: string | null; email: string } | null;
}

export async function getAdminSupportRequests(scope: ClientScope): Promise<AdminSupportRow[]> {
  if (scope !== null && scope.length === 0) return []; // fail closed, no query
  let q = supabaseAdmin
    .from("support_requests")
    .select("id, sr_number, type, subject, body, status, admin_response, case_id, created_at, resolved_at, clients(full_name, email)")
    .order("created_at", { ascending: false });
  if (scope !== null) q = q.in("client_id", scope);
  const { data } = await q;
  return (data as unknown as AdminSupportRow[]) ?? [];
}

/** The nav badge count — same scoping law as the list (leak-equivalent, founder-ruled). */
export async function getOpenSupportCount(scope: ClientScope): Promise<number> {
  if (scope !== null && scope.length === 0) return 0; // fail closed, no query
  let q = supabaseAdmin
    .from("support_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");
  if (scope !== null) q = q.in("client_id", scope);
  const { count, error } = await q;
  if (error) return 0; // a broken badge shows nothing, never everything
  return count ?? 0;
}
