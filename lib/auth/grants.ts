// ── PERMISSION HIERARCHY (founder-ruled 2026-08-02) — the STRUCTURAL containment core.
// Super admin creates/removes ADMINS; admins create SUB-USERS (staff) and grant a subset of
// their OWN held capabilities. Two non-negotiable containment rules live HERE, as pure code
// every grant path must pass through (users API, invitations API):
//   (a) NEVER grant a capability you do not hold — grantableBy intersects with the grantor's
//       own capabilities (super_admin holds everything by role).
//   (b) NEVER grant the granting power itself — user management is a ROLE, not a capability
//       (no capability string can confer it), and rolesCreatableBy lets only super_admin mint
//       'admin'; admins mint only 'sub_user'; the invitation claim path mints only 'sub_user'.
// Additionally, SUPER_ADMIN_ONLY_CAPS (money + scope-breaker) are grantable by NOBODY — they
// are exercised through the super_admin role alone. Without (a)+(b) any admin reaches full
// access in two moves; with them, escalation has no path. Proven in grants.test.ts.

import { CAPABILITIES, GRANTABLE_CAPABILITIES, SUPER_ADMIN_ONLY_CAPS, type Capability } from "@/lib/auth/capabilities";
import type { Operator } from "@/lib/auth/permissions";

export type GrantableRole = "admin" | "sub_user";

export function rolesCreatableBy(grantor: Pick<Operator, "role">): GrantableRole[] {
  if (grantor.role === "super_admin") return ["admin", "sub_user"];
  if (grantor.role === "admin") return ["sub_user"];
  return []; // staff mint nothing
}

/** The only function that turns a requested capability list into a grantable one. */
export function grantableBy(
  grantor: Pick<Operator, "role" | "capabilities">,
  requested: unknown,
): Capability[] {
  const asked = Array.isArray(requested)
    ? requested.filter((c): c is Capability => (CAPABILITIES as readonly string[]).includes(c as string))
    : [];
  // Rule (b) half: the super-only pair is grantable by nobody, super admin included.
  const withoutSuperOnly = asked.filter((c) => !SUPER_ADMIN_ONLY_CAPS.includes(c));
  if (grantor.role === "super_admin") return withoutSuperOnly;
  // Rule (a): subset of the grantor's OWN held capabilities.
  return withoutSuperOnly.filter((c) => grantor.capabilities.includes(c));
}

/** The FULL-ACCESS preset as seen by a specific grantor (still subset-of-own for admins). */
export function fullGrantBy(grantor: Pick<Operator, "role" | "capabilities">): Capability[] {
  return grantableBy(grantor, [...GRANTABLE_CAPABILITIES]);
}
