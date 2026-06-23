import { describe, it, expect } from "vitest";
import { runTrack0 } from "./track0";

describe("runTrack0", () => {
  it("normalizes vendor and counts brands, no flags when complete", () => {
    const r = runTrack0({ vendor_name: "Acme LLC", brands_submitted: ["Milwaukee"], has_document: true });
    expect(r.normalized_vendor_name).toBe("acme");
    expect(r.brands_count).toBe(1);
    expect(r.submission_type).toBe("full_review");
    expect(r.intake_flags).toEqual([]);
  });
  it("flags missing brands and document evidence", () => {
    const r = runTrack0({ vendor_name: "Acme LLC", brands_submitted: [], has_document: false });
    expect(r.intake_flags).toContain("no_brands_submitted");
    expect(r.intake_flags).toContain("no_document_evidence");
  });
  it("flags an unusable vendor name and marks brand-only", () => {
    const r = runTrack0({ vendor_name: null, brands_submitted: ["Dewalt"], has_document: true });
    expect(r.intake_flags).toContain("missing_or_unusable_vendor_name");
    expect(r.submission_type).toBe("brand_only_review");
  });
});
