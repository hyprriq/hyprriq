// ── ASIN intake (tracker §1.3, Keepa ruling 4 — founder-ruled 2026-07-28: Scale = 5 brands,
// 1 ASIN per brand). DEPENDENCY-FREE except plans constants (client-importable; the
// client-boundary lock applies). The CODE GUARD lives here — the form is a convenience,
// this function is the rule. Caps read from PLAN_BRAND_CAPS, NEVER from the DB's
// max_brands_per_credit (NULL on every live row — code is the authority).
//
// Keepa does NOT read this module yet — it only guarantees the value is clean and threaded
// (see lib/research/intakeExtras.ts for how it rides TrackContext without touching the
// frozen contracts.ts).

import { PLAN_BRAND_CAPS, brandCapForPlan, KEEPA_LIVE, type PlanType } from "@/lib/constants/plans";

// Amazon ASINs are 10 chars, alphanumeric uppercase (modern ones start B0; legacy ASINs are
// ISBN-10s, so we accept the general 10-char form rather than hardcoding the B0 prefix).
export const ASIN_RE = /^[A-Z0-9]{10}$/;

// ── ASIN GATING (founder-ruled 2026-08-07): the field is gated on KEEPA_LIVE, NOT on plan
// alone. Keepa is scheduled but does not exist — while KEEPA_LIVE is false, NO ASIN field
// renders anywhere on any plan, so the form can never quietly collect a field nothing consumes
// (the exact failure removed from $99 uploads). When the flag flips, collection lights up for
// the ELIGIBLE plans below (one ASIN per brand). ASIN-optional RULED 2026-08-02 stands. ──
export const PLAN_ASIN_ELIGIBLE: Record<PlanType, boolean> = {
  single_99: false,
  single_149: true,
  growth_279: false,
  scale_499: true,
};

export function planCollectsAsins(plan: PlanType | null | undefined): boolean {
  return KEEPA_LIVE && !!plan && PLAN_ASIN_ELIGIBLE[plan];
}

export function normalizeAsin(raw: string): string {
  return raw.trim().toUpperCase();
}

export type BrandAsinResult =
  | { ok: true; clean: Record<string, string> | null }
  | { ok: false; error: string; message: string };

/**
 * The guard: ONE ASIN per brand (structural — the map admits one value per key), every ASIN
 * belongs to a submitted brand, valid format, plan must collect ASINs, and the total can never
 * exceed the plan brand cap (5/5 max by the ruled numbers). Empty values are dropped, not errors.
 * Returns clean=null when nothing (valid) was provided — the DB column stays null.
 */
export function validateBrandAsins(
  plan: PlanType | null | undefined,
  brands: string[],
  asinByBrand: Record<string, unknown> | null | undefined,
): BrandAsinResult {
  const entries = Object.entries(asinByBrand ?? {})
    .map(([brand, v]) => [brand.trim(), normalizeAsin(String(v ?? ""))] as const)
    .filter(([, asin]) => asin.length > 0);
  if (entries.length === 0) return { ok: true, clean: null };

  if (!planCollectsAsins(plan)) {
    return {
      ok: false,
      error: "asin_not_available",
      message: "ASINs are collected on the Scale plan — your plan researches the supplier and brands without a listing-level check.",
    };
  }
  const cap = brandCapForPlan(plan);
  if (entries.length > cap) {
    return { ok: false, error: "asin_cap", message: `Up to ${cap} ASINs — one per brand.` };
  }
  const brandSet = new Set(brands.map((b) => b.trim().toLowerCase()));
  const clean: Record<string, string> = {};
  for (const [brand, asin] of entries) {
    if (!brandSet.has(brand.toLowerCase())) {
      return { ok: false, error: "asin_unknown_brand", message: `ASIN given for “${brand}”, which is not in your brand list.` };
    }
    if (!ASIN_RE.test(asin)) {
      return { ok: false, error: "asin_format", message: `“${asin}” is not a valid ASIN (10 letters/digits, e.g. B0ABC12345).` };
    }
    if (clean[brand] !== undefined) {
      return { ok: false, error: "asin_duplicate_brand", message: `More than one ASIN for “${brand}” — one per brand.` };
    }
    clean[brand] = asin;
  }
  return { ok: true, clean };
}

// Graceful at-cap explanation (entry tiers especially) — shown by the form when the brand list
// is full. A sentence, never an error state. Cap text derives from the same constants.
export function brandCapMessage(plan: PlanType | null | undefined): string {
  const cap = brandCapForPlan(plan);
  return cap === 1
    ? "Your plan researches one brand per case — one deep supplier-and-brand check."
    : `Your plan researches up to ${cap} brands per case — remove one to add another.`;
}

// Re-export for form display convenience (single import site client-side).
export { PLAN_BRAND_CAPS };
