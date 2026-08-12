import { describe, it, expect } from "vitest";
import * as plans from "./plans";

// ── SLA RULING LOCK (founder-ruled 2026-08-12, both rulings): the case SLA is 24 hours, ONE
// constant, and since the same-day COPY RULING it is also the client-facing promise —
// PLAN_SLA_DAYS retired, no per-plan variation, no other duration source may exist. ──
describe("SLA ruling lock (2026-08-12)", () => {
  it("CASE_SLA_HOURS is 24 — the founder-ruled deadline AND the client promise", () => {
    expect(plans.CASE_SLA_HOURS).toBe(24);
  });

  it("DELIVERY_SLA_HOURS is retired — one SLA source only", () => {
    expect("DELIVERY_SLA_HOURS" in plans).toBe(false);
  });

  it("PLAN_SLA_DAYS is retired (copy ruling 2026-08-12) — no per-plan delivery times survive", () => {
    expect("PLAN_SLA_DAYS" in plans).toBe(false);
  });
});
