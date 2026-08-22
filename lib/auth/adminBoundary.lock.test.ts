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
