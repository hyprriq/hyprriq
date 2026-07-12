import { describe, it, expect } from "vitest";
import { MAX_CASE_DOCUMENTS, FILE_LIMIT_MESSAGE, fileCountError } from "./uploads";

// Founder-ruled (2026-07-12): five is ONE flat constant, every tier; a silent backend guardrail,
// not a portal feature — the limit surfaces only when a sixth file is attempted, quietly.
describe("case-document upload cap", () => {
  it("five is the flat cap, one constant, shared by the form and the route", () => {
    expect(MAX_CASE_DOCUMENTS).toBe(5);
  });
  it("a sixth file is rejected with the quiet message; five is not", () => {
    expect(fileCountError(5)).toBeNull();
    expect(fileCountError(6)).toBe(FILE_LIMIT_MESSAGE);
    expect(FILE_LIMIT_MESSAGE).toMatch(/maximum 5 files/i);
    expect(FILE_LIMIT_MESSAGE).toMatch(/contact support/i);
  });
});
