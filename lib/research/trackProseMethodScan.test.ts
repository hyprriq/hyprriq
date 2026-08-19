import { describe, it, expect } from "vitest";
import { scanTrackProseAtDelivery } from "./synthesisMethodScan";

// ── CLASS 4 — THE DERIVATION SCANNER OVER TRACK PROSE (founder-ruled 2026-08-18).
//
// The hole it closes: the language scanner covered BOTH client-facing prose surfaces, this one
// covered only synthesis. `weight[_\s]?key` was already in METHOD_PATTERNS — nothing ever looked
// at track findings, so 9 occurrences across 6 cases have been passing the publish gate.
//
// STANDING RULE: fixtures must cover shapes the author did NOT have in mind. The corpus sentence
// is only the first block below; the rest are the spellings, positions and containers that the
// corpus does not happen to contain today but which the same engine can emit tomorrow.

const row = (cf: unknown, q: unknown = null) => [
  { track_key: "supplier_identity", compiled_findings_json: cf, questions_to_ask: q },
];

describe("Class 4 — it now sees track prose at all (the coverage, on the real corpus sentence)", () => {
  it("blocks the AWI-2606-009 sentence, verbatim", () => {
    const v = scanTrackProseAtDelivery(row({
      summary: "Domain age could not be directly assessed from the pack (no WHOIS data provided), but the company's 30+ year history and NYSE listing strongly imply the domain is well over 5 years old — however, no weight_key for domain age is proposed without evidence.",
    }));
    expect(v.join(" ")).toMatch(/firewall vocabulary/);
  });
});

describe("Class 4 — spellings and positions the corpus does NOT contain today", () => {
  const shapes: [string, string][] = [
    ["spaced spelling", "The weight key for domain age was not applied."],
    ["capitalised, sentence-initial", "Weight_key selection is deferred until evidence arrives."],
    ["inside a nested object", "nested"],
    ["gate name in track prose", "The provenance gate did not clear this supplier."],
    ["threshold voice in track prose", "This was confirmed by two independent sources."],
    ["hard-fail vocabulary", "The record hit a hard_fail on registry lookup."],
    ["validation layer", "The validation layer version was not recorded for this row."],
  ];

  for (const [label, text] of shapes) {
    it(`blocks: ${label}`, () => {
      const cf = label === "inside a nested object"
        ? { detail: { nested: { deeper: "A weight_key was assigned to the wrong track." } } }
        : { summary: text };
      expect(scanTrackProseAtDelivery(row(cf)).length).toBeGreaterThan(0);
    });
  }

  it("blocks it in questions_to_ask, not only in findings", () => {
    expect(scanTrackProseAtDelivery(row(null, ["Can you confirm the weight_key we applied?"])).length)
      .toBeGreaterThan(0);
  });
});

// ── CLOSED 2026-08-19 BY FOUNDER RULING. This fixture set found that `weight[_s]?key` did not
// match the PLURAL, so the token-leak sweep (which counts `keys?`) and the GATE were counting
// different things — AWI-2607-030 carries "tied to the relevant blocking weight keys". The rule now
// carries `s?`. One instrument, one number.
describe("the PLURAL is matched — founder-ruled 2026-08-19, the sweep and the gate now agree", () => {
  it("blocks 'weight keys' (plural), which slipped past weight[_\s]?key\b", () => {
    expect(scanTrackProseAtDelivery(row({ summary: "Several weight keys were left unset for this brand." })).length)
      .toBeGreaterThan(0);
  });
});

// ── THE OTHER SIDE. Two-sided fixtures are mandatory: a scanner that only proves it blocks is
// half-tested, and a false refusal at publish is the failure mode this codebase has ruled against
// twice. These must all PASS the gate.
describe("Class 4 — honest prose still publishes", () => {
  const clean = [
    "The registry filing confirms the entity is active in Delaware.",
    "We could not independently verify the authorisation for this brand.",
    "The domain has been registered for more than five years.",
    // Named attribution passes — the ruled carve-out, and it must survive on this surface too.
    "The address is corroborated by the FDA, BBB, and LinkedIn.",
    // Ordinary use of the word "weight" with no internal machinery behind it.
    "The shipment weight was not stated on the invoice.",
    "Primary sources were given more weight than forum posts.",
  ];

  for (const text of clean) {
    it(`passes: ${text.slice(0, 52)}…`, () => {
      expect(scanTrackProseAtDelivery(row({ summary: text }))).toEqual([]);
    });
  }
});

// ⚠ SURFACE LOCK. The scan reads the ALLOWLIST projection — the fields that actually cross to a
// client — not the whole raw row. Raw carries internal machinery whose values legitimately contain
// this vocabulary and never reach anybody; scanning it wholesale would manufacture false blocks.
describe("Class 4 — internal machinery that never crosses must NOT block a publish", () => {
  it("ignores non-allowlisted fields even when they are full of method vocabulary", () => {
    const v = scanTrackProseAtDelivery(row({
      summary: "The registry filing confirms the entity.",
      weight_validation: { note: "weight_key brand_enforcement_signals failed the provenance gate" },
      evidence_weights_applied: [{ weight_key: "domain_age", points: 2 }],
      manual_notes: "Operator: corroborated by two independent sources.",
    }));
    expect(v).toEqual([]);
  });
});
