import type { PlanType } from "@/lib/constants/plans";

// Stripe Price IDs are read from env so the founder can paste the test/live IDs
// (created in the planning thread, NOT by this app) without any code change —
// per Tech Arch §6. Set these in .env.local + Vercel once the prices exist.
// Until a given var is set, checkout for that item returns 503 (never a broken flow).
export const PLAN_PRICE_ENV: Record<PlanType, string> = {
  single_99: "STRIPE_PRICE_SINGLE_99",
  growth_279: "STRIPE_PRICE_GROWTH_279",
  scale_499: "STRIPE_PRICE_SCALE_499",
};

export function priceIdForPlan(plan: PlanType): string | null {
  return process.env[PLAN_PRICE_ENV[plan]] ?? null;
}

// Reverse lookup (price_id -> plan_type) for the webhook, resolved from env.
export function planForPriceId(priceId: string): PlanType | null {
  for (const plan of Object.keys(PLAN_PRICE_ENV) as PlanType[]) {
    if (process.env[PLAN_PRICE_ENV[plan]] === priceId) return plan;
  }
  return null;
}

// Top-up packs add credits without changing the plan. Env-driven Price IDs too.
export type TopupId = "growth_topup" | "scale_topup";
export const TOPUP: Record<TopupId, { env: string; credits: number }> = {
  growth_topup: { env: "STRIPE_PRICE_GROWTH_TOPUP", credits: 3 },
  scale_topup: { env: "STRIPE_PRICE_SCALE_TOPUP", credits: 6 },
};

export function topupPriceId(id: TopupId): string | null {
  return process.env[TOPUP[id].env] ?? null;
}

export function topupForPriceId(priceId: string): { id: TopupId; credits: number } | null {
  for (const id of Object.keys(TOPUP) as TopupId[]) {
    if (process.env[TOPUP[id].env] === priceId) return { id, credits: TOPUP[id].credits };
  }
  return null;
}
