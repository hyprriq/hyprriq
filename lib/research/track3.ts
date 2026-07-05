import type { TrackOutput } from "@/lib/research/contracts";

// Track 3 — Brand Risk Assessment (Layer 1). Real build: its own gated phase (design spec
// 2026-07-03 + firewall registry entries + ADR-T1-001 collision audit).
// H3 — until then this dimension is a declared ABSENCE (not_implemented → n_a + skipped),
// never a soft_fail: pre-H3 the bare empty stub scored soft_fail and floored EVERY case
// at verify_before_purchase (audit N2).
export function runTrack3(): Promise<TrackOutput> {
  return Promise.resolve({
    track_key: "brand_risk_assessment",
    evidence_items: [],
    evidence_weights_applied: [],
    reasoning_notes: "dimension not yet available — excluded from scoring",
    unknowns: [],
    not_implemented: true,
  });
}
