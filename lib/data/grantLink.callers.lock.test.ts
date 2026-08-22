import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// ── CALLER LOCK (item 1b, founder-locked 2026-08-22): ONE shared TS notion of grant validity.
// The defect this guards against is exactly what happened before the collapse: the admin
// manager carried its own private revoked/expired/exhausted logic, and the landing route had
// none at all — several independent notions of "is this grant usable", drifting separately.
// Two assertions, filesystem-derived so a NEW caller cannot appear outside the lock:
//   1. Every known validity consumer imports the shared module (grantLink directly, or
//      grantCheck — the server lookup that wraps it).
//   2. NO file outside the shared modules re-derives validity (the tell-tale expressions:
//      comparing redemption_count to max_redemptions, or date-comparing expires_at).
// The redeem RPC (SQL) is the gate and deliberately NOT a caller of this module — one notion
// per layer, pinned to agree by the grantLink fixtures.

const repo = path.resolve(__dirname, "../..");
const read = (rel: string) => fs.readFileSync(path.join(repo, rel), "utf8");

const CALLERS = [
  "app/grant/[code]/route.ts",
  "app/(marketing)/partners/page.tsx",
  "components/admin/grants-manager.tsx",
];

const SHARED = new Set(["lib/data/grantLink.ts", "lib/data/grantCheck.ts"]);

function walk(dir: string): string[] {
  return fs.readdirSync(dir).flatMap((name) => {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) return name === "node_modules" ? [] : walk(p);
    if (!/\.(ts|tsx)$/.test(name) || /\.test\./.test(name)) return [];
    return [path.relative(repo, p).replace(/\\/g, "/")];
  });
}

describe("LOCK — one shared notion of grant validity", () => {
  it("every validity consumer reads the shared module, never its own copy", () => {
    for (const f of CALLERS) {
      const src = read(f);
      const usesShared = src.includes('from "@/lib/data/grantLink"') || src.includes('from "@/lib/data/grantCheck"');
      expect(usesShared, `${f} must derive grant validity via lib/data/grantLink (or grantCheck), not privately`).toBe(true);
    }
  });

  it("no file outside the shared modules re-derives validity", () => {
    const offenders: string[] = [];
    for (const dir of ["app", "components", "lib"]) {
      for (const f of walk(path.join(repo, dir))) {
        if (SHARED.has(f)) continue;
        const src = read(f);
        // expires_at exists in OTHER domains too (admin_invitations); date-comparing it only
        // counts as a grant-validity re-derivation in a file that handles acquisition grants.
        const grantDomain = /AcquisitionGrant|acquisition_grants|GRANT_COOKIE/.test(src);
        if (/redemption_count\s*>=\s*\S*max_redemptions/.test(src) || (grantDomain && /new Date\([^)]*expires_at/.test(src))) {
          offenders.push(f);
        }
      }
    }
    expect(offenders, `these files re-derive grant validity instead of importing the shared module:\n${offenders.join("\n")}`).toEqual([]);
  });
});
