// ── OPERATOR-AWARE ADMIN NAV (founder-ruled 2026-08-02) — visibility rules, ABSENT not
// disabled: items the operator lacks capability for are filtered out, never
// rendered-and-refusing (visible-but-refusing advertises the elevation ladder to staff).
//
// SHARE, DON'T MIRROR (locked): the rules consume the SAME functions the API gates call —
// can() / canManageUsers() from lib/auth/permissions — via a declarative `requires` field per
// item. There is no second capability map to drift. Nav filtering is UX; the page/API gates
// remain the security boundary, unchanged.
//
// Ruled visibility: Users → super_admin only · Run a Case → run_case · case views →
// view_cases · Support → view_cases (client-scoped data, same class as cases) · Revenue →
// view_billing · everything else → always.

import { can, canManageUsers, type Operator } from "@/lib/auth/permissions";
import type { Capability } from "@/lib/auth/capabilities";

export type AdminNavKey =
  | "dashboard"
  | "review"
  | "delivered"
  | "all"
  | "clients"
  | "support"
  | "outcomes"
  | "revenue"
  | "prompts"
  | "settings"
  | "run"
  | "users";

export type NavItem = {
  key: AdminNavKey;
  label: string;
  icon: string;
  href: string;
  badge?: number;
  requires?: { superAdminOnly: true } | { cap: Capability };
};
export type NavGroup = { section?: string; items: NavItem[] };

const GROUPS: NavGroup[] = [
  { items: [{ key: "dashboard", label: "Dashboard", icon: "▪", href: "/admin/dashboard" }] },
  {
    section: "Cases",
    items: [
      { key: "review", label: "Quality Review", icon: "🔍", href: "/admin/cases?filter=queue", requires: { cap: "view_cases" } },
      { key: "delivered", label: "Delivered", icon: "✓", href: "/admin/cases?filter=delivered", requires: { cap: "view_cases" } },
      { key: "all", label: "All Cases", icon: "▦", href: "/admin/cases", requires: { cap: "view_cases" } },
      { key: "run", label: "Run a Case", icon: "▶", href: "/admin/cases/run", requires: { cap: "run_case" } },
    ],
  },
  {
    section: "Management",
    items: [
      { key: "clients", label: "Clients", icon: "👥", href: "/admin/clients" },
      { key: "support", label: "Support Queue", icon: "✉", href: "/admin/support", requires: { cap: "view_cases" } },
      { key: "outcomes", label: "Outcomes", icon: "📈", href: "/admin/outcomes" },
      { key: "users", label: "Users", icon: "🔐", href: "/admin/users", requires: { superAdminOnly: true } },
    ],
  },
  {
    section: "System",
    items: [
      { key: "revenue", label: "Revenue", icon: "📊", href: "/admin/revenue", requires: { cap: "view_billing" } },
      { key: "prompts", label: "Prompts", icon: "📄", href: "/admin/prompts" },
      { key: "settings", label: "Settings", icon: "⚙", href: "/admin/settings" },
    ],
  },
];

export function navItemVisible(op: Pick<Operator, "role" | "capabilities" | "transitional">, item: NavItem): boolean {
  if (!item.requires) return true;
  const asOperator = op as Operator;
  if ("superAdminOnly" in item.requires) return canManageUsers(asOperator);
  return can(asOperator, item.requires.cap);
}

/** The nav an operator actually gets: ineligible items filtered out, emptied groups dropped. */
export function navFor(op: Pick<Operator, "role" | "capabilities" | "transitional">): NavGroup[] {
  return GROUPS
    .map((g) => ({ ...g, items: g.items.filter((item) => navItemVisible(op, item)) }))
    .filter((g) => g.items.length > 0);
}
