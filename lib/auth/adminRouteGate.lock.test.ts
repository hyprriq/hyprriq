import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const repo = path.resolve(__dirname, "../..");
const NL = String.fromCharCode(10);

// ── LOCK — getOperator IS THE ONE NOTION OF "WHO IS AN OPERATOR" (founder-ruled, fixed 2026-09-01)
//
// ⚠ THE DEFECT THIS EXISTS TO PREVENT. /api/admin/cases/[id]/review — PUBLISH, the only step
// between a finished case and a client receiving it — opened with a second, legacy gate:
//
//     const { data } = await supabaseAdmin.from("clients").select("role").eq("id", userId)…
//     if (!data || data.role === "client") return 403
//
// It read the WRONG TABLE. The founder's identity ruling puts operator roles on their own
// identities in `admin_permissions` and leaves the clients row as a plain client — so the more
// correctly the data followed the ruling, the harder this gate refused. A super_admin got 403.
//
// ⛔ AND IT WAS NEVER ABOUT CAPABILITIES. getOperator() returns FULL_ACCESS for super_admin and
// can() short-circuits on the role, so `capabilities: []` is already sufficient. Anyone debugging
// a 403 here by adding capability strings to a row is fixing the wrong thing.
//
// ⚠ IT PASSED FOR MONTHS ON AN ACCIDENT, WHICH IS THE REAL LESSON. Every case published through
// that route was published by an OLDER Clerk identity whose clients row still held the pre-ruling
// role='founder'. A second identity for the SAME PERSON, created under the ruling, could never
// publish. The route did not break; it only ever worked for a row shape the ruling forbids.
// A gate that admits exactly one grandfathered row is indistinguishable from a working gate until
// somebody signs in as anyone else — standing rule 15, one layer up from guards, at routes.
//
// AND THE TEST SUITE COULD NOT HAVE CAUGHT IT: review/route.test.ts mocks the clients lookup to
// return { role: "admin" }, fabricating the very row production lacks. The mock encoded the bug's
// precondition, so the suite stayed green while production 403'd. This lock reads SOURCE, never
// mocks, for exactly that reason.

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(path.join(repo, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) out.push(...walk(rel));
    else if (e.name === "route.ts") out.push(rel);
  }
  return out;
}

const ADMIN_ROUTES = walk("app/api/admin");
const read = (p: string) => fs.readFileSync(path.join(repo, p), "utf8");
const strip = (x: string) =>
  x.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");

describe("LOCK — no admin route decides operator identity for itself", () => {
  it("the scanner found the admin routes at all", () => {
    // Rule 14: prove it LOOKED. If the tree moves, this fails loudly instead of passing empty.
    expect(
      ADMIN_ROUTES.length,
      "no app/api/admin route.ts files were found — the scanner is looking in the wrong place",
    ).toBeGreaterThan(15);
  });

  it("no admin route reads the CALLER's role off `clients`", () => {
    // The exact shape of the defect: selecting a role from `clients` keyed on the CALLER's id.
    // Reading a TARGET's role (`.eq("id", id)` — the row being acted on) is a different question
    // and is deliberately still allowed; clients/[id] uses it to refuse deleting an elevated row.
    const offenders = ADMIN_ROUTES.filter((f) => {
      const src = strip(read(f));
      return /from\(\s*["'`]clients["'`]\s*\)[\s\S]{0,120}?\brole\b[\s\S]{0,120}?\.eq\(\s*["'`]id["'`]\s*,\s*userId\s*\)/.test(src);
    });
    expect(
      offenders,
      `these admin routes gate on the CALLER's clients.role instead of getOperator(). That table ` +
        `does not carry operator roles — the identity ruling puts them in admin_permissions — so ` +
        `this refuses a super_admin:${NL}${offenders.join(NL)}`,
    ).toEqual([]);
  });

  it("every admin route that returns 403 consults getOperator", () => {
    const missing = ADMIN_ROUTES.filter((f) => {
      const src = strip(read(f));
      if (!/status:\s*403/.test(src)) return false;
      return !/getOperator\s*\(/.test(src);
    });
    expect(
      missing,
      `these admin routes refuse with 403 without ever calling getOperator(), so they are ` +
        `deciding operator identity by some other means:${NL}${missing.join(NL)}`,
    ).toEqual([]);
  });

  it("the review route's publish path still requires review_publish and scope", () => {
    // The fix DELETED a gate. Without this, "fixed the 403" is indistinguishable from "removed
    // the authorisation" — the same canary discipline the PDF projection fix carries.
    const src = strip(read("app/api/admin/cases/[id]/review/route.ts"));
    expect(src, "the review route must still call getOperator").toMatch(/getOperator\s*\(/);
    expect(src, "publish/override must still require a capability").toMatch(/can\(\s*op\s*,\s*needed\s*\)/);
    expect(src, "review_publish must still be the capability for publish").toMatch(/review_publish/);
    expect(src, "the re-run action must still require rerun").toMatch(/rerun/);
    expect(src, "client partitioning must still apply").toMatch(/caseInScope\s*\(\s*op\s*,/);
  });
});

describe("LOCK — super_admin needs no capability list (the trap that started this)", () => {
  it("getOperator hands super_admin FULL_ACCESS regardless of the stored array", async () => {
    // Asserted against the REAL module, not a mock. Both production rows hold `capabilities: []`,
    // and that must remain sufficient: "a role that means everything and then fails on an empty
    // array is a trap, and it will catch the next operator too" (founder, 2026-09-01).
    const { can } = await import("./permissions");
    const { CAPABILITIES } = await import("./capabilities");
    const op = { user_id: "u", role: "super_admin" as const, capabilities: [] as never[] };
    for (const cap of CAPABILITIES) {
      expect(can(op, cap), `super_admin was refused "${cap}" with an empty capabilities array`).toBe(true);
    }
  });

  it("a sub_user with an empty array is still refused — the mirror", () => {
    // Without this, "super_admin passes" is indistinguishable from "can() always returns true".
    return import("./permissions").then(({ can }) => {
      const sub = { user_id: "u", role: "sub_user" as const, capabilities: [] as never[] };
      expect(can(sub, "review_publish"), "an empty sub_user must NOT be able to publish").toBe(false);
      expect(can(null, "review_publish"), "a non-operator must NOT be able to publish").toBe(false);
    });
  });
});
