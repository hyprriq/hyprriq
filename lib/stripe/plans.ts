import type { PlanType } from "@/lib/constants/plans";

// Stripe Price IDs are read from env so the founder can paste the test/live IDs
// (created in the planning thread, NOT by this app) without any code change —
// per Tech Arch §6. Set these in .env.local + Vercel once the prices exist.
// Until a given var is set, checkout for that item returns 503 (never a broken flow).
export const PLAN_PRICE_ENV: Record<PlanType, string> = {
  single_99: "STRIPE_PRICE_SINGLE_99",
  single_149: "STRIPE_PRICE_SINGLE_149", // founder creates the price + sets the env (2026-08-07 tier)
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

// ══ THE B2 LAW, AS FUNCTIONS (founder-locked 2026-08-22, item 3): on a PAID event, a lookup
// miss NEVER resolves to zero/null/skip — it THROWS, so the webhook's catch writes
// stripe_events.error, Stripe retries, and the failure is visible like every other money
// failure. "A write of zero is not a success." The pre-fix shape — `TOPUP[id]?.credits ?? 0`
// — took the money and granted nothing, recording "Top-up: 0 credits" as though that were the
// product. These helpers exist so the law is FIXTURE-ENFORCED (plans.paidLookups.test.ts), not
// comment-enforced; the webhook calls them and nothing else on paid paths. ══

/** Paid top-up → its credit count. Unrecognized id = a paid purchase we cannot attribute: throw. */
export function creditsForPaidTopup(topupId: string): number {
  // Object.hasOwn, not truthiness: "constructor" et al. resolve through the prototype chain and
  // would smuggle an inherited function past a `!topup` check (caught by the fixture).
  if (!Object.hasOwn(TOPUP, topupId)) {
    throw new Error(`B2: unrecognized top-up id "${topupId}" on a PAID session — money accepted, no known product; refusing to record a zero-credit success`);
  }
  return TOPUP[topupId as TopupId].credits;
}

/** Paid subscription price → its plan. Unmapped price = a paid subscription we cannot provision: throw. */
export function planForPaidPrice(priceId: string): PlanType {
  const plan = planForPriceId(priceId);
  if (!plan) {
    throw new Error(`B2: no plan maps to price "${priceId}" on a PAID event — money accepted, nothing would provision; check the STRIPE_PRICE_* env mapping`);
  }
  return plan;
}

/** Paid one-time session's metadata kind ("plan:x") → a REGISTERED plan. Anything else: throw. */
export function planForPaidKind(kind: string): PlanType {
  const candidate = kind.startsWith("plan:") ? kind.slice(5) : null;
  // Object.hasOwn, not `in`: "toString" is `in` every object via the prototype chain.
  if (candidate && Object.hasOwn(PLAN_PRICE_ENV, candidate)) return candidate as PlanType;
  throw new Error(`B2: unattributable PAID checkout session (metadata kind "${kind}") — money accepted, nothing would provision`);
}
