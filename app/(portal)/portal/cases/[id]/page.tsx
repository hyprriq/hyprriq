import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getClientWithAccess } from "@/lib/data/access";
import { getCaseById, getCaseFindings, getClientReport } from "@/lib/data/cases";
import { PortalShell } from "@/components/portal/portal-shell";
import { CaseDetailView } from "@/components/portal/case-detail-view";
import { presentVerdict, VERDICT_ABSENT_TITLE, VERDICT_ABSENT_BODY } from "@/lib/portal/verdictPresence";
import { logVerdictAbsent } from "@/lib/portal/verdictAbsent.server";

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { client, access } = await getClientWithAccess();
  if (access.state === "no_plan") redirect("/portal/dashboard");
  const { id } = await params;
  const c = await getCaseById(id);
  if (!c) notFound();

  // ── ABSENCE IS NOT A VALUE (founder-locked 2026-08-22): a delivered case with no usable
  // verdict must never reach the report renderer — the old path fabricated "Verify Before
  // Purchase" via a display default. Refusal state over a throw, deliberately: the error
  // boundary's "Try again" would be false advice (a retry cannot fix a broken upstream
  // invariant), while this keeps the client in their portal with the truth and a support path.
  // LOUD server-side: console + audit_log + ops pager (lib/portal/verdictAbsent.server.ts).
  const delivered = c.status === "delivered" || c.status === "complete";
  if (delivered && !presentVerdict(c.verdict)) {
    await logVerdictAbsent({ caseRef: c.case_number, surface: "portal_report_page", raw: c.verdict });
    return (
      <PortalShell client={client} active="cases" title={`Case ${c.case_number}`}>
        <div className="mx-auto max-w-2xl">
          <nav className="mb-4 flex items-center gap-1.5 text-[13px] text-muted" aria-label="Breadcrumb">
            <Link href="/portal/cases" className="font-medium text-ink-2 hover:text-ink">Reports</Link>
            <span aria-hidden>/</span>
            <span className="font-mono text-[12px]">{c.case_number}</span>
          </nav>
          <div className="rounded-card border border-line bg-surface p-6">
            <h2 className="font-display text-xl font-bold text-ink">{VERDICT_ABSENT_TITLE}</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{VERDICT_ABSENT_BODY}</p>
            <div className="mt-5">
              <Link
                href="/portal/support"
                className="inline-flex items-center rounded-lg bg-ink px-4 py-2 text-[13px] font-semibold text-surface hover:opacity-90"
              >
                Message support
              </Link>
            </div>
          </div>
        </div>
      </PortalShell>
    );
  }

  // §2 — the Decision Snapshot projection (delivered cases only; null otherwise). Fetched
  // server-side beside the findings so the report renders in one pass.
  const [findings, report] = await Promise.all([getCaseFindings(id), getClientReport(id)]);

  return (
    <PortalShell client={client} active="cases" title={`Case ${c.case_number}`}>
      <CaseDetailView c={c} findings={findings} report={report} />
    </PortalShell>
  );
}
