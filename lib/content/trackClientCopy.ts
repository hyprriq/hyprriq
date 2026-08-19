// ── CLIENT COPY FOR TRACKS THAT PRODUCED NO FINDING (2026-08-19) ────────────────────────────
//
// WHY THIS EXISTS: `pipeline.steps.ts` has FIVE sites that write `compiled_findings_json.summary`.
// One is the scored path (now `client_summary`). The other four are failure/absence branches, and
// every one of them assigned `summary: out.reasoning_notes` — an INTERNAL status string — straight
// into a client-facing field. That is the same root cause as the scored path, and it is where the
// dev-era "stub track_N for case 7e2bd898-…" text reached client payloads on 19 cases.
//
// On these branches THERE IS NO MODEL client_summary TO USE: the model failed, or never ran. So the
// text is CODE-OWNED and constant — the one case where a fixed sentence is more honest than
// generated prose, because there is genuinely nothing to report.
//
// RULES THESE STRINGS FOLLOW (the ruled client vocabulary, not new invention):
//  · ABSENCE IS NOT AN ACCUSATION. "No documents were provided" is a fact about the record, never a
//    finding against the supplier.
//  · NEVER CLAIM A VERDICT EFFECT WE DO NOT HAVE. An unassessed area neither raises nor lowers the
//    verdict — that wording already exists in the report's own Not-assessed definition.
//  · NO INTERNAL VOCABULARY. No track keys, no stage names, no "acquisition", no "LLM", no ids.
//  · NO APOLOGY AND NO ALARM. A held area is a normal state of a report, not an incident.
export const TRACK_CLIENT_COPY = {
  /** The track is not built for this plan/version — it produced no finding by design. */
  not_implemented:
    "This area was not assessed for this report. It neither raises nor lowers the verdict.",

  /** Documentation Review with nothing to review — the ruled absence branch (OQ-A3). */
  nothing_to_review:
    "No documents were provided for review, so this area was not assessed. It neither raises nor lowers the verdict.",

  /** Research could not be completed — held for human review, never scored. */
  acquisition_failed:
    "We could not complete research for this area, so it was not assessed. It has been held for review and neither raises nor lowers the verdict.",

  /** The model call failed or returned unusable output — same client meaning as above. */
  llm_failed:
    "We could not complete research for this area, so it was not assessed. It has been held for review and neither raises nor lowers the verdict.",

  /**
   * The scored path returned no client_summary (an older attempt, or a response that omitted the
   * key). ⚠ THE FALLBACK IS NEVER reasoning_notes — falling back would silently restore the exact
   * defect client_summary exists to remove, and it would look like it was working.
   */
  missing_client_summary:
    "The detail for this area is in the findings below.",
} as const;

export type TrackClientCopyKey = keyof typeof TRACK_CLIENT_COPY;
