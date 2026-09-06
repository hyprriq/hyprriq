import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { ClientsBand, PartnerRole, PartnerRequestInput } from "@/lib/content/partnerRequest";

// ── PARTNER REQUESTS — data layer (ruling amended 2026-09-06) ────────────────────────────────
//
// A row here is a REQUEST and nothing more (2026-08-22, ruled 1c) — nothing in the PUBLIC form
// path creates, reserves, or promises a grant. THE AMENDMENT (founder-ruled 2026-09-06): the
// OPERATOR'S Approve click now does the whole yes — creates the ruled grant, emails the link,
// marks the request approved. The old flow recorded "contacted" and depended on the founder
// remembering to email a stranger by hand; the word made approval look like it had sent
// something, and it never had. ⛔ STILL NO AUTO-ISSUE: the click is the decision, the code is
// only the courier.
//
// ⚠ BLOCKS ON THE FOUNDER-RUN partner_requests MIGRATION (20260822100000): until the table
// exists every function answers 'unavailable' / empty — the newsletter fail-soft pattern.
//
// Duplicate handling (1h — no admin noise): the DB's partial unique index (lower(email) WHERE
// status='new') is the authority. A resubmission while a request is open returns 'duplicate' —
// no second row, and the caller sends no second email. After a decision the address may ask again.

// 'contacted' is LEGACY-READ-ONLY (pre-2026-09-06 rows; prod had zero when the CHECK changed,
// but a dev database may still hold one and a render must not lie about it). Nothing issues it.
export type PartnerRequestStatus = "new" | "approved" | "declined" | "contacted";

export interface PartnerRequest {
  id: string;
  name: string;
  email: string;
  role: PartnerRole;
  clients_band: ClientsBand;
  note: string | null;
  status: PartnerRequestStatus;
  /** The grant an approval produced. Absent until the founder runs 20260906000000; NULL on a
   *  declined row — and on an APPROVED row it is the visible remnant of a failed grant
   *  creation, which the panel must render as a problem, never as success. */
  grant_id?: string | null;
  decided_at: string | null;
  created_at: string;
}

export type CreateRequestResult =
  | { status: "ok"; request: PartnerRequest }
  | { status: "duplicate" }
  | { status: "unavailable" };

export async function createPartnerRequest(input: PartnerRequestInput): Promise<CreateRequestResult> {
  const { data, error } = await supabaseAdmin
    .from("partner_requests")
    .insert({
      name: input.name,
      email: input.email,
      role: input.role,
      clients_band: input.clientsBand,
      note: input.note,
    })
    .select("*")
    .single();
  if (error) {
    // 23505 = the one-open-request unique index — a pending request already holds this address.
    if (error.code === "23505") return { status: "duplicate" };
    console.error(`[partner-requests] insert failed: ${error.message}`);
    return { status: "unavailable" };
  }
  return { status: "ok", request: data as PartnerRequest };
}

export async function listPartnerRequests(): Promise<{ requests: PartnerRequest[]; available: boolean }> {
  const { data, error } = await supabaseAdmin
    .from("partner_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    // Missing table (migration not yet founder-run) reads as an honest "not migrated" in the panel.
    return { requests: [], available: false };
  }
  return { requests: (data ?? []) as PartnerRequest[], available: true };
}

/** Decide a request. 'new' → re-opened is deliberate (un-decide restores the pending state). */
export async function setPartnerRequestStatus(
  id: string,
  status: PartnerRequestStatus,
): Promise<{ error: string | null }> {
  const { error } = await supabaseAdmin
    .from("partner_requests")
    .update({ status, decided_at: status === "new" ? null : new Date().toISOString() })
    .eq("id", id);
  return { error: error?.message ?? null };
}

// ── THE APPROVE CLAIM (founder-ruled 2026-09-06) ─────────────────────────────────────────────
//
// ⚠ CLAIM FIRST, GRANT SECOND, AND THE ORDER IS THE IDEMPOTENCY. The UPDATE's own
// `status = 'new'` predicate is the lock: a double-click, a retried request, or two operators
// racing produce exactly one claim — the loser sees zero rows and gets "already decided". The
// alternative order (grant first, claim second) leaves an ORPHAN GRANT worth a real research
// credit when the claim loses the race; a claimed request with no grant merely leaves a visible,
// re-actionable row. Credit value fails toward nothing issued, never toward issued twice.

export type ClaimResult = { claimed: true; request: PartnerRequest } | { claimed: false; reason: "already_decided" | "not_found" | "migration_missing" | "unavailable" };

export async function claimPartnerRequestForApproval(id: string): Promise<ClaimResult> {
  const { data, error } = await supabaseAdmin
    .from("partner_requests")
    .update({ status: "approved", decided_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "new")
    .select("*");
  if (error) {
    // 23514 = the pre-2026-09-06 CHECK constraint refusing 'approved' — the founder has not run
    // the migration. Named, because "approve silently does nothing" is the exact defect class
    // this feature exists to end.
    if (error.code === "23514") return { claimed: false, reason: "migration_missing" };
    console.error(`[partner-requests] claim failed: ${error.message}`);
    return { claimed: false, reason: "unavailable" };
  }
  const row = (data ?? [])[0] as PartnerRequest | undefined;
  if (!row) {
    const { data: exists } = await supabaseAdmin.from("partner_requests").select("id").eq("id", id).maybeSingle();
    return { claimed: false, reason: exists ? "already_decided" : "not_found" };
  }
  return { claimed: true, request: row };
}

/** Grant creation failed after the claim — put the request back so the yes can be retried.
 *  Best-effort and LOUD on failure: a stuck 'approved' row with no grant_id renders as a
 *  problem in the panel, so even the double-failure is visible rather than silent. */
export async function revertPartnerRequestClaim(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("partner_requests")
    .update({ status: "new", decided_at: null })
    .eq("id", id)
    .eq("status", "approved")
    .is("grant_id", null);
  if (error) console.error(`[partner-requests] claim revert failed for ${id}: ${error.message}`);
}

/** Point the approved request at the grant it produced. */
export async function attachGrantToRequest(id: string, grantId: string): Promise<{ error: string | null }> {
  const { error } = await supabaseAdmin
    .from("partner_requests")
    .update({ grant_id: grantId })
    .eq("id", id);
  if (error) console.error(`[partner-requests] grant attach failed for ${id}: ${error.message}`);
  return { error: error?.message ?? null };
}
