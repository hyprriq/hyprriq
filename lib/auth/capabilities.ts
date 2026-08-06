// ── Capability constants — DEPENDENCY-FREE ON PURPOSE (2026-07-30 /admin/users fix). This
// module is importable from "use client" components; it must never grow an import of
// lib/supabase/admin.ts or any other server-only module (the client-boundary lock enforces
// this). The permission LOGIC (getOperator etc.) stays in permissions.ts, which is server-only.
// manage-users is deliberately absent: it is the super_admin ROLE, never a grantable cap. ──

// view_all_clients (ADMIN FOUNDATIONS, founder-ruled 2026-08-02): the CLIENT-SCOPING elevation —
// capabilities say what ACTIONS a sub-user may take; this one widens WHICH CLIENTS they see
// (default = assigned-only via staff_client_assignments; this grant = all clients). super_admin
// always sees all regardless. A `refund` capability is deliberately ABSENT (STOP-3: refunds are
// Stripe-dashboard-only until post-Phase-J; the name is reserved, never granted early).
export const CAPABILITIES = [
  "view_cases", "review_publish", "run_case", "rerun", "adjust_credits", "view_billing", "view_all_clients",
] as const;
export type Capability = (typeof CAPABILITIES)[number];

// FULL ACCESS preset = everything EXCEPT managing users (that is the super admin's role, not a cap).
export const FULL_ACCESS: readonly Capability[] = CAPABILITIES;
