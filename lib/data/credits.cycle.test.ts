import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// ── THE WHOLE CYCLE, FIXTURE-LOCKED (item 2c, founder-locked 2026-08-22): buy a top-up, run a
// renewal, prove the purchased credits survive and the plan credits clip. The arithmetic lives
// in SQL (founder-run, as-applied record 20260822300000), so the lock is TWO-LAYER:
//   1. The load-bearing SQL expressions are asserted VERBATIM from the migration record — the
//      record was itself verified against pg_proc.prosrc live, so repo = live = this test.
//   2. The cycle proof below implements EXACTLY those asserted formulas and runs the numbers —
//      if anyone edits the SQL record, layer 1 fails; if anyone edits the simulation, the
//      numbers diverge from the asserted source and review catches it in one hunk.

const MIGRATION = fs
  .readFileSync(path.resolve(__dirname, "../../supabase/migrations/20260822300000_purchased_credits.sql"), "utf8")
  .replace(/\r\n/g, "\n"); // CRLF checkouts must not break the verbatim locks

describe("layer 1 — the as-applied SQL says what the proof simulates", () => {
  it("rollover clips ONLY the plan portion (purchased rides through)", () => {
    expect(MIGRATION).toContain(
      "credits_available = LEAST(credits_available - purchased_credits, p_rollover_cap)",
    );
    expect(MIGRATION).toContain("+ purchased_credits + p_cycle_credits");
  });
  it("consumption is PLAN-FIRST (the deduct clamp)", () => {
    expect(MIGRATION).toContain("purchased_credits = LEAST(purchased_credits, credits_available - p_amount)");
  });
  it("a paid top-up raises balance AND floor together", () => {
    expect(MIGRATION).toContain("credits_available = credits_available + p_amount,\n    purchased_credits = purchased_credits + p_amount");
  });
});

// The asserted formulas, verbatim in TS. SQL UPDATE SET expressions all read OLD values.
type C = { available: number; purchased: number };
const buyTopup = (c: C, n: number): C => ({ available: c.available + n, purchased: c.purchased + n });
const renewal = (c: C, cap: number, cycle: number): C => ({
  available: Math.min(c.available - c.purchased, cap) + c.purchased + cycle,
  purchased: c.purchased,
});
const deduct = (c: C, n: number): C => ({
  available: c.available - n,
  purchased: Math.min(c.purchased, c.available - n),
});

describe("layer 2 — the cycle, with real numbers (Growth: cap 2, +5/cycle)", () => {
  it("buy 3 → renew: the 3 paid credits SURVIVE the clip; plan credits clip to the cap", () => {
    let c: C = { available: 4, purchased: 0 };       // mid-cycle Growth client, 4 plan credits held
    c = buyTopup(c, 3);                              // buys the 3-pack
    expect(c).toEqual({ available: 7, purchased: 3 });
    c = renewal(c, 2, 5);                            // renewal: plan portion 4 clips to 2, +5 cycle
    expect(c).toEqual({ available: 10, purchased: 3 });
    // THE OLD DEFECT, shown dead: the pre-fix formula LEAST(available, cap) + cycle would have
    // produced LEAST(7,2)+5 = 7 — destroying 3 credits the client PAID for. Now: 10, floor intact.
    expect(Math.min(7, 2) + 5).toBe(7); // the money-destroying arithmetic, kept here as the tombstone
  });

  it("consumption burns plan credits first; paid credits burn LAST", () => {
    let c: C = { available: 10, purchased: 3 };
    c = deduct(c, 6);                                // six submissions
    expect(c).toEqual({ available: 4, purchased: 3 }); // plan burned, floor untouched
    c = deduct(c, 2);
    expect(c).toEqual({ available: 2, purchased: 2 }); // plan exhausted — NOW purchased burns
    c = deduct(c, 2);
    expect(c).toEqual({ available: 0, purchased: 0 });
  });

  it("a paid credit held across MULTIPLE renewals never expires", () => {
    let c: C = { available: 0, purchased: 0 };
    c = buyTopup(c, 3);
    c = renewal(c, 2, 5);                            // cycle 1
    c = renewal(c, 2, 5);                            // cycle 2 — untouched plan credits clip each time
    c = renewal(c, 2, 5);                            // cycle 3
    expect(c.purchased).toBe(3);                     // the paid 3 are still there, three renewals later
    expect(c.available).toBe(2 + 3 + 5);             // clipped plan portion + paid floor + fresh cycle
  });

  it("shapes not in the brief: a zero-balance buyer, and a floor at exactly the cap boundary", () => {
    // Fresh top-up on an empty account survives its first renewal whole.
    expect(renewal(buyTopup({ available: 0, purchased: 0 }, 6), 4, 12)).toEqual({ available: 18, purchased: 6 });
    // Plan portion exactly at the cap: nothing clips, nothing is invented.
    expect(renewal({ available: 5, purchased: 3 }, 2, 5)).toEqual({ available: 10, purchased: 3 });
  });
});
