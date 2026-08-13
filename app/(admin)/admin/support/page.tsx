import { requireAdmin } from "@/lib/data/admin";
import { can } from "@/lib/auth/permissions";
import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminSupportRequests } from "@/lib/data/adminSupport";
import { CAPABILITY_LABELS } from "@/lib/auth/capabilities";

// ── SUPPORT QUEUE (founder-ruled 2026-08-02) — function-only, READ-ONLY BY LAW: a list is not
// ticketing. No reply, no assign, no status change; helpdesk stays email-only at launch. The
// list AND the nav badge are client-partitioned (lib/data/adminSupport). Console restyle
// 2026-08-13: sunk header strip, explicit grid columns, hairline rows, hover-paper, mono
// IDs/dates — same read, same rules, zero controls added. ──

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

const STATUS_CLS: Record<string, string> = {
  open: "bg-verify-bg text-verify-ink",
  in_progress: "bg-conditional-bg text-conditional-ink",
  resolved: "bg-clear-bg text-clear-ink",
  closed: "bg-subtle text-muted",
};

const COLS = "grid grid-cols-[104px_150px_104px_1fr_104px_92px_92px] gap-3";

export default async function AdminSupportPage() {
  const admin = await requireAdmin();
  // PAGE GATE (2026-08-11, close-out item 7): support rows are client case material — same
  // capability as cases; nav filtering is UX, this is the rule.
  if (!can(admin, "view_cases")) {
    return (
      <AdminShell active="support" title="Support Queue" operator={admin} clientScope={admin.clientScope} user={{ initial: (admin.full_name || admin.email || "?").charAt(0).toUpperCase(), email: admin.email }}>
        <p className="rounded-card border border-line bg-surface p-6 text-sm text-muted">
          Viewing the support queue requires the <span className="font-semibold">{CAPABILITY_LABELS.view_cases}</span> permission.
        </p>
      </AdminShell>
    );
  }
  const requests = await getAdminSupportRequests(admin.clientScope);
  const openCount = requests.filter((r) => r.status === "open").length;
  return (
    <AdminShell
      active="support"
      title="Support Queue"
      operator={admin}
      clientScope={admin.clientScope}
      user={{ initial: (admin.full_name || admin.email || "?").charAt(0).toUpperCase(), email: admin.email }}
      topRight={
        <span className={`text-[13px] font-semibold ${openCount > 0 ? "text-verify-ink" : "text-muted"}`}>
          {openCount} open
        </span>
      }
    >
      <p className="mb-3 text-[13px] text-muted">
        Read-only queue. Replies happen over email — this list shows what is open and what was resolved, not a ticketing surface.
      </p>
      <div className="overflow-hidden rounded-card border border-line bg-surface">
        <div className={`${COLS} border-b border-line bg-subtle px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted`}>
          <span>SR Number</span><span>Client</span><span>Type</span><span>Subject</span><span>Status</span>
          <span className="text-right">Created</span><span className="text-right">Resolved</span>
        </div>
        {requests.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">No support requests yet. New requests from the portal land here.</p>
        ) : (
          requests.map((r) => (
            <div key={r.id} className={`${COLS} items-center border-b border-line px-4 py-2.5 transition-colors last:border-b-0 hover:bg-subtle`}>
              <span className="font-mono text-[12.5px] font-semibold text-brand">{r.sr_number}</span>
              <span className="truncate text-[13px] text-ink">{r.clients?.full_name ?? r.clients?.email ?? "—"}</span>
              <span className="truncate text-[12.5px] capitalize text-muted">{r.type.replaceAll("_", " ")}</span>
              <div className="min-w-0">
                <div className="truncate text-[13.5px] font-semibold text-ink">{r.subject}</div>
                <div className="truncate text-[12px] text-ink-2" title={r.body}>{r.body}</div>
                {r.admin_response && (
                  <div className="truncate text-[12px] text-muted" title={r.admin_response}>Response on file: {r.admin_response}</div>
                )}
              </div>
              <span>
                <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold capitalize ${STATUS_CLS[r.status] ?? "bg-subtle text-muted"}`}>
                  {r.status.replaceAll("_", " ")}
                </span>
              </span>
              <span className="text-right font-mono text-[11.5px] text-muted">{fmt(r.created_at)}</span>
              <span className="text-right font-mono text-[11.5px] text-muted">{fmt(r.resolved_at)}</span>
            </div>
          ))
        )}
      </div>
    </AdminShell>
  );
}
