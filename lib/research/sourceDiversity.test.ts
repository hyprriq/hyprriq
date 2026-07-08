import { it, expect, describe } from "vitest";
import { applySourceDiversityCap } from "./sourceDiversity";

const item = (url: string | null) => ({ source_url: url });

describe("applySourceDiversityCap (H7 SO-3 — pass requires multiple independent sources)", () => {
  it("caps pass → infer when applied evidence cites <2 distinct canonical sources", () => {
    const r = applySourceDiversityCap("pass", [
      item("https://www.reg.gov/x"), item("http://reg.gov/x/"), item("https://reg.gov/x?utm_source=a"),
    ]);
    expect(r).toMatchObject({ signal: "infer", capped: true, distinct_sources: 1 });
    expect(r.cap_reason).toMatch(/distinct/);
  });
  it("pass with ≥2 distinct sources stands", () => {
    const r = applySourceDiversityCap("pass", [item("https://a.com/1"), item("https://b.com/2")]);
    expect(r).toMatchObject({ signal: "pass", capped: false, cap_reason: null, distinct_sources: 2 });
  });
  it("only pass is ever touched — every other signal passes through untouched", () => {
    for (const s of ["hard_fail", "flag", "infer", "soft_fail", "n_a"] as const) {
      const r = applySourceDiversityCap(s, [item("https://a.com/1")]);
      expect(r.signal).toBe(s);
      expect(r.capped).toBe(false);
    }
  });
  it("a pass built purely on inference (no URLs) caps — conservative edge", () => {
    expect(applySourceDiversityCap("pass", [item(null)]).signal).toBe("infer");
    expect(applySourceDiversityCap("pass", []).signal).toBe("infer");
  });
});
