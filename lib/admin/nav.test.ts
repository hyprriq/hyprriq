// ── OPERATOR-AWARE NAV (2026-08-02, hierarchy update) — super_admin sees the full nav; admins
// see Users (staff management) without super-only sections; scoped staff see a filtered nav
// with no Users and no Revenue. Rules consume the SAME can()/canManageUsers()/canManageStaff()
// the API gates use — asserted by behavior here. ──
import { describe, it, expect } from "vitest";
import { navFor } from "./nav";
import type { Operator } from "@/lib/auth/permissions";
import { CAPABILITIES } from "@/lib/auth/capabilities";

const keys = (op: Parameters<typeof navFor>[0]) => navFor(op).flatMap((g) => g.items.map((i) => i.key));

const superAdmin: Operator = { user_id: "sa", role: "super_admin", capabilities: CAPABILITIES };
const adminMid: Operator = { user_id: "a1", role: "admin", capabilities: ["view_cases", "run_case", "review_publish"] };
const scopedStaff: Operator = { user_id: "s1", role: "sub_user", capabilities: ["view_cases"] };
const minimalStaff: Operator = { user_id: "s2", role: "sub_user", capabilities: [] };
const legacyFounder: Operator = { user_id: "f1", role: "super_admin", capabilities: CAPABILITIES, transitional: true };

describe("navFor — ruled visibility, absent not disabled", () => {
  it("super_admin sees the FULL nav (all 19 items — Design system added 2026-08-24)", () => {
    expect(keys(superAdmin)).toEqual([
      "dashboard", "review", "delivered", "all", "run",
      "clients", "billing", "support", "outcomes", "users",
      "suppliers", "brands",
      "acquisition", "bulk",
      "revenue", "integrity", "prompts", "design", "settings",
    ]);
  });

  it("an ADMIN (staff manager) gets Users + their capability items, but never Acquisition or Revenue-without-billing", () => {
    const k = keys(adminMid);
    expect(k).toContain("users");        // staffManager — admins manage staff
    expect(k).toContain("run");          // holds run_case
    expect(k).toContain("bulk");         // run_case-gated shell
    expect(k).not.toContain("acquisition"); // super-admin only (money-adjacent)
    expect(k).not.toContain("revenue");     // needs view_billing
  });

  it("a scoped sub_user (view_cases) gets case views + support + DBs but NO Users, NO Revenue, NO Run", () => {
    const k = keys(scopedStaff);
    expect(k).toContain("review");
    expect(k).toContain("all");
    expect(k).toContain("support");
    expect(k).toContain("suppliers");
    expect(k).toContain("brands");
    expect(k).toContain("clients");
    expect(k).not.toContain("users");
    expect(k).not.toContain("revenue");
    expect(k).not.toContain("run");
    expect(k).not.toContain("acquisition");
    expect(k).not.toContain("bulk");
  });

  it("a capability-less sub_user gets only the always-on items; emptied sections drop", () => {
    expect(keys(minimalStaff)).toEqual(["dashboard", "clients", "outcomes", "integrity", "prompts", "design", "settings"]);
    const sections = navFor(minimalStaff).map((g) => g.section);
    expect(sections).not.toContain("Cases");
    expect(sections).not.toContain("Intelligence");
    expect(sections).not.toContain("Growth");
  });

  it("legacy transitional founder = full nav (pre-partitioning behavior preserved)", () => {
    expect(keys(legacyFounder)).toEqual(keys(superAdmin));
  });
});
