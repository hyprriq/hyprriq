// ── BRAND / SUPPLIER DB reads (2026-08-02) — READ-ONLY views over the EXISTING institutional-
// memory corpus (vendor_intelligence, intelligence_events). No new tables, no writes, no
// fabricated fields — every column below exists in the live schema. NOTE (flagged): the corpus
// is VENDOR-level and deliberately client-agnostic (no client_id column exists), so client
// partitioning cannot apply here; access is capability-gated (view_cases) instead.

import { supabaseAdmin } from "@/lib/supabase/admin";

export interface SupplierProfileRow {
  vendor_name: string;
  vendor_type: string | null;
  registration_status: string | null;
  overall_risk_signal: string | null;
  case_count: number;
  known_brand_relationships: string[];
  last_reviewed_at: string | null;
}

export async function getSupplierProfiles(limit = 200): Promise<SupplierProfileRow[]> {
  const { data } = await supabaseAdmin
    .from("vendor_intelligence")
    .select("vendor_name, vendor_type, registration_status, overall_risk_signal, case_count, known_brand_relationships, last_reviewed_at")
    .is("deleted_at", null)
    .order("case_count", { ascending: false })
    .limit(limit);
  return (data as SupplierProfileRow[]) ?? [];
}

export interface BrandRollupRow {
  brand: string;                 // normalized rollup key
  investigations: number;        // events mentioning the brand
  vendors: string[];             // distinct resolved vendor names seen with it
  last_seen: string | null;
}

export async function getBrandRollup(limit = 500): Promise<BrandRollupRow[]> {
  const { data } = await supabaseAdmin
    .from("intelligence_events")
    .select("resolved_name, brands_normalized, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  const events = (data ?? []) as { resolved_name: string; brands_normalized: string[]; created_at: string }[];
  const map = new Map<string, { investigations: number; vendors: Set<string>; last_seen: string | null }>();
  for (const e of events) {
    for (const b of e.brands_normalized ?? []) {
      const cur = map.get(b) ?? { investigations: 0, vendors: new Set<string>(), last_seen: null };
      cur.investigations += 1;
      cur.vendors.add(e.resolved_name);
      if (!cur.last_seen || e.created_at > cur.last_seen) cur.last_seen = e.created_at;
      map.set(b, cur);
    }
  }
  return [...map.entries()]
    .map(([brand, v]) => ({ brand, investigations: v.investigations, vendors: [...v.vendors], last_seen: v.last_seen }))
    .sort((a, b) => b.investigations - a.investigations);
}
