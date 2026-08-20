// ── LIVE-KEY ENVIRONMENT GUARD (founder-ruled 2026-08-20; tracker 1.9 "business-ending risk") ──
//
// THE FAILURE THIS REFUSES: a LIVE Stripe key reaching any environment except Production — a
// preview deploy or a laptop quietly charging real cards, refunding real money, or emitting live
// webhooks at staging data. The tracker has carried "env separation" as a business-ending risk
// since v2; this is the mechanical half (the human half is which keys get pasted where).
//
// SHAPE: pure predicate + a throwing assertion, called at the ONE place a Stripe client is
// constructed (lib/stripe.ts getStripe). Throwing at construction rather than at boot keeps the
// key-safe lazy design (no key → billing degrades gracefully, nothing throws at import), while
// guaranteeing no live-key CALL can ever execute outside Production.
//
//   Production is VERCEL_ENV === "production" — Vercel's own environment name, not NODE_ENV
//   (which is "production" on every deployed build, previews included — using it here would
//   defeat the guard exactly where it matters most).

export interface StripeEnvInput {
  key: string | null | undefined;
  vercelEnv: string | null | undefined; // process.env.VERCEL_ENV: "production" | "preview" | "development" | undefined (local)
}

/** True when this key is a LIVE-mode Stripe secret (sk_live_ / rk_live_). */
export function isLiveStripeKey(key: string | null | undefined): boolean {
  return !!key && /^(sk|rk)_live_/.test(key);
}

/** The rule, pure: a live key is permitted ONLY in Vercel Production. */
export function liveKeyPermitted(input: StripeEnvInput): boolean {
  if (!isLiveStripeKey(input.key)) return true; // test keys and no key are fine anywhere
  return input.vercelEnv === "production";
}

/** Throws on a live key outside Production. Call at Stripe client construction. */
export function assertStripeKeyMatchesEnvironment(input: StripeEnvInput): void {
  if (liveKeyPermitted(input)) return;
  throw new Error(
    `LIVE Stripe key refused: STRIPE_SECRET_KEY is a live-mode key but this environment is ` +
      `"${input.vercelEnv ?? "local"}", not Vercel Production. A live key outside Production can ` +
      `charge real cards from a preview or a laptop. Use a test key here, or move this deploy to Production.`,
  );
}
