// Case statuses where research is actively progressing. The case detail page polls (router.refresh)
// while the status is one of these and STOPS once the case reaches a terminal/waiting state
// (awaiting_review, manual_override_required, awaiting_client, delivered, escalated, …). Keep in sync
// with the pipeline's status writes: the Inngest set-running step (research_running) +
// stageFinalize (awaiting_review / manual_override_required).
export const IN_PROGRESS_STATUSES = ["pending_intake", "research_running", "pending_review"] as const;

export function isResearchInProgress(status: string): boolean {
  return (IN_PROGRESS_STATUSES as readonly string[]).includes(status);
}
