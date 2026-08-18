/**
 * REPORT PDF VERIFICATION — standing tool (renderer-switch pass, 2026-08-16).
 * Extracts every page's text (pdfjs-dist, no browser) and asserts the document contract:
 * ligature-intact text layer, zero internal vocabulary, orphan-free area headings, conditional
 * footnote, scope notes, checklist count, real TOC numbers, cover + closing completeness.
 *
 * Run: npx tsx scripts/pdf/verify-report.ts [pdfPath] [pdfPath...]
 * Default: docs/pdf-samples/AWI-2607-022-report.pdf + its -grey twin.
 * Exit 0 = every check green on every file; exit 1 otherwise (prints the failures).
 */
import fs from "node:fs";
import path from "node:path";
import { SECTIONS } from "@/lib/content/reportDocument";
import { DOC_TITLE } from "@/lib/content/documentIdentity";

const AREAS = ["Supplier Legitimacy", "Supply-Chain Relationship", "Brand Risk", "Documentation Review", "Sourcing Logic"];
const BROKEN_LIGATURES = [/verif ?ed\b/i, /confrm/i, /\bflings\b/i, /ofcial/i, /\bveried\b/i];
const INTERNAL_LEAKS = [/\bEV-\d/, /\bsrc_\d/, /Dimension \d/, /\bsoft_fail\b/, /\bhard_fail\b/, /track_\d/, /\bn_a\b/];

interface Check { name: string; pass: boolean; detail?: string }

async function verify(pdfPath: string): Promise<Check[]> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await getDocument({ data: new Uint8Array(fs.readFileSync(pdfPath)), useSystemFonts: true }).promise;
  const pages: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const tc = await (await doc.getPage(p)).getTextContent();
    pages.push((tc.items as { str: string }[]).map((i) => i.str).join(" ").replace(/\s+/g, " ").trim());
  }
  const all = " " + pages.join(" ");
  const squash = all.toLowerCase().replace(/\s/g, "");
  const checks: Check[] = [];
  const add = (name: string, pass: boolean, detail?: string) => checks.push({ name, pass, detail });

  // Text layer: no broken ligature forms; the fi/ff words extract intact.
  const broken = BROKEN_LIGATURES.filter((re) => re.test(all)).map(String);
  add("no broken ligature forms", broken.length === 0, broken.join(", "));
  add("fi/ff words intact", ["verified", "confirm"].every((w) => squash.includes(w)));

  // Projection: zero internal vocabulary.
  const leaks = INTERNAL_LEAKS.filter((re) => re.test(all)).map(String);
  add("no internal vocabulary", leaks.length === 0, leaks.join(", "));

  // Page-break discipline: no page may END with an area heading.
  const orphans = pages
    .map((t, i) => {
      const tail = t.replace(new RegExp(`${DOC_TITLE}.*?Page \\d+ of \\d+`), "").trim().slice(-60);
      const hit = AREAS.find((a) => new RegExp(`${a}\\s*(Verified|Assessed|Not assessed|Informational)?\\s*$`).test(tail));
      return hit ? `p${i + 1}:${hit}` : null;
    })
    .filter(Boolean) as string[];
  add("no orphaned area headings", orphans.length === 0, orphans.join(", "));

  // Conditional footnote: dagger note only if a dagger marker exists in the checklist.
  const hasDagger = / † /.test(all) || /\?\s*†/.test(all);
  const hasNote = all.includes("Added by our review team");
  add("footnote only with markers", hasDagger === hasNote, `markers=${hasDagger} note=${hasNote}`);

  // Content completeness.
  // The checklist length is a property of the CASE, not of the template — an earlier version of
  // this check hardcoded 17 (case AWI-2607-022's count) and failed a perfectly good document
  // that legitimately had 16. Exactly the failure the founder's standing rule names: an
  // instrument that only sees the shape it was built for. Assert presence, and let the caller
  // assert an exact count when it actually knows one.
  const questionCount = (all.match(/\?/g) || []).length;
  const expected = Number(process.env.EXPECT_QUESTIONS ?? 0);
  add(
    expected > 0 ? `checklist has ${expected} questions` : "checklist has questions",
    expected > 0 ? questionCount === expected : questionCount >= 1,
    `found ${questionCount}`,
  );
  const missing = [...AREAS, "single most important risk", "not for redistribution", "Hyprr Retail LLC", "It is not a guarantee", "Contents"]
    .filter((m) => !squash.includes(m.toLowerCase().replace(/\s/g, "")));
  add("content set complete", missing.length === 0, missing.join(", "));
  add("cover complete", ["Verdict", "Prepared", "Case"].every((m) => pages[0].toUpperCase().includes(m.toUpperCase())));

  // TOC accuracy: each section's TOC number matches the page its heading actually starts on.
  const tocMismatch: string[] = [];
  for (const s of SECTIONS) {
    const actual = pages.findIndex((t, i) => i + 1 > 2 && t.includes(s.no) && t.includes(s.title)) + 1;
    const m = new RegExp(`${s.title}[ .·]*?(\\d+)`).exec(pages[1] ?? "");
    const tocN = m ? Number(m[1]) : NaN;
    if (!actual || tocN !== actual) tocMismatch.push(`${s.no}: toc=${tocN} actual=${actual}`);
  }
  add("TOC numbers real", tocMismatch.length === 0, tocMismatch.join(", "));

  // Running footer paginates.
  add("footer paginates", /Page 2 of \d+/.test(all));
  return checks;
}

async function main() {
  // Default target = THE DELIVERABLE. The greyscale print-check is an internal proof and is
  // only verified when explicitly passed.
  const files = process.argv.slice(2).length
    ? process.argv.slice(2)
    : ["docs/pdf-samples/AWI-2607-022-report.pdf"];
  let failed = false;
  for (const f of files) {
    const checks = await verify(path.resolve(f));
    const bad = checks.filter((c) => !c.pass);
    console.log(`\n${path.basename(f)}: ${checks.length - bad.length}/${checks.length} checks pass`);
    for (const c of checks) console.log(`  ${c.pass ? "PASS" : "FAIL"}  ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
    if (bad.length) failed = true;
  }
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
