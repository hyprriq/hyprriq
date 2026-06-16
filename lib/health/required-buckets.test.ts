import { describe, it, expect } from "vitest";
import { REQUIRED_BUCKETS, missingBuckets } from "./required-buckets";

// Pure logic backing the /api/health DB+storage check: given the bucket
// names Supabase actually reports, which required buckets are absent?
describe("missingBuckets", () => {
  it("reports both required buckets missing when none exist", () => {
    expect(missingBuckets([])).toEqual([...REQUIRED_BUCKETS]);
  });

  it("reports nothing missing when both required buckets exist", () => {
    expect(missingBuckets(["case-documents", "reports"])).toEqual([]);
  });

  it("reports only the missing one when one of two exists", () => {
    expect(missingBuckets(["case-documents"])).toEqual(["reports"]);
  });

  it("ignores extra unrelated buckets", () => {
    expect(missingBuckets(["case-documents", "reports", "avatars"])).toEqual([]);
  });
});
