import { supabaseAdmin } from "@/lib/supabase/admin";
import type { TrackContext, TrackSignal } from "@/lib/research/contracts";
import { normalizeName } from "@/lib/utils/normalize-name";

// ADR-G006 Institutional Memory — WRITE-SIDE. Every completed case contributes to the corpus
// from case #1 (the moat compounds; it cannot be reconstructed retroactively). Target tables
// vendor_intelligence / brand_intelligence are live (migration 20260626000000). normalizeName()
// is the fixed lookup key. Read-modify-write upsert so case_count increments and array fields
// append without a DB function.
// H2 (OQ-2) — memory-write failures are LOUD but non-fatal: logged + audit_log row, never thrown
// (throw-and-retry would re-increment the name-keyed case_count on partial failure; the H6 event
// ledger makes this atomic/idempotent properly). Returns degraded:true when any write was lost.
export async function writeIntelligence(ctx: TrackContext, signal?: TrackSignal | null): Promise<{ degraded: boolean }> {
  // Spec-B — key the corpus on the RESOLVED identity, NEVER the entered name. For the globaldist case
  // (entered "Bosch", resolved "Global Distribution LLC") this stops a "bosch" vendor row being written
  // for what is really Global Distribution LLC. When the name was mislabeled, record the entered name as
  // an alias so G6 can later learn "this supplier is often mis-entered as X". (Write-side only — ADR-G006
  // engine/query/admin views are deferred.)
  const identity = ctx.supplier_identity;
  const enteredName = ctx.vendor_name ?? "";
  const resolvedName = identity?.resolved_name || enteredName; // resolved_name == entered on the matched path
  const failures: string[] = [];
  if (resolvedName) {
    const enteredAlias = enteredName && normalizeName(enteredName) !== normalizeName(resolvedName) ? enteredName : null;
    const res = await upsertVendorIntelligence(resolvedName, ctx.brands_submitted ?? [], signal ?? null, enteredAlias);
    if (res.error) failures.push(`vendor(${resolvedName}): ${res.error}`);
  }
  for (const brand of ctx.brands_submitted ?? []) {
    const res = await upsertBrandIntelligence(brand);
    if (res.error) failures.push(`brand(${brand}): ${res.error}`);
  }
  if (failures.length > 0) {
    const detail = failures.join("; ");
    console.error(`[intelligence] memory write failed (case ${ctx.case_id}): ${detail}`);
    await supabaseAdmin.from("audit_log").insert({
      table_name: "vendor_intelligence", record_id: ctx.case_id, action: "UPDATE",
      actor_id: "system", actor_type: "system", new_value: { memory_write_failed: detail },
    });
    return { degraded: true };
  }
  return { degraded: false };
}

export async function upsertVendorIntelligence(
  vendorName: string, brands: string[], signal: TrackSignal | null, enteredAlias: string | null = null,
): Promise<{ error: string | null }> {
  const key = normalizeName(vendorName);
  const { data: existing } = await supabaseAdmin
    .from("vendor_intelligence")
    .select("id, case_count, known_brand_relationships, entered_names")
    .eq("vendor_name_normalized", key)
    .maybeSingle();
  const prevBrands = (existing?.known_brand_relationships as string[] | undefined) ?? [];
  const mergedBrands = Array.from(new Set([...prevBrands, ...brands.map(normalizeName).filter(Boolean)]));
  const prevEntered = (existing?.entered_names as string[] | undefined) ?? [];
  const mergedEntered = enteredAlias ? Array.from(new Set([...prevEntered, enteredAlias])) : prevEntered;
  const row: Record<string, unknown> = {
    vendor_name: vendorName,
    vendor_name_normalized: key,
    known_brand_relationships: mergedBrands,
    entered_names: mergedEntered, // Spec-B — client-entered aliases (requires the 20260705 migration)
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
