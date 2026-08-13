import { notFound, redirect } from "next/navigation";
import { getClientWithAccess } from "@/lib/data/access";
import { getCaseById, getCaseFindings, getClientReport } from "@/lib/data/cases";
import { PortalShell } from "@/components/portal/portal-shell";
import { CaseDetailView } from "@/components/portal/case-detail-view";

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
  // §2 — the Decision Snapshot projection (delivered cases only; null otherwise). Fetched
  // server-side beside the findings so the report renders in one pass.
  const [findings, report] = await Promise.all([getCaseFindings(id), getClientReport(id)]);

  return (
    <PortalShell client={client} active="cases" title={`Case ${c.case_number}`}>
      <CaseDetailView c={c} findings={findings} report={report} />
    </PortalShell>
  );
}
