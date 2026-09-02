import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/data/admin";
import { can } from "@/lib/auth/permissions";
import { getClientScope } from "@/lib/auth/clientScope";
import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminSupportRequest } from "@/lib/data/adminSupport";
import { SupportReply } from "@/components/admin/support-reply";
import { CAPABILITY_LABELS } from "@/lib/auth/capabilities";

// ── THE TICKET DETAIL VIEW (founder-ruled 2026-09-01) ────────────────────────────────────────
//
// This page did not exist, and its absence was the visible half of the defect: /admin/support
// listed tickets with no row link, because the 2026-08-02 ruling made the queue read-only and
// sent replies over email. Email replies were never receivable, so a ticket could be seen and
// never answered. The founder proved it by raising one.
//
// ⚠ THE READ IS GATED ON view_cases, THE WRITE ON review_publish — see the route for why. The
// page shows the reply form only to an operator who could actually save it, so nobody types an
// answer into a box that will 403.

const STATUS_CLS: Record<string, string> = {
  open: "bg-verify-bg text-verify-ink",
  in_progress: "bg-conditional-bg text-conditional-ink",
  resolved: "bg-clear-bg text-clear-ink",
  closed: "bg-subtle text-muted",
};

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function AdminSupportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const shell = {
    active: "support" as const,
    operator: admin,
    clientScope: admin.clientScope,
    user: { initial: (admin.full_name || admin.email || "?").charAt(0).toUpperCase(), email: admin.email },
  };

  if (!can(admin, "view_cases")) {
    return (
      <AdminShell {...shell} title="Support request">
        <p className="rounded-card border border-line bg-surface p-6 text-sm text-muted">
          Viewing support requests requires the <span className="font-semibold">{CAPABILITY_LABELS.view_cases}</span> permission.
        </p>
      </AdminShell>
    );
  }

  const { id } = await params;
  // ⚠ SCOPE IS APPLIED IN THE QUERY, so an out-of-scope ticket 404s exactly like a missing one.
  // A scoped operator must not be able to learn that another client's ticket exists.
  const t = await getAdminSupportRequest(id, await getClientScope(admin));
  if (!t) notFound();

  return (
    <AdminShell {...shell} title={`${t.sr_number} · ${t.subject}`}>
      <Link href="/admin/support" className="min-h-11 inline-flex items-center text-[13px] font-semibold text-brand hover:underline">
        ← Support queue
      </Link>

      <div className="mt-3 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-5">
          <div className="rounded-card border border-line bg-surface p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[12.5px] font-semibold text-brand">{t.sr_number}</span>
              <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold capitalize ${STATUS_CLS[t.status] ?? "bg-subtle text-muted"}`}>
                {t.status.replaceAll("_", " ")}
              </span>
              <span className="text-[12.5px] capitalize text-muted">{t.type.replaceAll("_", " ")}</span>
            </div>
            <h2 className="mt-2 font-display text-lg font-bold text-ink">{t.subject}</h2>
            <p className="report-prose mt-2 whitespace-pre-wrap text-ink-2">{t.body}</p>
          </div>

          {t.admin_response && (
            <div className="rounded-card border border-line bg-subtle p-5">
              <div className="text-[13px] font-bold text-ink">Reply on file — the client sees this</div>
              <p className="report-prose mt-2 whitespace-pre-wrap text-ink-2">{t.admin_response}</p>
            </div>
          )}

          {can(admin, "review_publish") ? (
            <SupportReply
              ticketId={t.id}
              currentStatus={t.status}
              existingResponse={t.admin_response}
              clientEmail={t.clients?.email ?? null}
            />
          ) : (
            <p className="rounded-card border border-line bg-surface p-5 text-sm text-muted">
              Replying requires the <span className="font-semibold">{CAPABILITY_LABELS.review_publish}</span> permission.
            </p>
          )}
        </div>

        <aside className="space-y-3 rounded-card border border-line bg-surface p-5 text-[13px]">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">Client</div>
            <div className="mt-0.5 text-ink">{t.clients?.full_name ?? "—"}</div>
            <div className="break-words text-muted">{t.clients?.email ?? "—"}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">Raised</div>
            <div className="mt-0.5 text-ink-2">{fmt(t.created_at)}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">Resolved</div>
            <div className="mt-0.5 text-ink-2">{fmt(t.resolved_at)}</div>
          </div>
          {t.case_id && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">Linked case</div>
              <Link href={`/admin/cases/${t.case_id}`} className="mt-0.5 inline-block font-semibold text-brand hover:underline">
                Open the case →
              </Link>
            </div>
          )}
        </aside>
      </div>
    </AdminShell>
  );
}
