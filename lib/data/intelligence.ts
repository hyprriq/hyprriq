import { supabaseAdmin } from "@/lib/supabase/admin";
import type { TrackContext, TrackSignal } from "@/lib/research/contracts";
import { normalizeName } from "@/lib/utils/normalize-name";
import {
  buildInvestigationEvent, recordInvestigationEvent, type MemoryWriteArgs,
} from "@/lib/data/intelligence-events";

// ADR-G006/G007 Institutional Memory — H6 shape: the append-only intelligence_events ledger is the
// SOURCE OF TRUTH; vendor_intelligence / brand_intelligence are recomputable ROLLUPS. ONE shared
// compute function per table (H3 pattern rule) serves both the incremental pipeline write and the
// founder-run rebuild (scripts/cleanup-corpus.ts). Rollups consume ONLY confirmed-identity events
// (identity_unconfirmed/identity_failed excluded — the ledger records truth, the corpus stays clean).
// Loud-but-non-fatal contract unchanged (H2 OQ-2): failures log + audit_log, return degraded:true.

export interface LedgerEvent {
  case_id: string; attempt_number: number;
  entered_name: string | null; resolved_name: string; vendor_name_normalized: string;
  resolved_domain: string | null; identity_unconfirmed: boolean; identity_failed: boolean;
  brands: string[]; brands_normalized: string[];
  signals: Partial<Record<string, TrackSignal>>; verdict: string | null; created_at: string;
}

export interface VendorRollup {
  vendor_name: string; vendor_name_normalized: string; resolved_domain: string | null;
  known_brand_relationships: string[]; entered_names: string[];
  overall_risk_signal: TrackSignal | null;
  risk_history: { case_id: string; attempt_number: number; date: string; signal: TrackSignal | null; verdict: string | null }[];
  case_count: number; last_reviewed_at: string;
}

export interface BrandRollup { brand_name: string; brand_name_normalized: string; case_count: number; last_reviewed_at: string }

const byTime = (a: LedgerEvent, b: LedgerEvent) => a.created_at.localeCompare(b.created_at);

export function computeVendorRollup(key: string, events: LedgerEvent[]): VendorRollup {
  const sorted = [...events].sort(byTime);
  const latest = sorted[sorted.length - 1];
  const withSignal = [...sorted].reverse().find((e) => e.signals.supplier_identity);
  return {
    vendor_name: latest.resolved_name,
    vendor_name_normalized: key,
    resolved_domain: [...sorted].reverse().find((e) => e.resolved_domain)?.resolved_domain ?? null,
    known_brand_relationships: [...new Set(sorted.flatMap((e) => e.brands_normalized))],
    // Aliases = entered names that normalize away from the vendor key (Spec-B: mis-entered names).
    entered_names: [...new Set(sorted.map((e) => e.entered_name).filter((n): n is string => !!n && normalizeName(n) !== key))],
    overall_risk_signal: withSignal?.signals.supplier_identity ?? null,
    risk_history: sorted.map((e) => ({
      case_id: e.case_id, attempt_number: e.attempt_number, date: e.created_at,
      signal: e.signals.supplier_identity ?? null, verdict: e.verdict,
    })),
    case_count: new Set(sorted.map((e) => e.case_id)).size,
    last_reviewed_at: latest.created_at,
  };
}

export function computeBrandRollup(brandKey: string, events: LedgerEvent[]): BrandRollup {
  const relevant = events.filter((e) => e.brands_normalized.includes(brandKey)).sort(byTime);
  const latest = relevant[relevant.length - 1];
  const display = latest.brands[latest.brands_normalized.indexOf(brandKey)] ?? brandKey;
  return {
    brand_name: display, brand_name_normalized: brandKey,
    case_count: new Set(relevant.map((e) => e.case_id)).size,
    last_reviewed_at: latest.created_at,
  };
}

const EVENT_COLUMNS =
  "case_id, attempt_number, entered_name, resolved_name, vendor_name_normalized, resolved_domain, identity_unconfirmed, identity_failed, brands, brands_normalized, signals, verdict, created_at";

// Fetch the confirmed events feeding a vendor rollup. Used by the incremental write below AND the
// rebuild script — same query, same compute, same upsert (one fn, all sites).
async function confirmedVendorEvents(key: string): Promise<{ events: LedgerEvent[]; error: string | null }> {
  const { data, error } = await supabaseAdmin.from("intelligence_events")
    .select(EVENT_COLUMNS)
    .eq("vendor_name_normalized", key).eq("identity_unconfirmed", false).eq("identity_failed", false);
  return { events: (data ?? []) as unknown as LedgerEvent[], error: error?.message ?? null };
}

async function confirmedBrandEvents(brandKey: string): Promise<{ events: LedgerEvent[]; error: string | null }> {
  const { data, error } = await supabaseAdmin.from("intelligence_events")
    .select(EVENT_COLUMNS)
    .contains("brands_normalized", [brandKey]).eq("identity_unconfirmed", false).eq("identity_failed", false);
  return { events: (data ?? []) as unknown as LedgerEvent[], error: error?.message ?? null };
}

export async function rollupVendor(key: string): Promise<{ error: string | null }> {
  const { events, error } = await confirmedVendorEvents(key);
  if (error) return { error };
  if (events.length === 0) return { error: null }; // nothing confirmed → profiles untouched
  const r = computeVendorRollup(key, events);
  const { error: upErr } = await supabaseAdmin.from("vendor_intelligence")
    .upsert({ ...r }, { onConflict: "vendor_name_normalized" });
  return { error: upErr?.message ?? null };
}

export async function rollupBrand(brandKey: string): Promise<{ error: string | null }> {
  const { events, error } = await confirmedBrandEvents(brandKey);
  if (error) return { error };
  if (events.length === 0) return { error: null };
  const r = computeBrandRollup(brandKey, events);
  const { error: upErr } = await supabaseAdmin.from("brand_intelligence")
    .upsert({ ...r }, { onConflict: "brand_name_normalized" });
  return { error: upErr?.message ?? null };
}

export async function writeIntelligence(ctx: TrackContext, args: MemoryWriteArgs): Promise<{ degraded: boolean }> {
  const ev = buildInvestigationEvent(ctx, args);
  const failures: string[] = [];
  const rec = await recordInvestigationEvent(ev);
  if (rec.error) failures.push(`event(${ev.vendor_name_normalized}): ${rec.error}`);
  // Rollups fire only when THIS call appended a new event (replay-safe) AND the identity is
  // confirmed (H6 gate — unconfirmed/failed attempts live in the ledger as truth, never in profiles).
  if (rec.inserted && !ev.identity_unconfirmed && !ev.identity_failed) {
    const v = await rollupVendor(ev.vendor_name_normalized);
    if (v.error) failures.push(`vendor(${ev.vendor_name_normalized}): ${v.error}`);
    for (const brandKey of ev.brands_normalized) {
      const b = await rollupBrand(brandKey);
      if (b.error) failures.push(`brand(${brandKey}): ${b.error}`);
    }
  }
  if (failures.length > 0) {
    const detail = failures.join("; ");
    console.error(`[intelligence] memory write failed (case ${ctx.case_id}): ${detail}`);
    await supabaseAdmin.from("audit_log").insert({
      table_name: "intelligence_events", record_id: ctx.case_id, action: "UPDATE",
      actor_id: "system", actor_type: "system", new_value: { memory_write_failed: detail },
    });
    return { degraded: true };
  }
  return { degraded: false };
}
