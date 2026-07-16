import { describe, it, expect } from "vitest";
import { resolveRejudgeAttempt, rejudgeSummary } from "./rejudgeReport";

// ── AT-S0-2 defect pair (founder-caught 2026-07-16): rejudge-case.ts rejudged the LATEST attempt
// by default and printed the FULL "PASS — the stored record fully determines the verdict." line
// even when the verdict comparison was SKIPPED (rejudged attempt ≠ delivered attempt). The claim
// outran the artifact — the same class this gate has caught four times. These tests encode the
// corrected behavior; the AWI-2607-021 shape (9 attempts, delivered 6) is the named fixture. ──

describe("resolveRejudgeAttempt — DEFECT 2: the default targets the DELIVERED attempt", () => {
  it("delivered case, no explicit arg → the DELIVERED attempt (the only one cases.verdict belongs to)", () => {
    const r = resolveRejudgeAttempt({ requested: null, deliveredAttempt: 6, latestAttempt: 9 }); // AWI-2607-021 shape
    expect(r.attempt).toBe(6);
    expect(r.basis).toBe("delivered_default");
  });
  it("non-delivered case, no explicit arg → the latest attempt (unchanged semantics)", () => {
    const r = resolveRejudgeAttempt({ requested: null, deliveredAttempt: null, latestAttempt: 3 });
    expect(r.attempt).toBe(3);
    expect(r.basis).toBe("latest_default");
  });
  it("an explicit attempt argument always wins — latest-attempt rejudging stays available, explicitly", () => {
    const r = resolveRejudgeAttempt({ requested: 9, deliveredAttempt: 6, latestAttempt: 9 });
    expect(r.attempt).toBe(9);
    expect(r.basis).toBe("explicit");
  });
});

describe("rejudgeSummary — DEFECT 1: a skipped comparison must NEVER print the full PASS", () => {
  const base = { mismatches: 0, storedVerdict: "usable_with_conditions", rejudgedVerdict: "usable_with_conditions" };

  it("THE OLD BUG, encoded: attempt 9 rejudged on a case delivered at 6 → TRACKS-ONLY, exit 2, never the full claim", () => {
    const s = rejudgeSummary({ ...base, attempt: 9, deliveredAttempt: 6, rejudgedVerdict: "verify_before_purchase" });
    expect(s.outcome).toBe("tracks_only");
    expect(s.exitCode).toBe(2);
    expect(s.line).toContain("SKIPPED");
    expect(s.line).toContain("attempt 9");
    expect(s.line).toContain("delivered attempt 6");
    expect(s.line).not.toContain("fully determines"); // the full property was NOT tested — the claim may not print
  });

  it("comparison RAN and matched → the full PASS, exit 0", () => {
    const s = rejudgeSummary({ ...base, attempt: 6, deliveredAttempt: 6 });
    expect(s.outcome).toBe("pass");
    expect(s.exitCode).toBe(0);
    expect(s.line).toContain("PASS — the stored record fully determines the verdict.");
  });

  it("non-delivered case: latest-attempt comparison is meaningful (cases.verdict tracks latest) → full PASS allowed", () => {
    const s = rejudgeSummary({ ...base, attempt: 3, deliveredAttempt: null });
    expect(s.outcome).toBe("pass");
    expect(s.exitCode).toBe(0);
  });

  it("verdict mismatch on the delivered attempt → FAIL, exit 1", () => {
    const s = rejudgeSummary({ ...base, attempt: 6, deliveredAttempt: 6, rejudgedVerdict: "do_not_rely" });
    expect(s.outcome).toBe("fail");
    expect(s.exitCode).toBe(1);
    expect(s.line).toContain("verdict mismatch");
  });

  it("track mismatches FAIL regardless of comparison skipping (a signal mismatch is real on any attempt)", () => {
    const s = rejudgeSummary({ ...base, mismatches: 2, attempt: 9, deliveredAttempt: 6 });
    expect(s.outcome).toBe("fail");
    expect(s.exitCode).toBe(1);
    expect(s.line).toContain("2 signal mismatch(es)");
  });
});
