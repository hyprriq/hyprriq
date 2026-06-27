import { supabaseAdmin } from "@/lib/supabase/admin";
import type { TrackContext, TrackSignal } from "@/lib/research/contracts";
import { normalizeName } from "@/lib/utils/normalize-name";

// ADR-G006 Institutional Memory — WRITE-SIDE. Every completed case contributes to the corpus
// from case #1 (the moat compounds; it cannot be reconstructed retroactively). Target tables
// vendor_intelligence / brand_intelligence are live (migration 20260626000000). normalizeName()
// is the fixed lookup key. Read-modify-write upsert so case_count increments and array fields
// append without a DB function.
export async function writeIntelligence(ctx: TrackContext, signal?: TrackSignal | null): Promise<void> {
  if (ctx.vendor_name) {
    await upsertVendorIntelligence(ctx.vendor_name, ctx.brands_submitted ?? [], signal ?? null);
  }
  for (const brand of ctx.brands_submitted ?? []) {
    await upsertBrandIntelligence(brand);
  }
}

export async function upsertVendorIntelligence(
  vendorName: string, brands: string[], signal: TrackSignal | null,
): Promise<{ error: string | null }> {
  const key = normalizeName(vendorName);
  const { data: existing } = await supabaseAdmin
    .from("vendor_intelligence")
    .select("id, case_count, known_brand_relationships")
    .eq("vendor_name_normalized", key)
    .maybeSingle();
  const prevBrands = (existing?.known_brand_relationships as string[] | undefined) ?? [];
  const mergedBrands = Array.from(new Set([...prevBrands, ...brands.map(normalizeName).filter(Boolean)]));
  const row: Record<string, unknown> = {
    vendor_name: vendorName,
    vendor_name_normalized: key,
    known_brand_relationships: mergedBrands,
    case_count: (existing?.case_count ?? 0) + 1,
    last_reviewed_at: new Date().toISOString(),
  };
  // Only set the signal when this run produced one — a null run must not erase prior history.
  if (signal) row.overall_risk_signal = signal;
  const { error } = await supabaseAdmin
    .from("vendor_intelligence")
    .upsert(row, { onConflict: "vendor_name_normalized" });
  return { error: error?.message ?? null };
}

export async function upsertBrandIntelligence(brandName: string): Promise<{ error: string | null }> {
  const key = normalizeName(brandName);
  const { data: existing } = await supabaseAdmin
    .from("brand_intelligence")
    .select("id, case_count")
    .eq("brand_name_normalized", key)
    .maybeSingle();
  const { error } = await supabaseAdmin.from("brand_intelligence").upsert({
    brand_name: brandName,
    brand_name_normalized: key,
    case_count: (existing?.case_count ?? 0) + 1,
    last_reviewed_at: new Date().toISOString(),
  }, { onConflict: "brand_name_normalized" });
  return { error: error?.message ?? null };
}
