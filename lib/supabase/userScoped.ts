import "server-only";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

// ── THE JWT-SCOPED CLIENT (ADR-RLS-001 step 4; provider enabled by the founder 2026-08-21,
// issuer https://maximum-dragon-9.clerk.accounts.dev, `sub` confirmed in claims_supported) ────
//
// ANON key + the caller's VERIFIED Clerk session token: PostgREST verifies the JWT against
// Clerk's JWKS on every request and RLS policies read the `sub` claim via get_current_user_id().
// Identity is request-scoped by construction — the pooled-GUC footgun (ADR-RLS-001) does not
// exist on this path. ⛔ NEVER "simplify" this to a set_config GUC: session-scope leaks identity
// ACROSS TENANTS on the connection pool; txn-scope never reaches the query.
//
// THIS IS NOT THE SERVICE-ROLE CLIENT and must never be used where one is expected:
//   · it sees ONLY the signed-in user's rows (RLS-enforced, zero rows for everyone else's data)
//   · it returns zero rows everywhere until the founder-run migration 20260820000100 teaches
//     get_current_user_id() to read the verified JWT — so nothing wires it into a portal read
//     path until scripts/rls-jwt-probe.ts has PASSED (wired early = portal outage, not a hole).
//
// Deliberately NOT wired into any read path in this commit (the ADR's own step 4 boundary).
// Read migration onto this client is a later, measured step, taken read-by-read after the probe.

export function createUserScopedClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false },
      // supabase-js v2 third-party auth: called per request; Clerk mints/refreshes the short-lived
      // session JWT. Null (signed out) → requests carry only the anon key → RLS grants nothing.
      accessToken: async () => (await auth()).getToken(),
    },
  );
}
