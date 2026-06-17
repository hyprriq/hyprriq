import { VerdictBadge } from "./verdict-badge";

// The hero artifact: a tasteful mock of HyprrIQ's one-page Decision Snapshot.
// The product's deliverable IS the hero image — anonymized, on-brand, no stock
// photo. CSS load choreography lives in globals.css (hq-rise / hq-verdict).
const DIMENSIONS = [
  { label: "Supplier Identity", state: "Verified", tone: "text-clear-ink" },
  { label: "Supply Chain Relationship", state: "Inferred", tone: "text-conditional-ink" },
  { label: "Brand Risk", state: "Verified", tone: "text-clear-ink" },
  { label: "Sourcing Logic", state: "Holds together", tone: "text-clear-ink" },
];

const ASK = [
  "Request the distribution agreement covering this brand.",
  "Confirm the invoice ships from the address on file.",
  "Ask which authorized distributor they source through.",
];

export function DecisionSnapshot() {
  return (
    <div className="w-full max-w-md rounded-[var(--radius-card)] border border-line bg-surface shadow-[0_1px_2px_rgba(26,25,23,0.04),0_12px_32px_-12px_rgba(26,25,23,0.16)]">
      {/* Header */}
      <div className="hq-rise flex items-center justify-between border-b border-line px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs tnum text-muted">AWI-2606-014</span>
        </div>
        <span className="text-xs text-muted">Decision Snapshot</span>
      </div>

      {/* Vendor + verdict */}
      <div className="hq-rise px-5 pt-5" style={{ animationDelay: "0.08s" }}>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Vendor</p>
        <p className="mt-0.5 text-lg font-semibold text-ink">Northgate Wholesale Co.</p>
        <p className="mt-0.5 text-sm text-ink-2">Brands reviewed · Anker, Soundcore</p>
        <div className="hq-verdict mt-4">
          <VerdictBadge verdict="conditional" />
        </div>
        <p className="mt-3 text-sm leading-relaxed text-ink-2">
          Source appears credible. Collect the items below before committing
          significant capital.
        </p>
      </div>

      {/* Dimensions */}
      <div className="hq-rise mt-5 border-t border-line px-5 py-4" style={{ animationDelay: "0.16s" }}>
        <p className="mb-2.5 text-xs font-medium uppercase tracking-wide text-muted">
          What we looked at
        </p>
        <ul className="space-y-2">
          {DIMENSIONS.map((d) => (
            <li key={d.label} className="flex items-center justify-between text-sm">
              <span className="text-ink-2">{d.label}</span>
              <span className={`font-medium ${d.tone}`}>{d.state}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* What to ask */}
      <div
        className="hq-rise rounded-b-[var(--radius-card)] border-t border-line bg-subtle px-5 py-4"
        style={{ animationDelay: "0.24s" }}
      >
        <p className="mb-2.5 text-xs font-medium uppercase tracking-wide text-brand-ink">
          What to ask your vendor
        </p>
        <ul className="space-y-2">
          {ASK.map((q, i) => (
            <li key={q} className="flex gap-2.5 text-sm text-ink-2">
              <span className="mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded-full border border-line-strong font-mono text-[10px] text-muted">
                {i + 1}
              </span>
              <span className="leading-snug">{q}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
