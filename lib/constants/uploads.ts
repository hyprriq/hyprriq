// Founder-ruled (2026-07-12): the case-document limit is a SILENT backend guardrail, not a portal
// feature — no "up to 5" hints or counters anywhere; the limit surfaces only when a sixth file is
// attempted, quietly. ONE flat constant, every tier; ONE message, shared by the intake form and
// the submit route so client and server can never disagree.
export const MAX_CASE_DOCUMENTS = 5;
export const FILE_LIMIT_MESSAGE = "Maximum 5 files — contact support if you need more.";

export function fileCountError(count: number): string | null {
  return count > MAX_CASE_DOCUMENTS ? FILE_LIMIT_MESSAGE : null;
}
