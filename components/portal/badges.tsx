// Presentational mappings from DB enums -> client-facing pills. Verdict colors
// use the @theme verdict tokens (clear / conditional / verify / deny). Status
// labels are deliberately client-language (never "Track 1-5", never raw enum).

export type CaseStatus =
  | "pending_intake"
  | "intake_complete"
  | "queued"
  | "awaiting_client"
  | "research_running"
  | "awaiting_review"
  | "manual_override_required"
  | "qa_in_progress"
  | "approved"
  | "delivered"
  | "complete"
  | "cancelled"
  | "research_failed"      // H2 — pipeline exhausted retries / watchdog sweep (client sees a neutral delay)
  | "submission_failed";   // H2 — enqueue failed at submit; credit refunded; excluded from the client list

export type Verdict =
  | "source_clear"
  | "usable_with_conditions"
  | "verify_before_purchase"
  | "do_not_rely"
  | "pending";

export function isActionRequired(status: CaseStatus): boolean {
  return status === "awaiting_client";
}

const STATUS_META: Record<CaseStatus, { label: string; cls: string }> = {
  pending_intake: { label: "Submitted", cls: "bg-subtle text-ink-2" },
  intake_complete: { label: "Submitted", cls: "bg-subtle text-ink-2" },
  queued: { label: "Queued", cls: "bg-brand-tint text-brand-ink" },
  awaiting_client: { label: "⚠ Action Needed", cls: "bg-verify-bg text-verify-ink" },
  research_running: { label: "In Research", cls: "bg-brand-tint text-brand-ink" },
  awaiting_review: { label: "In Review", cls: "bg-subtle text-ink-2" },
  manual_override_required: { label: "In Review", cls: "bg-subtle text-ink-2" },
  qa_in_progress: { label: "In Review", cls: "bg-subtle text-ink-2" },
  approved: { label: "In Review", cls: "bg-subtle text-ink-2" },
  delivered: { label: "✓ Ready", cls: "bg-clear-bg text-clear-ink" },
  complete: { label: "Completed", cls: "bg-subtle text-ink-2" },
  cancelled: { label: "Cancelled", cls: "bg-subtle text-muted" },
  // H2 (OQ-3) — client-language, banned-language-safe; the admin dashboard shows the real state.
  research_failed: { label: "Delayed — under review", cls: "bg-verify-bg text-verify-ink" },
  submission_failed: { label: "Submission failed", cls: "bg-subtle text-muted" },
};

const VERDICT_META: Record<Verdict, { label: string; cls: string }> = {
  source_clear: { label: "Source Clear", cls: "bg-clear-bg text-clear-ink" },
  usable_with_conditions: { label: "Usable With Conditions", cls: "bg-conditional-bg text-conditional-ink" },
  verify_before_purchase: { label: "Verify Before Purchase", cls: "bg-verify-bg text-verify-ink" },
  do_not_rely: { label: "Do Not Rely", cls: "bg-deny-bg text-deny-ink" },
  pending: { label: "Pending", cls: "bg-subtle text-muted" },
};

const PILL = "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold";

export function StatusBadge({ status }: { status: CaseStatus }) {
  const m = STATUS_META[status] ?? STATUS_META.pending_intake;
  return <span className={`${PILL} ${m.cls}`}>{m.label}</span>;
}

export function VerdictBadge({ verdict }: { verdict: Verdict | null }) {
  const m = VERDICT_META[verdict ?? "pending"] ?? VERDICT_META.pending;
  return <span className={`${PILL} ${m.cls}`}>{m.label}</span>;
}

// Finding certainty pill — the RULED two-value client vocabulary (founder, 2026-08-07):
// Verified (at least one attached evidence item is LLM-certainty "verified") or Assessed
// (everything else — including absence, which is never doubt). "Unconfirmed"/"Inferred"
// no longer exist on client surfaces. Derivation: lib/portal/certainty.ts.
export type FindingCertainty = "verified" | "assessed";

const CERTAINTY_META: Record<FindingCertainty, { label: string; cls: string }> = {
  verified: { label: "Verified", cls: "bg-clear-bg text-clear-ink" },
  assessed: { label: "Assessed", cls: "bg-subtle text-ink-2" },
};

export function CertaintyBadge({ certainty }: { certainty: FindingCertainty }) {
  const m = CERTAINTY_META[certainty] ?? CERTAINTY_META.assessed;
  return <span className={`${PILL} ${m.cls}`}>{m.label}</span>;
}
