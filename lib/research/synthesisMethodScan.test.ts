import { describe, it, expect } from "vitest";
import { scanForMethodLeakage, scanSynthesisAtDelivery } from "@/lib/research/synthesisMethodScan";

const scan = (s: string) => scanForMethodLeakage({ decision_snapshot: s });

// ── THE FALSE POSITIVE, as an executable test (audit 2026-08-18). AWI-2608-034 — a real client's
// only report — was held from delivery by the corroboration rule firing on a sentence that NAMED
// its three sources. Verbatim from the stored decision_snapshot.leading_interpretation.
const THE_034_SENTENCE =
  "is a verifiably real company with a 27-year-old domain, a confirmed physical address in Andover, New Jersey corroborated by the FDA, BBB, and LinkedIn, and a named owner identified in federal correspondence (E02, E05, A01).";

describe("corroboration rule — names pass, counts do not", () => {
  it("releases the exact sentence that held AWI-2608-034", () => {
    expect(scan(THE_034_SENTENCE)).toEqual([]);
  });

  it("still blocks the threshold voice the rule exists for", () => {
    // Blocked twice over: the carve-out declines to open, AND the source-count pattern fires.
    const v = scan("The address was corroborated by two independent sources before we accepted it.");
    expect(v.join(" | ")).toMatch(/corroboration vocabulary/);
    expect(v.join(" | ")).toMatch(/source-count threshold/);
  });

  it.each([
    ["bare method voice", "The registration was corroborated."],
    ["our threshold", "This did not meet the corroboration threshold."],
    ["the negated method claim", "The relationship could not be corroborated."],
    ["a generic count", "Corroborated by several sources across the record."],
    ["a numeric count", "corroborated by 3 sources"],
  ])("blocks %s", (_label, text) => {
    expect(scan(text).join(" | ")).toMatch(/corroboration vocabulary/);
  });

  it.each([
    ["named agencies", "The address is corroborated by the FDA, BBB, and LinkedIn."],
    ["a single named registry", "The filing is corroborated by the New Jersey Division of Revenue."],
    ["via a named party", "Ownership is corroborated via Dun & Bradstreet."],
  ])("passes %s", (_label, text) => {
    expect(scan(text)).toEqual([]);
  });

  it("a passing match never masks a blocking one in the same string", () => {
    const both = "Corroborated by the FDA. The claim also met our corroboration threshold.";
    expect(scan(both).join(" | ")).toMatch(/corroboration vocabulary/);
  });
});

describe("the rest of the ruled classes are untouched by the carve-out", () => {
  it.each([
    ["gate name", "The provenance gate rejected it.", /gate name/],
    ["firewall vocabulary", "The weight_key was dropped by the firewall.", /firewall vocabulary/],
    ["at-least threshold", "We require at least 2 sources.", /source-count threshold/],
  ])("still blocks %s", (_label, text, expected) => {
    expect(scan(text).join(" | ")).toMatch(expected);
  });

  it("honest uncertainty language still passes — the safe paraphrase is the whole point", () => {
    expect(scan("We could not independently verify the authorisation relationship.")).toEqual([]);
  });
});

describe("scanSynthesisAtDelivery composition", () => {
  it("covers M9, M8 and the M7 rationale, and names the field", () => {
    const v = scanSynthesisAtDelivery({
      module_9_decision_snapshot: { the_real_risk: "The claim rests on our corroboration threshold." },
      module_8_vendor_questions: ["Can you provide documents corroborated by two independent sources?"],
      module_7_doubt_calibration: { rationale: "The consensus gate held.", doubt_focus: "" },
    });
    expect(v.join(" | ")).toMatch(/decision_snapshot\.the_real_risk/);
    expect(v.join(" | ")).toMatch(/vendor_questions\[0\]/);
    expect(v.join(" | ")).toMatch(/doubt_rationale/);
  });

  it("passes a snapshot whose corroboration is attributed to named sources", () => {
    expect(scanSynthesisAtDelivery({
      module_9_decision_snapshot: { leading_interpretation: THE_034_SENTENCE },
      module_8_vendor_questions: [],
      module_7_doubt_calibration: { rationale: "", doubt_focus: "" },
    })).toEqual([]);
  });
});
