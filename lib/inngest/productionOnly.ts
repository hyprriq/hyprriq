/**
 * THE PRODUCTION-ONLY GATE for scheduled work (founder-ruled 2026-08-31).
 *
 * THE RULE, in the founder's words: "anything that writes, deletes or emails a client is
 * production-only. Read-only checks can run in both."
 *
 * ⚠ WHY THIS IS NEEDED AT ALL, and it was DEMONSTRATED not theorised. Splitting Inngest into a
 * Production and a `staging` environment gave each its own scheduler — but BOTH deployments talk to
 * the SAME Supabase project. Within minutes of the heartbeats shipping, `pipeline-watchdog` recorded
 * two beats four seconds apart: one per environment, both against production data. Harmless for a
 * watchdog that found nothing. NOT harmless for `retention-sweep`, which permanently deletes client
 * documents and emails clients — that would have run twice a day, from two environments, one of them
 * a preview build.
 *
 * ⚠⚠ THE TRAP, WRITTEN DOWN SO NOBODY "FIXES" IT.
 *
 * `VERCEL_ENV === "production"` is FALSE on staging BY CONSTRUCTION — staging deploys carry
 * `target: null` and are PREVIEW deployments, so `VERCEL_ENV` is `"preview"` there. That is exactly
 * the shape of the console-switcher bug (§0-K), where a feature was gated this way, worked on
 * staging, and VANISHED on the only domain that mattered.
 *
 * HERE THAT ASYMMETRY IS THE ENTIRE POINT AND MUST NOT BE REMOVED. The switcher bug was a gate that
 * hid something the founder needed to SEE. This is a gate that stops something the founder needs NOT
 * TO HAPPEN TWICE. Same mechanism, opposite intent.
 *
 * If you are here because a scheduled job "does not run on staging": that is correct and deliberate.
 * Do not widen this. If you need to exercise a gated job outside production, invoke its exported
 * sweep function directly from a script — every one of them is exported for exactly that reason.
 *
 * ⚠ AND IT IS `VERCEL_ENV`, NEVER `NODE_ENV`. NODE_ENV is "production" on every deployed build,
 * previews included — using it here would defeat the gate precisely where it matters. The same
 * reasoning already governs the live-Stripe-key guard in lib/billing/envGuard.ts.
 */

export const NOT_PRODUCTION = "skipped:not_production" as const;

/** True only on a Vercel PRODUCTION deployment. False on preview, on staging, and locally. */
export function isVercelProduction(): boolean {
  return process.env.VERCEL_ENV === "production";
}

/**
 * The early return every side-effecting scheduled job starts with.
 *
 * ⚠ CALLED BEFORE THE HEARTBEAT, DELIBERATELY. A gated job on staging records nothing, so
 * /admin/integrity shows ONE beat per interval — the production one — instead of a confusing pair.
 * The health page is about whether the work happened, and on staging it correctly did not.
 */
export function skipOutsideProduction(): { skipped: typeof NOT_PRODUCTION; env: string } | null {
  return isVercelProduction() ? null : { skipped: NOT_PRODUCTION, env: process.env.VERCEL_ENV ?? "local" };
}
