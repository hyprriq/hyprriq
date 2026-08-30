import { VerdictBadge } from "./verdict-badge";
import { SAMPLE_CASE_ID, SAMPLE_VENDOR } from "@/lib/content/sampleIdentifiers";

// SWAP POINT (post report-finalization): replace the mock document body with a
// real rendered first page of the PDF report. Keep the blur overlay so the full
// report stays gated — the teaser shows the shape, not the findings.
export function ReportPreview() {
  return (
    <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-[0_1px_2px_rgba(26,25,23,0.04),0_24px_60px_-24px_rgba(26,25,23,0.22)]">
      <div className="px-7 pt-7 pb-10">
        {/* report header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="font-display text-sm font-semibold text-ink">
              Source Intelligence Report
            </p>
            <p className="mt-0.5 font-mono text-xs tnum text-muted">
              {SAMPLE_CASE_ID} · {SAMPLE_VENDOR}
            </p>
          </div>
          <VerdictBadge verdict="conditional" size="sm" />
        </div>

        <div className="my-5 h-px bg-line" />

        {/* finding blocks */}
        <p className="text-xs font-medium uppercase tracking-wide text-brand-ink">
          Supplier Identity Check
        </p>
        <div className="mt-2 space-y-1.5">
          <div className="h-2.5 w-full rounded bg-subtle" />
          <div className="h-2.5 w-[92%] rounded bg-subtle" />
          <div className="h-2.5 w-[74%] rounded bg-subtle" />
        </div>

        <p className="mt-5 text-xs font-medium uppercase tracking-wide text-brand-ink">
          Supply Chain Relationship
        </p>
        <div className="mt-2 space-y-1.5">
          <div className="h-2.5 w-[88%] rounded bg-subtle" />
          <div className="h-2.5 w-full rounded bg-subtle" />
          <div className="h-2.5 w-[60%] rounded bg-subtle" />
        </div>

        <p className="mt-5 text-xs font-medium uppercase tracking-wide text-brand-ink">
          Brand Risk Assessment
        </p>
        <div className="mt-2 space-y-1.5">
          <div className="h-2.5 w-[80%] rounded bg-subtle" />
          <div className="h-2.5 w-[95%] rounded bg-subtle" />
        </div>
      </div>

      {/* blur gate — the report exists, the findings are earned */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 backdrop-blur-[5px]"
        style={{
          maskImage: "linear-gradient(to bottom, transparent, black 55%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent, black 55%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-28"
        style={{
          background: "linear-gradient(to bottom, rgba(255,255,255,0), var(--color-surface))",
        }}
      />
    </div>
  );
}
