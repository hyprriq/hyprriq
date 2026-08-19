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
export type ReportPdfEvent = {
  case_id: string;
  attempt: number;
  /**
   * The portal origin for the email's 'View your report' link.
   *
   * ⚠ CARRIED ON THE EVENT, NOT READ FROM AN ENV VAR — AND THAT WAS A BUG I SHIPPED FOR ONE
   * COMMIT. The publish route always knew the correct origin, because the request came from it
   * (`new URL(req.url).origin`, which is what the old synchronous email used). Moving the email
   * into the render job replaced that self-deriving value with `NEXT_PUBLIC_APP_URL` — a variable
   * NOTHING ELSE in this codebase reads, so there is no reason to believe it is set in the
   * deployed environment, and the link would have rendered HOST-LESS in a real client's inbox.
   * The publisher knows the origin; the worker should be told it rather than guess.
   * The env var remains only as a fallback for an event published without one.
   */
  origin?: string;
};
