import { requireAdmin } from "@/lib/data/admin";
import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminSupportRequests } from "@/lib/data/adminSupport";

// ── SUPPORT QUEUE (founder-ruled 2026-08-02) — function-only, READ-ONLY BY LAW: a list is not
// ticketing. No reply, no assign, no status change; helpdesk stays email-only at launch. The
// list AND the nav badge are client-partitioned (lib/data/adminSupport). UI thread restyles. ──

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

export default async function AdminSupportPage() {
  const admin = await requireAdmin();
  const requests = await getAdminSupportRequests(admin.clientScope);
  return (
    <AdminShell
      active="support"
      title="Support Queue"
      operator={admin}
      clientScope={admin.clientScope}
      user={{ initial: (admin.full_name || admin.email || "?").charAt(0).toUpperCase(), email: admin.email }}
    >
      <div className="rounded-card border border-line bg-surface p-4">
        <p className="mb-3 text-[13px] text-muted">
          Read-only queue. Replies happen over email — this list is for seeing what is open, not for ticketing.
        </p>
        {requests.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No support requests.</p>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-line text-left text-[12px] uppercase tracking-wide text-muted">
                <th className="py-2 pr-3">SR</th>
                <th className="py-2 pr-3">Client</th>
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Subject</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Created</th>
                <th className="py-2">Resolved</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-t border-line/60 align-top">
                  <td className="py-2 pr-3 font-mono text-ink">{r.sr_number}</td>
                  <td className="py-2 pr-3 text-ink">{r.clients?.full_name ?? r.clients?.email ?? "—"}</td>
                  <td className="py-2 pr-3 text-muted">{r.type}</td>
                  <td className="py-2 pr-3">
                    <div className="font-medium text-ink">{r.subject}</div>
                    <div className="mt-0.5 max-w-xl text-[12px] leading-relaxed text-ink-2">{r.body}</div>
                    {r.admin_response && (
                      <div className="mt-1 text-[12px] text-muted">Response on file: {r.admin_response}</div>
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${STATUS_CLS[r.status] ?? "bg-subtle text-muted"}`}>
                      {r.status.replaceAll("_", " ")}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-muted">{fmt(r.created_at)}</td>
                  <td className="py-2 text-muted">{fmt(r.resolved_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}
