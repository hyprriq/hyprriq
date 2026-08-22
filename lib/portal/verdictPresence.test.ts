import { describe, it, expect } from "vitest";
import { presentVerdict, requireVerdict, VerdictAbsentError } from "./verdictPresence";
import { VERDICT_SCALE_ORDER } from "@/lib/content/reportCopy";

// ── ABSENCE IS NOT A VALUE (founder-locked 2026-08-22). These fixtures pin the ONE presence
// notion every render surface reads. Deliberately covered beyond the brief: display names,
// casing, whitespace, the honest non-verdict words, and prototype-chain keys (the shape that
// caught a real hole in the money-path helpers last session).

describe("presentVerdict", () => {
  it("every canonical verdict passes through, typed", () => {
    for (const v of VERDICT_SCALE_ORDER) expect(presentVerdict(v)).toBe(v);
  });

  it("null, undefined, and empty are absent", () => {
    expect(presentVerdict(null)).toBeNull();
    expect(presentVerdict(undefined)).toBeNull();
    expect(presentVerdict("")).toBeNull();
  });

  it("unrecognized strings are absent too — a meta lookup must never half-render", () => {
    for (const bad of [
      "pending",                 // an honest STATUS word, but not a verdict
      "Source Clear",            // display name, not the key
      "SOURCE_CLEAR",            // casing
      " source_clear",           // whitespace — the column would never hold this legitimately
      "source_clear ",
      "verify",                  // truncation
      "approved",
      "toString",                // prototype-chain key
      "constructor",
    ]) {
      expect(presentVerdict(bad), JSON.stringify(bad)).toBeNull();
    }
  });

  it("derives from VERDICT_SCALE_ORDER — the canonical four, no private list", () => {
    expect(VERDICT_SCALE_ORDER).toEqual(["source_clear", "usable_with_conditions", "verify_before_purchase", "do_not_rely"]);
  });
});

describe("requireVerdict — the throwing form", () => {
  it("returns the typed verdict when present", () => {
    expect(requireVerdict("do_not_rely", { caseRef: "AWI-1", surface: "test" })).toBe("do_not_rely");
  });

  it("throws VerdictAbsentError naming the case, the surface, and the raw value", () => {
    try {
      requireVerdict(null, { caseRef: "AWI-2608-099", surface: "report_view" });
      expect.unreachable("must throw");
    } catch (e) {
      expect(e).toBeInstanceOf(VerdictAbsentError);
      const err = e as VerdictAbsentError;
      expect(err.caseRef).toBe("AWI-2608-099");
      expect(err.surface).toBe("report_view");
      expect(err.message).toContain("AWI-2608-099");
      expect(err.message).toContain("report_view");
      expect(err.message).toContain("never issued");
    }
  });

  it("NEVER resolves absence to a verdict — the fabrication this module exists to kill", () => {
    for (const absent of [null, undefined, "", "pending", "garbage"]) {
      expect(() => requireVerdict(absent, { caseRef: "x", surface: "s" })).toThrow(VerdictAbsentError);
    }
  });
});
