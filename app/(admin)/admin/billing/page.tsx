import Link from "next/link";
import { requireAdmin, getAdminClients } from "@/lib/data/admin";
import { can } from "@/lib/auth/permissions";
import { AdminShell } from "@/components/admin/admin-shell";
import { PLAN_NAME, PLAN_CATEGORY, type PlanType } from "@/lib/constants/plans";

// ── BILLING — ALL-CLIENTS OVERVIEW (admin design pass 2026-08-12). Per-client accounting was
// fully built but reachable from exactly one link on client detail; this is its front door.
// The morning screen: who's on what plan, credits held, who's running low — each row links to
// the existing per-client accounting page (credits used, per-credit consumption, invoices,
// payments, plan events, adjustments with reasons).
//
// Flag, don't fabricate: cycle usage, payment feeds, and dollar totals exist only per-client
// today; a rolled-up cross-client feed and Stripe-accurate revenue need a data pass this
// design deliberately does not invent. Refund actions land on the per-client page with the
// locked policy (refund = max(0, paid − credits_used × tier_list_price × 0.70), 14-day window;
// SLA-breach unconditional) — a later dev pass wires the logic; money + credit move together.
//
// Capability: view_billing (same gate as Revenue) — absent from nav without it; a direct URL
// hit sees one plain line, per the absent-not-disabled rule.

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default async function AdminBillingPage() {
  const admin = await requireAdmin();
  const shellProps = {
    operator: admin,
    clientScope: admin.clientScope,
    user: { initial: (admin.full_name || admin.email || "?").charAt(0).toUpperCase(), email: admin.email },
  } as const;

  if (!can(admin, "view_billing")) {
    return (
      <AdminShell active="billing" title="Billing" {...shellProps}>
        <p className="rounded-card border border-line bg-surface p-6 text-sm text-muted">
          Billing access isn&rsquo;t granted on this account.
        </p>
      </AdminShell>
    );
  }

  const clients = (await getAdminClients(admin.clientScope)).filter((c) => c.role === "client");
  const subscribers = clients.filter((c) => c.plan_type && PLAN_CATEGORY[c.plan_type as PlanType] === "subscription");
  const lowCredit = subscribers.filter((c) => c.credits_available <= 1);
  const paying = clients.filter((c) => c.plan_type);
  const oneTime = paying.length - subscribers.length;

  return (
    <AdminShell active="billing" title="Billing" {...shellProps}>
      <div className="max-w-[920px]">
      {/* the three numbers that drive a decision this morning */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="rounded-card border border-line bg-surface px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Paying clients</div>
          <div className="mt-1.5 font-mono text-[28px] font-semibold leading-none text-brand">{paying.length}</div>
          <div className="mt-1.5 text-[12px] text-ink-2">{subscribers.length} subscription · {oneTime} one-time</div>
        </div>
        <div className="rounded-card border border-line bg-surface px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Credits held</div>
          <div className="mt-1.5 font-mono text-[28px] font-semibold leading-none text-brand">
            {clients.reduce((n, c) => n + c.credits_available, 0)}
          </div>
          <div className="mt-1.5 text-[12px] text-ink-2">across all clients in scope</div>
        </div>
        {/* item 3 — the one tile that demands action gets a STATE: calm at zero, warn above it */}
        <div className={`rounded-card border px-4 py-3 ${
          lowCredit.length > 0 ? "border-verify-ink/40 bg-verify-bg" : "border-line bg-surface"
        }`}>
          <div className={`text-[11px] font-bold uppercase tracking-wide ${lowCredit.length > 0 ? "text-verify-ink" : "text-ink-2"}`}>
            Running low
          </div>
          <div className={`mt-1.5 font-mono text-[28px] font-semibold leading-none ${lowCredit.length > 0 ? "text-verify-ink" : "text-ink"}`}>
            {lowCredit.length}
          </div>
          <div className={`mt-1.5 text-[12px] ${lowCredit.length > 0 ? "text-verify-ink" : "text-ink-2"}`}>
            subscribers at ≤1 credit
          </div>
        </div>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-card border border-line bg-surface p-10 text-center text-sm text-muted">
          No clients in your scope yet. Client accounting appears here as soon as one exists.
        </div>
      ) : (
        <div className="overflow-hidden rounded-card border border-line bg-surface">
          <div className="grid grid-cols-[minmax(200px,1.6fr)_130px_80px_110px_96px] items-center gap-3 border-b border-line bg-subtle px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
            <span>Client</span>
            <span>Plan</span>
            <span className="text-right">Credits</span>
            <span className="text-right">Since</span>
            <span />
          </div>
          {clients.map((c) => {
            const plan = c.plan_type as PlanType | null;
            const low = plan && PLAN_CATEGORY[plan] === "subscription" && c.credits_available <= 1;
            return (
              <div
                key={c.id}
                className="grid grid-cols-[minmax(200px,1.6fr)_130px_80px_110px_96px] items-center gap-3 border-b border-line px-4 py-2 last:border-b-0"
              >
                <div className="min-w-0">
                  <div className="truncate text-[13.5px] font-semibold text-ink">
                    {c.full_name || c.company_name || "—"}
                  </div>
                  <div className="mt-0.5 truncate font-mono text-[11px] text-muted">{c.email}</div>
                </div>
                <div className="min-w-0">
                  <span className="text-[13px] font-medium text-ink-2">{plan ? PLAN_NAME[plan] : "No plan"}</span>
                  {/* status is exception-only: "active" earns no ink; anything else does */}
                  {c.billing_status && c.billing_status !== "active" && (
                    <div className="mt-0.5 text-[11px] font-semibold capitalize text-verify-ink">
                      {c.billing_status.replace(/_/g, " ")}
                    </div>
                  )}
                </div>
                <span className={`text-right font-mono text-[12.5px] font-medium ${low ? "text-verify-ink" : "text-ink"}`}>
                  {c.credits_available}
                </span>
                <span className="text-right font-mono text-[11.5px] text-muted">{fmt(c.created_at)}</span>
                <Link
                  href={`/admin/clients/${c.id}/accounting`}
                  className="justify-self-end rounded-md border border-line px-2.5 py-1 text-[11.5px] font-semibold text-ink-2 hover:bg-subtle"
                >
                  Accounting
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* honest boundary — the console's voice, not the build log's */}
      <p className="mt-4 max-w-[72ch] text-[13px] leading-relaxed text-ink-2">
        Each client&rsquo;s full history — payments, plan events, adjustments, and which report used which
        credit — is under Accounting on their row. Refunds will be issued there too, money and credit
        together, with a reason on record. Dollar-accurate revenue and churn live in Stripe; this screen
        shows what the app itself records.
      </p>
      </div>
    </AdminShell>
  );
}
