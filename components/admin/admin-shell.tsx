import Link from "next/link";
import { UserMenu } from "@/components/portal/user-menu";
import { navFor, type AdminNavKey, type NavGroup } from "@/lib/admin/nav";
import type { Operator } from "@/lib/auth/permissions";
import type { ClientScope } from "@/lib/auth/clientScope";
import { getOpenSupportCount } from "@/lib/data/adminSupport";
import { Wordmark } from "@/components/brand/wordmark";

// ── OPERATOR-AWARE SHELL (founder-ruled 2026-08-02): the nav model + visibility rules live in
// lib/admin/nav.ts (SHARED capability source — the same can()/canManageUsers() the API gates
// call). The badge derives from the ROLE, never hardcoded. Nav filtering is UX; the page/API
// gates remain the security boundary. ──

export type { AdminNavKey };

// One SVG icon family (admin design pass 2026-08-12) — replaces the glyph strings from
// nav.ts (its `icon` field is now decorative-legacy; capability rules there are untouched).
// 16px, stroke 2 — one step tighter than the client portal's 17px: density is a feature.
const NAV_ICONS: Record<AdminNavKey, React.ReactNode> = {
  dashboard: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /><path d="M9 22V12h6v10" /></svg>,
  review: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>,
  delivered: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="m8.5 12.5 2.5 2.5 5-5" /></svg>,
  all: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M9 13h6M9 17h6" /></svg>,
  run: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m6 4 14 8-14 8V4Z" /></svg>,
  clients: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  billing: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>,
  support: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></svg>,
  outcomes: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 3v18h18" /><path d="m7 14 4-4 3 3 5-6" /></svg>,
  users: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="11" width="18" height="10" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
  suppliers: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" /></svg>,
  brands: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m12 2 3 6.3 7 .7-5 4.8 1.5 6.9L12 17l-6.5 3.7L7 13.8 2 9l7-.7L12 2Z" /></svg>,
  acquisition: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /><circle cx="12" cy="12" r="5" /></svg>,
  bulk: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M4 6h16M4 12h16M4 18h10" /></svg>,
  revenue: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M12 7v10M8.5 9.5h5a2 2 0 0 1 0 4h-3a2 2 0 0 0 0 4h5.5" /></svg>,
  prompts: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m7 8-4 4 4 4M17 8l4 4-4 4M14 4l-4 16" /></svg>,
  settings: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" /></svg>,
};

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
            const base = "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13.5px] font-medium transition-colors";
            const content = (
              <>
                <span aria-hidden className="opacity-80">{NAV_ICONS[item.key]}</span>
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
  // Every page passes the FULL requireAdmin() return here; the type only narrows what the shell
  // reads. image_url (Clerk avatar, resolved per request — founder-ruled 2026-08-20) rides that
  // same object, so the avatar reaches the header with zero per-page changes.
  operator: Pick<Operator, "role" | "capabilities" | "transitional"> & { image_url?: string | null };
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
      <aside className="flex w-[248px] shrink-0 flex-col bg-brand-hover px-4 py-5">
        <div className="mb-4 flex items-center justify-between px-1">
          <div className="flex items-baseline gap-1.5">
            <Wordmark variant="reversed" height={17} />
            <span className="font-display text-base font-semibold tracking-tight text-white/50">Admin</span>
          </div>
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white/70">
            {roleBadge}
          </span>
        </div>
        <Nav groups={groups} active={active} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-line bg-surface px-6">
          <h1 className="font-display text-lg font-semibold tracking-tight text-ink">{title}</h1>
          <div className="flex items-center gap-3">
            {topRight}
            {user && (
              <UserMenu
                initial={user.initial}
                email={user.email}
                imageUrl={operator.image_url ?? null}
                switcher={showSwitcher ? { href: "/portal/dashboard", label: "View as Client" } : undefined}
              />
            )}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-6 py-5">{children}</main>
      </div>
    </div>
  );
}
