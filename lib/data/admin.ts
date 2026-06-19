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
    supabaseAdmin
      .from("clients")
      .select("id, full_name, plan_type, credits_available, billing_status")
      .eq("billing_status", "active")
      .is("deleted_at", null)
      .order("last_active_at", { ascending: false, nullsFirst: false })
      .limit(5),
  ]);

  // PostgREST infers embedded to-one relations as arrays in its generated types,
  // but returns a single object at runtime for a many-to-one FK. Cast via unknown.
  const cases = (casesRes.data as unknown as AdminCaseRow[]) ?? [];
  const support = (supportRes.data as unknown as SupportRow[]) ?? [];
  const clients = (clientsRes.data ?? []) as { id: string; full_name: string | null; plan_type: PlanType | null; credits_available: number; billing_status: string }[];

  const mrr = clients.reduce((sum, c) => sum + (c.plan_type ? MONTHLY_PRICE[c.plan_type] : 0), 0);
  const creditsSold = cases.reduce((sum, c) => sum + (c.credits_charged ?? 0), 0);
  const pendingReview = cases.filter((c) => c.status === "awaiting_review").length;
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
    reviewQueue: cases.filter((c) => c.status === "awaiting_review").slice(0, 10),
    openSupport: support.slice(0, 10),
    recentClients: clients.map((c) => ({ id: c.id, full_name: c.full_name, plan_type: c.plan_type, credits_available: c.credits_available })),
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

export { PLAN_PRICE_LABEL };
