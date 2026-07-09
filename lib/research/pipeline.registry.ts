import type { TrackKey } from "@/lib/constants/tracks";
import type { PlanType } from "@/lib/constants/plans";

// Code-owned, ORDERED orchestration registry (deterministic IP — NOT a DB table, NOT
// runtime-editable via any UI; same pattern as weights.ts / source_profile.ts). It drives the
// durable Inngest pipeline: which finding tracks exist, their step names, plan gating, and
// execution ordering / parallel grouping. Adding a track = ONE entry here; no orchestration-code
// change. Track INTELLIGENCE logic lives in runTrackN and is untouched by this file.
//
// plan_gates MUST stay consistent with requiredFindingTracks (lib/constants/tracks) — a test
// asserts they agree so the two cannot silently drift.
export interface TrackRegistryEntry {
  track_key: TrackKey;
  track_number: number;     // selects runTrackN
  step_name: string;        // Inngest step id, e.g. "track-1"
  execution_order: number;  // ascending; entries with the same order may run together
  parallel_group: number;   // entries sharing a group fan out via Promise.all
  plan_gates: PlanType[];   // plans that include this track
  available: boolean;       // false → skipped gracefully (reserved for future tracks 6, 7…)
}

const ALL: PlanType[] = ["single_99", "growth_279", "scale_499"];
const GROWTH_SCALE: PlanType[] = ["growth_279", "scale_499"];

// Tracks 1–4 = parallel group 1 (execution_order 1). Track 5 (sourcing-logic arbitrator) =
// execution_order 2: it waits for 1–4 because it arbitrates across their outputs.
export const TRACK_REGISTRY: readonly TrackRegistryEntry[] = [
  { track_key: "supplier_identity",         track_number: 1, step_name: "track-1", execution_order: 1, parallel_group: 1, plan_gates: ALL,          available: true },
  { track_key: "supply_chain_relationship", track_number: 2, step_name: "track-2", execution_order: 1, parallel_group: 1, plan_gates: GROWTH_SCALE, available: true },
  { track_key: "brand_risk_assessment",     track_number: 3, step_name: "track-3", execution_order: 1, parallel_group: 1, plan_gates: ALL,          available: true },
  { track_key: "documentation_review",      track_number: 4, step_name: "track-4", execution_order: 1, parallel_group: 1, plan_gates: GROWTH_SCALE, available: true },
  { track_key: "sourcing_logic",            track_number: 5, step_name: "track-5", execution_order: 2, parallel_group: 2, plan_gates: ALL,          available: true },
] as const;

// Orchestration version (cases.pipeline_version). Bump on a step add/remove/reorder, a retry- or
// parallelism-strategy change, or any workflow-shape change — NOT when a track prompt, the
// Evidence Pack, the weight registry, verdict logic, or source profiles change.
// 1.1.0 (2026-07-07, H7): source-diversity cap at the signal site (SO-3), hard-fail consensus
// second-extraction pass (SO-4), replay mode (OQ-D: stored packs + frozen identity in place of
// live acquisition/resolution). Companion versions this phase: pack 1.1.0 (SO-1), firewall 1.3.0 (SO-2).
// 1.2.0 (2026-07-09, SB-1, founder-approved): Track 0.5 domain-mode anchor match (SO-1) + llm_failed
// research-failure routing (SO-2) — resolution behavior changes for NEW attempts; frozen attempts untouched.
export const PIPELINE_VERSION = "1.2.0";

// Finding tracks included for a plan, available-only, in execution order.
export function tracksForPlan(plan: PlanType): TrackRegistryEntry[] {
  return TRACK_REGISTRY
    .filter((t) => t.available && t.plan_gates.includes(plan))
    .sort((a, b) => a.execution_order - b.execution_order);
}

// Execution-order groups (ascending). Each group's entries fan out together (Promise.all);
// groups run sequentially. Track 5 lands in a later group than 1–4.
export function executionGroupsForPlan(plan: PlanType): TrackRegistryEntry[][] {
  const included = tracksForPlan(plan);
  const orders = [...new Set(included.map((t) => t.execution_order))].sort((a, b) => a - b);
  return orders.map((o) => included.filter((t) => t.execution_order === o));
}
