import type { TrackContext, TrackOutput } from "@/lib/research/contracts";

// Track 4 — Documentation Review (Layer 1). Real build: after Track 3 (14-field review +
// manipulation detection, Master Prompts v2.1 §6).
// H3 — declared ABSENCE until built (not_implemented → n_a + skipped), never soft_fail.
export function runTrack4(_ctx: TrackContext): Promise<TrackOutput> {
  return Promise.resolve({
    track_key: "documentation_review",
    evidence_items: [],
    evidence_weights_applied: [],
    reasoning_notes: "dimension not yet available — excluded from scoring",
    unknowns: [],
    not_implemented: true,
  });
}
