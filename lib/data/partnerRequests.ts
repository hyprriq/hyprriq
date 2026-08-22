import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { ClientsBand, PartnerRole, PartnerRequestInput } from "@/lib/content/partnerRequest";

// ── PARTNER REQUESTS — data layer (founder-ruled 2026-08-22, item 1) ─────────────────────────
//
// A row here is a REQUEST and nothing more (ruled 1c): no grant is created, reserved, or
// promised by anything in this module. The founder reads requests in /admin/acquisition and
// issues grants by hand from the existing grants panel.
//
// ⚠ BLOCKS ON THE FOUNDER-RUN partner_requests MIGRATION (20260822100000): until the table
// exists every function answers 'unavailable' / empty — the newsletter fail-soft pattern.
//
// Duplicate handling (1h — no admin noise): the DB's partial unique index (lower(email) WHERE
// status='new') is the authority. A resubmission while a request is open returns 'duplicate' —
// no second row, and the caller sends no second email. After a decision the address may ask again.

export type PartnerRequestStatus = "new" | "contacted" | "declined";

export interface PartnerRequest {
  id: string;
  name: string;
  email: string;
  role: PartnerRole;
  clients_band: ClientsBand;
  note: string | null;
  status: PartnerRequestStatus;
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
