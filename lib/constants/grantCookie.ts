// The invite-link handoff cookie — set by app/grant/[code]/route.ts, consumed (and the
// redemption attempted) on the first authenticated portal load in lib/data/client.ts.
// Dependency-free so both a route handler and the data layer can import it.
export const GRANT_COOKIE = "hyprriq_grant";
