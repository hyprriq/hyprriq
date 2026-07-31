import Link from "next/link";
import type { Client } from "@/lib/data/client";
import { deriveAccess, type Access } from "@/lib/data/access";
import { UserMenu } from "@/components/portal/user-menu";
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
  | "support";

type NavItem = {
  key: PortalNavKey;
  label: string;
  icon: string;
  href?: string; // omitted => rendered disabled (route not in scope yet)
  sub?: boolean;
  badge?: number;
};

const NAV: { section?: string; items: NavItem[] }[] = [
  { items: [{ key: "dashboard", label: "Dashboard", icon: "▪", href: "/portal/dashboard" }] },
  {
    section: "Research",
    items: [
      { key: "new", label: "New Case", icon: "＋", href: "/portal/submit", sub: true },
      { key: "cases", label: "Active Cases", icon: "🗎", href: "/portal/cases", sub: true },
      { key: "completed", label: "Completed Reports", icon: "✓", href: "/portal/cases?filter=completed", sub: true },
    ],
  },
  {
    section: "Account",
    items: [
      { key: "billing", label: "Billing & Credits", icon: "💳", href: "/portal/billing" },
      { key: "settings", label: "Settings", icon: "⚙", href: "/portal/settings" },
    ],
  },
  {
    section: "Support",
    items: [
      { key: "help", label: "Help Centre", icon: "❓", href: "/portal/help" },
      { key: "support", label: "Contact Support", icon: "✉", href: "/portal/support" },
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
  const cv = creditsView(client.credits_available, plan);
  const renew = daysUntil(client.renewal_date);

  return (
    <div className="mt-auto rounded-card border border-line bg-base p-3.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          Credits
        </span>
        <Link href="/portal/billing" className="text-xs font-semibold text-brand hover:text-brand-hover">
          Add more
        </Link>
      </div>
      <div className="mt-1 font-display text-3xl font-extrabold leading-none text-ink">
        {cv.available}
      </div>
      <div className="mt-1 text-[12px] text-muted">
        {cv.detail ?? "no active plan"}
        {renew !== null ? ` • renews ${renew} day${renew === 1 ? "" : "s"}` : ""}
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-subtle">
        <div className="h-full rounded-full bg-brand" style={{ width: `${cv.pct}%` }} />
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
    <aside className="flex w-[248px] shrink-0 flex-col border-r border-line bg-surface px-4 py-5">
      <div className="mb-5 px-1">
        <div className="font-display text-lg font-extrabold tracking-tight text-ink">
          Hyprr<span className="text-brand">IQ</span>
        </div>
        <div className="mt-0.5 text-xs font-medium text-muted">
          {plan ? `${PLAN_NAME[plan]} Plan` : "No plan yet"}
        </div>
      </div>

      <nav className="flex flex-col gap-0.5">
        {NAV.map((group, gi) => (
          <div key={gi} className="flex flex-col gap-0.5">
            {group.section && (
              <div className="mb-0.5 mt-3 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
                {group.section}
              </div>
            )}
            {group.items.map((item) => {
              const isActive = item.key === active;
              const blocked = isBlocked(item.key, access);
              const base =
                "flex items-center gap-2 rounded-lg px-2.5 py-2 text-[14px] font-medium transition-colors";
              const cls = isActive
                ? `${base} bg-brand-tint text-brand-ink`
                : `${base} text-ink-2 hover:bg-subtle hover:text-ink`;
              const content = (
                <>
                  <span aria-hidden className="w-4 text-center text-xs">
                    {item.icon}
                  </span>
                  <span className={item.sub ? "pl-0.5" : ""}>{item.label}</span>
                  {item.badge ? (
                    <span className="ml-auto rounded-full bg-brand-tint px-1.5 py-0.5 text-[11px] font-bold text-brand-ink">
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
                  className={`${base} cursor-not-allowed text-muted/60`}
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

function Topbar({
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
    <header className="flex h-16 items-center justify-between border-b border-line bg-surface px-7">
      <h1 className="font-display text-xl font-bold tracking-tight text-ink">{title}</h1>
      <div className="flex items-center gap-3">
        {access.canSubmit && (
          <Link
            href="/portal/submit"
            className="rounded-lg bg-brand px-3.5 py-2 text-[14px] font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            ＋ New Research
          </Link>
        )}
        <UserMenu
          initial={initial}
          email={client.email}
          switcher={showSwitcher ? { href: "/admin/dashboard", label: "View as Admin" } : undefined}
        />
      </div>
    </header>
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
    <div className="flex min-h-dvh bg-base">
      <Sidebar client={client} active={active} access={access} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar client={client} title={title} access={access} showSwitcher={showSwitcher} />
        <main className="flex-1 overflow-y-auto px-7 py-6">{children}</main>
      </div>
    </div>
  );
}
