// ── Capability constants — DEPENDENCY-FREE ON PURPOSE (2026-07-30 /admin/users fix). This
// module is importable from "use client" components; it must never grow an import of
// lib/supabase/admin.ts or any other server-only module (the client-boundary lock enforces
// this). The permission LOGIC (getOperator etc.) stays in permissions.ts, which is server-only.
// manage-users is deliberately absent: it is the super_admin ROLE, never a grantable cap. ──

// view_all_clients (ADMIN FOUNDATIONS, founder-ruled 2026-08-02): the CLIENT-SCOPING elevation —
// capabilities say what ACTIONS an operator may take; this one widens WHICH CLIENTS they see
// (default = assigned-only via staff_client_assignments). super_admin always sees all regardless.
// A `refund` capability is deliberately ABSENT (STOP-3: refunds are Stripe-dashboard-only until
// the billing-section pass; the name is reserved, never granted early).
export const CAPABILITIES = [
  "view_cases", "review_publish", "run_case", "rerun", "adjust_credits", "view_billing", "view_all_clients",
] as const;
export type Capability = (typeof CAPABILITIES)[number];

// ── PERMISSION HIERARCHY (founder-ruled 2026-08-02): money and the scope-breaker stay at the
// TOP. These capabilities are grantable by NOBODY — not to admins, not by admins; they are
// exercised only through the super_admin ROLE itself (can() passes super_admin for everything).
// Structural containment rule half (b) lives here: no grant path can ever emit these. ──
export const SUPER_ADMIN_ONLY_CAPS: readonly Capability[] = ["adjust_credits", "view_all_clients"];

// What any grant flow may ever hand out (the day-to-day set).
export const GRANTABLE_CAPABILITIES: readonly Capability[] = CAPABILITIES.filter(
  (c) => !SUPER_ADMIN_ONLY_CAPS.includes(c),
);

// FULL ACCESS preset = every GRANTABLE capability (never user management — that is a ROLE; and
// never the super-only pair — that is the super_admin role too, by the 2026-08-02 hierarchy).
export const FULL_ACCESS: readonly Capability[] = GRANTABLE_CAPABILITIES;
