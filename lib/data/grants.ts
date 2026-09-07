import "server-only";
import { randomBytes } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { PlanType } from "@/lib/constants/plans";

// ── ACQUISITION GRANTS — Phase 2 data layer (founder-ruled 2026-08-21) ───────────────────────
//
// Shapes are the FOUNDER-APPLIED live schema (verified live; supabase/migrations/20260821000200
// is the as-applied record): acquisition_grants {code, mode link|coupon, grant_plan_type,
// grant_credits, max_redemptions, redemption_count, expires_at, created_by, note, revoked_at} +
// grant_redemptions {grant_id, client_id, email} + clients.referred_by_grant_id (attribution).
//
// EVERY redemption goes through the redeem_acquisition_grant RPC (20260821000400, founder-run)
// — the H6 pattern: the counter, the max check, and the plan-and-credit-together write are one
// row-locked transaction. NOTHING else writes these tables. Until the founder runs the RPC,
// redemption answers 'unavailable' (fail-soft, the newsletter pattern) and nothing breaks.
//
// FRAMING (ruled): a grant is described as a FULL ASSESSMENT — never by tier name. The tier it
// technically grants is a mechanism, not copy.
//
// ── THE GRANT VALUE IS A RULING, NOT A DEFAULT (founder-locked 2026-08-22, item 3) ──
// grant_plan_type = growth_279: all five assessment areas, NO category compliance — Track 6
// gates on scale_499/single_149 and depends on Keepa, which is not built; a tester must never
// receive a section that exists unable to answer its own question. The previous value
// (scale_499) reached production as a `??` FALLBACK the founder discovered by reading a
// database row — which is why createGrant now takes NO plan, credit, cap, or expiry defaults:
// every product-facing value is either a named ruled constant or an explicit caller argument.
// Tiers not sold are NOT grantable: no API accepts a plan input, and this module writes only
// GRANT_PLAN_TYPE.

export type GrantMode = "link" | "coupon";

// The ruled grant value (founder-locked 2026-08-22): one free full assessment on growth_279.
// Not parameters, not defaults — changing either is a new ruling, not an edit.
export const GRANT_PLAN_TYPE: PlanType = "growth_279";
export const GRANT_CREDITS = 1;

export interface AcquisitionGrant {
  id: string;
  code: string;
  mode: GrantMode;
  grant_plan_type: PlanType;
  grant_credits: number;
  max_redemptions: number;
  redemption_count: number;
  expires_at: string;
  created_by: string;
  /** The intended recipient, normalized lower/trim — NULL = unbound (the campaign-coupon case).
   *  Set by Approve from the partner request; optional on the manual form. The RPC refuses any
   *  other verified email with 'wrong_account'. Added 2026-09-07 after the issuer consumed a
   *  partner grant whose recipient existed only as free text in `note`. */
  recipient_email?: string | null;
  note: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface GrantRedemption {
  id: string;
  grant_id: string;
  client_id: string;
  email: string;
  redeemed_at: string;
}

export type RedeemStatus =
  | "ok" | "invalid_code" | "revoked" | "expired" | "exhausted"
  | "no_client" | "already_has_plan" | "email_already_used" | "unavailable"
  // ── 2026-09-07, two words for two LAWS (founder-ruled; do not fold them together):
  // wrong_account       — per-GRANT: a recipient was named at creation and this is not them.
  // issuer_cannot_redeem — per-SYSTEM: unconditional, both modes. "A coupon may be unbound to
  //                        recipients; it is never redeemable by its creator."
  | "wrong_account" | "issuer_cannot_redeem";

/**
 * TERMINAL statuses can never succeed on retry with the same code+account — the attach flow
 * clears its cookie and audits on these. Retryable ones (unavailable = RPC/transport down,
 * no_client = provisioning race) keep the cookie so the next attempt can succeed.
 */
export function isTerminalRedeemStatus(s: RedeemStatus): boolean {
  return s !== "ok" && s !== "unavailable" && s !== "no_client";
}

// Link slugs are unguessable (the URL is the secret); coupon codes are human-typeable —
// unambiguous alphabet (no 0/O/1/I/L), HYPRR- prefix so a screenshot reads as ours.
const LINK_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const COUPON_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomFrom(alphabet: string, length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

export function generateGrantCode(mode: GrantMode): string {
  return mode === "link" ? randomFrom(LINK_ALPHABET, 28) : `HYPRR-${randomFrom(COUPON_ALPHABET, 8)}`;
}

export async function createGrant(opts: {
  mode: GrantMode;
  note: string;
  createdBy: string;
  /** REQUIRED (may be null) — the caller DECIDES bound vs unbound; no silent default, the same
   *  law as expiry and the cap. Approve passes the request's email; the manual form passes its
   *  optional field or null. */
  recipientEmail: string | null;
  /** REQUIRED — the admin route clamps to the ruled 30-day ceiling; no silent default here. */
  expiresDays: number;
  /** REQUIRED — the admin route decides the cap explicitly; no silent default here. */
  maxRedemptions: number;
}): Promise<{ grant: AcquisitionGrant | null; error: string | null }> {
  const code = generateGrantCode(opts.mode);
  const { data, error } = await supabaseAdmin
    .from("acquisition_grants")
    .insert({
      code,
      mode: opts.mode,
      grant_plan_type: GRANT_PLAN_TYPE, // ruled, never chosen (item 3, 2026-08-22)
      grant_credits: GRANT_CREDITS,
      max_redemptions: opts.maxRedemptions,
      expires_at: new Date(Date.now() + opts.expiresDays * 86_400_000).toISOString(),
      created_by: opts.createdBy,
      note: opts.note || null,
      // Normalized HERE, at the one write site, with the same lower/trim the RPC applies to the
      // redeemer's email — the comparison must never fail on case or whitespace.
      recipient_email: opts.recipientEmail?.trim() ? opts.recipientEmail.trim().toLowerCase() : null,
    })
    .select("*")
    .single();
  if (error) return { grant: null, error: error.message };
  return { grant: data as AcquisitionGrant, error: null };
}

export async function listGrants(): Promise<{ grants: AcquisitionGrant[]; redemptions: GrantRedemption[] }> {
  const [{ data: grants }, { data: redemptions }] = await Promise.all([
    supabaseAdmin.from("acquisition_grants").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.from("grant_redemptions").select("*").order("redeemed_at", { ascending: false }),
  ]);
  return { grants: (grants ?? []) as AcquisitionGrant[], redemptions: (redemptions ?? []) as GrantRedemption[] };
}

export interface AttachFailure {
  status: string;
  code_prefix: string;
  client_id: string;
  at: string;
}

/**
 * Failed invite attaches (grant-carrier rework, 2026-08-21): the attach route audits every
 * TERMINAL failure — this surfaces the recent ones so the founder can see an invite that
 * landed on an account but could not apply (the silent-loss failure, made visible).
 */
export async function listAttachFailures(limit = 20): Promise<AttachFailure[]> {
  const { data } = await supabaseAdmin
    .from("audit_log")
    .select("new_value, created_at")
    .eq("table_name", "grant_redemptions")
    .order("created_at", { ascending: false })
    .limit(limit * 3); // over-fetch; not every grant_redemptions audit row is an attach failure
  const out: AttachFailure[] = [];
  for (const r of data ?? []) {
    const v = r.new_value as { grant_attach_failed?: boolean; status?: string; code_prefix?: string; client_id?: string } | null;
    if (v?.grant_attach_failed) {
      out.push({
        status: v.status ?? "unknown", code_prefix: v.code_prefix ?? "?", client_id: v.client_id ?? "?",
        at: r.created_at as string,
      });
      if (out.length >= limit) break;
    }
  }
  return out;
}

export async function revokeGrant(id: string): Promise<{ error: string | null }> {
  const { error } = await supabaseAdmin
    .from("acquisition_grants")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .is("revoked_at", null);
  return { error: error?.message ?? null };
}

/**
 * Redeem — the ONE write path, via the founder-run RPC. Returns a status word; the caller maps
 * it to client-facing copy. A missing RPC (not yet run) or transport failure → 'unavailable',
 * never a throw and never a client-side reimplementation of the checks.
 */
export async function redeemGrant(code: string, clientId: string): Promise<RedeemStatus> {
  const cleaned = code.trim();
  if (!cleaned) return "invalid_code";
  const attempt = async (c: string): Promise<RedeemStatus> => {
    const { data, error } = await supabaseAdmin.rpc("redeem_acquisition_grant", { p_code: c, p_client_id: clientId });
    if (error) {
      console.error(`[grants] redeem RPC failed: ${error.message}`);
      return "unavailable";
    }
    return (data as RedeemStatus) ?? "unavailable";
  };
  let status = await attempt(cleaned);
  // Coupons are stored uppercase (HYPRR-…); a typed lowercase code gets one normalized retry.
  if (status === "invalid_code" && cleaned.toUpperCase() !== cleaned) {
    status = await attempt(cleaned.toUpperCase());
  }
  if (status === "ok") {
    // Billing history (the 7a design note carried forward): grant redemptions are money-shaped
    // events and belong in billing_audit. Fail-soft — the redemption already landed atomically.
    //
    // ⚠ THIS INSERT FAILED ON EVERY REDEMPTION FROM 2026-08-21 TO 2026-09-07 and the catch below
    // hid it: billing_audit_event_check did not include 'grant_redeemed', so the write violated
    // the CHECK and the fail-soft swallowed the error inside a success path — rule 14 in a place
    // nobody had looked. Found only because the path's FIRST real redemption prompted a count
    // (1 redemption, 0 rows). The 20260907000000 migration widens the CHECK; the catch stays
    // fail-soft (the redemption already landed) but is no longer the only witness.
    try {
      await supabaseAdmin.from("billing_audit").insert({
        client_id: clientId,
        event: "grant_redeemed",
        new_plan: null,
        source: "grant",
        notes: `Acquisition grant redeemed (code ${cleaned.slice(0, 6)}…)`,
      });
    } catch (e) {
      console.error(`[grants] billing_audit write failed (non-fatal): ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return status;
}

/** Client-facing copy per status — "full assessment", never the tier name (ruled framing). */
// ── THE MASKED REFUSAL (founder-ruled 2026-09-07): "never echo the full target address to
// whoever is holding a forwarded link — the full address turns a refusal into an information
// leak." First character + ••• + full domain: enough for the right person to recognize their
// own address, nothing for a stranger to harvest.
export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "•••";
  return `${email[0]}•••${email.slice(at)}`;
}

/** ONE definition of the wrong-account message, shared by the attach and coupon-redeem routes —
 *  two hand-kept copies of a refusal string is the scanner/locator drift class. */
export function wrongAccountMessage(recipientEmail: string | null): string {
  return recipientEmail
    ? `This invite was issued to a different email address (${maskEmail(recipientEmail)}). Sign in with that address and open your invite link again, or ask us to reissue it.`
    : REDEEM_COPY.wrong_account;
}

/** Read-only recipient lookup so a refusal can name its mask. Null on any miss — the generic
 *  copy is the fallback, never an error in a refusal path. */
export async function getGrantRecipientByCode(code: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("acquisition_grants").select("recipient_email").eq("code", code.trim()).maybeSingle();
  return (data?.recipient_email as string | null) ?? null;
}

export const REDEEM_COPY: Record<Exclude<RedeemStatus, "ok">, string> = {
  invalid_code: "That code isn't recognized — check it and try again.",
  revoked: "This code is no longer active.",
  expired: "This code has expired.",
  exhausted: "This code has already been used the maximum number of times.",
  no_client: "We couldn't find your account — try signing out and back in.",
  already_has_plan: "Your account already has a plan, so this code can't be applied to it.",
  email_already_used: "This code has already been used with this email address.",
  unavailable: "Codes can't be applied right now — please try again shortly.",
  // The generic form — the routes upgrade it to the MASKED form when the recipient is known.
  wrong_account: "This invite was issued to a different email address. Sign in with the address it was sent to, or ask us to reissue it.",
  issuer_cannot_redeem: "This code was created from your own operator account and can't be redeemed by it.",
};
export const REDEEM_SUCCESS_COPY =
  "Your free full assessment is ready — one report credit has been added to your account. Submit a supplier whenever you're ready.";
