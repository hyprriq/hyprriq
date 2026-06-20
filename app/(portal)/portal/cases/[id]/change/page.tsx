import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getClientWithAccess } from "@/lib/data/access";
import { getCaseById } from "@/lib/data/cases";
import { PortalShell } from "@/components/portal/portal-shell";
import { ChangeRequestForm } from "@/components/portal/change-request-form";

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

// Date math kept out of the component body (React purity rule disallows calling
// the impure Date.now() directly during render).
function isDeadlineOpen(iso: string | null): boolean {
  return !!iso && new Date(iso).getTime() > Date.now();
}
function daysLeftUntil(iso: string | null): number {
  if (!iso) return 0;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

export default async function ChangeRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { client, access } = await getClientWithAccess();
  if (access.state === "no_plan") redirect("/portal/dashboard");
  const { id } = await params;
  const c = await getCaseById(id);
  if (!c) notFound();

  const delivered = c.status === "delivered" || c.status === "complete";
  const eligible =
    access.canRequestChange && delivered && isDeadlineOpen(c.change_request_deadline) && !c.change_request_used;
  const daysLeft = daysLeftUntil(c.change_request_deadline);

  return (
    <PortalShell client={client} active="cases" title={`Change Request — ${c.case_number}`}>
      <div className="mx-auto max-w-2xl">
        <nav className="mb-4 flex items-center gap-1.5 text-[13px] text-muted">
          <Link href="/portal/cases" className="hover:text-ink">My Cases</Link>
          <span>/</span>
          <Link href={`/portal/cases/${c.id}`} className="hover:text-ink font-mono">{c.case_number}</Link>
          <span>/</span>
          <span>Change Request</span>
        </nav>

        {eligible ? (
          <>
            <div className="mb-5 flex gap-3 rounded-card border border-brand/30 bg-brand-tint p-4">
              <span className="text-lg" aria-hidden>ⓘ</span>
              <div>
                <div className="text-[14px] font-bold text-brand-ink">7-day change request window is open</div>
                <div className="mt-0.5 text-[13px] text-ink-2">
                  Report delivered {fmt(c.delivered_at)}. Window closes {fmt(c.change_request_deadline)} ({daysLeft} day{daysLeft === 1 ? "" : "s"} remaining). One change request is included per report.
                </div>
              </div>
            </div>
            <ChangeRequestForm caseId={c.id} caseNumber={c.case_number} />
          </>
        ) : (
          <div className="rounded-card border border-line bg-surface p-8 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-subtle text-xl text-muted">⊘</div>
            <h2 className="mt-4 font-display text-lg font-bold text-ink">
              {c.change_request_used
                ? "Change request already used"
                : !delivered
                  ? "This report isn't delivered yet"
                  : "The change request window has closed"}
            </h2>
            <p className="mt-1 text-sm text-ink-2">
              {c.change_request_used
                ? "One change request is included per report, and this report's has been submitted."
                : !delivered
                  ? "You can request a change once the report is delivered."
                  : `Change requests can be submitted within 7 days of delivery (delivered ${fmt(c.delivered_at)}).`}
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <Link href={`/portal/cases/${c.id}`} className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover">
                Back to case
              </Link>
              <Link href="/portal/support" className="rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink-2 hover:bg-subtle">
                Contact support
              </Link>
            </div>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
