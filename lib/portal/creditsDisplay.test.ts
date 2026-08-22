// â”€â”€ BUG-2 â€” the credits framing can never say "7 of 5" or overflow the bar. â”€â”€
import { describe, it, expect } from "vitest";
import { creditsView } from "./creditsDisplay";

describe("creditsView â€” honest credits framing (BUG-2)", () => {
  it("the live bug case: 7 credits on a 5/cycle plan â€” no '7 of 5', bar capped at 100", () => {
    const v = creditsView(7, "growth_279");
    expect(v.headline).toBe("7 credits available");
    expect(v.detail).toContain("renews to 5/cycle");
    expect(v.detail).toContain("2 extra");
    expect(v.pct).toBe(100);
    expect(v.headline + (v.detail ?? "")).not.toMatch(/7 of 5/);
  });

  it("under the allotment with real usage: usage from the USED COLUMN, never inferred", () => {
    const v = creditsView(3, "growth_279", 2);
    expect(v.headline).toBe("3 credits available");
    expect(v.detail).toBe("plan adds 5 at renewal · 2 used this cycle");
    expect(v.pct).toBe(60);
    expect(v.extra).toBe(0);
  });

  it("THE POST-UPGRADE CASE (founder-ruled): 7 on a fresh 12/cycle plan, 0 used â€” never implies 5 consumed", () => {
    const v = creditsView(7, "scale_499", 0);
    expect(v.detail).toBe("plan adds 12 at renewal");
    const all = v.headline + v.detail;
    expect(all).not.toMatch(/of 12/);      // the consumed-implying framing is gone
    expect(all).not.toMatch(/used/);       // zero usage shows no usage claim at all
  });

  it("post-upgrade WITH prior usage: every number independently true (7 avail · 12/cycle · 3 used)", () => {
    const v = creditsView(7, "scale_499", 3);
    expect(v.detail).toBe("plan adds 12 at renewal · 3 used this cycle");
  });

  it("exactly at the allotment: full bar, no phantom extra", () => {
    const v = creditsView(12, "scale_499");
    expect(v.pct).toBe(100);
    expect(v.extra).toBe(0);
    expect(v.detail).toBe("plan adds 12 at renewal");
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

  // Item 2 (founder-ruled 2026-08-22): top-ups aren't for sale, and "carry until used" was false
  // above the rollover cap — the extra line states only what is independently true.
  it("the extra line never mentions top-ups or promises credits carry until used", () => {
    const v = creditsView(7, "growth_279", 1);
    expect(v.detail).toBe("plan renews to 5/cycle · includes 2 extra · 1 used this cycle");
    expect(v.detail).not.toMatch(/top.?up/i);
    expect(v.detail).not.toContain("carry until used");
  });
});

