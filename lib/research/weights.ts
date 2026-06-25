import type { TrackKey } from "@/lib/constants/tracks";

// ADR-G003 evidence-weight registry — CODE owns the weights (enhancement #1). The LLM reports
// which evidence_types it found; this table assigns the points. Deterministic + versioned.
// `hard_fail: true` = affirmative fraud/deception → forces hard_fail regardless of score.
// rubric_version is stored on results so historical reports stay reproducible when tuned.
export const RUBRIC_VERSION = "g003-1.0.0";

export interface WeightEntry { points: number; hard_fail?: boolean }

// Per-track: evidence_type -> weight. evidence_types are the canonical tags the tracks emit
// (Phase 5). Negative points are risk signals; hard_fail entries are disqualifiers.
const WEIGHTS: Record<Exclude<TrackKey, "intake_scope_guard" | "sourcing_logic">, Record<string, WeightEntry>> = {
  supplier_identity: {
    government_registration: { points: 4 },
    domain_age_5_plus: { points: 3 },
    domain_age_2_5: { points: 2 },
    domain_age_under_2_established: { points: -2 },
    address_verifiable: { points: 2 },
    linkedin_company: { points: 2 },
    phone_verifiable: { points: 1 },
    website_quality: { points: 1 },
    bbb_or_trade_association: { points: 1 },
    negative_reputation: { points: -3 },
    // hard fails (affirmative fraud)
    registration_fabricated: { points: 0, hard_fail: true },
    address_fraudulent: { points: 0, hard_fail: true },
    website_fraudulent: { points: 0, hard_fail: true },
    scam_reports_corroborated: { points: 0, hard_fail: true },
  },
  supply_chain_relationship: {
    dealer_page_listed: { points: 5 },
    loa_legitimate: { points: 4 },
    invoice_matches_distributor: { points: 3 },
    purchases_from_mega_distributor: { points: 3 },
    trade_press_connection: { points: 2 },
    claims_authorization_unverified: { points: 1 },
    no_connection_found: { points: 0 },
    grey_market_signals: { points: -3 },
    // hard fails
    counterfeit_channel: { points: 0, hard_fail: true },
    conflicting_authorization: { points: 0, hard_fail: true },
  },
  brand_risk_assessment: {
    reseller_friendly: { points: 4 },
    keepa_stable_no_cliff: { points: 3 },
    low_seller_count_stable: { points: 2 },
    no_enforcement_found: { points: 2 },
    map_policy_present: { points: 1 },
    keepa_enforcement_cliff: { points: -3 },
    brand_enforcement_signals: { points: -3 },
    brand_restricts_amazon: { points: -4 },
    b2b_only_confirmed: { points: -5, hard_fail: true },
    // hard fails
    active_ip_complaints: { points: 0, hard_fail: true },
    confirmed_amazon_restrictions: { points: 0, hard_fail: true },
    cease_and_desist_distributed: { points: 0, hard_fail: true },
  },
  documentation_review: {
    invoice_full: { points: 4 },
    loa_legitimate: { points: 4 },
    po_on_letterhead: { points: 3 },
    catalog_or_pricelist: { points: 2 },
    email_correspondence: { points: 1 },
    screenshot_only: { points: 1 },
    no_documents: { points: 0 },
    document_missing_fields: { points: -2 },
    // hard fails
    document_alteration: { points: 0, hard_fail: true },
    retail_receipt_as_wholesale: { points: 0, hard_fail: true },
  },
};

export function weightFor(track: TrackKey, evidenceType: string): WeightEntry | null {
  const table = (WEIGHTS as Record<string, Record<string, WeightEntry>>)[track];
  return table?.[evidenceType] ?? null;
}

// ADR-G004 signal → score and verdict bands (deterministic verdict engine).
export const SIGNAL_SCORE: Record<string, number> = {
  pass: 4.0, infer: 2.5, flag: 1.5, soft_fail: 0.5, hard_fail: 0.0,
};
export const TRACK_WEIGHTS: Record<string, number> = {
  supplier_identity: 0.30, supply_chain_relationship: 0.25,
  brand_risk_assessment: 0.30, documentation_review: 0.15,
};
