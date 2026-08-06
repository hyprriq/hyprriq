import Link from "next/link";
import { UserMenu } from "@/components/portal/user-menu";
import { navFor, type AdminNavKey, type NavGroup } from "@/lib/admin/nav";
import type { Operator } from "@/lib/auth/permissions";
import type { ClientScope } from "@/lib/auth/clientScope";
import { getOpenSupportCount } from "@/lib/data/adminSupport";

// ── OPERATOR-AWARE SHELL (founder-ruled 2026-08-02): the nav model + visibility rules live in
// lib/admin/nav.ts (SHARED capability source — the same can()/canManageUsers() the API gates
// call). The badge derives from the ROLE, never hardcoded. Nav filtering is UX; the page/API
// gates remain the security boundary. ──

export type { AdminNavKey };

function Nav({ groups, active }: { groups: NavGroup[]; active: AdminNavKey }) {
  return (
    <nav className="flex flex-col gap-0.5">
      {groups.map((g, i) => (
        <div key={i} className="flex flex-col gap-0.5">
          {g.section && (
            <div className="mb-0.5 mt-3 px-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
              {g.section}
            </div>
          )}
          {g.items.map((item) => {
            const isActive = item.key === active;
            const base = "flex items-center gap-2 rounded-lg px-2.5 py-2 text-[14px] font-medium transition-colors";
            const content = (
              <>
                <span aria-hidden className="w-4 text-center text-xs">{item.icon}</span>
                <span>{item.label}</span>
                {item.badge ? (
                  <span className="ml-auto rounded-full bg-verify-ink px-1.5 py-0.5 text-[11px] font-bold text-white">{item.badge}</span>
                ) : null}
              </>
            );
            if (isActive) {
              return (
                <span key={item.key} className={`${base} bg-white/10 text-white`} aria-current="page">{content}</span>
              );
            }
            // bug fix #2: inactive nav at 0.65 opacity (was 0.48 — contrast)
            return (
              <Link key={item.key} href={item.href} className={`${base} text-white/[0.65] hover:bg-white/5 hover:text-white`}>
                {content}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export async function AdminShell({
  active,
  title,
  topRight,
  user,
  operator,
  clientScope,
  children,
}: {
  active: AdminNavKey;
  title: string;
  topRight?: React.ReactNode;
  user?: { initial: string; email: string };
  operator: Pick<Operator, "role" | "capabilities" | "transitional">;
  clientScope: ClientScope;
  children: React.ReactNode;
}) {
  // Admin routes are already is_admin-guarded; the switcher just needs the
  // dev/staging gate (VERCEL_ENV, not NODE_ENV — see ADR-005).
  const showSwitcher = process.env.VERCEL_ENV !== "production";
  // Badge derives from the role — never hardcoded (identity law, 2026-08-02).
  const roleBadge = operator.role === "super_admin" ? "Founder" : "Staff";
  // Support open-count badge: fetched only when the item is visible to this operator, and
  // SCOPED like the list itself (an unscoped count leaks out-of-scope request existence).
  let groups = navFor(operator);
  if (groups.some((g) => g.items.some((i) => i.key === "support"))) {
    const openCount = await getOpenSupportCount(clientScope);
    if (openCount > 0) {
      groups = groups.map((g) => ({
        ...g,
        items: g.items.map((i) => (i.key === "support" ? { ...i, badge: openCount } : i)),
      }));
    }
  }
  return (
    <div className="flex min-h-dvh bg-base">
      <aside className="flex w-[248px] shrink-0 flex-col bg-ink px-4 py-5">
        <div className="mb-4 flex items-center justify-between px-1">
          <div className="font-display text-base font-extrabold tracking-tight text-white">
            HyprrIQ <span className="text-white/50">Admin</span>
          </div>
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white/70">
            {roleBadge}
          </span>
        </div>
        <Nav groups={groups} active={active} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-line bg-surface px-7">
          <h1 className="font-display text-xl font-bold tracking-tight text-ink">{title}</h1>
          <div className="flex items-center gap-3">
            {topRight}
            {user && (
              <UserMenu
                initial={user.initial}
                email={user.email}
                switcher={showSwitcher ? { href: "/portal/dashboard", label: "View as Client" } : undefined}
              />
            )}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-7 py-6">{children}</main>
      </div>
    </div>
  );
}
