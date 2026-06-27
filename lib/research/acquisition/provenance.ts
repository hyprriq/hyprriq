import type { Provenance } from "./types";
import { classifySource, authorityFor, sourceTypeFor, freshnessExpectationFor } from "@/lib/research/source_profile";

const DAY_MS = 86_400_000;

export function buildProvenance(input: {
  url: string | null; pluginId: string; collectedAt: string; freshnessDays: number | null;
}): Provenance {
  const profile = classifySource(input.url ?? "", input.pluginId);
  const expires = new Date(new Date(input.collectedAt).getTime() + freshnessExpectationFor(profile) * DAY_MS);
  return {
    source_profile: profile,
    source_type: sourceTypeFor(profile),
    authority_score: authorityFor(profile),
    freshness_days: input.freshnessDays,
    acquisition_method: (input.pluginId as Provenance["acquisition_method"]),
    collected_at: input.collectedAt,
    expires_at: expires.toISOString(),
    refresh_required: false,
  };
}

const REQUIRED: (keyof Provenance)[] = [
  "source_profile", "source_type", "authority_score", "acquisition_method",
  "collected_at", "expires_at", "refresh_required",
];
// Full provenance chain: no source enters reasoning without a complete record. (freshness_days
// may legitimately be null; the others must be present.)
export function assertProvenanceComplete(p: Partial<Provenance>): asserts p is Provenance {
  for (const k of REQUIRED) {
    if (p[k] === undefined || p[k] === null) throw new Error(`incomplete provenance: missing ${k}`);
  }
}
