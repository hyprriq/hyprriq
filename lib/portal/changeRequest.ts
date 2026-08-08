// PRE-DESIGN BATCH (2026-08-08, gap audit 5.1): the change-request feature was fully built with
// ZERO entry points. This is the ONE shared eligibility read — the change page re-guards
// server-side (including access.canRequestChange); this only decides whether an entry link shows.
export function changeRequestOpen(c: {
  status: string;
  change_request_deadline: string | null;
  change_request_used: boolean;
}): boolean {
  const delivered = c.status === "delivered" || c.status === "complete";
  return (
    delivered &&
    !c.change_request_used &&
    !!c.change_request_deadline &&
    new Date(c.change_request_deadline).getTime() > Date.now()
  );
}
