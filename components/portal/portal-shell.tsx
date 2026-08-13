import Link from "next/link";
import type { Client } from "@/lib/data/client";
import { deriveAccess, type Access } from "@/lib/data/access";
import { UserMenu } from "@/components/portal/user-menu";
import { ShellChrome } from "@/components/portal/shell-chrome";
import {
  PLAN_NAME,
  type PlanType,
} from "@/lib/constants/plans";
import { creditsView } from "@/lib/portal/creditsDisplay";

export type PortalNavKey =
  | "dashboard"
  | "new"
  | "cases"
  | "completed"
  | "billing"
  | "settings"
  | "help"
  | "support"
  | "guides";

// Stroked SVG icons (skin port 2026-08-11) — the emoji glyphs are gone; one icon
// family, 17px, stroke 2, matching the ruled prototype's icon language.
const ICONS: Record<PortalNavKey, React.ReactNode> = {
  dashboard: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /><path d="M9 22V12h6v10" /></svg>
  ),
  new: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></svg>
  ),
  cases: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M9 13h6M9 17h6" /></svg>
  ),
  completed: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="m8.5 12.5 2.5 2.5 5-5" /></svg>
  ),
  billing: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>
  ),
  settings: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" /></svg>
  ),
  help: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01" /></svg>
  ),
  support: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></svg>
  ),
  guides: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2ZM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7Z" /></svg>
  ),
};

type NavItem = {
  key: PortalNavKey;
  label: string;
  href?: string; // omitted => rendered disabled (route not in scope yet)
  sub?: boolean;
  badge?: number;
};

const NAV: { section?: string; items: NavItem[] }[] = [
  { items: [{ key: "dashboard", label: "Dashboard", href: "/portal/dashboard" }] },
  {
    section: "Research",
    items: [
      { key: "new", label: "New Case", href: "/portal/submit", sub: true },
      { key: "cases", label: "Active Cases", href: "/portal/cases", sub: true },
      { key: "completed", label: "Completed Reports", href: "/portal/cases?filter=completed", sub: true },
    ],
  },
  {
    section: "Account",
    items: [
      { key: "billing", label: "Billing & Credits", href: "/portal/billing" },
      { key: "settings", label: "Settings", href: "/portal/settings" },
    ],
  },
  {
    section: "Support",
    items: [
      { key: "help", label: "Help Centre", href: "/portal/help" },
      { key: "support", label: "Contact Support", href: "/portal/support" },
      { key: "guides", label: "How-to Guides", href: "/portal/guides" },
    ],
  },
];

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

function CreditsWidget({ client }: { client: Client }) {
  const plan = client.plan_type as PlanType | null;
  // BUG-2 fix — shared honest framing (lib/portal/creditsDisplay); never "7 of 5".
  const cv = creditsView(client.credits_available, plan, client.credits_used_this_cycle);
  const renew = daysUntil(client.renewal_date);

  return (
    <div className="mt-auto rounded-card bg-white/[0.06] p-3.5">
      <div className="flex items-center justify-between">
        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-nav-fg-dim">
          Credits
        </span>
        <Link href="/portal/billing" className="text-xs font-semibold text-white hover:underline">
          Add more
        </Link>
      </div>
      <div className="mt-1 font-display text-3xl font-semibold leading-none text-white">
        {cv.available}
      </div>
      <div className="mt-1 text-[12px] leading-snug text-nav-fg-dim">
        {cv.detail ?? "no active plan"}
        {renew !== null ? ` • renews ${renew} day${renew === 1 ? "" : "s"}` : ""}
      </div>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-nav-fg" style={{ width: `${cv.pct}%` }} />
      </div>
    </div>
  );
}

function isBlocked(key: PortalNavKey, access: Access): boolean {
  if (key === "new") return !access.canSubmit;
  if (key === "cases") return !access.canViewActive;
  if (key === "completed") return !access.canViewCompleted;
  return false;
}

function Sidebar({ client, active, access }: { client: Client; active: PortalNavKey; access: Access }) {
  const plan = client.plan_type as PlanType | null;
  return (
    <aside className="flex h-full w-full flex-col overflow-y-auto bg-brand-hover px-4 py-5 text-nav-fg">
      <div className="mb-5 px-1">
        <div className="font-display text-xl font-semibold tracking-tight text-white">
          Hyprr<span className="text-accent-warm">IQ</span>
        </div>
        <div className="mt-0.5 text-xs font-medium text-nav-fg-dim">
          {plan ? `${PLAN_NAME[plan]} Plan` : "No plan yet"}
        </div>
      </div>

      <nav className="flex flex-col gap-0.5">
        {NAV.map((group, gi) => (
          <div key={gi} className="flex flex-col gap-0.5">
            {group.section && (
              <div className="mb-0.5 mt-3 px-2 text-[10.5px] font-semibold uppercase tracking-wider text-nav-fg-dim">
                {group.section}
              </div>
            )}
            {group.items.map((item) => {
              const isActive = item.key === active;
              const blocked = isBlocked(item.key, access);
              const base =
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition-colors";
              const cls = isActive
                ? `${base} bg-white/10 font-semibold text-white`
                : `${base} text-nav-fg hover:bg-white/[0.06] hover:text-white`;
              const content = (
                <>
                  <span aria-hidden className="opacity-85">{ICONS[item.key]}</span>
                  <span className={item.sub ? "pl-0.5" : ""}>{item.label}</span>
                  {item.badge ? (
                    <span className="ml-auto rounded-full bg-accent-data px-1.5 py-0.5 text-[11px] font-bold text-white">
                      {item.badge}
                    </span>
                  ) : null}
                </>
              );
              return item.href && !blocked ? (
                <Link key={item.key} href={item.href} className={cls} aria-current={isActive ? "page" : undefined}>
                  {content}
                </Link>
              ) : (
                <button
                  key={item.key}
                  type="button"
                  disabled
                  className={`${base} cursor-not-allowed text-nav-fg-dim/70`}
                  title={blocked ? "Requires an active plan" : "Coming soon"}
                >
                  {content}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <CreditsWidget client={client} />
    </aside>
  );
}

function TopbarContent({
  client,
  title,
  access,
  showSwitcher,
}: {
  client: Client;
  title: string;
  access: Access;
  showSwitcher: boolean;
}) {
  const initial = (client.full_name || client.email || "?").charAt(0).toUpperCase();
  return (
    <>
      <h1 className="min-w-0 truncate font-display text-xl font-semibold tracking-tight text-ink">{title}</h1>
      <div className="ml-auto flex items-center gap-3">
        {access.canSubmit && (
          <Link
            href="/portal/submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-[14px] font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
            <span className="hidden sm:inline">New Research</span>
            <span className="sm:hidden">New</span>
          </Link>
        )}
        <UserMenu
          initial={initial}
          email={client.email}
          switcher={showSwitcher ? { href: "/admin/dashboard", label: "View as Admin" } : undefined}
        />
      </div>
    </>
  );
}

export function PortalShell({
  client,
  active,
  title,
  children,
  isOperator,
}: {
  client: Client;
  active: PortalNavKey;
  title: string;
  children: React.ReactNode;
  // ADMIN ACCESS FIX (2026-07-30): admin_permissions rows live on their own identities, so a
  // portal user may be an operator without an elevated clients.role. Callers that load the
  // operator can pass this; the legacy clients.role path keeps working unchanged. (A rows-only
  // super-admin has no portal presence at all — they enter via /admin directly.)
  isOperator?: boolean;
}) {
  const access = deriveAccess(client);
  // Dev/staging-only view switcher, admin-only. VERCEL_ENV (not NODE_ENV) — Vercel
  // sets NODE_ENV='production' on preview builds too (see ADR-005).
  const showSwitcher = process.env.VERCEL_ENV !== "production" && (client.role !== "client" || isOperator === true);

  return (
    <ShellChrome
      sidebar={<Sidebar client={client} active={active} access={access} />}
      header={<TopbarContent client={client} title={title} access={access} showSwitcher={showSwitcher} />}
    >
      {children}
    </ShellChrome>
  );
}
