import { describe, it, expect } from "vitest";
import { MAX_CASE_DOCUMENTS, FILE_LIMIT_MESSAGE, fileCountError, planAcceptsUploads } from "./uploads";

// Founder-ruled 2026-08-07 (supersedes 2026-07-12's five): TWO is the flat cap on every tier
// that accepts uploads — operational, not a tier differentiator; still a silent guardrail that
// surfaces only when one file too many is attempted, quietly.
describe("case-document upload cap", () => {
  it("two is the flat cap, one constant, shared by the form and the route", () => {
    expect(MAX_CASE_DOCUMENTS).toBe(2);
  });
  it("a third file is rejected with the quiet message; two is not", () => {
    expect(fileCountError(2)).toBeNull();
    expect(fileCountError(3)).toBe(FILE_LIMIT_MESSAGE);
    expect(FILE_LIMIT_MESSAGE).toMatch(/maximum 2 files/i);
    expect(FILE_LIMIT_MESSAGE).toMatch(/contact support/i);
  });
});

// $99 takes no uploads (founder-ruled 2026-08-07) — server-side predicate, the form's disabled
// state is presentation only.
describe("planAcceptsUploads", () => {
  it("single_99 never; every other tier yes; no plan = no", () => {
    expect(planAcceptsUploads("single_99")).toBe(false);
    expect(planAcceptsUploads("single_149")).toBe(true);
    expect(planAcceptsUploads("growth_279")).toBe(true);
    expect(planAcceptsUploads("scale_499")).toBe(true);
    expect(planAcceptsUploads(null)).toBe(false);
  });
});
