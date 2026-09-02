import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const repo = path.resolve(__dirname, "../..");
const NL = String.fromCharCode(10);

// ── STANDING CHECK — A COLUMN THAT IS READ AND NEVER WRITTEN (founder-ruled 2026-09-01) ──────
//
// ⚠ THE DEFECT IT EXISTS FOR. `support_requests.admin_response` was SELECTed by two data modules
// and RENDERED by the admin queue ("Response on file: …") for a month. Nothing in the codebase
// ever wrote it. A client raised a ticket, it appeared in the queue, and there was no route, no
// form and no surface that could answer it — the data model implied an action the product did
// not perform.
//
// ⛔ WHY THIS IS A BETTER DETECTOR THAN THE ROUTE CENSUS, in the founder's words: "it finds the
// dead end rather than the disuse. A route that has never run may simply be waiting; a column
// that is read and never written is broken by construction."
//
// AND IT WOULD HAVE FIRED ON 2026-08-02, the day the read-only ruling was made — the same commit
// that decided replies would happen over email also shipped a surface reading a reply column
// with no writer.
//
// ── WHAT IT CAN AND CANNOT SEE, stated so nobody over-trusts it ──────────────────────────────
// It is a SOURCE scan, not a schema diff. It knows the columns this repo NAMES, not the columns
// the database has — a column neither read nor written is invisible to it, and that is correct:
// an unused column is not a dead end, it is just unused. What it catches is the asymmetry that
// means a workflow stops halfway.

type Site = { file: string; line: number };

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(path.join(repo, dir), { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".next" || e.name.startsWith(".")) continue;
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) walk(rel, out);
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) out.push(rel);
  }
  return out;
}

const FILES = [...walk("app"), ...walk("lib"), ...walk("components"), ...walk("scripts")];
const SRC = new Map(FILES.map((f) => [f, fs.readFileSync(path.join(repo, f), "utf8")]));

/**
 * Columns that record THAT SOMEONE ACTED — the shape whose absence of a writer means a workflow
 * dead-ends. Deliberately not "every column": a plain data field with no writer is usually just
 * an unused read, while an action column with no writer is a promise the product cannot keep.
 */
const ACTION_COLUMNS = [
  "admin_response", "resolved_at", "resolved_by", "reviewed_by", "reviewed_at",
  "handled_at", "handled_by", "replied_at", "answered_at", "closed_at",
];

// ── WHAT COUNTS AS A WRITE, and the first version of this got it wrong ───────────────────────
//
// ⚠ THE FIRST VERSION LOOKED ONLY INSIDE `.update({...})` PAYLOADS and immediately false-flagged
// `reviewed_by`, which IS written — as a property of the `decision` object the review route
// serialises into `internal_notes`. A detector that models one spelling of "write" reports every
// other spelling as a dead end, and a check that cries wolf gets switched off.
//
// So a write is any of the three shapes this codebase actually uses:
//   1. an object-literal property with a real value      `reviewed_by: userId`
//   2. a property assignment onto a patch object          `patch.admin_response = text`
//   3. the column named inside an update/insert payload   `.update({ resolved_at: null })`
//
// ⛔ AND A TYPE DECLARATION IS NOT A WRITE. `admin_response: string | null;` in an interface is
// the shape, not an act — counting it would mark every read-only column as written and the check
// would pass forever while proving nothing.
// ⚠ `null` ALONE IS AMBIGUOUS and that is the whole difficulty: `resolved_at: string | null;` is
// a type, `resolved_at: null,` is a write of null — which is exactly how a ticket is un-resolved.
// The value cannot settle it, so the SYNTAX does: a TS field carries a type keyword or a union
// bar, or terminates with a semicolon. An object-literal property does none of those.
const isTypeDeclaration = (value: string): boolean =>
  /\b(?:string|number|boolean|unknown|any|Record|Array|Promise)\b/.test(value) ||
  value.includes("|") ||
  /;\s*$/.test(value);

function writesColumn(src: string, col: string): boolean {
  // 1 + 3 — object-literal property with a value that is not a TS type.
  const propRe = new RegExp(`\\b${col}\\s*:([^,\\n}]*)`, "g");
  let m: RegExpExecArray | null;
  while ((m = propRe.exec(src)) !== null) {
    const value = m[1];
    if (value.trim() === "") continue;
    if (isTypeDeclaration(value)) continue;   // an interface field, not a write
    return true;
  }
  // 2 — assignment onto an object that is later persisted.
  if (new RegExp(`\\.${col}\\s*=[^=]`).test(src)) return true;
  return false;
}

/** A read is a select list or a property access naming the column. */
function readsColumn(src: string, col: string): Site | null {
  const re = new RegExp(`\\b${col}\\b`, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    return { file: "", line: src.slice(0, m.index).split(NL).length };
  }
  return null;
}

describe("STANDING CHECK — no surface reads an action column nothing writes", () => {
  it("the scanner found source files at all", () => {
    // Rule 14: prove it LOOKED. An empty file list would pass every assertion below in silence.
    expect(FILES.length, "the dead-end scanner walked no files — it is looking in the wrong place")
      .toBeGreaterThan(200);
  });

  it("every action column that is read somewhere is also written somewhere", () => {
    const broken: string[] = [];
    for (const col of ACTION_COLUMNS) {
      const readers: string[] = [];
      let written = false;
      for (const [file, src] of SRC) {
        if (writesColumn(src, col)) written = true;
        const r = readsColumn(src, col);
        if (r) readers.push(`${file}:${r.line}`);
      }
      if (readers.length > 0 && !written) {
        broken.push(`${col} — read in ${readers.length} file(s), written NOWHERE:${NL}      ${readers.slice(0, 6).join(`${NL}      `)}`);
      }
    }
    expect(
      broken,
      `these columns are READ by a surface and WRITTEN by nothing. The data model implies an ` +
        `action the product cannot perform — a workflow that dead-ends where someone will one day ` +
        `stand and wait. Either build the writer or stop reading the column:${NL}  ${broken.join(`${NL}  `)}`,
    ).toEqual([]);
  });

  it("the detector actually bites — the canary", () => {
    // ⚠ WITHOUT THIS, "no dead ends found" is indistinguishable from "the detector is broken".
    // A file that reads a column and never writes it must be flagged; one that writes it must not.
    const reader = `const x = row.admin_response; console.log(x);`;
    const writer = `await db.from("t").update({ admin_response: "hi", status: "resolved" }).eq("id", id);`;
    expect(writesColumn(reader, "admin_response"), "a pure read must not count as a write").toBe(false);
    expect(writesColumn(writer, "admin_response"), "an update payload must count as a write").toBe(true);
    expect(readsColumn(reader, "admin_response"), "a read must be located").not.toBeNull();
    // The patch-object shape, which is how the real writer is spelled.
    const patchWriter = `const patch: Record<string, unknown> = {\n  status,\n  resolved_at: null,\n};`;
    expect(writesColumn(patchWriter, "resolved_at"), "a patch object must count as a write").toBe(true);
  });
});
