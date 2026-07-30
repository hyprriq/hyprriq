// ── Capability constants — DEPENDENCY-FREE ON PURPOSE (2026-07-30 /admin/users fix). This
// module is importable from "use client" components; it must never grow an import of
// lib/supabase/admin.ts or any other server-only module (the client-boundary lock enforces
// this). The permission LOGIC (getOperator etc.) stays in permissions.ts, which is server-only.
// manage-users is deliberately absent: it is the super_admin ROLE, never a grantable cap. ──

export const CAPABILITIES = [
  "view_cases", "review_publish", "run_case", "rerun", "adjust_credits", "view_billing",
] as const;
export type Capability = (typeof CAPABILITIES)[number];

// FULL ACCESS preset = everything EXCEPT managing users (that is the super admin's role, not a cap).
export const FULL_ACCESS: readonly Capability[] = CAPABILITIES;
