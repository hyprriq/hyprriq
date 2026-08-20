import Stripe from "stripe";
import { assertStripeKeyMatchesEnvironment } from "@/lib/billing/envGuard";

// Lazy, key-safe Stripe client. Returns null when STRIPE_SECRET_KEY is absent
// so Billing degrades gracefully until the key is configured (see
// SESSION_F_PROGRESS.md open question).
let cached: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  // ENV GUARD (founder-ruled 2026-08-20): a LIVE key outside Vercel Production throws HERE, at
  // the only construction site — no live-key call can ever execute from a preview or a laptop.
  assertStripeKeyMatchesEnvironment({ key, vercelEnv: process.env.VERCEL_ENV });
  if (!cached) cached = new Stripe(key);
  return cached;
}

export function stripeEnabled(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}
