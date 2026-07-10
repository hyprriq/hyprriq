import type { TrackKey } from "@/lib/constants/tracks";

// ADR-G003 evidence-weight registry — CODE owns the weights (enhancement #1). The LLM reports
// which evidence_types it found; this table assigns the points. Deterministic + versioned.
// `hard_fail: true` = affirmative fraud/deception → forces hard_fail regardless of score.
// rubric_version is stored on results so historical reports stay reproducible when tuned.
// g003-1.1.0 (2026-07-10, Track 3 SO-4 founder-signed): b2b_only_confirmed −5+hard_fail → 0-point
// pure veto — the only hard-fail key that double-counted (veto + score drag); the drag only ever
// affected the confidence score of an already-vetoed track. Convention: every hard_fail is 0-point.
export const RUBRIC_VERSION = "g003-1.1.0";

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
    b2b_only_confirmed: { points: 0, hard_fail: true }, // SO-4 (g003-1.1.0): pure veto, no double-count
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

// Phase 4.5 (item 4) — the positive-weight evidence types we'd EXPECT to strengthen a track.
// Used to compute "missing evidence" = expected − found. Informational only (some are alternatives,
// e.g. invoice OR LOA) — never framed as required. Tracks with no weight table return [].
export function expectedEvidenceTypes(track: TrackKey): string[] {
  const table = (WEIGHTS as Record<string, Record<string, WeightEntry>>)[track];
  if (!table) return [];
  return Object.entries(table).filter(([, w]) => w.points > 0).map(([k]) => k);
}

// Human labels for evidence types (item 4 display). Keyed by evidence_type.
export const EVIDENCE_LABELS: Record<string, string> = {
  // supplier_identity
  government_registration: "Government business registration",
  domain_age_5_plus: "Domain age 5+ years",
  domain_age_2_5: "Domain age 2–5 years",
  address_verifiable: "Verifiable business address",
  linkedin_company: "LinkedIn company presence",
  phone_verifiable: "Verifiable phone number",
  website_quality: "Established website",
  bbb_or_trade_association: "BBB / trade-association listing",
  // supply_chain_relationship
  dealer_page_listed: "Listed on the brand's dealer page",
  loa_legitimate: "Legitimate Letter of Authorization",
  invoice_matches_distributor: "Invoice matching the distributor",
  purchases_from_mega_distributor: "Purchases from a major distributor",
  trade_press_connection: "Trade-press connection",
  claims_authorization_unverified: "Stated (unverified) authorization",
  // brand_risk_assessment
  reseller_friendly: "Reseller-friendly brand history",
  keepa_stable_no_cliff: "Stable Keepa history (no cliff)",
  low_seller_count_stable: "Low, stable seller count",
  no_enforcement_found: "No enforcement found",
  map_policy_present: "MAP policy present",
  // documentation_review
  invoice_full: "Full wholesale invoice",
  po_on_letterhead: "Purchase order on letterhead",
  catalog_or_pricelist: "Catalog or price list",
  email_correspondence: "Email correspondence",
  screenshot_only: "Screenshot evidence",
};

export const evidenceLabel = (evidenceType: string): string =>
  EVIDENCE_LABELS[evidenceType] ?? evidenceType.replace(/_/g, " ");

// Mutually-exclusive evidence buckets — one member satisfies the whole attribute. Used so "missing
// evidence" (item 4) doesn't list the OTHER buckets when one is already covered (e.g. a 7-year
// domain found as domain_age_5_plus must not report domain_age_2_5 as "missing").
export const EVIDENCE_ALTERNATIVE_GROUPS: string[][] = [
  ["domain_age_5_plus", "domain_age_2_5", "domain_age_under_2_established"], // one domain-age value
];

export function alternativeGroupFor(evidenceType: string): string[] | null {
  return EVIDENCE_ALTERNATIVE_GROUPS.find((g) => g.includes(evidenceType)) ?? null;
}

// ADR-G004 signal → score and verdict bands (deterministic verdict engine).
export const SIGNAL_SCORE: Record<string, number> = {
  pass: 4.0, infer: 2.5, flag: 1.5, soft_fail: 0.5, hard_fail: 0.0,
};
export const TRACK_WEIGHTS: Record<string, number> = {
  supplier_identity: 0.30, supply_chain_relationship: 0.25,
  brand_risk_assessment: 0.30, documentation_review: 0.15,
};

// Phase 5.1b — does an evidence_type exist in ANY track's registry? Distinguishes a totally-unknown
// key (firewall gate ①) from a key valid for a DIFFERENT track (gate ④). Additive; no scoring change.
export function weightKeyExistsInAnyTrack(evidenceType: string): boolean {
  const tables = WEIGHTS as Record<string, Record<string, WeightEntry>>;
  return Object.values(tables).some((t) => evidenceType in t);
}

// H7 — registry enumeration for the firewall-coverage lock (firewallRegistry.test.ts). Additive
// read-only export; scoring untouched.
export function weightKeysForTrack(track: TrackKey): string[] {
  const table = (WEIGHTS as Record<string, Record<string, WeightEntry>>)[track];
  return table ? Object.keys(table) : [];
}
