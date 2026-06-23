import type { PlanType } from "@/lib/constants/plans";
import { requiredFindingTracks } from "@/lib/constants/tracks";
import { getCaseTrackResults, type TrackResultRow } from "@/lib/data/track-results";

// ADR-G002 gate: report generation / delivery is blocked until EVERY required
// finding track has compiled findings AND founder_review_status approved|edited.
// Pure predicate (testable without a DB) + a thin DB-backed wrapper.
export function evaluateReportReady(plan: PlanType, rows: TrackResultRow[]): boolean {
  const required = requiredFindingTracks(plan);
  return required.every((n) => {
    const r = rows.find((x) => x.track_number === n);
    return !!r && r.compiled_findings_json !== null
      && (r.founder_review_status === "approved" || r.founder_review_status === "edited");
  });
}

export async function isCaseReadyForReport(caseId: string, plan: PlanType): Promise<boolean> {
  const rows = await getCaseTrackResults(caseId);
  return evaluateReportReady(plan, rows);
}
