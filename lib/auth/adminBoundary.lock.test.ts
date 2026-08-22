import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// ── THE ADMIN BOUNDARY LOCK (2026-08-22) ─────────────────────────────────────────────────────
//
// app/(admin)/layout.tsx enforced AUTHENTICATION ONLY for months: `await auth.protect()` and a
// "TODO(Session 5): enforce admin role" that outlived Session 5 — under the file's own warning
// not to expose admin data until the role check landed. Nothing leaked, because all eighteen
// admin pages call requireAdmin() themselves; but deny-by-default was carried entirely by every
// page remembering, and the next page added would have been one forgotten line from serving
// operator data to any signed-in client.
//
// Two assertions, both filesystem-derived so a NEW admin page cannot appear outside the lock:
//   1. The layout enforces the OPERATOR boundary, not merely authentication.
//   2. Every admin page still calls requireAdmin() — the layout is the floor, not a replacement
//      (pages need the operator's scope/display fields anyway, and depth is the point).

const repo = path.resolve(__dirname, "../..");
const read = (rel: string) => fs.readFileSync(path.join(repo, rel), "utf8");

function adminPages(): string[] {
  const root = path.join(repo, "app", "(admin)");
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir)) {
      const p = path.join(dir, entry);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (entry === "page.tsx") out.push(path.relative(repo, p).split(path.sep).join("/"));
    }
  };
  walk(root);
  return out;
}

describe("LOCK — the admin boundary is enforced by the layout, not only by every page", () => {
  it("the layout enforces the OPERATOR boundary (not just an authenticated session)", () => {
    const src = read("app/(admin)/layout.tsx");
    expect(
      src.includes("requireOperatorAccess"),
      "app/(admin)/layout.tsx must enforce the operator boundary — an authenticated-only layout lets any signed-in client through to whatever page forgets its own guard",
    ).toBe(true);
    // The historical hole, pinned by name so it cannot be reintroduced as "temporary".
    expect(/TODO.*enforce admin role/i.test(src), "the admin-role TODO must not return — enforce it or rule it").toBe(false);
  });

  it("the walk actually finds admin pages — an empty walk would pass the next assertion vacuously", () => {
    expect(adminPages().length).toBeGreaterThanOrEqual(10);
  });

  it("every admin page ALSO calls requireAdmin() — depth, not redundancy", () => {
    const missing = adminPages().filter((f) => !read(f).includes("requireAdmin"));
    expect(missing, `these admin pages do not call requireAdmin():\n${missing.join("\n")}`).toEqual([]);
  });
});

// ── DEV VALIDATION ROUTES STAY DISARMED (CTO audit 2026-08-22). Both spend real research budget
// (AI tokens, Serper, WHOIS) and seed throwaway cases. They are kept — they are the instruments
// that prove the stack after an engine change — but they must never be reachable without being
// deliberately armed by env, and they must not carry a private admin check.
describe("LOCK — /api/admin/dev routes are disarmed by default", () => {
  const DEV_ROUTES = [
    "app/api/admin/dev/validate-track1/route.ts",
    "app/api/admin/dev/validate-acquisition/route.ts",
  ];

  it("every dev route checks devValidationRoutesArmed() before doing any work", () => {
    for (const f of DEV_ROUTES) {
      const src = read(f);
      expect(src.includes("devValidationRoutesArmed"), `${f} must be arm-gated`).toBe(true);
    }
  });

  it("the arming flag is env-driven and off unless explicitly set to 1", () => {
    const src = read("lib/auth/devRoutes.ts");
    expect(src).toContain('process.env.DEV_VALIDATION_ROUTES === "1"');
  });

  it("no dev route re-derives admin from clients.role — getOperator is the one notion", () => {
    for (const f of DEV_ROUTES) {
      const src = read(f);
      expect(
        /select\("role"\)[\s\S]{0,120}role !== "client"/.test(src),
        `${f} must authorize through getOperator, not a private clients.role read`,
      ).toBe(false);
    }
  });
});
