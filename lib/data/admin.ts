import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getOperator } from "@/lib/auth/permissions";
import { getClientScope, type ClientScope } from "@/lib/auth/clientScope";
import { claimAdminInvitation } from "@/lib/auth/invitations";
import { type Role } from "@/lib/data/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { OPERATOR_HOUSE_CLIENT_ID } from "@/lib/data/operatorCase";
import type { CaseStatus, Verdict } from "@/components/portal/badges";
import { PLAN_PRICE_LABEL, type PlanType } from "@/lib/constants/plans";
import type { AdditionalQuestion } from "@/lib/research/contracts";
import { buildWeeklyCaseSeries, type WeekBucket } from "@/lib/admin/dashboard-charts";

// Admin-role guard. The (admin) layout enforces authentication; this enforces
// the role (clients.is_admin). Non-admins are bounced to their own portal.
// ── ADMIN ACCESS FIX (2026-07-30) — admin PAGE access = getOperator(userId) !== null. The
// super-admin identity has NO clients row by founder ruling; the old clients-row gate would
// bounce it before any admin screen rendered. getOperator carries the transitional legacy
// clients.role fallback INSIDE it, so the founder's current toggle keeps working unchanged.
// This one function gates all admin pages (they all funnel through it). ──
export async function requireAdmin() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  let op = await getOperator(userId);
  // ── ADMIN FOUNDATIONS (2026-08-02) — invitation claim: a brand-new Clerk user with a pending
  // invitation for their verified email materializes their sub_user row on FIRST admin visit
  // (WordPress-style). Only runs on the null path — never a cost for existing operators. ──
  if (!op) {
    const claimed = await claimAdminInvitation(userId);
    if (claimed) op = await getOperator(userId);
  }
  if (!op) redirect("/portal/dashboard"); // plain clients (and unknowns) land at the portal
  // Display fields for the shell/header: the clients row when one exists (legacy identities),
  // else the admin_permissions email label (rows-only operators have no clients row by ruling).
  const { data: c } = await supabaseAdmin.from("clients").select("email, full_name").eq("id", userId).maybeSingle();
  let email = c?.email ?? "";
  if (!email) {
    try {
      const { data: p } = await supabaseAdmin.from("admin_permissions").select("email").eq("user_id", userId).maybeSingle();
      email = p?.email ?? "";
    } catch { /* pre-migration */ }
  }
  // CLIENT PARTITIONING: null = unrestricted (super_admin / view_all_clients / legacy);
  // string[] = assigned-only (fail-closed empty when none assigned). Pages pass this into the
  // data reads; client-id routes call clientInScope directly.
  const clientScope = await getClientScope(op);
  return { ...op, email, full_name: c?.full_name ?? null, clientScope };
}

type AdminCaseRow = {
  id: string;
  case_number: string;
  vendor_name: string | null;
  brands_submitted: string[] | null;
  status: CaseStatus;
  verdict: Verdict | null;
  plan_type: PlanType | null;
  sla_deadline: string | null;
  created_at: string;
  delivered_at: string | null;
  credits_charged: number | null;
  clients: { full_name: string | null; company_name: string | null } | null;
};

type SupportRow = {
  id: string;
  sr_number: string;
  type: string;
  subject: string;
  status: string;
  created_at: string;
  clients: { full_name: string | null } | null;
};

export const MONTHLY_PRICE: Record<PlanType, number> = { single_99: 0, single_149: 0, growth_279: 279, scale_499: 499 };

// Statuses that require founder action in the review queue.
//
// WHY THIS IS BROAD RIGHT NOW: the automated research pipeline (Track 0 intake →
// Tracks 1–5 → QA) that would advance a case pending_intake → awaiting_review
// does NOT exist yet (deferred to the research-pipeline session). Until it does,
// the founder researches and delivers every case manually via the Case Review
// screen, so the queue must surface everything that's been submitted and isn't
// either blocked on the client (awaiting_client) or already finished
// (delivered/complete/cancelled).
//
// WHEN THE PIPELINE LANDS: narrow this to ["awaiting_review",
// "manual_override_required"] (cases the automation has finished researching) —
// a one-line change, since both the queue and the KPI read from here.
export const FOUNDER_QUEUE_STATUSES: CaseStatus[] = [
  "pending_intake",
  "intake_complete",
  "queued",
  "research_running",
  "awaiting_review",
  "manual_override_required",
  "qa_in_progress",
  "approved",
  // H2 — failure states surface in the FOUNDER queue (the client never sees submission_failed;
  // research_failed shows as "Delayed — under review" client-side).
  "research_failed",
  "submission_failed",
];

const inFounderQueue = (s: CaseStatus) => FOUNDER_QUEUE_STATUSES.includes(s);

export type AdminDashboard = {
  kpis: { mrr: number; creditsSold: number; casesCreated: number; pendingReview: number; delivered: number; openRequests: number };
  reviewQueue: AdminCaseRow[];
  openSupport: SupportRow[];
  recentClients: { id: string; full_name: string | null; plan_type: PlanType | null; credits_available: number }[];
  // Weekly true series for the dashboard charts (design pass 2026-08-13) — computed from the
  // same case rows the KPIs read; see lib/admin/dashboard-charts.ts for the truth rules.
  weekly: WeekBucket[];
  // Active clients by plan — counted from the same rows MRR reads (house row already excluded).
  planMix: { plan: PlanType; count: number }[];
};

// scope (ADMIN FOUNDATIONS): null = unrestricted; string[] = restrict every client-owned read
// to those client ids (an empty array legitimately shows an empty dashboard — fail closed).
export async function getAdminDashboard(scope: ClientScope = null): Promise<AdminDashboard> {
  let casesQ = supabaseAdmin
    .from("cases")
    .select("id, case_number, vendor_name, brands_submitted, status, verdict, plan_type, sla_deadline, created_at, delivered_at, credits_charged, clients(full_name, company_name)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  let supportQ = supabaseAdmin
    .from("support_requests")
    .select("id, sr_number, type, subject, status, created_at, clients(full_name)")
    .eq("status", "open")
    .order("created_at", { ascending: false });
  // No limit here: MRR must aggregate ALL active subscribers. The "Active
  // Clients" widget slices to 5 in JS below. (At scale, move MRR to a DB-side
  // sum and paginate this list — see SESSION_F_PROGRESS.md.)
  // ── DATA HONESTY (2026-08-11): the operator house row is NOT a client — it carries
  // scale_499/active only so operator cases can attribute somewhere. Left in, it inflated MRR by
  // $499 and sat in Active Clients as a fake subscriber. Excluded from every money/list read;
  // kept wherever it is legitimately the case OWNER (case attribution is untouched). ──
  let clientsQ = supabaseAdmin
    .from("clients")
    .select("id, full_name, plan_type, credits_available, billing_status")
    .eq("billing_status", "active")
    .neq("id", OPERATOR_HOUSE_CLIENT_ID)
    .is("deleted_at", null)
    .order("last_active_at", { ascending: false, nullsFirst: false });
  if (scope !== null) {
    casesQ = casesQ.in("client_id", scope);
    supportQ = supportQ.in("client_id", scope);
    clientsQ = clientsQ.in("id", scope);
  }
  const [casesRes, supportRes, clientsRes] = await Promise.all([casesQ, supportQ, clientsQ]);

  // PostgREST infers embedded to-one relations as arrays in its generated types,
  // but returns a single object at runtime for a many-to-one FK. Cast via unknown.
  const cases = (casesRes.data as unknown as AdminCaseRow[]) ?? [];
  const support = (supportRes.data as unknown as SupportRow[]) ?? [];
  const clients = (clientsRes.data ?? []) as { id: string; full_name: string | null; plan_type: PlanType | null; credits_available: number; billing_status: string }[];

  // MRR over ALL active subscribers (not the display-limited slice).
  const mrr = clients.reduce((sum, c) => sum + (c.plan_type ? MONTHLY_PRICE[c.plan_type] : 0), 0);
  const creditsSold = cases.reduce((sum, c) => sum + (c.credits_charged ?? 0), 0);
  const pendingReview = cases.filter((c) => inFounderQueue(c.status)).length;
  const delivered = cases.filter((c) => c.status === "delivered" || c.status === "complete").length;

  return {
    kpis: {
      mrr,
      creditsSold,
      casesCreated: cases.length,
      pendingReview,
      delivered,
      openRequests: support.length,
    },
    // Triage order (design pass 2026-08-13): the queue is "what needs me next", so it lists the
    // nearest SLA deadline first (was newest-first, which buried the urgent case under fresh
    // arrivals). Ordering only — same statuses, same 10-row cap. Nulls sort last.
    reviewQueue: cases
      .filter((c) => inFounderQueue(c.status))
      .sort((a, b) => (a.sla_deadline ? Date.parse(a.sla_deadline) : Infinity) - (b.sla_deadline ? Date.parse(b.sla_deadline) : Infinity))
      .slice(0, 10),
    openSupport: support.slice(0, 10),
    recentClients: clients.slice(0, 5).map((c) => ({ id: c.id, full_name: c.full_name, plan_type: c.plan_type, credits_available: c.credits_available })),
    weekly: buildWeeklyCaseSeries(cases, Date.now()),
    planMix: Object.entries(
      clients.reduce<Record<string, number>>((acc, c) => {
        if (c.plan_type) acc[c.plan_type] = (acc[c.plan_type] ?? 0) + 1;
        return acc;
      }, {}),
    )
      .map(([plan, count]) => ({ plan: plan as PlanType, count }))
      .sort((a, b) => b.count - a.count),
  };
}

export type AdminCaseDetail = {
  id: string;
  case_number: string;
  vendor_name: string | null;
  vendor_website: string | null;
  brands_submitted: string[] | null;
  brands_from_ocr: string[] | null;
  client_notes: string | null;
  internal_notes: string | null;
  status: CaseStatus;
  verdict: Verdict | null;
  confidence_score: number | null;
  plan_type: PlanType | null;
  sla_deadline: string | null;
  created_at: string;
  delivered_at: string | null;
  client_id: string;
  additional_questions: AdditionalQuestion[] | null; // ADR-T2-002 follow-up — analyst/review-team questions
  supplier_identity: import("@/lib/research/contracts").SupplierIdentity | null; // Spec-B — Track 0.5 identity + discrepancy
  clients: { full_name: string | null; company_name: string | null; email: string } | null;
};

export async function getAdminCase(id: string): Promise<AdminCaseDetail | null> {
  const { data } = await supabaseAdmin
    .from("cases")
    .select("id, case_number, vendor_name, vendor_website, brands_submitted, brands_from_ocr, client_notes, internal_notes, status, verdict, confidence_score, plan_type, sla_deadline, created_at, delivered_at, client_id, additional_questions, supplier_identity, clients(full_name, company_name, email)")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  return (data as unknown as AdminCaseDetail) ?? null;
}

// ---- All Cases (admin, cross-client) ----
export type AdminCaseListFilter = "all" | "queue" | "delivered" | "action";

export async function getAllCasesAdmin(filter: AdminCaseListFilter = "all", scope: ClientScope = null): Promise<AdminCaseRow[]> {
  let q = supabaseAdmin
    .from("cases")
    .select("id, case_number, vendor_name, brands_submitted, status, verdict, plan_type, sla_deadline, created_at, delivered_at, credits_charged, clients(full_name, company_name)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (scope !== null) q = q.in("client_id", scope);
  const { data } = await q;
  const rows = (data as unknown as AdminCaseRow[]) ?? [];
  switch (filter) {
    case "queue":
      return rows.filter((c) => inFounderQueue(c.status));
    case "delivered":
      return rows.filter((c) => c.status === "delivered" || c.status === "complete");
    case "action":
      return rows.filter((c) => c.status === "awaiting_client");
    default:
      return rows;
  }
}

// ---- Clients (admin) ----
export type AdminClientRow = {
  id: string;
  full_name: string | null;
  company_name: string | null;
  email: string;
  plan_type: PlanType | null;
  billing_status: string;
  credits_available: number;
  role: Role;
  created_at: string;
};

export async function getAdminClients(scope: ClientScope = null): Promise<AdminClientRow[]> {
  let q = supabaseAdmin
    .from("clients")
    .select("id, full_name, company_name, email, plan_type, billing_status, credits_available, role, created_at")
    .neq("id", OPERATOR_HOUSE_CLIENT_ID) // data honesty 2026-08-11 — the house row is not a client
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (scope !== null) q = q.in("id", scope);
  const { data } = await q;
  return (data as AdminClientRow[]) ?? [];
}

// ---- Single client detail (admin) ----
// Full profile INCLUDING internal_notes — admin-only by construction (reached
// only from requireAdmin()-guarded pages). The client-facing data layer
// (lib/data/client.ts) never selects internal_notes/notes_updated_at.
export type AdminClientDetail = {
  id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  plan_type: PlanType | null;
  plan_category: "one_time" | "subscription" | null;
  billing_status: string;
  credits_available: number;
  credits_used_this_cycle: number;
  renewal_date: string | null;
  stripe_customer_id: string | null;
  role: Role;
  created_at: string;
  last_active_at: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  primary_marketplace: string | null;
  marketplace_other_name: string | null;
  sells_on_amazon: boolean | null;
  sells_on_walmart: boolean | null;
  amazon_store_name: string | null;
  walmart_store_name: string | null;
  billing_company_name: string | null;
  billing_address_line1: string | null;
  billing_address_line2: string | null;
  billing_city: string | null;
  billing_state: string | null;
  billing_zip: string | null;
  billing_country: string | null;
  vat_number: string | null;
  ein_number: string | null;
  tax_id: string | null;
  internal_notes: string | null;
  notes_updated_at: string | null;
};

const CLIENT_DETAIL_COLUMNS =
  "id, email, full_name, company_name, plan_type, plan_category, billing_status, credits_available, credits_used_this_cycle, renewal_date, stripe_customer_id, role, created_at, last_active_at, contact_name, contact_email, contact_phone, primary_marketplace, marketplace_other_name, sells_on_amazon, sells_on_walmart, amazon_store_name, walmart_store_name, billing_company_name, billing_address_line1, billing_address_line2, billing_city, billing_state, billing_zip, billing_country, vat_number, ein_number, tax_id, internal_notes, notes_updated_at";

export async function getAdminClientDetail(id: string): Promise<AdminClientDetail | null> {
  const { data } = await supabaseAdmin
    .from("clients")
    .select(CLIENT_DETAIL_COLUMNS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  return (data as AdminClientDetail) ?? null;
}

export async function getCasesForClient(id: string): Promise<AdminCaseRow[]> {
  const { data } = await supabaseAdmin
    .from("cases")
    .select("id, case_number, vendor_name, brands_submitted, status, verdict, plan_type, sla_deadline, created_at, delivered_at, credits_charged, clients(full_name, company_name)")
    .eq("client_id", id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  return (data as unknown as AdminCaseRow[]) ?? [];
}

// ── CLOSE-OUT item 5 (2026-08-11): the assignment read for the Users screen. The whole table is
// small (staff × assigned clients); the Users page is super-admin-territory anyway (writes go
// through the existing assignments API, which is canManageUsers-gated). ──
export type StaffAssignmentRow = { admin_user_id: string; client_id: string };

export async function getAllStaffAssignments(): Promise<StaffAssignmentRow[]> {
  try {
    const { data } = await supabaseAdmin.from("staff_client_assignments").select("admin_user_id, client_id");
    return (data as StaffAssignmentRow[]) ?? [];
  } catch {
    return []; // pre-migration: no table yet
  }
}

// Billing History (Item 5). Reads billing_audit; empty until the Stripe webhook
// starts writing rows (Item 5 build) — the panel renders an empty state.
export type BillingAuditRow = {
  id: string;
  old_plan: string | null;
  new_plan: string | null;
  event: string;
  source: string;
  notes: string | null;
  created_at: string;
};

export async function getClientBillingAudit(id: string): Promise<BillingAuditRow[]> {
  const { data } = await supabaseAdmin
    .from("billing_audit")
    .select("id, old_plan, new_plan, event, source, notes, created_at")
    .eq("client_id", id)
    .order("created_at", { ascending: false });
  return (data as BillingAuditRow[]) ?? [];
}

export { PLAN_PRICE_LABEL };
