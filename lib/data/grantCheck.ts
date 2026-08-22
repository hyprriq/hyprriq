import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { grantDisplayState, type GrantLinkFields, type GrantDisplayState } from "@/lib/data/grantLink";
import { REDEEM_COPY } from "@/lib/data/grants";

// ── THE ONE COURTESY LOOKUP (item 1b/1c, founder-locked 2026-08-22) ──────────────────────────
//
// Server-side companion to lib/data/grantLink.ts: fetches the grant's validity fields and
// answers through the shared state derivation — used by the landing route, the /partners
// banner, and the sign-up code check. The redeem RPC remains the only gate; this exists so no
// surface promises what the gate will refuse.
//
// FAIL-OPEN IS NEVER SILENT (1c, founder-accepted): a lookup error means "couldn't check", and
// each caller decides open/closed for its surface — but every fail-open path records itself
// via logGrantCheckFailOpen (console + audit_log), because a fail-open's symptom is identical
// to the pre-fix bug (a banner for a dead link) and the founder must be able to tell them apart.

export type ClosedGrantState = Exclude<GrantDisplayState, "active"> | "no_such_code";

export type GrantCheck =
  | { outcome: "open" }
  | { outcome: "closed"; state: ClosedGrantState }
  | { outcome: "unavailable"; error: string };

export async function checkGrantCode(code: string): Promise<GrantCheck> {
  const lookup = (c: string) =>
    supabaseAdmin
      .from("acquisition_grants")
      .select("revoked_at, expires_at, redemption_count, max_redemptions")
      .eq("code", c)
      .maybeSingle();

  let { data, error } = await lookup(code);
  // Coupons are stored uppercase (HYPRR-…); a typed lowercase code gets one normalized retry —
  // the same courtesy redeemGrant extends at the gate.
  if (!error && !data && code.toUpperCase() !== code) {
    ({ data, error } = await lookup(code.toUpperCase()));
  }
  if (error) return { outcome: "unavailable", error: error.message };
  if (!data) return { outcome: "closed", state: "no_such_code" };
  const g = data as GrantLinkFields;
  const state = grantDisplayState(g);
  return state === "active" ? { outcome: "open" } : { outcome: "closed", state };
}

/**
 * A closed state in the words the gate would use — REUSES the pinned REDEEM_COPY (the billing
 * box's exact strings), so a dead code reads the same wherever it is typed (2c: one validation
 * path, one vocabulary).
 */
export function closedStateCopy(state: ClosedGrantState): string {
  switch (state) {
    case "revoked": return REDEEM_COPY.revoked;
    case "expired": return REDEEM_COPY.expired;
    case "fully_redeemed": return REDEEM_COPY.exhausted;
    case "no_such_code": return REDEEM_COPY.invalid_code;
  }
}

/** The 1c record: every fail-open writes console + audit_log (fail-soft — the reporter never blocks). */
export async function logGrantCheckFailOpen(surface: string, code: string, errorMessage: string): Promise<void> {
  console.error(`[grant-check] validity lookup failed on ${surface} for ${code.slice(0, 8)}… — FAILING OPEN (the redeem RPC remains the gate): ${errorMessage}`);
  try {
    await supabaseAdmin.from("audit_log").insert({
      table_name: "acquisition_grants", record_id: null, action: "INSERT",
      actor_id: "system", actor_type: "system",
      new_value: { grant_link_fail_open: true, surface, code_prefix: code.slice(0, 8), error: errorMessage },
    });
  } catch (e) {
    console.error(`[grant-check] audit write for the fail-open itself failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}
