import { notFound } from "next/navigation";
import { requireOnboardedClient } from "@/lib/data/client";
import { getCaseById, getCaseFindings } from "@/lib/data/cases";
import { PortalShell } from "@/components/portal/portal-shell";
import { CaseDetailView } from "@/components/portal/case-detail-view";

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const client = await requireOnboardedClient();
  const { id } = await params;
  const c = await getCaseById(id);
  if (!c) notFound();
  const findings = await getCaseFindings(id);

  return (
    <PortalShell client={client} active="cases" title={`Case ${c.case_number}`}>
      <CaseDetailView c={c} findings={findings} />
    </PortalShell>
  );
}
