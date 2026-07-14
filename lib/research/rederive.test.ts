import { describe, it, expect } from "vitest";
import { rederiveStoredSignal } from "./rederive";
import type { EvidenceItem } from "./contracts";

// ── Sweep fix F4 (founder-approved 2026-07-14) — ONE composition for re-deriving a STORED track
// signal from frozen evidence_items: dedupe → deriveTrackSignal → applySourceDiversityCap.
// The proof layer (rejudge-case.ts, the dispute stability lock) previously re-derived WITHOUT the
// cap and diverged from what pipeline + admin store — the determinism proof false-failed on any
// capped track. The shared helper is the H3 shared-ceiling-fn medicine: one source of truth,
// composing the frozen fns byte-identically. ──
const item = (id: string, key: string, url: string): EvidenceItem => ({
  evidence_id: id, weight_key: key, statement: "", certainty: "verified", source_type: "government_record",
  source_url: url, claimant: "independent_registry", claimant_benefits: false, supports: "supplier_identity",
});

describe("rederiveStoredSignal (the shared proof-layer composition)", () => {
  it("applies the source-diversity cap exactly like the pipeline: single-source pass → infer", () => {
    // gov(4) + domain5(3) + address(2) = 9 ≥ 8 → pass by score — but ONE real source (the H7 SO-3 seam).
    const items = [
      item("e1", "government_registration", "https://www.reg.gov/x/"),
      item("e2", "domain_age_5_plus", "http://reg.gov/x"),
      item("e3", "address_verifiable", "https://reg.gov/x?utm_source=a"),
    ];
    expect(rederiveStoredSignal("supplier_identity", items)).toBe("infer");
  });

  it("a genuinely multi-source pass stands", () => {
    const items = [
      item("e1", "government_registration", "https://reg.gov/x"),
      item("e2", "domain_age_5_plus", "https://whois.example/y"),
      item("e3", "address_verifiable", "https://maps.example/z"),
    ];
    expect(rederiveStoredSignal("supplier_identity", items)).toBe("pass");
  });

  it("dedupes evidence keys before scoring (anti-double-count, same as the pipeline)", () => {
    const items = [
      item("e1", "government_registration", "https://reg.gov/x"),
      item("e2", "government_registration", "https://other.example/y"), // same key twice — scores ONCE (4 < 8)
    ];
    expect(rederiveStoredSignal("supplier_identity", items)).not.toBe("pass");
  });

  it("empty evidence set → the empty-set floor (soft_fail), unchanged semantics", () => {
    expect(rederiveStoredSignal("supplier_identity", [])).toBe("soft_fail");
  });
});
