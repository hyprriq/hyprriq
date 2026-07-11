import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";
import { findingsVisibleToClient } from "@/lib/portal/case-status";
import type { CaseStatus, Verdict } from "@/components/portal/badges";
import type { QuestionToAsk } from "@/lib/research/contracts";

export type CaseRow = {
  id: string;
  case_number: string;
  vendor_name: string | null;
  brands_submitted: string[] | null;
  brands_confirmed: string[] | null;
  status: CaseStatus;
  verdict: Verdict | null;
  sla_deadline: string | null;
  delivered_at: string | null;
  change_request_deadline: string | null;
  change_request_used: boolean;
  queue_position: number | null;
  created_at: string;
};

const LIST_COLUMNS =
  "id, case_number, vendor_name, brands_submitted, brands_confirmed, status, verdict, sla_deadline, delivered_at, change_request_deadline, change_request_used, queue_position, created_at";

const DONE: CaseStatus[] = ["delivered", "complete", "cancelled"];

export type CaseFilter = "all" | "active" | "completed" | "action";

export function isActive(c: Pick<CaseRow, "status">): boolean {
  return !DONE.includes(c.status);
}

// All non-deleted cases for the current client, newest first. Scoped by Clerk
// user id (service-role client bypasses RLS — see lib/supabase/server.ts).
// H2 (OQ-3) — submission_failed is excluded: the enqueue failed, the credit was refunded, and the
// client was told at submit time; a refunded failed submission is not a case they own a result for.
export async function getClientCases(): Promise<CaseRow[]> {
  const { userId } = await auth();
  if (!userId) return [];
  const supa = createServerClient();
  const { data } = await supa
    .from("cases")
    .select(LIST_COLUMNS)
    .eq("client_id", userId)
    .neq("status", "submission_failed")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  return (data as CaseRow[]) ?? [];
}

export function filterCases(cases: CaseRow[], filter: CaseFilter): CaseRow[] {
  switch (filter) {
    case "active":
      return cases.filter(isActive);
    case "completed":
      return cases.filter((c) => c.status === "delivered" || c.status === "complete");
    case "action":
      return cases.filter((c) => c.status === "awaiting_client");
    default:
      return cases;
  }
}

type TrackStatus = "complete" | "failed" | "skipped" | "manual_required" | "pending";

export type CaseDetail = CaseRow & {
  client_id: string;
  vendor_website: string | null;
  brands_from_ocr: string[] | null;
  client_notes: string | null;
  marketplace: string | null;
  credits_required: number | null;
  credits_charged: number | null;
  confidence_score: number | null;
  submission_type: string | null;
  plan_type: string | null;
  track_1_status: TrackStatus;
  track_2_status: TrackStatus;
  track_3_status: TrackStatus;
  track_4_status: TrackStatus;
  track_5_status: TrackStatus;
  supplier_identity: ClientSupplierIdentity; // PG-1 — PROJECTED client shape, never the full engine record
};

// PG-1 — the CLIENT-facing identity shape (the H5 findings pattern applied to supplier_identity).
// The full SupplierIdentity (resolution_research + inner audits, resolution_notes, candidate
// scoring) is METHOD data — show outputs, never method — and a Server→Client prop serializes into
// the RSC payload, so the strip must happen server-side, not at render. Admin path (lib/data/
// admin.ts) deliberately unprojected: the review surface sees everything.
export type ClientSupplierIdentity = {
  identity_discrepancy: { kind: string; client_note: string };
} | null;

export function projectSupplierIdentityForClient(
  si: import("@/lib/research/contracts").SupplierIdentity | null,
): ClientSupplierIdentity {
  const d = si?.identity_discrepancy;
  return d ? { identity_discrepancy: { kind: d.kind, client_note: d.client_note } } : null;
}

// A single case, scoped to the current client. Returns null if not found or not
// owned by the caller.
export async function getCaseById(id: string): Promise<CaseDetail | null> {
  const { userId } = await auth();
  if (!userId) return null;
  const supa = createServerClient();
  const { data } = await supa
    .from("cases")
    .select(
      `${LIST_COLUMNS}, client_id, vendor_website, brands_from_ocr, client_notes, marketplace, credits_required, credits_charged, confidence_score, submission_type, plan_type, track_1_status, track_2_status, track_3_status, track_4_status, track_5_status, supplier_identity`,
    )
    .eq("id", id)
    .eq("client_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!data) return null;
  // PG-1 — project the identity BEFORE it can cross the RSC boundary (see ClientSupplierIdentity).
  const raw = data as Omit<CaseDetail, "supplier_identity"> & { supplier_identity: import("@/lib/research/contracts").SupplierIdentity | null };
  return { ...raw, supplier_identity: projectSupplierIdentityForClient(raw.supplier_identity) };
}

// H5 — the CLIENT-facing finding shape. Deliberately excludes ai_output_json (raw model output —
// internal/IP) and manual_notes (internal reviewer notes): the client query never selects them,
// so they can never reach a browser payload.
export type Finding = {
  id: string;
  track: string;
  track_key: string;
  finding_certainty: "verified" | "inferred" | "unknown" | null;
  confidence_band: "low" | "moderate" | "high" | "verified" | null;
  compiled_findings_json: Record<string, unknown> | null;
  questions_to_ask: QuestionToAsk[] | null; // Phase 5.1c — Track 2 client-facing questions
};

// Findings for a case, scoped via the parent case's ownership. Reads the
// authoritative case_track_results (ADR-G001); the Evidence tab shows finding
// tracks (1–5), not the intake row.
export async function getCaseFindings(caseId: string): Promise<Finding[]> {
  const { userId } = await auth();
  if (!userId) return [];
  const supa = createServerClient();
  // Confirm ownership first (service-role bypasses RLS).
  const { data: owned } = await supa
    .from("cases")
    .select("id, status, delivered_attempt")
    .eq("id", caseId)
    .eq("client_id", userId)
    .maybeSingle();
  if (!owned) return [];
  // H5 — the gate lives at the DATA layer: findings do not leave the server until the case is
  // delivered. (The component's render guard remains as belt-and-braces only.)
  const { status, delivered_attempt } = owned as { status: string; delivered_attempt?: number | null };
  if (!findingsVisibleToClient(status)) return [];
  const { data } = await supa
    .from("case_track_results")
    .select("id, track, track_key, finding_certainty, confidence_band, compiled_findings_json, questions_to_ask, attempt_number")
    .eq("case_id", caseId)
    .gte("track_number", 1)
    .is("deleted_at", null)
    .order("track_number", { ascending: true });
  const rows = (data as (Finding & { attempt_number: number | null })[]) ?? [];
  if (rows.length === 0) return rows;
  // H1 — the client always sees the DELIVERED attempt once delivered; latest attempt before that.
  const chosen = delivered_attempt ?? Math.max(...rows.map((r) => r.attempt_number ?? 1));
  // Track 3 (founder-ruled 2026-07-11, the PG-1 pattern on a second field) — the analyst_reading
  // quartet is ADMIN-ONLY (OQ-D) and leans harder than the veto-gated findings (AT-1 rider): strip
  // it server-side so it is structurally absent from the delivered payload, not merely unrendered.
  // brand_risk_finding STAYS (the Track-2-finding analog; HARD-scanned at delivery).
  return rows
    .filter((r) => (r.attempt_number ?? 1) === chosen)
    .map((r) => {
      if (r.compiled_findings_json && "analyst_reading" in r.compiled_findings_json) {
        const { analyst_reading: _stripped, ...rest } = r.compiled_findings_json;
        return { ...r, compiled_findings_json: rest };
      }
      return r;
    });
}
