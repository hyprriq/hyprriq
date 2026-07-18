import { describe, it, expect } from "vitest";
import { runCallA, certifyM2, certifyM3, type CallAModelFn } from "@/lib/research/synthesisCallA";
import { buildCallAPrompt, parseCallAOutput, type RawM2Item, type RawM3Item } from "@/lib/research/synthesisCallA.prompt";
import { assembleM1Record, type M1TrackInput } from "@/lib/research/m1Assembler";
import type { EvidenceItem, TrackOutput, WeightValidation, WidenedM1Record } from "@/lib/research/contracts";

// ── S-1c — CALL A (M2+M3), the first LLM boundary. ONE call per the RULED four-call staging
// (SO-S1-2; the frozen SchemaFallbackRecord has exactly call_a/call_b/call_b_refuter/call_c) —
// both modules emitted together, then EACH code-certified separately. THE CONSCIENCE is the
// firewall-wins law's dangerous direction: the LLM must never resurrect a firewall-killed claim
// as independent evidence — code overrides from the stored record, and only that direction. ──

const item = (id: string, over: Partial<EvidenceItem> = {}): EvidenceItem => ({
  evidence_id: id, statement: `statement ${id}`, certainty: "verified", source_type: "third_party",
  source_url: `https://example.com/${id}`, claimant: "independent_registry", claimant_benefits: false,
  supports: "supplier_identity", weight_key: "government_registration", ...over,
});
const track = (key: TrackOutput["track_key"], over: Partial<TrackOutput> = {}): TrackOutput => ({
  track_key: key, evidence_items: [], evidence_weights_applied: [], reasoning_notes: "", unknowns: [], ...over,
});
const rejection = (id: string, over: Partial<WeightValidation> = {}): WeightValidation => ({
  evidence_id: id, proposed_weight_key: "dealer_page_listed", validated_weight_key: null,
  gate: "provenance", rejection_reason: "provenance", validation_version: "1.7.0", ...over,
});

// A record with accepted items e1/e2 and two rejections: rc (corroboration gate) + rp (provenance).
const record = (): WidenedM1Record => assembleM1Record([
  { output: track("supplier_identity", {
      evidence_items: [item("e1"), item("e2", { source_url: "https://gov.example/e2" })],
      weight_validation: [
        rejection("rc", { gate: "corroboration", rejection_reason: "corroboration", proposed_weight_key: "scam_reports_corroborated" }),
        rejection("rp"),
      ],
    }) },
], null);

const attribution = (over: Partial<RawM2Item> = {}): RawM2Item => ({
  evidence_id: "e1", claim: "claim text", claim_attributed_to: "vendor",
  attributed_party_benefits: false, corroboration: "independent", weight: "standalone", ...over,
});
const assertion = (over: Partial<RawM3Item> = {}): RawM3Item => ({
  assertion_id: "a1", assertion: "assertion text", brand: "",
  status: "supported", supporting_evidence: ["e1"], contradicting_evidence: [], confidence: "high", ...over,
});

const mockModel = (json: unknown, extra: { schema_fallback?: boolean; throws?: boolean } = {}): CallAModelFn =>
  async () => {
    if (extra.throws) throw new Error("model down");
    return { json, schema_fallback: extra.schema_fallback ?? false, cost_usd: 0.01 };
  };

describe("S-1c Call A — THE CONSCIENCE: the firewall-wins law, dangerous direction only", () => {
  it("the LLM asserting independent/standalone on a firewall-REJECTED claim is overridden by CODE from the stored record + audited — the killed claim never reaches weight as independent evidence", () => {
    const raw = [attribution({ evidence_id: "rc", corroboration: "independent", weight: "standalone" })];
    const { attributions, audits } = certifyM2(raw, record());
    expect(attributions).toHaveLength(1);
    expect(attributions[0].corroboration, "resurrected claim reached the certified output as independent").toBe("none_found");
    expect(attributions[0].weight).toBe("low_until_corroborated");
    expect(audits.some((a) => a.reason.includes("firewall") && a.field === "corroboration")).toBe(true);
  });

  it("the override fires for ANY rejected item (provenance gate too) — a killed claim is not independent evidence whatever gate killed it", () => {
    const raw = [attribution({ evidence_id: "rp", corroboration: "cross_source", weight: "standalone" })];
    const { attributions } = certifyM2(raw, record());
    expect(attributions[0].corroboration).toBe("none_found");
    expect(attributions[0].weight).toBe("low_until_corroborated");
  });

  it("THE CONSERVATIVE DIRECTION IS LEFT ALONE: the LLM writing none_found on an ACCEPTED claim is never overridden — fails toward caution, no audit", () => {
    const raw = [attribution({ evidence_id: "e1", corroboration: "none_found", weight: "standalone", attributed_party_benefits: false })];
    const { attributions, audits } = certifyM2(raw, record());
    expect(attributions[0].corroboration).toBe("none_found");
    expect(attributions[0].weight).toBe("standalone"); // benefits=false: the pairing lock does not fire
    expect(audits).toHaveLength(0);
  });
});

describe("S-1c Call A — M2 certification (code locks over the LLM's proposal)", () => {
  it("the schema-enforced pairing: attributed_party_benefits && none_found ⇒ weight CODE-locked to low_until_corroborated, whatever the LLM wrote", () => {
    const raw = [attribution({ evidence_id: "e1", attributed_party_benefits: true, corroboration: "none_found", weight: "standalone" })];
    const { attributions, audits } = certifyM2(raw, record());
    expect(attributions[0].weight).toBe("low_until_corroborated");
    expect(audits.some((a) => a.field === "weight")).toBe(true);
  });

  it("a dangling evidence_id (resolving to neither accepted nor rejected) drops the attribution + audits", () => {
    const raw = [attribution({ evidence_id: "ghost" }), attribution({ evidence_id: "e2", corroboration: "cross_source" })];
    const { attributions, audits } = certifyM2(raw, record());
    expect(attributions.map((a) => a.evidence_id)).toEqual(["e2"]);
    expect(audits.some((a) => a.reason.includes("dangling"))).toBe(true);
  });

  it("certified entries carry EXACTLY the frozen ClaimAttribution keys — the naming law's runtime half (no claimant names can leak from M1)", () => {
    const { attributions } = certifyM2([attribution({ evidence_id: "e1" })], record());
    expect(Object.keys(attributions[0]).sort()).toEqual(
      ["attributed_party_benefits", "claim", "claim_attributed_to", "corroboration", "evidence_id", "weight"],
    );
  });
});

describe("S-1c Call A — M3 certification (dangling drops + the unconditional roster lock)", () => {
  const roster = ["bosch", "lenovo"];

  it("an assertion whose supporting OR contradicting evidence_ids do not all resolve to M1 accepted items is DROPPED + audited", () => {
    const raw = [
      assertion({ assertion_id: "a1", supporting_evidence: ["e1", "ghost"] }),
      assertion({ assertion_id: "a2", contradicting_evidence: ["nope"] }),
      assertion({ assertion_id: "a3", supporting_evidence: ["e1", "e2"] }),
    ];
    const { assertions, audits } = certifyM3(raw, record(), roster);
    expect(assertions.map((a) => a.assertion_id)).toEqual(["a3"]);
    expect(audits.filter((a) => a.reason.includes("dangling"))).toHaveLength(2);
  });

  it("THE ROSTER LOCK, UNCONDITIONAL: a brand tag not in cases.brands_submitted drops the assertion + audits; '' (vendor-level) and roster brands pass", () => {
    const raw = [
      assertion({ assertion_id: "a1", brand: "makita" }),
      assertion({ assertion_id: "a2", brand: "" }),
      assertion({ assertion_id: "a3", brand: "bosch" }),
    ];
    const { assertions, audits } = certifyM3(raw, record(), roster);
    expect(assertions.map((a) => a.assertion_id)).toEqual(["a2", "a3"]);
    expect(audits.some((a) => a.reason.includes("roster"))).toBe(true);
  });

  it("certified assertions carry exactly the frozen SynthesisAssertion keys (A8 brand present)", () => {
    const { assertions } = certifyM3([assertion()], record(), roster);
    expect(Object.keys(assertions[0]).sort()).toEqual(
      ["assertion", "assertion_id", "brand", "confidence", "contradicting_evidence", "status", "supporting_evidence"],
    );
  });
});

describe("S-1c Call A — the parser is tolerant and coerces CONSERVATIVELY", () => {
  it("invalid enums coerce toward caution: corroboration→none_found, weight→low_until_corroborated, status→unresolved, confidence→low; junk input → parse_failed, never a throw", () => {
    const parsed = parseCallAOutput({
      claim_attributions: [{ ...attribution(), corroboration: "definitely", weight: "huge" }],
      assertions: [{ ...assertion(), status: "certain!!", confidence: "extreme" }],
    });
    expect(parsed.parse_failed).toBe(false);
    expect(parsed.attributions[0].corroboration).toBe("none_found");
    expect(parsed.attributions[0].weight).toBe("low_until_corroborated");
    expect(parsed.assertions[0].status).toBe("unresolved");
    expect(parsed.assertions[0].confidence).toBe("low");
    expect(parseCallAOutput("garbage").parse_failed).toBe(true);
    expect(parseCallAOutput(null).parse_failed).toBe(true);
  });
});

describe("S-1c Call A — A7 order-invariance (the code half: canonical prompt, order-stable certification)", () => {
  it("shuffling the M1 inputs produces a BYTE-IDENTICAL prompt and identical certified outputs", async () => {
    const tracks: M1TrackInput[] = [
      { output: track("supplier_identity", { evidence_items: [item("e1"), item("e2")], weight_validation: [rejection("rp")] }) },
      { output: track("supply_chain_relationship", { evidence_items: [item("e3", { supports: "supply_chain_relationship" })] }) },
    ];
    const shuffled: M1TrackInput[] = [tracks[1], { output: { ...tracks[0].output, evidence_items: [tracks[0].output.evidence_items[1], tracks[0].output.evidence_items[0]] } }];
    const a = assembleM1Record(tracks, null);
    const b = assembleM1Record(shuffled, null);
    expect(buildCallAPrompt(a, ["bosch"]).user).toBe(buildCallAPrompt(b, ["bosch"]).user);
    const json = { claim_attributions: [attribution({ evidence_id: "e1" })], assertions: [assertion()] };
    const ra = await runCallA({ record: a, roster: ["bosch"], model: mockModel(json) });
    const rb = await runCallA({ record: b, roster: ["bosch"], model: mockModel(json) });
    expect(ra.attributions).toEqual(rb.attributions);
    expect(ra.assertions).toEqual(rb.assertions);
  });
});

describe("S-1c Call A — the stage (one call; R2 observability; fail-open, never fail-silent)", () => {
  const goodJson = () => ({ claim_attributions: [attribution({ evidence_id: "e1" })], assertions: [assertion()] });

  it("returns certified M2+M3 from one model call; schema_fallback is propagated for the R2 record (call_a flag)", async () => {
    const res = await runCallA({ record: record(), roster: ["bosch"], model: mockModel(goodJson(), { schema_fallback: true }) });
    expect(res.parse_failed).toBe(false);
    expect(res.schema_fallback).toBe(true);
    expect(res.attributions).toHaveLength(1);
    expect(res.assertions).toHaveLength(1);
  });

  it("an unparseable response or a thrown model call yields parse_failed=true with EMPTY certified outputs — never a throw, never silent junk", async () => {
    const bad = await runCallA({ record: record(), roster: [], model: mockModel("not json shaped") });
    expect(bad.parse_failed).toBe(true);
    expect(bad.attributions).toEqual([]);
    expect(bad.assertions).toEqual([]);
    const down = await runCallA({ record: record(), roster: [], model: mockModel(null, { throws: true }) });
    expect(down.parse_failed).toBe(true);
    expect(down.attributions).toEqual([]);
  });

  it("determinism: identical inputs + identical model responses certify deep-equal on repeated runs", async () => {
    const one = await runCallA({ record: record(), roster: ["bosch"], model: mockModel(goodJson()) });
    const two = await runCallA({ record: record(), roster: ["bosch"], model: mockModel(goodJson()) });
    expect(one.attributions).toEqual(two.attributions);
    expect(one.assertions).toEqual(two.assertions);
    expect(one.audits).toEqual(two.audits);
  });
});
