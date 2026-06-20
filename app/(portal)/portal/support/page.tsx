import { requireOnboardedClient } from "@/lib/data/client";
import { getClientCases } from "@/lib/data/cases";
import { getSupportRequests } from "@/lib/data/support";
import { PortalShell } from "@/components/portal/portal-shell";
import { SupportForm } from "@/components/portal/support-form";

const STATUS_CLS: Record<string, string> = {
  open: "bg-brand-tint text-brand-ink",
  in_progress: "bg-conditional-bg text-conditional-ink",
  resolved: "bg-clear-bg text-clear-ink",
  closed: "bg-subtle text-muted",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function SupportPage() {
  const client = await requireOnboardedClient();
  const [cases, requests] = await Promise.all([getClientCases(), getSupportRequests()]);
  const caseOptions = cases.map((c) => ({ id: c.id, case_number: c.case_number, vendor_name: c.vendor_name }));

  return (
    <PortalShell client={client} active="support" title="Support & Escalation">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <SupportForm cases={caseOptions} />

        <div className="rounded-card border border-line bg-surface">
          <div className="border-b border-line px-4 py-3 font-display text-sm font-bold text-ink">
            My Requests
          </div>
          {requests.length === 0 ? (
            <div className="p-6 text-center">
              <div className="text-[14px] font-semibold text-ink-2">All caught up</div>
              <div className="text-[13px] text-muted">No requests yet</div>
            </div>
          ) : (
            requests.map((r) => (
              <div key={r.id} className="flex items-start gap-3 border-b border-line px-4 py-3 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[12px] font-semibold text-brand">{r.sr_number}</div>
                  <div className="truncate text-[14px] font-medium text-ink">{r.subject}</div>
                  <div className="text-[12px] text-muted">
                    {r.type.replace("_", " ")} • {fmt(r.created_at)}
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_CLS[r.status] ?? STATUS_CLS.open}`}>
                  {r.status.replace("_", " ")}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </PortalShell>
  );
}
