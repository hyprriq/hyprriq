// ── PERMISSION HIERARCHY (2026-08-02) — the CONTAINMENT-RULE PROOF the founder ordered.
// (a) never grant a capability you do not hold; (b) never grant the granting power itself.
// Without both, any admin reaches full access in two moves — these tests close both moves. ──
import { describe, it, expect } from "vitest";
import { grantableBy, rolesCreatableBy, fullGrantBy } from "./grants";
import { GRANTABLE_CAPABILITIES, SUPER_ADMIN_ONLY_CAPS, CAPABILITIES } from "./capabilities";
import type { Operator } from "./permissions";

const superAdmin: Pick<Operator, "role" | "capabilities"> = { role: "super_admin", capabilities: CAPABILITIES };
const adminNarrow: Pick<Operator, "role" | "capabilities"> = { role: "admin", capabilities: ["view_cases", "review_publish"] };
const staff: Pick<Operator, "role" | "capabilities"> = { role: "sub_user", capabilities: ["view_cases"] };

describe("containment rule (a) — never grant a capability you do not hold", () => {
  it("an admin holding [view_cases, review_publish] granting a wider list gets ONLY the intersection", () => {
    expect(grantableBy(adminNarrow, ["view_cases", "run_case", "rerun", "review_publish"]))
      .toEqual(["view_cases", "review_publish"]);
  });

  it("full-access preset from a narrow admin is still subset-of-own", () => {
    expect(fullGrantBy(adminNarrow)).toEqual(["view_cases", "review_publish"]);
  });

  it("super admin grants any day-to-day capability (holds everything by role)", () => {
    expect(fullGrantBy(superAdmin)).toEqual([...GRANTABLE_CAPABILITIES]);
  });
});

describe("containment rule (b) — the granting power is never grantable", () => {
  it("no capability STRING confers user management — unknown/forged strings drop silently", () => {
    expect(grantableBy(superAdmin, ["manage_users", "manage_staff", "admin", "super_admin"])).toEqual([]);
  });

  it("only super_admin mints admins; admins mint only sub_user; staff mint nothing", () => {
    expect(rolesCreatableBy(superAdmin)).toEqual(["admin", "sub_user"]);
    expect(rolesCreatableBy(adminNarrow)).toEqual(["sub_user"]);
    expect(rolesCreatableBy(staff)).toEqual([]);
  });
});

describe("super-admin-only capabilities — money and the scope-breaker stay at the top", () => {
  it("adjust_credits and view_all_clients are grantable by NOBODY, super admin included", () => {
    for (const grantor of [superAdmin, adminNarrow, staff]) {
      expect(grantableBy(grantor, [...SUPER_ADMIN_ONLY_CAPS])).toEqual([]);
    }
  });

  it("the FULL_ACCESS preset no longer contains the super-only pair", () => {
    for (const cap of SUPER_ADMIN_ONLY_CAPS) {
      expect(GRANTABLE_CAPABILITIES).not.toContain(cap);
    }
  });
});

describe("the two-move escalation is closed end to end", () => {
  it("no sequence of grants starting from an admin ever yields admin-minting or super-only caps", () => {
    // Move 1: the admin creates staff — role forced by rolesCreatableBy, caps by grantableBy.
    const roles = rolesCreatableBy(adminNarrow);
    expect(roles).not.toContain("admin");
    const staffCaps = grantableBy(adminNarrow, [...CAPABILITIES]);
    // Move 2: nothing the minted staff holds can mint anyone or hold super-only power.
    const minted: Pick<Operator, "role" | "capabilities"> = { role: "sub_user", capabilities: staffCaps };
    expect(rolesCreatableBy(minted)).toEqual([]);
    for (const cap of SUPER_ADMIN_ONLY_CAPS) expect(staffCaps).not.toContain(cap);
    expect(staffCaps.every((c) => adminNarrow.capabilities.includes(c))).toBe(true);
  });
});
