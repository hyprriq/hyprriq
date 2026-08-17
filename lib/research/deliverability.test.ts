import { describe, it, expect } from "vitest";
import { checkDeliverable, type DeliverabilityRow } from "@/lib/research/deliverability";
import type { SynthesisOutput } from "@/lib/research/contracts";

// THE INCIDENT, as an executable test (2026-08-17): SEED-VALIDATE delivered on attempt 2, which
// held ONE track row (intake_scope_guard, n_a) and no synthesis for that attempt — while
// getCaseIntelligence handed back June's attempt-1 synthesis. It passed the language gate because
// there was nothing in it to scan.
const STUB: DeliverabilityRow[] = [
  { track_key: "intake_scope_guard", track_number: 0, attempt_number: 2, track_verdict_signal: "n_a", compiled_findings_json: {} },
];
const GOOD: DeliverabilityRow[] = [
  { track_key: "intake_scope_guard", track_number: 0, attempt_number: 2, track_verdict_signal: "n_a", compiled_findings_json: {} },
  { track_key: "supplier_identity", track_number: 1, attempt_number: 2, track_verdict_signal: "flag", compiled_findings_json: { summary: "The registry lists the entity at the stated address since 2014, with consistent filings." } },
  { track_key: "supply_chain_relationship", track_number: 2, attempt_number: 2, track_verdict_signal: "flag", compiled_findings_json: { brand_relationship_finding: "VERIFIED POSITIVES: the dealer locator lists the vendor for the US market (src_1)." } },
  // growth_279 requires tracks [0,1,2,3,4,5] — a "complete" fixture must actually be complete, or
  // it is testing the failure path while claiming to test the success one.
  { track_key: "brand_risk_assessment", track_number: 3, attempt_number: 2, track_verdict_signal: "flag", compiled_findings_json: { brand_risk_finding: "VERIFIED POSITIVES: the brand publishes a reseller policy (src_2)." } },
  { track_key: "documentation_review", track_number: 4, attempt_number: 2, track_verdict_signal: "n_a", compiled_findings_json: { summary: "no documents were provided for review" } },
  { track_key: "sourcing_logic", track_number: 5, attempt_number: 2, track_verdict_signal: "n_a", compiled_findings_json: { summary: "non-voting" } },
];
const synth = (risk: string): SynthesisOutput => ({
  module_1_normalized_evidence: [], module_2_claim_attributions: [], module_3_assertions: [],
  module_4_contradictions: [], module_5_hypotheses: { hypotheses: [], what_would_change_the_leader: "" },
  module_6_risk_gaps: [], module_7_doubt_calibration: { doubt_level: "moderate", doubt_focus: "", rationale: "" },
  module_8_vendor_questions: [],
  module_9_decision_snapshot: { headline: "h", leading_interpretation: "l", the_real_risk: risk, what_to_verify: [], what_to_monitor: [] },
} as unknown as SynthesisOutput);
const RISK = "What remains unverified drives the risk: the sourcing channel for this brand is not documented anywhere in the record.";

describe("THE INCIDENT — a stub attempt must never publish again", () => {
  it("refuses the exact shape that delivered on 2026-08-17", () => {
    const missing = checkDeliverable({
      attempt: 2, rows: STUB, synthesis: null, synthesisAttempt: null,
      planType: "growth_279", verdict: "verify_before_purchase",
    });
    expect(missing.join(" | ")).toMatch(/no synthesis for attempt 2/);
    expect(missing.join(" | ")).toMatch(/missing track/);
    expect(missing.join(" | ")).toMatch(/would be blank/);
  });

  it("refuses SKEW: synthesis from a different investigation than the tracks", () => {
    const missing = checkDeliverable({
      attempt: 2, rows: GOOD, synthesis: synth(RISK), synthesisAttempt: 1,
      planType: "growth_279", verdict: "verify_before_purchase",
    });
    expect(missing.join(" | ")).toMatch(/synthesis belongs to attempt 1, not the attempt being delivered \(2\)/);
  });
});

describe("a complete attempt still publishes", () => {
  it("passes when synthesis matches the attempt, tracks are present, and there is text, a verdict and a risk", () => {
    expect(checkDeliverable({
      attempt: 2, rows: GOOD, synthesis: synth(RISK), synthesisAttempt: 2,
      planType: "growth_279", verdict: "verify_before_purchase",
    })).toEqual([]);
  });

  it("refuses a missing verdict and a missing risk statement, naming each", () => {
    const missing = checkDeliverable({
      attempt: 2, rows: GOOD, synthesis: synth(""), synthesisAttempt: 2,
      planType: "growth_279", verdict: null,
    });
    expect(missing).toContain("no verdict on the case");
    expect(missing).toContain("no risk statement in the decision snapshot");
  });

  it("an n_a-only attempt is blank however many rows it has — signals are not content", () => {
    const naOnly = GOOD.map((r) => ({ ...r, track_verdict_signal: "n_a" as const }));
    expect(checkDeliverable({
      attempt: 2, rows: naOnly, synthesis: synth(RISK), synthesisAttempt: 2,
      planType: "growth_279", verdict: "verify_before_purchase",
    }).join(" | ")).toMatch(/would be blank/);
  });
});
