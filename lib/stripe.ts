import Stripe from "stripe";

// Lazy, key-safe Stripe client. Returns null when STRIPE_SECRET_KEY is absent
// so Billing degrades gracefully until the key is configured (see
// SESSION_F_PROGRESS.md open question).
let cached: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!cached) cached = new Stripe(key);
  return cached;
}

export function stripeEnabled(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}
