import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { PLANS_ON_SALE, PLAN_TYPES, TOPUPS_ON_SALE, KEEPA_LIVE, planOnSale } from "./plans";
import { subscriptionPlans, oneTimePlans } from "@/lib/content/pricing";

// ── SALE RULING LOCK (founder-locked 2026-08-22, money-surfaces ruling) ──────────────────────
// What is sellable is ONE constant, and this file is what makes that a fact: the ruling itself
// is pinned (an edit here is a deliberate re-ruling, not drift), the Keepa dependency is
// DERIVED from the engine source rather than hand-copied, and the pricing cards' coming-soon
// flags are proven to derive from the registry rather than a second list.

describe("PLANS_ON_SALE — the one sellability source", () => {
  it("pins the ruling: single_99 and growth_279, nothing else", () => {
    expect([...PLANS_ON_SALE]).toEqual(["single_99", "growth_279"]);
  });

  it("is a subset of the plan registry and never empty", () => {
    expect(PLANS_ON_SALE.length).toBeGreaterThan(0);
    for (const p of PLANS_ON_SALE) expect(PLAN_TYPES).toContain(p);
  });

  it("THE KEEPA TIE, derived from the engine source: while KEEPA_LIVE is false, no tier that " +
     "runs category compliance may be on sale — a customer must never pay for a section that " +
     "cannot answer its own question", () => {
    const src = fs.readFileSync(path.resolve(__dirname, "../research/categoryStep.ts"), "utf8");
    const m = src.match(/CATEGORY_PLANS = new Set<string>\(\[([^\]]*)\]\)/);
    expect(m, "CATEGORY_PLANS not found in categoryStep.ts — update this lock's derivation").toBeTruthy();
    const categoryPlans = [...m![1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
    expect(categoryPlans.length).toBeGreaterThan(0);
    if (!KEEPA_LIVE) {
      for (const p of categoryPlans) {
        expect(PLANS_ON_SALE as readonly string[], `${p} runs category compliance and Keepa is not live`).not.toContain(p);
      }
    }
  });

  it("pins the top-up ruling: OFF SALE (flips only by ruling, which edits this line too)", () => {
    expect(TOPUPS_ON_SALE).toBe(false);
  });

  it("planOnSale agrees with the list for every registered plan", () => {
    for (const p of PLAN_TYPES) expect(planOnSale(p)).toBe(PLANS_ON_SALE.includes(p));
  });
});

describe("pricing cards derive coming-soon from the registry — never a second list", () => {
  it("every card's comingSoon flag equals NOT on-sale", () => {
    for (const plan of [...subscriptionPlans, ...oneTimePlans]) {
      expect(plan.comingSoon, plan.id).toBe(!PLANS_ON_SALE.includes(plan.id));
    }
  });

  it("no coming-soon card carries the Most-popular chip — you cannot popularize the unbuyable", () => {
    for (const plan of [...subscriptionPlans, ...oneTimePlans]) {
      if (plan.comingSoon) expect(plan.popular, plan.id).toBe(false);
    }
  });
});
