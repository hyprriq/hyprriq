import { describe, it, expect } from "vitest";
import * as plans from "./plans";

// ── SLA RULING LOCK (founder-ruled 2026-08-12): the operational case SLA is 24 hours, one
// constant. PLAN_SLA_DAYS (client-facing est-completion copy) is deliberately separate and
// pends its own copy ruling — locked here so neither drifts silently. ──
describe("SLA ruling lock (2026-08-12)", () => {
  it("CASE_SLA_HOURS is 24 — the founder-ruled operational deadline", () => {
    expect(plans.CASE_SLA_HOURS).toBe(24);
  });

  it("DELIVERY_SLA_HOURS is retired — one SLA source only", () => {
    expect("DELIVERY_SLA_HOURS" in plans).toBe(false);
  });

  it("PLAN_SLA_DAYS is untouched (separate client-copy ruling): 5/5/5/3", () => {
    expect(plans.PLAN_SLA_DAYS).toEqual({ single_99: 5, single_149: 5, growth_279: 5, scale_499: 3 });
  });
});
