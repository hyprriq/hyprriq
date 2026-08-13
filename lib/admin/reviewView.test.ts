import { describe, it, expect } from "vitest";
import { buildAreaViews, parseLastDecision, escalationReason } from "./reviewView";
import { projectFindingJsonForClient } from "@/lib/portal/clientReport";
import { SOURCING_CLIENT_SUMMARY } from "@/lib/research/contracts";
import type { TrackResultRow } from "@/lib/data/track-results";

// The projection-extraction lock: the pure fn's neutral summary must equal the contracts
// constant forever (the OQ-D rule survived the extraction byte-identically).
describe("projectFindingJsonForClient — extraction lock", () => {
  it("track_5 summary is forced to the ruled neutral constant", () => {
    const p = projectFindingJsonForClient({ summary: "internal arbitration text", sourcing_logic: { x: 1 } }, "sourcing_logic");
    expect(p.summary).toBe(SOURCING_CLIENT_SUMMARY);
    expect("sourcing_logic" in p).toBe(false); // not on the allowlist — never crosses
  });
});

const row = (over: Partial<TrackResultRow>): TrackResultRow =>
  ({
    id: "r1", case_id: "c1", track: "track_3", track_key: "brand_risk_assessment", track_number: 3,
    attempt_number: 1, track_verdict_signal: "flag", confidence_score: 0, confidence_band: "low",
    evidence_items: [], evidence_weights_applied: null, reasoning_notes: null, unknowns: [],
    compiled_findings_json: null, questions_to_ask: null, weight_validation: null,
    ...over,
  }) as unknown as TrackResultRow;

describe("buildAreaViews — the operator reads the client's text, with internal detail beneath", () => {
  it("clientText is the projected + cleaned narrative (tags stripped, names substituted); internal fields stay raw", () => {
    const r = row({
      compiled_findings_json: {
        brand_risk_finding: "Enforcement documented (E10). This is a Track 2 brand-affiliation data point.",
        summary: "internal memo text (src_9)",
      },
      evidence_items: [{ evidence_id: "E10", statement: "Takedowns on complaint (src_9)", certainty: "inferred", weight_key: "brand_enforcement_signals", source_url: "https://forum.example" }] as never,
      evidence_weights_applied: [{ evidence_type: "brand_enforcement_signals", points: -3 }] as never,
      reasoning_notes: "The evidence pack contains a mix (src_9) of primary sources.",
    });
    const [a] = buildAreaViews([r]);
    expect(a.clientText).toBe("Enforcement documented. This is a Supply-Chain Relationship brand-affiliation data point.");
    // INTERNAL detail keeps its tags — the operator's leverage.
    expect(a.evidence[0].statement).toContain("(src_9)");
    expect(a.evidence[0].points).toBe(-3);
    expect(a.evidence[0].source_url).toBe("https://forum.example");
    expect(a.reasoningNotes).toContain("(src_9)");
  });

  it("rejected evidence carries proposed category + refusing gate (never a why — none is stored)", () => {
    const r = row({
      weight_validation: [
        { evidence_id: "E1", proposed_weight_key: "authorized_reseller", validated_weight_key: null, gate: "registry", rejection_reason: "unknown key", validation_version: "v1" },
        { evidence_id: "E2", proposed_weight_key: "map_policy_present", validated_weight_key: "map_policy_present", gate: null, rejection_reason: null, validation_version: "v1" },
      ] as never,
    });
    const [a] = buildAreaViews([r]);
    expect(a.rejected).toEqual([{ proposed: "authorized_reseller", gate: "registry", reason: "unknown key" }]);
  });
});

describe("parseLastDecision", () => {
  it("parses the review route's JSON decision", () => {
    const d = parseLastDecision(JSON.stringify({ action: "publish", reason: null, reviewed_by: "user_1", at: "2026-08-12T10:00:00Z" }));
    expect(d).toMatchObject({ action: "publish", reviewed_by: "user_1" });
  });
  it("legacy plain-text notes render raw, never crash", () => {
    expect(parseLastDecision("old freeform note")?.raw).toBe("old freeform note");
  });
  it("empty → null", () => {
    expect(parseLastDecision(null)).toBeNull();
  });
});

describe("escalationReason — names the pipeline's specific reason", () => {
  it("failed paid area + weak identity", () => {
    expect(escalationReason({ track_2_status: "manual_required" }, "medium"))
      .toBe("Supply-Chain Relationship could not be scored (a paid-for area failed); supplier identity resolution is medium");
  });
  it("clean case → null", () => {
    expect(escalationReason({ track_1_status: "complete" }, "high")).toBeNull();
  });
});
