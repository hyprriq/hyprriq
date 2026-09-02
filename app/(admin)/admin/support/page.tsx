import { requireAdmin } from "@/lib/data/admin";
import { can } from "@/lib/auth/permissions";
import { AdminShell } from "@/components/admin/admin-shell";
import { ListTable } from "@/components/admin/list-table";
import { getAdminSupportRequests } from "@/lib/data/adminSupport";
import { CAPABILITY_LABELS } from "@/lib/auth/capabilities";

// ── SUPPORT QUEUE — NOW A QUEUE YOU CAN ANSWER (ruling superseded 2026-09-01) ────────────────
//
// The 2026-08-02 ruling made this read-only because "helpdesk stays email-only at launch". Email
// replies were never receivable (Resend receiving off, From: support@hyprriq.com), so the queue
// could show a ticket and offer no way to answer it. The founder found it by raising one.
//
// The list AND the nav badge remain client-partitioned (lib/data/adminSupport); the detail view
// applies the same scope in its query, so an out-of-scope ticket 404s like a missing one.

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

// COLS IS GONE. It was `grid grid-cols-[104px_150px_104px_1fr_104px_92px_92px] gap-3` — 750px of
// track, gap and padding inside a 328px content box at 360px, wrapped in `overflow-hidden`, so the
// subject, the status and both dates were CLIPPED AWAY ENTIRELY on a phone. The widest grid in the
// codebase, and invisible to three passes of the audit scanner because the word `grid` lived inside
// this constant rather than in any className. See §0-O.
//
// ⚠ AND THE MISSING <Link> WAS NOT A BUG. This queue is deliberately read-only — replies happen over
// email — so there is nowhere for a row to navigate to. What was lost here was CONTENT, not
// navigation, which is why a card form matters and a bigger tap target would not have helped.

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
      {/* ⚠ THE OLD COPY SAID "Replies happen over email". They did not: nothing received them.
          It now says where the answer actually happens, because a surface that describes a
          workflow the product does not perform is how the founder lost a reply. */}
      <p className="mb-3 text-[13px] text-muted">
        Open a request to reply. The client reads the answer in their portal and is emailed that
        it is waiting — the reply itself is never sent by email.
      </p>
      <ListTable
        rows={requests}
        getKey={(r) => r.id}
        href={(r) => `/admin/support/${r.id}`}
        empty="No support requests yet. New requests from the portal land here."
        columns={[
          { key: "sr", header: "SR Number", width: "104px", card: "title",
            cell: (r) => <span className="font-mono text-[12.5px] font-semibold text-brand">{r.sr_number}</span> },
          { key: "status", header: "Status", width: "104px", card: "badge",
            cell: (r) => (
              <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold capitalize ${STATUS_CLS[r.status] ?? "bg-subtle text-muted"}`}>
                {r.status.replaceAll("_", " ")}
              </span>
            ) },
          { key: "subject", header: "Subject", width: "1fr", card: "body",
            cell: (r) => (
              <div className="min-w-0">
                <div className="truncate text-[13.5px] font-semibold text-ink">{r.subject}</div>
                <div className="truncate text-[12px] text-ink-2" title={r.body}>{r.body}</div>
                {/* This line read a column NOTHING WROTE for a month — the visible symptom of
                    a chain with no writer, and the reason the standing check in
                    lib/integrity/deadEndChecks.ts now looks for exactly this shape. */}
                {r.admin_response && (
                  <div className="truncate text-[12px] text-muted" title={r.admin_response}>
                    Replied: {r.admin_response}
                  </div>
                )}
              </div>
            ) },
          { key: "client", header: "Client", width: "150px",
            cell: (r) => <span className="truncate text-[13px] text-ink">{r.clients?.full_name ?? r.clients?.email ?? "—"}</span> },
          { key: "type", header: "Type", width: "104px",
            cell: (r) => <span className="truncate text-[12.5px] capitalize text-muted">{r.type.replaceAll("_", " ")}</span> },
          { key: "created", header: "Created", width: "92px", align: "right",
            cell: (r) => <span className="font-mono text-[11.5px] text-muted">{fmt(r.created_at)}</span> },
          { key: "resolved", header: "Resolved", width: "92px", align: "right",
            cell: (r) => <span className="font-mono text-[11.5px] text-muted">{fmt(r.resolved_at)}</span> },
        ]}
      />
    </AdminShell>
  );
}
