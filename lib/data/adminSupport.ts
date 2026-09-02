// ── ADMIN SUPPORT (ruling superseded 2026-09-01) ─────────────────────────────────────────────
//
// THIS MODULE WAS READ-ONLY BY LAW. The 2026-08-02 ruling read: "a list is not ticketing: no
// reply, no assign, no status change; HELPDESK STAYS EMAIL-ONLY AT LAUNCH", and this file said
// that the moment it gained a write call it would violate that ruling. It now has one.
//
// ⚠ THE OLD RULING WAS NOT WRONG — IT WAS CONDITIONAL, AND THE CONDITION NEVER HELD. Read-only
// plus a working email helpdesk is a coherent launch posture. But `from()` is
// support@hyprriq.com and Resend receiving was never enabled, so a client reply was accepted and
// discarded with no bounce. Read-only plus no inbound path is a queue where a ticket can be seen
// and never answered. The founder proved it by raising one.
//
// THE NEW RULING, in the founder's words: "EMAIL IS THE ALERT, NEVER THE CHANNEL. It tells me
// something needs answering; the answer happens in the product." And the reason, which is the
// part worth keeping: "email has no state. A ticket answered by email is answered nowhere —
// nothing shows what is open, what is waiting on me, or what is resolved, and a second operator
// would never see it. Status only means something if the replies live beside it."
//
// ⛔ WHAT DID NOT CHANGE. Client partitioning still governs every read AND the write: a scoped
// operator cannot open, answer or resolve a ticket belonging to a client outside their scope.
// FAIL CLOSED everywhere: an empty scope short-circuits to nothing WITHOUT querying.
// lib/data/support.ts remains the CLIENT portal's own-requests read (standing rule 7).

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
  /** Present on the single-ticket read; the list select omits it. */
  client_id?: string | null;
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

/** One ticket, scope-checked. Returns null for out-of-scope or missing — the route 404s either
 *  way, so a scoped operator cannot distinguish "not yours" from "does not exist". */
export async function getAdminSupportRequest(
  id: string,
  scope: ClientScope,
): Promise<AdminSupportRow | null> {
  if (scope !== null && scope.length === 0) return null; // fail closed, no query
  let q = supabaseAdmin
    .from("support_requests")
    .select("id, sr_number, type, subject, body, status, admin_response, case_id, created_at, resolved_at, client_id, clients(full_name, email)")
    .eq("id", id);
  if (scope !== null) q = q.in("client_id", scope);
  const { data } = await q.maybeSingle();
  return (data as unknown as AdminSupportRow) ?? null;
}

export const SUPPORT_STATUSES = ["open", "in_progress", "resolved", "closed"] as const;
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];

/**
 * Write the operator's reply and move the ticket's status.
 *
 * ⚠ resolved_at IS DERIVED FROM STATUS, NEVER PASSED IN. A caller that could set them
 * independently would eventually produce a resolved ticket with no timestamp, or a timestamp on
 * an open one — two fields disagreeing about the same fact. Moving to resolved/closed stamps it;
 * moving back to open/in_progress clears it.
 *
 * ⛔ THE RESPONSE TEXT IS NOT GATED HERE. lib/utils/banned-language runs in the ROUTE, before
 * this is ever called, exactly as the prose-override route does it: the gate decides, not the
 * operator, and a data-layer function that also enforced copy law would be two responsibilities
 * in one place with no way to test either alone.
 */
export async function saveSupportResponse(opts: {
  id: string;
  response: string | null;
  status: SupportStatus;
  actorId: string;
}): Promise<{ error: string | null }> {
  const stamped = opts.status === "resolved" || opts.status === "closed";
  const patch: Record<string, unknown> = {
    status: opts.status,
    resolved_at: stamped ? new Date().toISOString() : null,
  };
  if (opts.response !== null) patch.admin_response = opts.response;
  const { error } = await supabaseAdmin.from("support_requests").update(patch).eq("id", opts.id);
  if (error) return { error: error.message };
  await supabaseAdmin.from("audit_log").insert({
    table_name: "support_requests",
    record_id: opts.id,
    action: "UPDATE",
    actor_id: opts.actorId,
    actor_type: "admin",
    new_value: { status: opts.status, responded: opts.response !== null },
  });
  return { error: null };
}
