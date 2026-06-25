import type { TrackOutput, NormalizedEvidence, NormalizedEvidenceItem } from "@/lib/research/contracts";

// Layer 2 — Evidence Normalization (deterministic). Phase 3: real stable hash over the
// sorted normalized set (the cache + replay key). Stage-1 scaffold: passthrough + placeholder hash.
export function computeEvidenceHash(items: NormalizedEvidenceItem[]): string {
  // Phase 3: SHA-256 over canonicalized (sorted) evidence. Placeholder for now.
  return `stub-${items.length}`;
}

export function normalizeEvidence(outputs: TrackOutput[]): NormalizedEvidence {
  const items: NormalizedEvidenceItem[] = outputs.flatMap((o) =>
    o.evidence_items.map((e) => ({ ...e, source_track: o.track_key })),
  );
  return { items, evidence_hash: computeEvidenceHash(items) };
}
