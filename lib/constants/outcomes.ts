// H6 — case_outcomes shared constants (client-safe: no server imports; the outcome panel needs
// the enum + labels in the browser). Mirrors the DB CHECK on case_outcomes.outcome_type —
// extend both together or not at all. Server-side data access lives in lib/data/outcomes.ts.
export const OUTCOME_TYPES = [
  "no_issues", "ip_complaint", "invoice_rejected", "account_action",
  "brand_enforcement", "client_stopped_using_vendor", "other",
] as const;
export type OutcomeType = (typeof OUTCOME_TYPES)[number];

export const OUTCOME_LABELS: Record<OutcomeType, string> = {
  no_issues: "No issues — worked as predicted",
  ip_complaint: "IP complaint received",
  invoice_rejected: "Invoice rejected by Amazon",
  account_action: "Account action / health hit",
  brand_enforcement: "Brand enforcement action",
  client_stopped_using_vendor: "Client stopped using vendor",
  other: "Other (notes)",
};

export interface CaseOutcome {
  outcome_type: string | null;
  outcome_notes: string | null;
  prediction_correct: boolean | null;
  outcome_reported_at: string | null;
  verdict_at_delivery: string | null;
  checkpoint_30_sent_at: string | null;
  checkpoint_90_sent_at: string | null;
}
