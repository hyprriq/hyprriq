import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { PUBLIC_ROUTES } from "./public-routes";

// ── THE MARKETING-ROUTE LOCK (2026-08-20) — DERIVED FROM THE FILESYSTEM, never a hand list.
// /sample-report shipped its first render redirecting to /sign-in: it was built as a marketing
// page and never added to PUBLIC_ROUTES. A hand-maintained expectation here would have had the
// same hole; this walks app/(marketing) and demands a public entry for every route it finds, so
// the NEXT marketing page fails the suite instead of the funnel.
function marketingRoutes(): string[] {
  const root = join(__dirname, "..", "..", "app", "(marketing)");
  const out: string[] = [];
  const walk = (dir: string, prefix: string) => {
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry);
      if (!statSync(p).isDirectory()) continue;
      if (entry.startsWith("(") || entry.startsWith("[") || entry.startsWith("_")) continue; // groups & dynamic segments
      const route = `${prefix}/${entry}`;
      if (readdirSync(p).includes("page.tsx")) out.push(route);
      walk(p, route);
    }
  };
  walk(root, "");
  return out;
}

describe("PUBLIC_ROUTES", () => {
  it("every app/(marketing) page is PUBLIC — a marketing page behind auth is worse than a missing one", () => {
    const missing = marketingRoutes().filter(
      (r) => !PUBLIC_ROUTES.some((p) => p === r || p === `${r}(.*)`),
    );
    expect(missing, `marketing routes not in PUBLIC_ROUTES:\n${missing.join("\n")}`).toEqual([]);
  });

  it("the marketing walk actually finds pages — an empty walk would pass the lock vacuously", () => {
    expect(marketingRoutes().length).toBeGreaterThan(0);
    expect(marketingRoutes()).toContain("/sample-report");
  });

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
