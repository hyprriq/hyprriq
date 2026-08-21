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
  evidenceItems: Pick<EvidenceItem, "source_url" | "weight_key">[],
): DiversityCapResult {
  const distinct = new Set(
    evidenceItems.map((e) => canonicalUrl(e.source_url ?? null)).filter((k): k is string => !!k),
  ).size;
  // manufacturer_direct exemption (g003-1.2.0, CTO-DECIDED 2026-08-21, fixture-locked): the cap
  // exists to stop single-source LLM-extraction credulity; manufacturer_direct is CODE-emitted and
  // already rests on two independent systems agreeing (identity resolution: "the vendor's domain";
  // source profiling: "the brand's own site"). One evidence item = one URL by construction, so
  // without this the ruled +8→pass would silently cap to infer at every derivation site. The
  // exemption lives HERE — the one shared composition — so pipeline, track and rejudge can never
  // disagree (the F4 three-site agreement property).
  if (evidenceItems.some((e) => e.weight_key === "manufacturer_direct")) {
    return { signal, capped: false, cap_reason: null, distinct_sources: distinct };
  }
  if (signal !== "pass" || distinct >= 2) return { signal, capped: false, cap_reason: null, distinct_sources: distinct };
  return {
    signal: "infer",
    capped: true,
    distinct_sources: distinct,
    cap_reason: `pass requires >=2 distinct sources; applied evidence cites ${distinct}`,
  };
}
