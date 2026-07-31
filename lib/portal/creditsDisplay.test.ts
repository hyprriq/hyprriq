// ── BUG-2 — the credits framing can never say "7 of 5" or overflow the bar. ──
import { describe, it, expect } from "vitest";
import { creditsView } from "./creditsDisplay";

describe("creditsView — honest credits framing (BUG-2)", () => {
  it("the live bug case: 7 credits on a 5/cycle plan — no '7 of 5', bar capped at 100", () => {
    const v = creditsView(7, "growth_279");
    expect(v.headline).toBe("7 credits available");
    expect(v.detail).toContain("renews to 5/cycle");
    expect(v.detail).toContain("2 extra");
    expect(v.pct).toBe(100);
    expect(v.headline + (v.detail ?? "")).not.toMatch(/7 of 5/);
  });

  it("under the allotment: plain 'of N per cycle' framing", () => {
    const v = creditsView(3, "growth_279");
    expect(v.headline).toBe("3 credits available");
    expect(v.detail).toBe("of 5 included per cycle");
    expect(v.pct).toBe(60);
    expect(v.extra).toBe(0);
  });

  it("exactly at the allotment: full bar, no phantom extra", () => {
    const v = creditsView(12, "scale_499");
    expect(v.pct).toBe(100);
    expect(v.extra).toBe(0);
    expect(v.detail).toBe("of 12 included per cycle");
  });

  it("zero credits: honest zero, empty bar", () => {
    const v = creditsView(0, "growth_279");
    expect(v.headline).toBe("0 credits available");
    expect(v.pct).toBe(0);
  });

  it("singular credit reads as 'credit'", () => {
    expect(creditsView(1, "single_99").headline).toBe("1 credit available");
  });

  it("no plan: headline only, no per-cycle claim", () => {
    const v = creditsView(2, null);
    expect(v.detail).toBeNull();
    expect(v.pct).toBe(0);
  });

  it("bar never exceeds 100 for any balance", () => {
    for (const n of [6, 10, 50, 999]) expect(creditsView(n, "growth_279").pct).toBe(100);
  });
});
