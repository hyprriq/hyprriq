// Founder-ruled 2026-08-07 (supersedes 2026-07-12's five): the case-document cap is 2 on every
// tier that accepts uploads — the cap is OPERATIONAL, not a tier differentiator, and must never
// appear in pricing-comparison copy. WHY 2: this is a PRE-PURCHASE service — the buyer has a PO
// at most (invoices/LOAs come after a relationship exists); two slots covers the realistic case
// with one spare, and more slots means more parse paths, more unreadable-file escalations, and
// more reconciliation states for no product gain. Still a SILENT guardrail: no "up to N" hints
// or counters anywhere; the limit surfaces only when one file too many is attempted, quietly.
// ONE flat constant + ONE message shared by the intake form and the submit route.
import type { PlanType } from "@/lib/constants/plans";

export const MAX_CASE_DOCUMENTS = 2;
export const FILE_LIMIT_MESSAGE = "Maximum 2 files — contact support if you need more.";

// Per-file limits — ONE constant + ONE message each, shared by the intake form (UX) and the
// submit route (the rule; server-side since 2026-08-07 — type by CONTENT SNIFFING, never
// extension or client-claimed contentType).
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const FILE_SIZE_MESSAGE = "File must be 10MB or smaller.";
export const FILE_TYPE_MESSAGE = "Only PDF, JPG, or PNG files are accepted.";

export function fileCountError(count: number): string | null {
  return count > MAX_CASE_DOCUMENTS ? FILE_LIMIT_MESSAGE : null;
}

// $99 takes NO uploads (founder-ruled 2026-08-07): Documentation Review never runs on
// single_99, so accepting files would falsely imply review. Every other tier accepts uploads
// (Documentation Review runs on single_149 / growth / scale). Enforced SERVER-SIDE in the
// submit route — the form's disabled state is presentation, this predicate is the rule.
export function planAcceptsUploads(plan: PlanType | null | undefined): boolean {
  return plan !== "single_99" && plan != null;
}
