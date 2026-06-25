import type { TrackContext, TrackOutput } from "@/lib/research/contracts";

// Track 1 — Supplier Identity (Layer 1 evidence collector). Phase 5: real Sonnet 4.6
// + WHOIS injection (Master Prompts v2.1 §3). Stage-1 scaffold: returns empty evidence,
// no model call.
export function runTrack1(ctx: TrackContext): Promise<TrackOutput> {
  return Promise.resolve({
    track_key: "supplier_identity",
    evidence_items: [],
    evidence_weights_applied: [],
    reasoning_notes: `stub track_1 for case ${ctx.case_id}`,
    unknowns: [],
  });
}
