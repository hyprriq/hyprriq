import "server-only";

// ── DEV-ONLY VALIDATION ROUTES ARE OFF UNLESS DELIBERATELY ARMED (CTO audit, 2026-08-22) ─────
//
// Two endpoints under /api/admin/dev exist to validate the research stack end-to-end:
// validate-track1 (runs the REAL runPipeline) and validate-acquisition (runs the REAL
// orchestrator + plugins). Both create throwaway cases and both SPEND REAL MONEY on every call
// — AI tokens, Serper queries, WHOIS lookups. Both carried a note in their own headers saying
// to remove them or keep them behind admin "once frozen"; Track 1 and 5.1a are frozen now.
//
// They are not deleted, because they are the instruments that prove the stack after an engine
// change — throwing them away would cost a rebuild the next time something needs proving. They
// are ARMED BY ENV instead: absent the flag they 404 (not 403 — a disabled dev tool should not
// advertise that it exists), so a production deploy cannot spend research budget or seed
// throwaway cases even if an operator session reaches the URL.
//
// To use one locally: set DEV_VALIDATION_ROUTES=1 in .env.local. Never set it in Production.

export function devValidationRoutesArmed(): boolean {
  return process.env.DEV_VALIDATION_ROUTES === "1";
}
