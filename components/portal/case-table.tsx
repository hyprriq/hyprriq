import Link from "next/link";
import type { CaseRow } from "@/lib/data/cases";
import { StatusBadge, VerdictBadge } from "@/components/portal/badges";

function brandsLabel(brands: string[] | null): string {
  if (!brands || brands.length === 0) return "—";
  return brands.join(" • ");
}

function slaLabel(c: CaseRow): { text: string; tone: "ok" | "warn" | "muted" } {
  if (c.status === "delivered" || c.status === "complete") {
    return { text: "Delivered", tone: "muted" };
  }
  if (c.status === "cancelled") return { text: "—", tone: "muted" };
  if (!c.sla_deadline) return { text: "Queued", tone: "muted" };
  const days = Math.ceil((new Date(c.sla_deadline).getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return { text: "Due today", tone: "warn" };
  return { text: `${days} day${days === 1 ? "" : "s"}`, tone: days <= 1 ? "warn" : "ok" };
}

function RowAction({ c }: { c: CaseRow }) {
  if (c.status === "delivered") {
    return (
      <Link
        href={`/portal/cases/${c.id}`}
        className="rounded-md bg-brand px-2.5 py-1 text-[12px] font-bold text-white hover:bg-brand-hover"
      >
        View report
      </Link>
    );
  }
  if (c.queue_position != null && c.status !== "complete") {
    return (
      <span className="rounded-md bg-subtle px-2 py-1 text-[12px] font-semibold text-ink-2">
        Queue #{c.queue_position}
      </span>
    );
  }
  return (
    <Link
      href={`/portal/cases/${c.id}`}
      className="rounded-md border border-line bg-subtle px-2.5 py-1 text-[12px] font-semibold text-ink-2 hover:bg-line"
    >
      View
    </Link>
  );
}

export function CaseTable({
  cases,
  showAction = false,
  emptyLabel = "No cases yet.",
}: {
  cases: CaseRow[];
  showAction?: boolean;
  emptyLabel?: string;
}) {
  const cols = showAction
    ? "grid-cols-[110px_1fr_140px_150px_90px_110px]"
    : "grid-cols-[110px_1fr_140px_150px_90px]";

  if (cases.length === 0) {
    return (
      <div className="rounded-card border border-line bg-surface p-10 text-center text-sm text-muted">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface">
      <div className={`grid ${cols} gap-3 border-b border-line bg-subtle px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide text-muted`}>
        <span>Case ID</span>
        <span>Supplier / Brands</span>
        <span>Status</span>
        <span>Verdict</span>
        <span>SLA</span>
        {showAction && <span>Action</span>}
      </div>
      {cases.map((c) => {
        const sla = slaLabel(c);
        const slaTone =
          sla.tone === "warn" ? "text-verify-ink" : sla.tone === "ok" ? "text-ink-2" : "text-muted";
        return (
          <div
            key={c.id}
            className={`grid ${cols} items-center gap-3 border-b border-line px-4 py-3 last:border-b-0 ${
              c.status === "awaiting_client" ? "bg-verify-bg/60" : ""
            }`}
          >
            <Link href={`/portal/cases/${c.id}`} className="font-mono text-[13px] font-semibold text-brand hover:underline">
              {c.case_number}
            </Link>
            <div className="min-w-0">
              <div className="truncate text-[14px] font-semibold text-ink">
                {c.vendor_name ?? "—"}
              </div>
              <div className="truncate text-[12px] text-muted">{brandsLabel(c.brands_submitted)}</div>
            </div>
            <div><StatusBadge status={c.status} /></div>
            <div><VerdictBadge verdict={c.verdict} /></div>
            <div className={`text-[12px] font-semibold ${slaTone}`}>{sla.text}</div>
            {showAction && (
              <div><RowAction c={c} /></div>
            )}
          </div>
        );
      })}
    </div>
  );
}
