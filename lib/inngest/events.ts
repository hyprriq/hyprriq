// ── EVENT CONTRACTS (no Inngest client, deliberately) ───────────────────────────────────────
//
// Event NAMES and PAYLOAD TYPES live here, apart from the handlers that consume them, so a
// PUBLISHER can import the contract without importing the function module — and therefore without
// pulling the Inngest client into its module graph.
//
// That is not tidiness. The publish route imports this; importing the handler instead evaluated
// `inngest.createFunction` at module load and broke the route's own test, which mocks the client.
// A route that sends an event should depend on the event, not on the worker that handles it.

export const REPORT_PDF_EVENT = "report/render-pdf";

/** Rendered per DELIVERED ATTEMPT — the attempt is part of the identity, never "latest" (H1). */
export type ReportPdfEvent = { case_id: string; attempt: number };
