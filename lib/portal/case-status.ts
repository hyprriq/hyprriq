// Case statuses where research is actively progressing. The case detail page polls (router.refresh)
// while the status is one of these and STOPS once the case reaches a terminal/waiting state
// (awaiting_review, manual_override_required, awaiting_client, delivered, escalated, …). Keep in sync
// with the pipeline's status writes: the Inngest set-running step (research_running) +
// stageFinalize (awaiting_review / manual_override_required).
export const IN_PROGRESS_STATUSES = ["pending_intake", "research_running", "pending_review"] as const;

export function isResearchInProgress(status: string): boolean {
  return (IN_PROGRESS_STATUSES as readonly string[]).includes(status);
}

// Interim client-facing guard (ADR-T2-002 follow-up, until the Phase H client report ships): a client
// may see raw research findings ONLY once their case has been reviewed + DELIVERED. Before that (incl.
// internal-review states like awaiting_review / qa_in_progress) the client sees a placeholder, so
// unreviewed raw research output is never exposed. Admin surfaces are unaffected (separate components).
const CLIENT_VISIBLE_STATUSES = ["delivered", "complete"] as const;

export function findingsVisibleToClient(status: string): boolean {
  return (CLIENT_VISIBLE_STATUSES as readonly string[]).includes(status);
}
