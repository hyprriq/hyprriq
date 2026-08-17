import { describe, it, expect } from "vitest";
import { locateMethodLeakage, locateSynthesisMethodLeakage } from "@/lib/research/methodScanReport";
import { scanForMethodLeakage, scanSynthesisAtDelivery } from "@/lib/research/synthesisMethodScan";

// AWI-2608-034's actual block, in its actual field — the case this locator was built to diagnose.
const M9 = {
  headline: "Key items could not be verified.",
  leading_interpretation:
    "Verdict: Verify Before Purchase. The vendor appears on two regional portals. This reading is corroborated by the distributor listing. Products may be genuine.",
  the_real_risk: "What remains unverified drives the risk: the sourcing channel is not documented.",
};

describe("the locator agrees with the scanner — in both directions", () => {
  it("finds a hit for every violation the scanner reports, and none it does not", () => {
    const scanner = scanForMethodLeakage({ leading_interpretation: M9.leading_interpretation });
    const located = locateMethodLeakage({ leading_interpretation: M9.leading_interpretation });
    expect(located).toHaveLength(scanner.length);
    expect(located[0].label).toContain("corroboration vocabulary");
  });

  it("stays silent on clean synthesis — the publish path must not invent work", () => {
    const clean = { decision_snapshot: { the_real_risk: "The sourcing channel is not documented." } };
    expect(scanForMethodLeakage(clean)).toEqual([]);
    expect(locateMethodLeakage(clean)).toEqual([]);
  });

  it("honest uncertainty language still passes — the scanner's ruled carve-out is inherited, not re-implemented", () => {
    const safe = { rationale: "We could not independently verify the distributor relationship." };
    expect(scanForMethodLeakage(safe)).toEqual([]);
    expect(locateMethodLeakage(safe)).toEqual([]);
  });
});

describe("what 034's operator finally gets", () => {
  const hits = locateSynthesisMethodLeakage({ module_9_decision_snapshot: M9 });

  it("names the FIELD, not just the record", () => {
    expect(hits[0].where).toBe("synthesis › decision_snapshot.leading_interpretation");
    expect(hits[0].path).toBe("decision_snapshot.leading_interpretation");
  });

  it("isolates the offending SENTENCE out of a four-sentence field", () => {
    expect(hits[0].sentence).toBe("This reading is corroborated by the distributor listing.");
    expect(hits[0].sentence).not.toContain("Verify Before Purchase");   // the clean sentences stay out
  });

  it("carries a concrete rewrite, not a restatement of the rule", () => {
    expect(hits[0].fix).toMatch(/never .*how many|not how many/i);
    expect(hits[0].fix.length).toBeGreaterThan(40);
  });

  it("returns the WHOLE field too, so the operator can see the sentence in context", () => {
    expect(hits[0].field_text).toBe(M9.leading_interpretation);
  });
});

describe("shape compatibility — two scanners, one worklist", () => {
  it("returns the same shape as the language locator so both feed ONE findings array", () => {
    const h = locateSynthesisMethodLeakage({ module_9_decision_snapshot: M9 })[0];
    for (const k of ["label", "target", "path", "where", "field_text", "sentence", "fix"]) {
      expect(h, `missing ${k}`).toHaveProperty(k);
    }
  });

  it("covers every field scanSynthesisAtDelivery covers — M8 and M7, not just M9", () => {
    const synth = {
      module_8_vendor_questions: ["Can you supply the invoices that were corroborated?"],
      module_7_doubt_calibration: { rationale: "Two independent sources were required.", doubt_focus: "" },
    };
    const scanner = scanSynthesisAtDelivery(synth);
    const located = locateSynthesisMethodLeakage(synth);
    expect(scanner.length).toBeGreaterThan(0);
    expect(located).toHaveLength(scanner.length);
    expect(located.map((h) => h.path)).toEqual(expect.arrayContaining(["vendor_questions[0]", "doubt_rationale"]));
  });
});
