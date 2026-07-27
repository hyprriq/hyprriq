import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { findLegalSignals } from "./legalSignals";

// ── TRIGGER 9 (BL3, founder-ruled) — client-INPUT legal-signal detection: FLAG, never block.
// Two-sided like every scanner in this gate: signal-bearing notes flag; ordinary sourcing notes
// never do (a false flag trains the founder to ignore the banner). ──

const SIGNAL: [string, string][] = [
  ["IP complaint", "We received an IP complaint from the brand last month."],
  ["infringement", "Amazon flagged our listing for infringement."],
  ["cease and desist", "The brand sent a cease and desist letter."],
  ["legal notice", "There is a pending legal notice on our account."],
  ["lawsuit", "We are being sued by a competitor."],
  ["attorney", "Our attorney advised us to verify the supplier first."],
  ["counterfeit claim", "A counterfeit claim was filed against one ASIN."],
  ["account deactivation", "Our account was deactivated twice last year."],
  ["Section 3", "We got a Section 3 notice from Amazon."],
];

const CLEAN: [string, string][] = [
  ["ordinary sourcing note", "We plan to order 500 units of Bosch tools for Q4."],
  ["ordinary concern", "We want to verify this supplier before committing inventory."],
  ["price question", "The pricing seems low compared to other distributors."],
  ["empty", ""],
];

describe("trigger 9 — findLegalSignals (two-sided)", () => {
  for (const [label, text] of SIGNAL) {
    it(`FLAGS ${label}`, () => expect(findLegalSignals(text).length).toBeGreaterThan(0));
  }
  for (const [label, text] of CLEAN) {
    it(`stays quiet on ${label}`, () => expect(findLegalSignals(text)).toEqual([]));
  }
  it("null/undefined never throw", () => {
    expect(findLegalSignals(null)).toEqual([]);
    expect(findLegalSignals(undefined)).toEqual([]);
  });
});

describe("trigger 9 — the wiring (source-scan locks: derive-at-render + intake alert, NEVER a block)", () => {
  it("the submit route detects signals in client notes and fires the admin alert (non-fatal)", () => {
    const src = readFileSync(join(process.cwd(), "app/api/cases/submit/route.ts"), "utf8");
    expect(src.includes("findLegalSignals"), "submit route must run trigger-9 detection").toBe(true);
    expect(src.includes("sendAdminAlert"), "a hit must alert the admin inbox").toBe(true);
  });

  it("the admin review page derives the ⚖ LEGAL FLAG banner at render (zero storage)", () => {
    const src = readFileSync(join(process.cwd(), "app/(admin)/admin/cases/[id]/review/page.tsx"), "utf8");
    expect(src.includes("findLegalSignals"), "the review page must derive the flag at render").toBe(true);
    expect(/LEGAL FLAG/i.test(src), "the banner must be loud and named").toBe(true);
  });

  it("THE DIRECTION LAW: the submit route never blocks on a legal signal (no early return / thrown error keyed on it)", () => {
    const src = readFileSync(join(process.cwd(), "app/api/cases/submit/route.ts"), "utf8");
    const idx = src.indexOf("findLegalSignals");
    expect(idx).toBeGreaterThan(-1);
    const after = src.slice(idx, idx + 400);
    expect(/return\s+NextResponse\.json\([^)]*(?:400|403|422)/.test(after), "a legal signal must NEVER produce an error response — flag, never block").toBe(false);
  });
});
