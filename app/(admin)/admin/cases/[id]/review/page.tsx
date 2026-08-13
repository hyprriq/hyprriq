import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin, getAdminCase } from "@/lib/data/admin";
import { can } from "@/lib/auth/permissions";
import { getCaseTrackResults } from "@/lib/data/track-results";
import { getCaseIntelligence } from "@/lib/data/synthesis";
import { buildVerdictViewModel } from "@/lib/research/verdictViewModel";
import { requiredFindingTracks } from "@/lib/constants/tracks";
import { AdminShell } from "@/components/admin/admin-shell";
import { CaseReview } from "@/components/admin/case-review";
import { OutcomePanel } from "@/components/admin/outcome-panel";
import { getCaseOutcome } from "@/lib/data/outcomes";
import { PLAN_NAME } from "@/lib/constants/plans";
import { findLegalSignals } from "@/lib/research/legalSignals";
import { getCaseOpsView } from "@/lib/data/adminOps";
import { PipelineProgress, deriveStages } from "@/components/admin/pipeline-progress";
import { AttemptHistory } from "@/components/admin/attempt-history";
import { buildAreaViews, buildClientFindings, parseLastDecision, slaHoursLeft, escalationReason } from "@/lib/admin/reviewView";
import { projectClientReport } from "@/lib/portal/clientReport";
import { projectSupplierIdentityForClient, type CaseDetail } from "@/lib/data/cases";
import { getClientDecisionSnapshot } from "@/lib/data/synthesis";

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function Field({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 py-1.5 text-[14px]">
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
  // PAGE GATE (2026-08-11, close-out item 7): the review page is case material — view_cases is
  // the rule here, not just in the nav.
  if (!can(admin, "view_cases")) {
    return (
      <AdminShell active="review" title="Case Review" operator={admin} clientScope={admin.clientScope} user={{ initial: (admin.full_name || admin.email || "?").charAt(0).toUpperCase(), email: admin.email }}>
        <p className="rounded-card border border-line bg-surface p-6 text-sm text-muted">
          Viewing cases requires the <span className="font-semibold">Can view cases</span> permission.
        </p>
      </AdminShell>
    );
  }
  const c = await getAdminCase(id);
  if (!c) notFound();
  // CLIENT PARTITIONING — same 404 rule as the client detail page for out-of-scope cases.
  if (admin.clientScope !== null && !admin.clientScope.includes(c.client_id)) notFound();

  const trackRows = c.plan_type ? await getCaseTrackResults(c.id) : [];
  const intel = await getCaseIntelligence(c.id);
  // H6 — outcome ground truth, only meaningful once delivered (row seeded by the publish route).
  const delivered = c.status === "delivered" || c.status === "complete";
  const outcome = delivered ? await getCaseOutcome(c.id) : null;
  const ops = await getCaseOpsView(c.id); // ADMIN BATCH — progress + attempt history + provenance
  const vm = buildVerdictViewModel({
    trackRows,
    synthesis: intel?.synthesis ?? null,
    ios: intel?.ios ?? null,
    requiredTracks: c.plan_type ? requiredFindingTracks(c.plan_type) : undefined,
  });

  // ── REBUILD (build brief 2026-08-13) — the operator reads the client's text per area, and can
  // flip to the client's ACTUAL screen (same components, same pure projection). All assembly is
  // pure (lib/admin/reviewView); nothing engine-side is touched. ──
  const areas = buildAreaViews(trackRows);
  // §3 ATTEMPT PARITY (2026-08-13): the client view pins to the DELIVERED attempt exactly as the
  // client path does — a pending re-investigation never shows the operator client-text the
  // client isn't reading. The snapshot comes through getClientDecisionSnapshot (the client
  // path's own pinned reader); the operator's working view above stays on the latest attempt.
  const deliveredPinned = c.delivered_attempt != null && (c.status === "delivered" || c.status === "complete");
  const clientRows = deliveredPinned ? await getCaseTrackResults(c.id, c.delivered_attempt!) : trackRows;
  const clientSnap = await getClientDecisionSnapshot(c.id);
  const clientView = {
    // Minimal client-shaped case: exactly the fields ReportView reads in preview mode.
    c: {
      id: c.id, case_number: c.case_number, vendor_name: c.vendor_name,
      brands_submitted: c.brands_submitted, brands_confirmed: null,
      status: c.status, verdict: c.verdict, sla_deadline: c.sla_deadline,
      delivered_at: c.delivered_at, created_at: c.created_at,
      change_request_deadline: null, change_request_used: true,
      supplier_identity: projectSupplierIdentityForClient(c.supplier_identity),
    } as unknown as CaseDetail,
    findings: buildClientFindings(clientRows),
    report: projectClientReport(
      (clientSnap?.decision_snapshot ?? null) as Record<string, unknown> | null,
      clientSnap?.vendor_questions ?? [],
      c.additional_questions ?? [],
    ),
  };

  return (
    <AdminShell
      active="review"
      title={`Case ${c.case_number}`}
      operator={admin}
      clientScope={admin.clientScope}
      user={{ initial: (admin.full_name || admin.email || "?").charAt(0).toUpperCase(), email: admin.email }}
      topRight={
        <Link href="/admin/dashboard" className="text-[14px] font-semibold text-brand hover:text-brand-hover">
          ← Back to queue
        </Link>
      }
    >
      <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
        <div className="space-y-4">
          <div className="rounded-card border border-line bg-surface p-4">
            <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted">Case Information</div>
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
              {/* TRIGGER 9 (BL fix gate) — derived at render, zero storage: the client disclosed
                  something legal-adjacent; make sure the founder SEES it. Flags, never blocks. */}
              {findLegalSignals(c.client_notes).length > 0 && (
                <div className="mb-2 rounded-lg border border-deny-ink/30 bg-deny-bg px-3 py-2 text-[13px] font-semibold text-deny-ink">
                  ⚖ LEGAL FLAG — the client&apos;s notes mention: {findLegalSignals(c.client_notes).join(", ")}. No legal advice; review before any response.
                </div>
              )}
              <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted">Client Notes</div>
              <p className="text-[14px] leading-relaxed text-ink-2">{c.client_notes}</p>
            </div>
          )}
          {delivered && <OutcomePanel caseId={c.id} existing={outcome} />}
          {ops && (
            <>
              {ops.origin === "operator" && (
                <div className="rounded-card border border-line bg-subtle p-3 text-[13px] text-ink-2">
                  <span className="font-semibold">Operator-run case</span> (no credit charged)
                  {ops.operator_meta?.client_name && <> · for <span className="font-medium">{ops.operator_meta.client_name}</span></>}
                  {ops.operator_meta?.company_name && <> — {ops.operator_meta.company_name}</>}
                </div>
              )}
              <PipelineProgress stages={deriveStages(ops.statuses)} />
              <AttemptHistory attempts={ops.attempts} deliveredAttempt={ops.delivered_attempt} currentVerdict={c.verdict} />
            </>
          )}
        </div>

        <CaseReview
          caseId={c.id}
          caseNumber={c.case_number}
          vendorName={c.vendor_name}
          vm={vm}
          caseStatus={c.status}
          additionalQuestions={c.additional_questions ?? []}
          supplierIdentity={c.supplier_identity}
          canRerun={can(admin, "rerun")}
          canPublish={can(admin, "review_publish")}
          areas={areas}
          lastDecision={parseLastDecision(c.internal_notes)}
          slaHours={slaHoursLeft(c.sla_deadline)}
          escalation={escalationReason((ops?.statuses ?? null) as Record<string, string | null> | null, c.supplier_identity?.resolution_confidence ?? c.supplier_identity?.identity_confidence ?? null)}
          clientView={clientView}
        />
      </div>
    </AdminShell>
  );
}
