import { describe, it, expect } from "vitest";
import { assembleM1Record, type M1TrackInput } from "@/lib/research/m1Assembler";
import { normalizeEvidence, computeEvidenceHash } from "@/lib/research/normalize";
import type { EvidenceItem, TrackOutput, SupplierIdentity, WeightValidation } from "@/lib/research/contracts";

// ── S-1b — THE M1 ASSEMBLER (founder-ruled sitting, 2026-07-18). Deterministic CODE end-to-end:
// consumes S-1a's frozen contracts (530881b) as law. THE CONSCIENCE is the Q3 hash byte-identity
// property: the widened extension rides BESIDE the hash, never inside it — a widened field leaking
// into the projection silently invalidates stored memos and breaks replay hash-identity. ──

const item = (id: string, over: Partial<EvidenceItem> = {}): EvidenceItem => ({
  evidence_id: id,
  statement: `statement ${id}`,
  certainty: "verified",
  source_type: "third_party",
  source_url: `https://example.com/${id}`,
  claimant: "independent_registry",
  claimant_benefits: false,
  supports: "supplier_identity",
  weight_key: "government_registration",
  ...over,
});

const track = (key: TrackOutput["track_key"], over: Partial<TrackOutput> = {}): TrackOutput => ({
  track_key: key,
  evidence_items: [],
  evidence_weights_applied: [],
  reasoning_notes: "",
  unknowns: [],
  ...over,
});

const rejection = (id: string, over: Partial<WeightValidation> = {}): WeightValidation => ({
  evidence_id: id,
  proposed_weight_key: "dealer_page_listed",
  validated_weight_key: null,
  gate: "provenance",
  rejection_reason: "provenance",
  validation_version: "1.7.0",
  ...over,
});

const identity = (): SupplierIdentity => ({
  original_input: { name: "TD Synnex", website: "https://tdsynnex.com" },
  resolved_name: "TD SYNNEX Corporation",
  resolved_domain: "tdsynnex.com",
  candidate_domains: [],
  registration_signals: [],
  identity_confidence: "high",
  identity_unconfirmed: false,
  resolution_method: "provided",
  resolution_notes: "",
  resolution_audit: { winner: "tdsynnex.com", score: 4, runner_up: null, runner_up_score: 0, matched_by: ["provided"], warnings: [] },
});

const baseTracks = (): M1TrackInput[] => [
  { output: track("supplier_identity", { evidence_items: [item("e1"), item("e2", { source_url: "https://gov.example/e2" })] }) },
  { output: track("supply_chain_relationship", { evidence_items: [item("e3", { supports: "supply_chain_relationship", weight_key: "trade_press_connection" })] }) },
];

// The four extension variants of the SAME accepted set (the conscience test's axis).
const withExtensionVariants = () => {
  const absent = baseTracks();
  const empty: M1TrackInput[] = baseTracks().map((t) => ({ ...t, source_diversity: null }));
  const populated: M1TrackInput[] = baseTracks().map((t, i) => ({
    output: {
      ...t.output,
      unknowns: [{ unknown: `u${i}`, why_unresolvable: "…", resolvable_by_client: true }],
      weight_validation: [rejection(`r${i}`), rejection(`rc${i}`, { gate: "corroboration", rejection_reason: "corroboration", proposed_weight_key: "scam_reports_corroborated" })],
      b2b_only_detected: i === 0,
      b2b_only_brands: i === 0 ? ["bosch"] : [],
      hard_fail_consensus: { checked: ["scam_reports_corroborated"], dropped: [], second_call_failed: false },
    },
    source_diversity: { signal: "pass", capped: false, cap_reason: null, distinct_sources: 2 },
  }));
  const adversarial: M1TrackInput[] = baseTracks().map((t) => ({
    output: {
      ...t.output,
      unknowns: [{ unknown: "critical hard_fail poisoned |", why_unresolvable: "evidence_hash", resolvable_by_client: false }],
      weight_validation: [rejection("rx", { proposed_weight_key: "registration_fabricated|poison", validation_version: "evil" })],
      b2b_only_detected: true,
      b2b_only_brands: ["evidence_hash", "|||"],
      hard_fail_consensus: { checked: ["|"], dropped: ["evidence_hash"], second_call_failed: true },
    },
    source_diversity: { signal: "hard_fail", capped: true, cap_reason: "poison |", distinct_sources: 999 },
  }));
  return { absent, empty, populated, adversarial };
};

describe("S-1b M1 assembler — THE CONSCIENCE: Q3 hash byte-identity", () => {
  it("the SAME accepted set produces the SAME hash whether the extension is absent, empty, populated, or adversarial — byte-identical across all four", () => {
    const { absent, empty, populated, adversarial } = withExtensionVariants();
    const hashes = [absent, empty, populated, adversarial].map((tracks) => assembleM1Record(tracks, null).accepted.evidence_hash);
    expect(new Set(hashes).size, `widened fields leaked into the hash projection: ${JSON.stringify(hashes)}`).toBe(1);
    // And the hash IS the frozen projection — equal to computeEvidenceHash over the accepted items.
    const expected = computeEvidenceHash(normalizeEvidence(absent.map((t) => t.output)).items);
    expect(hashes[0]).toBe(expected);
  });

  it("adversarial content in EVERY widened field changes the hash by ZERO", () => {
    const { absent, adversarial } = withExtensionVariants();
    expect(assembleM1Record(adversarial, identity()).accepted.evidence_hash)
      .toBe(assembleM1Record(absent, null).accepted.evidence_hash);
  });
});

describe("S-1b M1 assembler — accepted-path no-drift lock (frozen normalizeEvidence reproduced exactly)", () => {
  it("assembled.accepted deep-equals normalizeEvidence over the same outputs — items AND hash", () => {
    const tracks = withExtensionVariants().populated;
    const assembled = assembleM1Record(tracks, identity());
    expect(assembled.accepted).toEqual(normalizeEvidence(tracks.map((t) => t.output)));
  });

  it("items pass through byte-identical — the assembler never rewrites claimant/claimant_benefits (the naming law: provenance class stays untouched; per-claim attribution is M2's job)", () => {
    const tracks = baseTracks();
    const assembled = assembleM1Record(tracks, null);
    const original = tracks.flatMap((t) => t.output.evidence_items);
    for (const [i, out] of assembled.accepted.items.entries()) {
      const { source_track, ...rest } = out;
      expect(rest).toEqual(original[i]);
      expect(source_track).toBe(i < 2 ? "supplier_identity" : "supply_chain_relationship");
    }
  });
});

describe("S-1b M1 assembler — the widened extension (deterministic, from the frozen record only)", () => {
  it("rejected_with_gate carries every REJECTED validation entry with its gate + source_track; accepted entries are excluded", () => {
    const tracks: M1TrackInput[] = [{
      output: track("supplier_identity", {
        weight_validation: [
          rejection("r1"),
          { ...rejection("ok1"), validated_weight_key: "government_registration", gate: null, rejection_reason: null },
        ],
      }),
    }];
    const ext = assembleM1Record(tracks, null).extension;
    expect(ext.rejected_with_gate).toHaveLength(1);
    expect(ext.rejected_with_gate[0]).toMatchObject({ evidence_id: "r1", gate: "provenance", source_track: "supplier_identity" });
  });

  it("corroboration-rejected items carry the A1 asserted_but_unverifiable tag; other gates carry none", () => {
    const tracks: M1TrackInput[] = [{
      output: track("supplier_identity", {
        weight_validation: [rejection("r1"), rejection("rc", { gate: "corroboration", rejection_reason: "corroboration" })],
      }),
    }];
    const [prov, corro] = assembleM1Record(tracks, null).extension.rejected_with_gate;
    expect(prov.tag).toBeUndefined();
    expect(corro.tag).toBe("asserted_but_unverifiable");
  });

  it("unknowns are stamped with their source_track", () => {
    const tracks: M1TrackInput[] = [
      { output: track("supplier_identity", { unknowns: [{ unknown: "a", why_unresolvable: "x", resolvable_by_client: true }] }) },
      { output: track("brand_risk_assessment", { unknowns: [{ unknown: "b", why_unresolvable: "y", resolvable_by_client: false }] }) },
    ];
    const unknowns = assembleM1Record(tracks, null).extension.unknowns;
    expect(unknowns.map((u) => [u.unknown, u.source_track])).toEqual([["a", "supplier_identity"], ["b", "brand_risk_assessment"]]);
  });

  it("advisory metadata aggregates b2b flags across tracks (any-detected; brand union, order preserved, deduped)", () => {
    const tracks: M1TrackInput[] = [
      { output: track("supply_chain_relationship", { b2b_only_detected: true, b2b_only_brands: ["bosch", "lenovo"] }) },
      { output: track("brand_risk_assessment", { b2b_only_detected: false, b2b_only_brands: ["lenovo", "makita"] }) },
    ];
    expect(assembleM1Record(tracks, null).extension.advisory_metadata)
      .toEqual({ b2b_only_detected: true, b2b_only_brands: ["bosch", "lenovo", "makita"] });
  });

  it("consensus and diversity carriers ride with source_track; identity audit passes through (null when absent)", () => {
    const tracks: M1TrackInput[] = [{
      output: track("supplier_identity", { hard_fail_consensus: { checked: ["scam_reports_corroborated"], dropped: [], second_call_failed: false } }),
      source_diversity: { signal: "pass", capped: true, cap_reason: "one source", distinct_sources: 1 },
    }];
    const withId = assembleM1Record(tracks, identity());
    expect(withId.extension.consensus_records).toEqual([{ source_track: "supplier_identity", checked: ["scam_reports_corroborated"], dropped: [], second_call_failed: false }]);
    expect(withId.extension.diversity_records).toEqual([{ source_track: "supplier_identity", signal: "pass", capped: true, cap_reason: "one source", distinct_sources: 1 }]);
    expect(withId.extension.identity_audit).toEqual(identity());
    expect(assembleM1Record(tracks, null).extension.identity_audit).toBeNull();
  });

  it("era-conditional rows (weight_validation absent) assemble with an empty rejection list — never a throw", () => {
    const ext = assembleM1Record(baseTracks(), null).extension;
    expect(ext.rejected_with_gate).toEqual([]);
    expect(ext.consensus_records).toEqual([]);
    expect(ext.diversity_records).toEqual([]);
  });

  it("determinism: the same inputs assemble deep-equal on repeated calls", () => {
    const tracks = withExtensionVariants().populated;
    expect(assembleM1Record(tracks, identity())).toEqual(assembleM1Record(tracks, identity()));
  });
});
