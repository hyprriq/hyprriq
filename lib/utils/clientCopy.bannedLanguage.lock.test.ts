import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { scanHard } from "./banned-language";

// ── BL FIX GATE — BL6 (founder-ruled): STATIC source locks for UI copy + error messages (the
// retiredPricing.lock pattern — the strings are static, so commit-time locks beat runtime
// scanning). Scope law: banned terms appear NOWHERE — reports (delivery gate), emails (notify
// gate), UI copy + error messages (THESE locks), prompts (accepted as instructions-of-the-ban).
// The scan runs over extracted STRING LITERALS only — code/comments may legitimately name the
// banned vocabulary (this file does). Docs and migrations stay exempt: the paper trail. ──

const ROOT = join(__dirname, "..", "..");
const UI_DIRS = ["lib/content", "components/marketing", "components/portal", "app/(marketing)", "app/(portal)"];
const API_DIR = "app/api";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return walk(p);
    if (!/\.(ts|tsx)$/.test(name) || /\.test\./.test(name)) return [];
    return [p];
  });
}

// Extract string literals ('…', "…", and template-literal static parts). JSX text is covered by
// the literal-heavy content modules; component prose rides literals in this codebase.
function stringLiterals(src: string): string[] {
  // Comments are stripped FIRST — code may legitimately quote banned vocabulary when explaining
  // a ban (this gate's own annotations do). Only shipped literals are scanned.
  const noComments = src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ").replace(/([;,{})\]]\s*)\/\/[^\n]*$/gm, "$1");
  const out: string[] = [];
  const re = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(noComments)) !== null) {
    const s = m[1] ?? m[2] ?? m[3] ?? "";
    if (s.length >= 8) out.push(s.replace(/\$\{[^}]*\}/g, " ")); // template holes become spaces
  }
  return out;
}

function offendersIn(dirs: string[], filter?: (src: string, lit: string) => boolean): string[] {
  const offenders: string[] = [];
  for (const dir of dirs) {
    let files: string[] = [];
    try { files = walk(join(ROOT, dir)); } catch { continue; }
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      for (const lit of stringLiterals(src)) {
        if (filter && !filter(src, lit)) continue;
        const hits = scanHard(lit);
        if (hits.length > 0) offenders.push(`${f.slice(ROOT.length + 1)} → "${lit.slice(0, 80)}" [${hits.join(",")}]`);
      }
    }
  }
  return offenders;
}

// ── ⚠ UNRULED — MARKETING REFUSAL COPY vs THE NEGATION GUARDS (2026-08-24) ───────────────────
//
// FOUNDER INSTRUCTION (2026-08-24): "marketing website can be okay if anything is wrong, just
// list it, we will change later — ignore and continue building." This IS that list.
//
// THE PROBLEM, and it is a SCANNER GAP, NOT A COPY DEFECT. Three sentences of the founder's
// CLOSED launch copy trip HARD rules. All three are REFUSALS — the product stating what it will
// not claim — which sitewide rules 1 and 5 require on every page. The scanner is built to let
// exactly these through: H2 is "negation-aware (mandated disclaimers pass)", H12 is "denial-aware
// — 'could not confirm authorization' passes", H14 runs makeVerdictGuard. They trip because:
//
//   · "we cannot prove a business is fraudulent"  — H14's guard looks for negation adjacent to
//     the verdict phrase; here "cannot" sits four words upstream of "is fraudulent".
//   · "nobody can confirm authorization"          — H12's guard reads not/cannot/never/could-not;
//     the negation here is carried by the SUBJECT ("nobody"), which it does not model.
//   · "We won't say your account is safe"         — H3 has NO negation test at all, so the
//     substring "account is safe" trips inside its own denial.
//
// THE REAL FIX is in lib/utils/banned-language.ts — extend the two guards' negation vocabulary
// and give H3 the guard the other promise-rules already have. That file is a FROZEN SURFACE
// (hard law 1: the design lane never reaches into it), and the change must be measured against
// the 45-case corpus first, because a guard that lets a refusal through must never let a real
// claim through with it. That is a dev-lane change under founder ruling, not a design-lane edit.
//
// UNTIL THEN these three literals are allowed BY EXACT TEXT — not by pattern, not by file, not by
// rule. Anything else with the same banned vocabulary still fails. Adding to this list is a
// founder decision; the companion test below deletes it from under you when a string stops
// existing, so it cannot quietly outlive the copy it was written for.
const PENDING_REFUSAL_REVIEW: { text: string; why: string }[] = [
  {
    text: "we cannot prove a business is fraudulent. Absence of a record is a gap in evidence, never an accusation.",
    why: "H14 fraud verdict — the stated limit of Supplier Legitimacy. Refuses the accusation it matches.",
  },
  {
    text: "nobody can confirm authorization from outside — those deals are private.",
    why: "H12 confirms authorization — the stated limit of Supply-Chain Relationship. Refuses the confirmation it matches.",
  },
  {
    text: "We won't say your account is safe",
    why: "H3 account safe — one of the three refusals on the homepage. H3 carries no negation guard.",
  },
  {
    text: "Will this keep my Amazon account safe?",
    why: "H3 account safe — the /faq QUESTION whose answer is 'No.' The rule cannot see that the sentence is interrogative, let alone that the answer beneath it refuses the claim outright.",
  },
  {
    text: "Will this get me ungated?",
    why: "H1 ungating — the /faq QUESTION whose answer refuses it, exactly the precedent set by 'Will this keep my Amazon account safe?' above. The 2026-09-01 narrowing blocks the WORD in client prose; the scanner cannot see that this literal is interrogative, nor that the answer beneath it says no. The page exists to refuse the service and must be able to name what it refuses.",
  },
  {
    text: "The promises this product refuses to make",
    why: "H1 ungating — /what-we-dont-do names the three refused promises in a list ('ungating, authorization, account safety'). 'refuses' is a denial the sentence-scoped negation check does not model, and widening the check to verbs like 'refuses' would weaken it for REPORT prose, where a supplier sentence could easily contain that word. The exemption is recorded here instead, on the static surface only.",
  },
  {
    // The offender line truncates the literal at 80 characters, so an exemption must be matched on
    // the literal's OPENING, not on the clause that trips the rule. The tripping clause is
    // "We do not sell your data and we do not tell suppliers they were checked."
    text: "Your cases are separated from every other client's at the database level",
    why: "Purchase-recommendation rule, either polarity — matched on 'sell' in the /faq data answer. The OBJECT is the client's data, not a purchase: this is a privacy promise, and the rule does not model what is being sold.",
  },
];

const pendingTexts = PENDING_REFUSAL_REVIEW.map((p) => p.text);

describe("BL6 — static surface locks (UI copy + error messages)", () => {
  it("every pending-refusal exemption still matches live copy", () => {
    // A stale exemption is worse than none: it silently pre-approves a string nobody ships any
    // more, and the next person to write that sentence inherits an allowance they never asked for.
    const live = offendersIn(UI_DIRS).join(" | ");
    const stale = PENDING_REFUSAL_REVIEW.filter((p) => !live.includes(p.text.slice(0, 60)));
    expect(
      stale.map((p) => p.text),
      `these exemptions no longer match any shipped literal and should be deleted: ${stale
        .map((p) => p.text)
        .join(" | ")}`,
    ).toEqual([]);
  });

  it("UI COPY: no HARD-banned language in any client-surface string literal", () => {
    const offenders = offendersIn(UI_DIRS).filter(
      (o) => !pendingTexts.some((t) => o.includes(t.slice(0, 60))),
    );
    expect(offenders, `banned language in live UI copy:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("ERROR MESSAGES: no HARD-banned language in route message/error string literals (research-query literals are inputs, not client output — out of scope)", () => {
    const offenders: string[] = [];
    let files: string[] = [];
    try { files = walk(join(ROOT, API_DIR)); } catch { /* absent */ }
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      const re = /(?:message|error)\s*:\s*(?:'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src)) !== null) {
        const lit = (m[1] ?? m[2] ?? m[3] ?? "").replace(/\$\{[^}]*\}/g, " ");
        const hits = scanHard(lit);
        if (hits.length > 0) offenders.push(`${f.slice(ROOT.length + 1)} → "${lit.slice(0, 80)}" [${hits.join(",")}]`);
      }
    }
    expect(offenders, `banned language in error/message strings:\n${offenders.join("\n")}`).toEqual([]);
  });
});
