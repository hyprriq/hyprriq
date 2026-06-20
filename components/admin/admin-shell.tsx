import Link from "next/link";
import { UserMenu } from "@/components/portal/user-menu";

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
  | "settings";

type Item = { key: AdminNavKey; label: string; icon: string; href: string; badge?: number };

const GROUPS: { section?: string; items: Item[] }[] = [
  { items: [{ key: "dashboard", label: "Dashboard", icon: "▪", href: "/admin/dashboard" }] },
  {
    section: "Cases",
    items: [
      { key: "review", label: "Quality Review", icon: "🔍", href: "/admin/cases?filter=queue" },
      { key: "delivered", label: "Delivered", icon: "✓", href: "/admin/cases?filter=delivered" },
      { key: "all", label: "All Cases", icon: "▦", href: "/admin/cases" },
    ],
  },
  {
    section: "Management",
    items: [
      { key: "clients", label: "Clients", icon: "👥", href: "/admin/clients" },
      { key: "support", label: "Support Queue", icon: "✉", href: "/admin/dashboard" },
      { key: "outcomes", label: "Outcomes", icon: "📈", href: "/admin/outcomes" },
    ],
  },
  {
    section: "System",
    items: [
      { key: "revenue", label: "Revenue", icon: "📊", href: "/admin/revenue" },
      { key: "prompts", label: "Prompts", icon: "📄", href: "/admin/prompts" },
      { key: "settings", label: "Settings", icon: "⚙", href: "/admin/settings" },
    ],
  },
];

function Nav({ active }: { active: AdminNavKey }) {
  return (
    <nav className="flex flex-col gap-0.5">
      {GROUPS.map((g, i) => (
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

export function AdminShell({
  active,
  title,
  topRight,
  user,
  children,
}: {
  active: AdminNavKey;
  title: string;
  topRight?: React.ReactNode;
  user?: { initial: string; email: string };
  children: React.ReactNode;
}) {
  // Admin routes are already is_admin-guarded; the switcher just needs the
  // dev/staging gate (VERCEL_ENV, not NODE_ENV — see ADR-005).
  const showSwitcher = process.env.VERCEL_ENV !== "production";
  return (
    <div className="flex min-h-dvh bg-base">
      <aside className="flex w-[248px] shrink-0 flex-col bg-ink px-4 py-5">
        <div className="mb-4 flex items-center justify-between px-1">
          <div className="font-display text-base font-extrabold tracking-tight text-white">
            HyprrIQ <span className="text-white/50">Admin</span>
          </div>
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white/70">
            Founder
          </span>
        </div>
        <Nav active={active} />
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
