import { auth } from "@clerk/nextjs/server";
import { createServerClient } from "@/lib/supabase/server";
import { findingsVisibleToClient } from "@/lib/portal/case-status";
import { deriveClientCertainty } from "@/lib/portal/certainty";
import type { CaseStatus, Verdict } from "@/components/portal/badges";
import type { QuestionToAsk } from "@/lib/research/contracts";
import { SOURCING_CLIENT_SUMMARY } from "@/lib/research/contracts";

// queue_position EXCISED from the client payload 2026-08-08 (gap audit §5.5): the column has no
// writer — the "Queue #N" pill was a dead husk. The DB column stays pending the founder's
// unused-schema ruling; admin reads are unaffected (lib/data/admin.ts selects its own columns).
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
  created_at: string;
};

const LIST_COLUMNS =
  "id, case_number, vendor_name, brands_submitted, brands_confirmed, status, verdict, sla_deadline, delivered_at, change_request_deadline, change_request_used, created_at";

const DONE: CaseStatus[] = ["delivered", "complete", "cancelled"];

// "action" filter EXCISED 2026-08-08 (gap audit §5.5): awaiting_client has no writer — the
// Action Required tab was structurally always empty.
export type CaseFilter = "all" | "active" | "completed";

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
    default:
      return cases;
  }
}

type TrackStatus = "complete" | "failed" | "skipped" | "manual_required" | "pending";

export type CaseDetail = CaseRow & {
  client_id: string;
  vendor_website: string | null;
  // brands_from_ocr removed from the client payload 2026-08-07 (dead document-matching flow
  // excised; the DB column stays pending a founder schema ruling).
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
      `${LIST_COLUMNS}, client_id, vendor_website, client_notes, marketplace, credits_required, credits_charged, confidence_score, submission_type, plan_type, track_1_status, track_2_status, track_3_status, track_4_status, track_5_status, supplier_identity`,
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
// VERIFIED/ASSESSED (founder-ruled 2026-08-07): finding_certainty here is the RULED two-value
// client derivation (lib/portal/certainty — from per-evidence certainty, computed server-side),
// NOT the stored column (which every frozen write site hardcodes "unknown"). confidence_band is
// deliberately ABSENT from this type: it is score-derived with a value literally named
// "verified" — a term collision that must never feed a client certainty label.
export type Finding = {
  id: string;
  track: string;
  track_key: string;
  finding_certainty: "verified" | "assessed";
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
  // evidence_items is selected SERVER-SIDE ONLY to run the ruled Verified/Assessed derivation —
  // it is stripped below and never crosses the RSC boundary (the H5 exclusion law holds).
  const { data } = await supa
    .from("case_track_results")
    .select("id, track, track_key, evidence_items, compiled_findings_json, questions_to_ask, attempt_number")
    .eq("case_id", caseId)
    .gte("track_number", 1)
    .is("deleted_at", null)
    .order("track_number", { ascending: true });
  type Row = { id: string; track: string; track_key: string; evidence_items: { certainty?: string | null }[] | null; compiled_findings_json: Record<string, unknown> | null; questions_to_ask: QuestionToAsk[] | null; attempt_number: number | null };
  const rows = (data as Row[]) ?? [];
  if (rows.length === 0) return [];
  // H1 — the client always sees the DELIVERED attempt once delivered; latest attempt before that.
  const chosen = delivered_attempt ?? Math.max(...rows.map((r) => r.attempt_number ?? 1));
  // ── F2 (founder-approved 2026-07-14, the PG-1 pattern applied to findings) — the delivered
  // payload is an ALLOWLIST projection: only client-purposed fields cross the RSC boundary, and
  // every other compiled_findings_json key — including any FUTURE field — is private BY DEFAULT.
  // This supersedes the field-by-field denylist history (ai_output/manual_notes at H5;
  // analyst_reading at Track 3; the sourcing_logic block + neutral summary at sub-gate B) and
  // structurally closes the secondary-path leak class before the Synthesis gate multiplies
  // narrative fields. FOUNDER-SIGNED exclusions: per-track signal/score (verdict is case-level;
  // raw signals are method exposure — re-adding is a deliberate client-surface-gate decision),
  // consensus/diversity records, research identity, auth_level*, b2b advisory metadata.
  const FINDING_CLIENT_ALLOWLIST = [
    "title", "heading", "summary", "detail",
    "brand_relationship_finding", "brand_risk_finding", "documentation_finding",
    "identity_scope_note", "authorization_scope_note", "marketplace_eligibility_disclaimer",
    "evidence_count",
  ] as const;
  return rows
    .filter((r) => (r.attempt_number ?? 1) === chosen)
    .map((r): Finding => {
      const cf = r.compiled_findings_json;
      const projected: Record<string, unknown> = {};
      if (cf) {
        for (const k of FINDING_CLIENT_ALLOWLIST) if (k in cf) projected[k] = cf[k];
        // OQ-D summary rule (founder-ruled 2026-07-14) — read-side defense in depth stays: a track_5
        // summary is ALWAYS the ruled neutral string, whatever the stored row carries.
        if (r.track_key === "sourcing_logic" && "summary" in projected) projected.summary = SOURCING_CLIENT_SUMMARY;
      }
      return {
        id: r.id,
        track: r.track,
        track_key: r.track_key,
        // The ruled two-value derivation — evidence_items consumed here, never returned.
        finding_certainty: deriveClientCertainty(r.evidence_items),
        compiled_findings_json: cf ? projected : null,
        questions_to_ask: r.questions_to_ask,
      };
    });
}
