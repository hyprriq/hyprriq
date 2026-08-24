import Link from "next/link";
import type { Client } from "@/lib/data/client";
import { deriveAccess, type Access } from "@/lib/data/access";
import { UserMenu } from "@/components/portal/user-menu";
import { AppSidebarBrand } from "@/components/app/app-header";
import { ShellChrome } from "@/components/app/shell-chrome";
import { auth } from "@clerk/nextjs/server";
import { getOperator } from "@/lib/auth/permissions";
import { GrantAttach } from "@/components/portal/grant-attach";
import { Wordmark } from "@/components/brand/wordmark";
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
    <aside className="flex h-full w-full flex-col overflow-y-auto bg-brand-hover px-4 pb-5 text-nav-fg">
      {/* Shares the page header's height, so the nav below starts level with the content. */}
      <AppSidebarBrand>
        <div>
          <Wordmark variant="reversed" height={21} />
          <div className="mt-0.5 text-xs font-medium text-nav-fg-dim">
            {plan ? `${PLAN_NAME[plan]} Plan` : "No plan yet"}
          </div>
        </div>
      </AppSidebarBrand>

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

// ACTIONS ONLY (2026-08-24): the page title moved into the shared AppHeader, which portal and
// admin both render. This contributes the right-hand slot and nothing else.
function TopbarActions({
  client,
  access,
  showSwitcher,
}: {
  client: Client;
  access: Access;
  showSwitcher: boolean;
}) {
  const initial = (client.full_name || client.email || "?").charAt(0).toUpperCase();
  return (
    <>
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
          switcher={showSwitcher ? { href: "/admin/dashboard", label: "Admin console" } : undefined}
        />
    </>
  );
}

export async function PortalShell({
  client,
  active,
  title,
  children,
}: {
  client: Client;
  active: PortalNavKey;
  title: string;
  children: React.ReactNode;
}) {
  const access = deriveAccess(client);

  // ── THE ADMIN CONSOLE IS REACHABLE FROM THE PORTAL (founder-ruled 2026-08-24, post-launch) ──
  //
  // TWO DEFECTS, BOTH FOUND BY THE FOUNDER ON THE LIVE DOMAIN. Signed in as an operator, he landed
  // in the client portal, was asked to buy a plan, and had no visible route to the admin console he
  // has permission for. /admin was reachable only by typing the URL.
  //
  //  1. THE SWITCHER WAS GATED OFF IN PRODUCTION — `VERCEL_ENV !== "production"` — so it existed on
  //     staging and vanished on exactly the domain that matters. It was built as a dev convenience;
  //     it is now a permanent, capability-gated route.
  //  2. AND IT WOULD STILL HAVE SHOWN NOTHING. The old condition was
  //     `client.role !== "client" || isOperator === true`, and NO CALLER EVER PASSED isOperator —
  //     grep across app/(portal) returned zero. So it fell back to the legacy clients.role, which
  //     an operator whose access comes from an admin_permissions row does not have.
  //
  // ONE NOTION OF WHO IS AN OPERATOR, NOT TWO. getOperator() is the SAME function the admin
  // boundary uses (lib/data/admin.ts: "admin PAGE access = getOperator(userId) !== null"), and it
  // already carries the legacy clients.role fallback INSIDE it. So the old expression was a
  // duplicate of logic that lives one call away — removing it reduces the notions from two to one.
  //
  // THE PRINCIPLE: the link appears exactly when the guard would admit you. It cannot advertise a
  // door that /admin would bounce, and it cannot hide one it would open.
  const { userId } = await auth();
  const showSwitcher = userId ? (await getOperator(userId)) !== null : false;

  return (
    <ShellChrome
      sidebar={<Sidebar client={client} active={active} access={access} />}
      title={title}
      actions={<TopbarActions client={client} access={access} showSwitcher={showSwitcher} />}
    >
      {/* Invite-grant attach (2026-08-21): plan-less accounts only — consumes the parked invite
          cookie via the attach route and makes every outcome VISIBLE (silent grant loss was the
          ruled failure). Plan-holders never see it; the RPC refuses them anyway. */}
      {!client.plan_type && <GrantAttach />}
      {children}
    </ShellChrome>
  );
}
