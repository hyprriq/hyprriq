import { deriveTrackSignal } from "@/lib/research/signals";
import { applySourceDiversityCap } from "@/lib/research/sourceDiversity";
import type { TrackKey } from "@/lib/constants/tracks";
import type { EvidenceItem, TrackSignal } from "@/lib/research/contracts";

// ── Sweep fix F4 (founder-approved 2026-07-14) — the ONE composition for re-deriving a STORED
// track signal from frozen evidence_items: dedupe keys → deriveTrackSignal → source-diversity cap.
// This is exactly what the pipeline persists (stageFindingTrack) — the proof layer (rejudge,
// stability locks) MUST use this helper, never re-compose the steps, or the three-site agreement
// property degrades into "mostly agrees" (the divergence the 2026-07-14 sweep caught: rejudge
// omitted the cap and false-failed on any capped track). Composes the FROZEN fns byte-identically;
// no judgment logic lives here (the H3 shared-ceiling-fn pattern).
export function rederiveStoredSignal(track: TrackKey, items: EvidenceItem[]): TrackSignal {
  const keys = [...new Set(items.map((e) => e.weight_key).filter((k): k is string => !!k))];
  return applySourceDiversityCap(deriveTrackSignal(track, keys).signal, items).signal;
}
