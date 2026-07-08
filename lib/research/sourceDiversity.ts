import type { TrackSignal, EvidenceItem } from "@/lib/research/contracts";
import { canonicalUrl } from "@/lib/research/canonicalUrl";

// H7 (SO-3, founder-signed) — the spec defines pass as "multiple independent sources confirm"; the
// scorer counted points, not sources (one registry page × 4 keys = 8 points = pass → the shell-company
// false-clear seam). ONE shared post-signal cap, applied at EVERY site that derives a track signal
// (the H3 pattern rule: pipeline stageFindingTrack + track1/track2 report signals), downgrades a
// single-source pass to infer. deriveTrackSignal is FROZEN and untouched; only 'pass' is ever capped
// (hard_fail/flag/soft_fail/infer/n_a pass through). Conservative edge: a pass cited purely by
// inference items (no URLs) also caps — zero verifiable sources is not "multiple independent sources".
export interface DiversityCapResult {
  signal: TrackSignal;
  capped: boolean;
  cap_reason: string | null;
  distinct_sources: number;
}

export function applySourceDiversityCap(
  signal: TrackSignal,
  evidenceItems: Pick<EvidenceItem, "source_url">[],
): DiversityCapResult {
  const distinct = new Set(
    evidenceItems.map((e) => canonicalUrl(e.source_url ?? null)).filter((k): k is string => !!k),
  ).size;
  if (signal !== "pass" || distinct >= 2) return { signal, capped: false, cap_reason: null, distinct_sources: distinct };
  return {
    signal: "infer",
    capped: true,
    distinct_sources: distinct,
    cap_reason: `pass requires >=2 distinct sources; applied evidence cites ${distinct}`,
  };
}
