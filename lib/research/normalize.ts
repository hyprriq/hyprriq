import { createHash } from "node:crypto";
import type { TrackOutput, NormalizedEvidence, NormalizedEvidenceItem } from "@/lib/research/contracts";

// Layer 2 — Evidence Normalization (deterministic). The evidence_hash is a stable SHA-256 over
// the canonicalized (order-independent) normalized evidence set. Same evidence → same hash →
// same synthesis (memoization) → same verdict (replay/DD requirement). Order-independent so two
// runs that find the same evidence in a different sequence still match.
export function computeEvidenceHash(items: NormalizedEvidenceItem[]): string {
  const canonical = items
    .map((i) => `${i.source_track}|${i.evidence_id}|${i.statement}|${i.certainty}|${i.source_type}|${i.source_url ?? ""}|${i.claimant}|${i.claimant_benefits}|${i.weight_key ?? ""}`)
    .sort();
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex").slice(0, 32);
}

export function normalizeEvidence(outputs: TrackOutput[]): NormalizedEvidence {
  const items: NormalizedEvidenceItem[] = outputs.flatMap((o) =>
    o.evidence_items.map((e) => ({ ...e, source_track: o.track_key })),
  );
  return { items, evidence_hash: computeEvidenceHash(items) };
}
