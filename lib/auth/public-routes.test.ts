import { describe, it, expect } from "vitest";
import { PUBLIC_ROUTES } from "./public-routes";

describe("PUBLIC_ROUTES", () => {
  // Regression guard (2026-06-28): the Clerk middleware matcher covers all /api routes, so
  // server-to-server endpoints that authenticate via their own signature MUST stay public or the
  // integration breaks with a 401 (Inngest sync failed exactly this way). Do not remove these.
  it("keeps the Inngest serve endpoint public (verified via INNGEST_SIGNING_KEY)", () => {
    expect(PUBLIC_ROUTES).toContain("/api/inngest(.*)");
  });
  it("keeps the Stripe webhook public (verified via STRIPE_WEBHOOK_SECRET)", () => {
    expect(PUBLIC_ROUTES).toContain("/api/webhooks/(.*)");
  });
});
