import type { PlanType } from "@/lib/constants/plans";

// Canonical track registry (ADR-G001 + ADR-008). track_key is THE reference for
// prompts, orchestration, reporting, PDFs, QA, analytics — never reference a track
// by number alone. Kept in sync with the case_track_results CHECK constraints.
export type TrackKey =
  | "intake_scope_guard" | "supplier_identity" | "supply_chain_relationship"
  | "brand_risk_assessment" | "documentation_review" | "sourcing_logic";

export type TrackDef = { track: string; track_key: TrackKey; track_number: number; dimension: string };

export const TRACKS: TrackDef[] = [
  { track: "track_0", track_key: "intake_scope_guard",       track_number: 0, dimension: "Intake" },
  { track: "track_1", track_key: "supplier_identity",         track_number: 1, dimension: "Supplier Identity" },
  { track: "track_2", track_key: "supply_chain_relationship", track_number: 2, dimension: "Supply Chain Relationship" },
  { track: "track_3", track_key: "brand_risk_assessment",     track_number: 3, dimension: "Brand Risk Assessment" },
  { track: "track_4", track_key: "documentation_review",      track_number: 4, dimension: "Documentation Review" },
  { track: "track_5", track_key: "sourcing_logic",            track_number: 5, dimension: "Sourcing Logic" },
];

// ── WHAT COUNTS AS AN "ASSESSMENT AREA" (§2, founder-ruled 2026-08-18) ──────────────────────
// The count a client reads must derive from THE PRODUCT DEFINITION, not from case data. Two
// wrong bases were measured on the corpus before this existed and both are traps:
//   · counting RENDERED ROWS — what report-view did — makes a Scale case say "6 assessment
//     areas" the moment Track 6 lands, when we sell five.
//   · counting rows where `non_voting !== true` — the obvious second guess — is WORSE: the probe
//     found `sourcing_logic` carrying `non_voting: true` on 5 stored rows and absent on 11, so
//     the SAME track would count as an area on some cases and not on others.
// TRACKS (1–5) is the canonical registry and the Track 6 advisory key is deliberately NOT in the
// TrackKey union, so "is it a sold assessment area" is answerable without looking at a single case.
//
// ⚠ THE TRACK 6 KEY IS NOT NAMED IN THIS FILE ON PURPOSE. A source-scan lock
// (track6.inertia.test.ts) asserts the literal string never appears here, because the frozen
// synthesisCallB consumes Record<TrackKey,…> exhaustively and growing the union would edit frozen
// code. This function answers by MEMBERSHIP in TRACKS, so it needs no such name and the lock holds.
export const ASSESSMENT_AREA_KEYS: readonly string[] =
  TRACKS.filter((t) => t.track_number >= 1).map((t) => t.track_key);

/** True for the five sold assessment areas; false for advisory surfaces such as Track 6. */
export function isAssessmentArea(trackKey: string): boolean {
  return ASSESSMENT_AREA_KEYS.includes(trackKey);
}

export function trackByNumber(n: number): TrackDef {
  const t = TRACKS.find((x) => x.track_number === n);
  if (!t) throw new Error(`Unknown track_number ${n}`);
  return t;
}

// Which tracks run per plan (brief §3.4). track_0 (intake) always runs.
// single_149 (founder-ruled 2026-08-07): ALL five areas — the "try the full engine once" tier.
export const TRACK_CONFIG: Record<PlanType, { tracks: number[] }> = {
  single_99: { tracks: [0, 1, 3, 5] },
  single_149: { tracks: [0, 1, 2, 3, 4, 5] },
  growth_279: { tracks: [0, 1, 2, 3, 4, 5] },
  scale_499: { tracks: [0, 1, 2, 3, 4, 5] },
};

// Finding tracks (1–5) included for a plan — the set the founder must complete and
// that isCaseReadyForReport() checks. Excludes track_0 (intake gate, not a finding).
export function requiredFindingTracks(plan: PlanType): number[] {
  return TRACK_CONFIG[plan].tracks.filter((n) => n >= 1);
}
