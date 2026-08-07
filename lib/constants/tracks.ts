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
