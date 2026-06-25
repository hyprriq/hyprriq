import { describe, it, expect } from "vitest";
import { computeEvidenceHash } from "./normalize";
import type { NormalizedEvidenceItem } from "@/lib/research/contracts";

const item = (id: string): NormalizedEvidenceItem => ({
  evidence_id: id, statement: "s", certainty: "verified", source_type: "third_party",
  source_url: null, claimant: "third_party", claimant_benefits: false, supports: "x",
  source_track: "supplier_identity",
});

describe("computeEvidenceHash", () => {
  it("same evidence → same hash (deterministic)", () => {
    expect(computeEvidenceHash([item("a"), item("b")])).toBe(computeEvidenceHash([item("a"), item("b")]));
  });
  it("order-independent", () => {
    expect(computeEvidenceHash([item("a"), item("b")])).toBe(computeEvidenceHash([item("b"), item("a")]));
  });
  it("different evidence → different hash", () => {
    expect(computeEvidenceHash([item("a")])).not.toBe(computeEvidenceHash([item("a"), item("b")]));
  });
});
