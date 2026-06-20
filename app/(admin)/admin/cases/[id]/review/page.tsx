import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin, getAdminCase } from "@/lib/data/admin";
import { AdminShell } from "@/components/admin/admin-shell";
import { CaseReview } from "@/components/admin/case-review";
import { PLAN_NAME } from "@/lib/constants/plans";

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function Field({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 py-1.5 text-[13px]">
      <span className="text-muted">{k}</span>
      <span className="text-right font-medium text-ink">{v}</span>
    </div>
  );
}

export default async function CaseReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;
  const c = await getAdminCase(id);
  if (!c) notFound();

  return (
    <AdminShell
      active="review"
      title={`Case ${c.case_number}`}
      user={{ initial: (admin.full_name || admin.email || "?").charAt(0).toUpperCase(), email: admin.email }}
      topRight={
        <Link href="/admin/dashboard" className="text-[13px] font-semibold text-brand hover:text-brand-hover">
          ← Back to queue
        </Link>
      }
    >
      <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
        <div className="space-y-4">
          <div className="rounded-card border border-line bg-surface p-4">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">Case Information</div>
            <Field k="Case ID" v={<span className="font-mono">{c.case_number}</span>} />
            <Field k="Client" v={c.clients?.full_name ?? c.clients?.email ?? "—"} />
            <Field k="Supplier" v={c.vendor_name ?? "—"} />
            <Field k="Brands" v={(c.brands_submitted ?? []).join(" • ") || "—"} />
            <Field k="Plan" v={c.plan_type ? PLAN_NAME[c.plan_type] : "—"} />
            <Field k="Submitted" v={fmt(c.created_at)} />
            <Field k="SLA" v={fmt(c.sla_deadline)} />
          </div>
          {c.client_notes && (
            <div className="rounded-card border border-line bg-surface p-4">
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">Client Notes</div>
              <p className="text-[13px] leading-relaxed text-ink-2">{c.client_notes}</p>
            </div>
          )}
        </div>

        <CaseReview caseId={c.id} initial={{ verdict: c.verdict }} />
      </div>
    </AdminShell>
  );
}
