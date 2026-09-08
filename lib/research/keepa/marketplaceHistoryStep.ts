// ── STAGE 1 WIRING — the marketplace-history advisory (founder-approved shape (b), 2026-09-08) ──
//
// The Track-6 precedent applied to Track 3's advisory surface: an OWN durable step, plan-gated
// implicitly (only single_149/scale_499 collect ASINs — lib/portal/asinIntake.ts), fail-loud-
// non-fatal end to end. REPORTED, NEVER SCORING: nothing here touches signals, weight keys, the
// firewall, or the verdict — the three keepa_* keys stay inert; their gate is a separate ruling.
//
// WHERE THE RECORD LIVES (CTO-DECIDED, ⚠ UNRULED — flagged for founder review): Keepa evidence
// cannot ride the EvidencePack without either widening the frozen ResearchQuestion union or
// letting a routing-only label steal serper's queries (pluginFor routes by question to the FIRST
// capable plugin). So the input-of-record is brand_cache.keepa_data_json — the columns built for
// exactly this in the initial schema, written by nothing until now — plus the audit_log trail.
//
// DEGRADE, NEVER BREAK (founder condition): key absent / quota exhausted / API down ⇒ the
// advisory persists SELLER_DATA_UNAVAILABLE (a data-availability note, not a finding) and the
// case completes. Production has no key by instruction, so production IS the degrade path.

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { TrackContextWithIntake } from "@/lib/research/intakeExtras";
import { normalizeName } from "@/lib/utils/normalize-name";
import { fetchProducts, fetchSellerNames, keepaConfigured, type KeepaProduct } from "./client";
import { parseKeepaCountCsv, readSellerCounts, priceHeldDuring, type SellerCountReading } from "./sellerCountReading";
import { classifySeller } from "./aggregators";
import {
  sellerCountSentence, sellerIdentitySentence, brandLevelSentence, monitorEntries,
  SELLER_DATA_UNAVAILABLE, LISTING_UNRETRIEVABLE,
} from "./sellerCountLanguage";

// Patterns that justify spending offer+seller tokens on WHO remains (§P4.4's trigger set).
const IDENTITY_TRIGGERS = new Set(["enforcement_cliff", "already_locked_down", "brand_direct_only"]);

export interface MarketplaceHistoryBrand {
  brand: string;
  asin: string;
  sentence: string;
  identity_sentence: string | null;
  brand_level_sentence: string;
  listing_category_path: string | null;  // Amazon's own tree — ground truth, information not flags
  monitor: string[];
}

export interface MarketplaceHistoryBlock {
  available: boolean;
  note: string | null;                    // the degrade note when available=false
  per_brand: MarketplaceHistoryBrand[];
  generated_at: string;
}

export interface MarketplaceHistoryResult {
  ran: boolean;
  persisted: boolean;
  reason?: string;
  keepa_tokens_spent: number;             // MEASURED from Keepa's own accounting, per the rule
  listing_categories: { brand: string; asin: string; path: string[] }[]; // for Track 6's model aid
}

async function auditNote(caseId: string, note: Record<string, unknown>): Promise<void> {
  try {
    await supabaseAdmin.from("audit_log").insert({
      table_name: "case_track_results", record_id: caseId, action: "UPDATE",
      actor_id: "system", actor_type: "system", new_value: { marketplace_history: true, ...note },
    });
  } catch (e) {
    console.error(`[keepa] audit-log write failed (${JSON.stringify(note).slice(0, 80)}): ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** Persist the block into the case's track_3 row (P4.6: "feed this data into Track 3"). The row
 *  exists — finding tracks run before this step. Private by default: the client projection
 *  crosses only via the field-filtered projector branch (clientReport.ts). */
async function persistIntoTrack3(caseId: string, attempt: number, block: MarketplaceHistoryBlock): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("case_track_results")
    .select("id, compiled_findings_json")
    .eq("case_id", caseId).eq("track_key", "brand_risk_assessment").eq("attempt_number", attempt)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return `track_3 row not found for attempt ${attempt}: ${error?.message ?? "no row"}`;
  const merged = { ...(data.compiled_findings_json as Record<string, unknown> | null ?? {}), marketplace_history: block };
  const upd = await supabaseAdmin.from("case_track_results").update({ compiled_findings_json: merged }).eq("id", data.id);
  return upd.error ? upd.error.message : null;
}

/** brand_cache — the columns' FIRST writer. Fail-soft: cache is a convenience, never a gate. */
async function persistBrandCache(brand: string, product: KeepaProduct, reading: SellerCountReading): Promise<void> {
  try {
    const trend = reading.trendDirection === "unknown" ? null : reading.trendDirection;
    await supabaseAdmin.from("brand_cache").upsert({
      brand_name: brand,
      brand_name_normalized: normalizeName(brand),
      seller_count_current: reading.current,
      seller_count_peak: reading.peak,
      enforcement_cliff_detected: reading.pattern === "enforcement_cliff",
      ...(trend ? { seller_count_trend: trend } : {}),
      keepa_data_json: {
        asin: product.asin, pattern: reading.pattern, points: reading.points,
        observed_days: reading.observedDays, count_new_csv: product.countNewCsv,
        category_tree: product.categoryTree.map((c) => c.name), fetched_at: new Date().toISOString(),
      },
      last_researched_at: new Date().toISOString(),
    }, { onConflict: "brand_name_normalized" });
  } catch (e) {
    console.error(`[keepa] brand_cache write failed for ${brand} (non-fatal): ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function stageMarketplaceHistory(ctx: TrackContextWithIntake): Promise<MarketplaceHistoryResult> {
  const attempt = ctx.attempt_number ?? 1;
  const entries = Object.entries(ctx.brand_asins ?? {}).filter(([, a]) => typeof a === "string" && a);
  if (entries.length === 0) {
    // No ASINs = plans that never collect them, or a client who provided none. Nothing renders —
    // the same absent-not-empty law as the category section.
    return { ran: false, persisted: false, reason: "no_asins", keepa_tokens_spent: 0, listing_categories: [] };
  }

  let tokens = 0;
  const degrade = async (reason: string): Promise<MarketplaceHistoryResult> => {
    const block: MarketplaceHistoryBlock = { available: false, note: SELLER_DATA_UNAVAILABLE, per_brand: [], generated_at: new Date().toISOString() };
    const err = await persistIntoTrack3(ctx.case_id, attempt, block);
    await auditNote(ctx.case_id, { degraded: true, reason, persist_error: err });
    return { ran: true, persisted: !err, reason, keepa_tokens_spent: tokens, listing_categories: [] };
  };

  if (!keepaConfigured()) return degrade("KEEPA_API_KEY not configured (production's standing state)");

  const asins = entries.map(([, a]) => a);
  const base = await fetchProducts(asins);
  if (!base.available) return degrade(base.reason);
  tokens += base.quota.tokensConsumed;

  const byAsin = new Map(base.data.map((p) => [p.asin, p]));
  const readings = entries.map(([brand, asin]) => {
    const product = byAsin.get(asin) ?? null;
    const reading = product ? readSellerCounts(parseKeepaCountCsv(product.countNewCsv)) : null;
    return { brand, asin, product, reading };
  });

  // §P4.4 identity — only where a trigger pattern earns the extra tokens, one offers call + one
  // seller batch for ALL triggered ASINs together.
  const triggered = readings.filter((r) => r.reading && IDENTITY_TRIGGERS.has(r.reading.pattern));
  const identityByAsin = new Map<string, string | null>();
  if (triggered.length > 0) {
    const withOffers = await fetchProducts(triggered.map((t) => t.asin), { withOffers: true });
    if (withOffers.available) {
      tokens += withOffers.quota.tokensConsumed;
      const allIds = [...new Set(withOffers.data.flatMap((p) => p.offerSellerIds))];
      const names = await fetchSellerNames(allIds);
      if (names.available) {
        tokens += names.quota.tokensConsumed;
        for (const p of withOffers.data) {
          const t = triggered.find((x) => x.asin === p.asin);
          const identities = p.offerSellerIds.map((id) => ({
            name: names.data[id] ?? "(storefront name unavailable)",
            identity: classifySeller(names.data[id] ?? "", t?.brand ?? null, id),
          }));
          identityByAsin.set(p.asin, sellerIdentitySentence(identities));
        }
      }
      // names unavailable → identity sentences simply absent; the pattern sentence stands alone.
    }
  }

  const per_brand: MarketplaceHistoryBrand[] = [];
  const listing_categories: MarketplaceHistoryResult["listing_categories"] = [];
  for (const { brand, asin, product, reading } of readings) {
    if (!product || !reading) {
      per_brand.push({
        brand, asin,
        sentence: LISTING_UNRETRIEVABLE,
        identity_sentence: null,
        brand_level_sentence: brandLevelSentence("single_asin", 1),
        listing_category_path: null, monitor: [],
      });
      continue;
    }
    const priceHeld = reading.drop ? priceHeldDuring(parseKeepaCountCsv(product.priceNewCsv), reading.drop) : null;
    const path = product.categoryTree.map((c) => c.name);
    if (path.length > 0) listing_categories.push({ brand, asin, path });
    per_brand.push({
      brand, asin,
      sentence: sellerCountSentence(reading, priceHeld),
      identity_sentence: identityByAsin.get(asin) ?? null,
      // ONE ASIN per brand at intake (ruled 2026-07-28) ⇒ step 9's brand-level agreement cannot
      // fire from intake alone; the honest single-listing line ships (recorded in the tracker).
      brand_level_sentence: brandLevelSentence("single_asin", 1),
      listing_category_path: path.length > 0 ? path.join(" › ") : null,
      monitor: monitorEntries(asin, reading),
    });
    await persistBrandCache(brand, product, reading);
  }

  const block: MarketplaceHistoryBlock = { available: true, note: null, per_brand, generated_at: new Date().toISOString() };
  const err = await persistIntoTrack3(ctx.case_id, attempt, block);
  if (err) {
    await auditNote(ctx.case_id, { persist_failed: true, error: err });
    return { ran: true, persisted: false, reason: err, keepa_tokens_spent: tokens, listing_categories };
  }
  await auditNote(ctx.case_id, { persisted: true, brands: per_brand.length, keepa_tokens_spent: tokens });
  return { ran: true, persisted: true, keepa_tokens_spent: tokens, listing_categories };
}
