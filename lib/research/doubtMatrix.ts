import type { DoubtLevel, DoubtCostInputs } from "@/lib/research/contracts";

// ── S-1e — Module 7's doubt matrix as VERSIONED CONFIG (ADDENDUM-2 Move 1 reduced form,
// instance #1). The 12 cells are the FOUNDER'S, verbatim from the filled skeleton
// (founder-authored + confirmed 2026-07-17). doubt_level = MATRIX[gap][cost], computed in CODE —
// the LLM writes doubt_focus + rationale only (WHERE, never HOW MUCH).
// THE FOUNDER'S LAW governs every cell: "doubt is calibrated trust in a stated conclusion;
// confusion is the absence of one" — every level must be actionable.
// TIER-INDEPENDENT (recorded law): one matrix, the same at every tier — no tier parameter enters.
// G4 flag on record, not acted on: `severe` never differs from `significant` in v1. ──

export const DOUBT_MATRIX_VERSION = "d7-1.0.0";

export type GapLevel = "none" | "narrow" | "material" | "wide";
export type CostLevel = "low" | "significant" | "severe";

export const DOUBT_MATRIX: Record<GapLevel, Record<CostLevel, DoubtLevel>> = {
  none: { low: "minimal", significant: "minimal", severe: "minimal" },
  narrow: { low: "minimal", significant: "targeted", severe: "targeted" },
  material: { low: "targeted", significant: "elevated", severe: "elevated" },
  wide: { low: "elevated", significant: "broad", severe: "broad" },
};

// AXIS 1 — the RULED FALLBACK (2026-07-17): LLM-DERIVED — M3 `unresolved` count + stored unknowns.
// The dead corroboration-death mechanism is NOT built (empty on this corpus AND wrong polarity —
// the A1 split ruling). Derivation THRESHOLDS are PARAMETERIZED and stay blank in product code:
// G4 measures them; nothing here invents a number. Callers MUST supply founder-ruled values.
export interface GapInputs { unresolved_assertions: number; stored_unknowns: number }
export interface GapThresholds { narrow: number; material: number; wide: number } // min totals per level

export function deriveGapLevel(inputs: GapInputs, thresholds: GapThresholds): GapLevel {
  const total = inputs.unresolved_assertions + inputs.stored_unknowns;
  if (total === 0) return "none"; // everything load-relevant is supported — the fixed meaning
  if (total >= thresholds.wide) return "wide";
  if (total >= thresholds.material) return "material";
  return total >= thresholds.narrow ? "narrow" : "none";
}

// AXIS 2 — OQ-S1 (a), RULED: observable enforcement stakes ONLY. Level meanings are the
// founder-CONFIRMED Axis-2 meanings (2026-07-17): low = nothing observed; significant = signals
// or a veto-grade finding present; severe = both together. (The breadth-of-brands clause of
// `severe` is G4-parameterized — per-brand attribution is not deterministic on the stored record.)
export function deriveCostLevel(inputs: Omit<DoubtCostInputs, "cost_level">): CostLevel {
  const signals = inputs.enforcement_posture_signals.length > 0;
  const vetoes = inputs.veto_grade_keys_present.length > 0;
  if (signals && vetoes) return "severe";
  if (signals || vetoes) return "significant";
  return "low";
}

export function computeDoubtLevel(gap: GapLevel, cost: CostLevel): DoubtLevel {
  return DOUBT_MATRIX[gap][cost];
}
