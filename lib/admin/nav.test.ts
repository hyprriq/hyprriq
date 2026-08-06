// ── OPERATOR-AWARE NAV (2026-08-02) — the founder-ordered verification: super_admin sees the
// full nav; a scoped sub_user sees a filtered nav with no Users and no Revenue. Rules consume
// the SAME can()/canManageUsers() the API gates use — asserted by behavior here. ──
import { describe, it, expect } from "vitest";
import { navFor } from "./nav";
import type { Operator } from "@/lib/auth/permissions";
import { CAPABILITIES } from "@/lib/auth/capabilities";

const keys = (op: Parameters<typeof navFor>[0]) => navFor(op).flatMap((g) => g.items.map((i) => i.key));

const superAdmin: Operator = { user_id: "sa", role: "super_admin", capabilities: CAPABILITIES };
const scopedStaff: Operator = { user_id: "s1", role: "sub_user", capabilities: ["view_cases", "adjust_credits"] };
const minimalStaff: Operator = { user_id: "s2", role: "sub_user", capabilities: [] };
const legacyFounder: Operator = { user_id: "f1", role: "super_admin", capabilities: CAPABILITIES, transitional: true };

describe("navFor — ruled visibility, absent not disabled", () => {
  it("super_admin sees the FULL nav (all 12 items)", () => {
    expect(keys(superAdmin)).toEqual([
      "dashboard", "review", "delivered", "all", "run",
      "clients", "support", "outcomes", "users",
      "revenue", "prompts", "settings",
    ]);
  });

  it("a scoped sub_user (view_cases + adjust_credits) gets case views + support but NO Users, NO Revenue, NO Run", () => {
    const k = keys(scopedStaff);
    expect(k).toContain("review");
    expect(k).toContain("all");
    expect(k).toContain("support");   // view_cases class
    expect(k).toContain("clients");   // always (scope filters the contents)
    expect(k).not.toContain("users");   // super_admin only — never grantable
    expect(k).not.toContain("revenue"); // needs view_billing
    expect(k).not.toContain("run");     // needs run_case
  });

  it("a capability-less sub_user still gets the always-on items and nothing gated", () => {
    expect(keys(minimalStaff)).toEqual(["dashboard", "clients", "outcomes", "prompts", "settings"]);
  });

  it("emptied groups are dropped, not rendered as bare section headers", () => {
    const sections = navFor(minimalStaff).map((g) => g.section);
    expect(sections).not.toContain("Cases"); // all four Cases items are gated away
  });

  it("legacy transitional founder = full nav (pre-partitioning behavior preserved)", () => {
    expect(keys(legacyFounder)).toEqual(keys(superAdmin));
  });
});
