import type { TrackContext } from "@/lib/research/contracts";

// ADR-G006 Institutional Memory — WRITE-SIDE SEAM. Every completed case must contribute to
// the corpus from case #1 (the moat compounds; it cannot be reconstructed retroactively).
//
// ⚠ NOT YET ACTIVE: the target tables `vendor_intelligence` / `brand_intelligence` referenced
// by Tech Arch v1.4 §2.5 do NOT exist in the live DB — it has `supplier_cache` / `brand_cache`
// from the initial schema instead. Writing the corpus needs a migration to create the
// intelligence-profile tables (or a decision to evolve supplier_cache/brand_cache). Until that
// migration lands, this is a no-op seam so the pipeline always calls it — when the tables exist,
// only this function changes. The pipeline contract (write intelligence on completion) is preserved.
export function writeIntelligence(ctx: TrackContext): Promise<void> {
  // Future: upsert vendor_intelligence (normalized vendor, risk_history, case_count) +
  // brand_intelligence (normalized brand, enforcement_history) + relationship records, keyed
  // by ctx.case_id / normalizeName(ctx.vendor_name). normalizeName() is the lookup key (fixed).
  if (!ctx.case_id) return Promise.resolve();
  return Promise.resolve(); // no-op until the intelligence-profile tables exist
}
