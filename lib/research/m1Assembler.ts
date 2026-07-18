import type {
  TrackOutput, SupplierIdentity, WidenedM1Record, M1RecordExtension, RejectedWithGate,
} from "@/lib/research/contracts";
import { normalizeEvidence } from "@/lib/research/normalize";
import type { DiversityCapResult } from "@/lib/research/sourceDiversity";

// ── S-1b — Module 1: the WIDENED-RECORD ASSEMBLER (deterministic CODE end-to-end; the one module
// that is never an LLM call). Consumes S-1a's frozen contracts (530881b) as law.
// THE Q3 LAW: the accepted projection is the hash anchor and stays BYTE-IDENTICAL to frozen
// normalizeEvidence/computeEvidenceHash; the widened extension rides BESIDE it, never inside it
// (property-locked in m1Assembler.test.ts — the conscience test).
// THE NAMING LAW: items pass through untouched — M1's claimant/claimant_benefits are per-track
// PROVENANCE CLASS; per-claim attribution is M2's job under the distinct names. ──

export interface M1TrackInput {
  output: TrackOutput;
  // The stored per-track diversity record (compiled_findings_json.source_diversity) — passed as
  // DATA from the frozen record; the assembler re-derives nothing (the F4 lesson: never recompose
  // the signal pipeline outside the shared fn).
  source_diversity?: DiversityCapResult | null;
}

export function assembleM1Record(tracks: M1TrackInput[], identityAudit: SupplierIdentity | null): WidenedM1Record {
  const outputs = tracks.map((t) => t.output);
  const accepted = normalizeEvidence(outputs);

  const rejected_with_gate: RejectedWithGate[] = tracks.flatMap((t) =>
    (t.output.weight_validation ?? [])
      .filter((v) => v.validated_weight_key === null)
      .map((v) => ({
        evidence_id: v.evidence_id,
        proposed_weight_key: v.proposed_weight_key,
        gate: v.gate,
        rejection_reason: v.rejection_reason,
        validation_version: v.validation_version,
        source_track: t.output.track_key,
        ...(v.gate === "corroboration" ? { tag: "asserted_but_unverifiable" as const } : {}),
      })),
  );

  const extension: M1RecordExtension = {
    rejected_with_gate,
    unknowns: tracks.flatMap((t) => t.output.unknowns.map((u) => ({ ...u, source_track: t.output.track_key }))),
    advisory_metadata: {
      b2b_only_detected: tracks.some((t) => t.output.b2b_only_detected === true),
      b2b_only_brands: [...new Set(tracks.flatMap((t) => t.output.b2b_only_brands ?? []))],
    },
    identity_audit: identityAudit,
    consensus_records: tracks.flatMap((t) =>
      t.output.hard_fail_consensus ? [{ source_track: t.output.track_key, ...t.output.hard_fail_consensus }] : [],
    ),
    diversity_records: tracks.flatMap((t) =>
      t.source_diversity ? [{ source_track: t.output.track_key, ...t.source_diversity }] : [],
    ),
  };

  // The accepted projection is the frozen normalizeEvidence output VERBATIM — the hash never sees
  // the extension (Q3; the conscience test watched this fail when a rejection fed the projection).
  return { accepted, extension };
}
