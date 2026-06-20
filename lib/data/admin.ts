import { redirect } from "next/navigation";
import { getCurrentClient } from "@/lib/data/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { CaseStatus, Verdict } from "@/components/portal/badges";
import { PLAN_PRICE_LABEL, type PlanType } from "@/lib/constants/plans";

// Admin-role guard. The (admin) layout enforces authentication; this enforces
// the role (clients.is_admin). Non-admins are bounced to their own portal.
export async function requireAdmin() {
  const client = await getCurrentClient();
  if (!client) redirect("/sign-in");
  if (!client.is_admin) redirect("/portal/dashboard");
  return client;
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

const MONTHLY_PRICE: Record<PlanType, number> = { single_99: 0, growth_279: 279, scale_499: 499 };

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
];

const inFounderQueue = (s: CaseStatus) => FOUNDER_QUEUE_STATUSES.includes(s);

export type AdminDashboard = {
  kpis: { mrr: number; creditsSold: number; casesCreated: number; pendingReview: number; delivered: number; openRequests: number };
  reviewQueue: AdminCaseRow[];
  openSupport: SupportRow[];
  recentClients: { id: string; full_name: string | null; plan_type: PlanType | null; credits_available: number }[];
};

export async function getAdminDashboard(): Promise<AdminDashboard> {
  const [casesRes, supportRes, clientsRes] = await Promise.all([
    supabaseAdmin
      .from("cases")
      .select("id, case_number, vendor_name, brands_submitted, status, verdict, plan_type, sla_deadline, created_at, delivered_at, credits_charged, clients(full_name, company_name)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("support_requests")
      .select("id, sr_number, type, subject, status, created_at, clients(full_name)")
      .eq("status", "open")
      .order("created_at", { ascending: false }),
    // No limit here: MRR must aggregate ALL active subscribers. The "Active
    // Clients" widget slices to 5 in JS below. (At scale, move MRR to a DB-side
    // sum and paginate this list — see SESSION_F_PROGRESS.md.)
    supabaseAdmin
      .from("clients")
      .select("id, full_name, plan_type, credits_available, billing_status")
      .eq("billing_status", "active")
      .is("deleted_at", null)
      .order("last_active_at", { ascending: false, nullsFirst: false }),
  ]);

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
    reviewQueue: cases.filter((c) => inFounderQueue(c.status)).slice(0, 10),
    openSupport: support.slice(0, 10),
    recentClients: clients.slice(0, 5).map((c) => ({ id: c.id, full_name: c.full_name, plan_type: c.plan_type, credits_available: c.credits_available })),
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
  client_id: string;
  clients: { full_name: string | null; company_name: string | null; email: string } | null;
};

export async function getAdminCase(id: string): Promise<AdminCaseDetail | null> {
  const { data } = await supabaseAdmin
    .from("cases")
    .select("id, case_number, vendor_name, vendor_website, brands_submitted, brands_from_ocr, client_notes, internal_notes, status, verdict, confidence_score, plan_type, sla_deadline, created_at, client_id, clients(full_name, company_name, email)")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  return (data as unknown as AdminCaseDetail) ?? null;
}

// ---- All Cases (admin, cross-client) ----
export type AdminCaseListFilter = "all" | "queue" | "delivered" | "action";

export async function getAllCasesAdmin(filter: AdminCaseListFilter = "all"): Promise<AdminCaseRow[]> {
  const { data } = await supabaseAdmin
    .from("cases")
    .select("id, case_number, vendor_name, brands_submitted, status, verdict, plan_type, sla_deadline, created_at, delivered_at, credits_charged, clients(full_name, company_name)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
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
  is_admin: boolean;
  created_at: string;
};

export async function getAdminClients(): Promise<AdminClientRow[]> {
  const { data } = await supabaseAdmin
    .from("clients")
    .select("id, full_name, company_name, email, plan_type, billing_status, credits_available, is_admin, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  return (data as AdminClientRow[]) ?? [];
}

export { PLAN_PRICE_LABEL };
