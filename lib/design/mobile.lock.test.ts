import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// ── LOCK — THE MOBILE FLOOR (2026-08-24, sitting three) ───────────────────────────────────────
//
// WHY A FORM CONTROL UNDER 16px IS A FUNCTIONAL BUG, NOT A PREFERENCE: iOS Safari zooms the page
// when a focused input's text is smaller than 16px, and it does NOT zoom back out afterwards. The
// client is left on a zoomed page they have to pinch their way out of, mid-form. Every portal field
// was `text-sm` (14px), including the submit form — the surface a client uses to spend a credit.
// That is very likely the origin of "the portal does not load on mobile": it loads, and then the
// first tap on a field breaks the viewport.
//
// The diagnosis that produced this lock also established what is NOT wrong: the portal shell is a
// proper mobile drawer, the real ReportView renders with zero horizontal overflow at 360/390/430,
// and there is no <table> anywhere in the portal. Recorded in the tracker.
//
// SCOPE: client-facing surfaces. Admin is an operator console at a desk (founder ruling 5d) and is
// deliberately not held to the input floor — but it IS held to having a mobile shell at all, which
// is a separate fix in the same sitting.

const repo = path.resolve(__dirname, "../..");
const CLIENT_SURFACES = [
  "app/(portal)", "app/(marketing)", "app/(auth)", "components/portal", "components/marketing",
  "components/auth",
];

function walk(dir: string): string[] {
  const abs = path.join(repo, dir);
  if (!fs.existsSync(abs)) return [];
  const out: string[] = [];
  const rec = (d: string) => {
    for (const n of fs.readdirSync(d)) {
      const p = path.join(d, n);
      if (fs.statSync(p).isDirectory()) rec(p);
      else if (/\.tsx$/.test(n) && !/\.test\./.test(n)) out.push(p);
    }
  };
  rec(abs);
  return out;
}

const rel = (p: string) => path.relative(repo, p).split(path.sep).join("/");
const files = CLIENT_SURFACES.flatMap(walk);

/** Tailwind sizes that render under 16px. text-base is excluded deliberately — see the note. */
const UNDER_16 = /\btext-(xs|sm)\b|\btext-\[(?:[0-9]|1[0-5])(?:\.[0-9]+)?px\]/;

/**
 * Element openings for real form controls, across line breaks. JSX puts className on its own line
 * constantly, so a single-line regex would miss nearly all of them — the first version of this
 * lock found zero offenders for exactly that reason.
 */
function controlOpenings(src: string): string[] {
  const out: string[] = [];
  const re = /<(input|textarea|select)\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    // Read to the end of the opening tag, tolerating nested braces in JSX expressions.
    let depth = 0;
    let i = m.index;
    for (; i < src.length; i++) {
      const c = src[i];
      if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === ">" && depth === 0) break;
    }
    out.push(src.slice(m.index, i + 1));
  }
  return out;
}

describe("LOCK — the mobile floor on client surfaces", () => {
  it("no form control on a client surface renders text under 16px", () => {
    const bad: string[] = [];
    for (const f of files) {
      const src = fs.readFileSync(f, "utf8");
      for (const tag of controlOpenings(src)) {
        // A control with no size class inherits 16px from the body — that is fine.
        if (UNDER_16.test(tag)) {
          const kind = tag.slice(1, 9).split(/\s/)[0];
          bad.push(`${rel(f)} → <${kind}> ${(tag.match(UNDER_16) ?? [""])[0]}`);
        }
      }
    }
    expect(
      bad,
      `iOS Safari zooms the page on focus below 16px and does not zoom back:\n${bad.join("\n")}`,
    ).toEqual([]);
  });

  it("the Clerk auth components are held to the same 16px floor", () => {
    // THE WORST PLACE THIS BUG COULD LIVE, and it lived there: Clerk renders its OWN inputs, and
    // measured at default they were 13px and 32px tall. Sign-in and sign-up are the first screens
    // a client meets — the zoom fired before they had paid anything, on a form we do not own the
    // markup for. It is set through Clerk's appearance API instead, which is why the scanner above
    // cannot see it and this assertion exists.
    const clerk = fs.readFileSync(path.join(repo, "lib/clerk-appearance.ts"), "utf8");
    expect(clerk, "Clerk's base font size must be 16px or iOS zooms the sign-in form")
      .toMatch(/fontSize:\s*"16px"/);
    expect(clerk, "Clerk's field must carry a 44px minimum touch target")
      .toMatch(/formFieldInput:\s*"[^"]*min-h-11/);
  });

  it("the checked class of control actually exists on these surfaces", () => {
    // A lock that silently matches nothing is worse than no lock. This proves the scanner sees the
    // controls it claims to police — the first version's regex missed every multi-line JSX tag.
    const found = files.reduce((n, f) => n + controlOpenings(fs.readFileSync(f, "utf8")).length, 0);
    expect(found, "the control scanner found no inputs at all — the regex is wrong").toBeGreaterThan(20);
  });
});

// ── LOCK — THE TWO CONSOLES ARE REACHABLE FROM EACH OTHER (founder-ruled 2026-08-24) ──────────
//
// Found on the LIVE domain: an operator signed in, landed in the client portal, was asked to buy
// a plan, and had no visible route to the admin console. Both directions needed a typed URL.
//
// Two separate causes, and the second is the one that would have survived a naive fix:
//   1. the switcher was gated `VERCEL_ENV !== "production"` — present on staging, absent on the
//      only domain that matters;
//   2. its condition read `client.role !== "client" || isOperator === true` and NO CALLER EVER
//      PASSED isOperator, so it fell back to a legacy role an admin_permissions operator lacks.
//
// The rule this pins: ONE notion of who is an operator, and it is getOperator() — the same
// function the admin boundary uses. The link appears exactly when the guard would admit you.
describe("LOCK — portal and admin link to each other", () => {
  // Comments are the paper trail and NECESSARILY quote the removed condition — the first version
  // of this lock failed against its own documentation. Code only.
  const strip = (x: string) =>
    x.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
  const portal = strip(fs.readFileSync(path.join(repo, "components/portal/portal-shell.tsx"), "utf8"));
  const admin = strip(fs.readFileSync(path.join(repo, "components/admin/admin-shell.tsx"), "utf8"));

  it("neither switcher is gated by the deploy environment", () => {
    for (const [name, src] of [["portal", portal], ["admin", admin]] as const) {
      expect(
        /showSwitcher\s*=\s*[^;]*VERCEL_ENV/.test(src),
        `${name}: the console switcher is env-gated again — it would vanish in production, which ` +
          `is the exact defect this lock exists for`,
      ).toBe(false);
    }
  });

  it("the portal decides with getOperator, the one shared operator notion", () => {
    expect(portal, "the portal switcher must ask getOperator()").toMatch(/getOperator\(/);
    expect(
      /client\.role\s*!==\s*"client"/.test(portal),
      "a second notion of who is an operator is back — getOperator already carries the legacy " +
        "clients.role fallback inside it",
    ).toBe(false);
  });

  it("both directions exist", () => {
    expect(portal, "portal must offer a route to /admin").toMatch(/href:\s*"\/admin\/dashboard"/);
    expect(admin, "admin must offer a route back to /portal").toMatch(/href:\s*"\/portal\/dashboard"/);
  });
});
