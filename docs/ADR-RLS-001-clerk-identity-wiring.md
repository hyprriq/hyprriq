# ADR-RLS-001: How Postgres learns the Clerk user — verified JWT, not a settable GUC

**Status:** Proposed (founder decision + two founder-run enable steps)
**Date:** 2026-08-20
**Deciders:** Founder
**Supersedes the naive reading of:** "Clerk→GUC wiring is now safe to land"

## Context

The escalation hole is closed and independently re-verified (2026-08-20): with the
`clients_self_update` WITH CHECK live, a spoofed `authenticated` session attempting
`update clients set role='founder'` is **REFUSED** ("new row violates row-level security policy"),
a legitimate self-edit still succeeds, and the target row's role is unchanged. So RLS is now safe
to make *functional* for a non-service-role path — today it is inert defense-in-depth behind the
service-role client, which bypasses RLS and hand-scopes every query by `.eq("client_id", userId)`.

The RLS policies read identity through `get_current_user_id()`, currently:

```sql
SELECT current_setting('app.current_user_id', true)   -- a GUC (session/txn variable)
```

The obvious next step — "wire Clerk into that GUC" — has a footgun that must be named before
anyone builds it.

## The footgun: `set_config` over a pooled REST connection

PostgREST (the Supabase REST layer supabase-js talks to) **pools Postgres connections**. Setting
the identity GUC per request has no safe form over that interface:

- `set_config('app.current_user_id', uid, false)` — **session-scoped → LEAKS.** The value
  survives on the pooled connection into the *next* request, so user A's identity bleeds into
  user B's query. A cross-tenant data breach, intermittent and pool-dependent — the worst kind.
- `set_config('app.current_user_id', uid, true)` — **transaction-scoped → doesn't reach the
  query.** supabase-js sends each `.select()` as its own PostgREST request (its own transaction).
  A separate RPC that sets the local GUC is a different transaction; the value is gone before the
  read runs.

There is no third form. A per-request identity GUC over supabase-js is either leaky or empty.
**Do not build it.** (This is also why the RLS proof measured "header/GUC injection ignored":
nothing sets it, and nothing safely can.)

## Decision: identity comes from a cryptographically verified Clerk JWT

Clerk mints a short-lived session JWT. Supabase is configured to trust Clerk as a **third-party
auth provider** and verifies the token against Clerk's JWKS on every request. PostgREST exposes
the verified claims at `current_setting('request.jwt.claims')`. `get_current_user_id()` reads the
`sub` claim from there.

Why this is correct where the GUC is not:

| Property | `set_config` GUC | Verified Clerk JWT |
|---|---|---|
| Per-request isolation | leaks on the pool | perfect — claims are request-scoped |
| Spoofable by the token holder | yes (a header/GUC is just data) | no — the signature is verified against JWKS |
| Browser-safe | never | yes — a browser cannot forge the JWT |
| supabase-js support | none (no safe injection point) | native (`accessToken` async option, v2) |

`get_current_user_id()` keeps the GUC read as a **fallback**, so any legitimate *server-side*
path that sets a transaction-local GUC inside a single function/transaction still works, and the
service-role admin path is untouched. Client identity, though, comes only from the verified JWT.

## Options considered

- **A · `set_config` GUC per request** — rejected: the pooled-connection leak above. Unsafe at
  any speed.
- **B · Verified Clerk JWT (third-party auth)** — chosen. Footgun-free, browser-safe, native
  supabase-js support, and the industry-standard Clerk×Supabase pattern.
- **C · Do nothing, stay service-role + hand-scoping** — the safe status quo. RLS stays inert
  defense-in-depth. Acceptable, but leaves the second layer un-enforced; the escalation fix was
  done precisely to make B reachable, so B is the intended destination.

## Consequences

- Easier: RLS becomes a *real* second layer. A future slip in hand-scoping no longer exposes
  cross-tenant data on any path that runs through the JWT-scoped client.
- Harder: reads migrated onto the JWT-scoped client will return **zero rows until both enable
  steps below are done** — so the client factory and any read migration land in the SAME session
  the provider is enabled, verified end-to-end against the adversarial suite. A client wired in
  early is a portal outage (everything returns empty), not a security hole — but still a bug to
  avoid, which is why nothing lands ahead of the config.
- Revisit: whether to move the client-facing reads in `lib/data/cases.ts` /
  `lib/data/synthesis.ts` off service-role onto the JWT client once it is proven — a later,
  measured migration, not part of enabling the wiring.

## Action items — TWO are founder-run (dashboard); the code + migration follow, verified together

1. [ ] **(Founder · Clerk dashboard)** Add a JWT template / confirm the session token carries
       `sub` = the Clerk user id. Clerk's default session token already exposes `sub`; no custom
       template is required for third-party auth — confirm and note the issuer URL.
2. [ ] **(Founder · Supabase dashboard)** Authentication → Sign In / Providers → **Third-Party
       Auth → add Clerk**, pasting the Clerk issuer domain. This is what makes PostgREST verify
       the token and populate `request.jwt.claims`. No secret is stored; verification is via
       Clerk's public JWKS.
3. [ ] **(Founder-run migration, described-and-stopped below)** Teach `get_current_user_id()` to
       read the verified JWT `sub` first, GUC as fallback.
4. [ ] **(Claude, same session as 1–3)** `createUserScopedClient()` — anon key + `accessToken`
       returning the Clerk session token; guarded so it can never be mistaken for the service-role
       client. Not wired into any read path in this step.
5. [ ] **(Claude)** Re-run `scripts/rls-adversarial.ts` AND a new authenticated-JWT probe: the
       real client sees only their own rows; another client's id sees zero; escalation still
       refused. Only then consider migrating specific reads (a separate, measured step).

### The migration (describe-and-stop — the founder runs it, AFTER steps 1–2)

File written alongside this ADR:
`supabase/migrations/20260820000100_get_current_user_id_reads_jwt.sql`. It is inert until the
provider is on (no JWT claims → falls back to the GUC → behaves exactly as today), so ordering is
forgiving, but the intended order is: enable provider (1–2) → run migration (3) → land code (4) →
verify (5).
