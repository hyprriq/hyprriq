import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { sampleChecklist, sampleAreas, sampleMonitor } from "./sampleReport";
import { SAMPLE_CASE_IDS, LIVE_CASE_ID_RE } from "./sampleIdentifiers";

// ── LOCK — THE MASKING HELD (2026-08-24) ──────────────────────────────────────────────────────
//
// /sample-report publishes a REAL delivered case (AWI-2608-037) with the supplier, both brands and
// the locations removed. The failure that matters is a single surviving name: the dev brief warns
// that "a brand name surviving in one finding while masked in another is exactly what a careful
// reader notices", and it would be a real business named on a public marketing page beside a risk
// finding.
//
// ⛔ THE REAL NAMES ARE NOT IN THIS FILE, AND MUST NEVER BE. Writing them into a tracked test to
// assert their absence would put them into git for the first time — the exact opposite of masking.
// Instead this reads the UNTRACKED source dump (qa-layout/, gitignored), derives the candidate
// names from it, and asserts none reached the published module. Where the dump is absent — CI,
// another machine, a fresh clone — the derivation test SKIPS and says so; the structural checks
// below always run.

const repo = path.resolve(__dirname, "../..");
const SOURCE = path.join(repo, "qa-layout/AWI-2608-037.html");
const published = fs.readFileSync(path.join(__dirname, "sampleReport.ts"), "utf8");

/** Comments carry the provenance (the real case number) and are never published. Strip them first —
 *  the same exemption sampleIdentifiers.lock.test.ts grants for the correction paper trail. */
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");

const publishedCode = stripComments(published);

/**
 * THE APPROVED VOCABULARY. The lock is INVERTED on purpose: rather than guessing which names to
 * hunt for, it constrains what may appear at all. Every proper noun in the published copy must be
 * listed here, so a name that survives a future re-mask fails the build by DEFAULT rather than
 * needing someone to have anticipated it.
 *
 * Each entry is a deliberate approval, and only three kinds qualify:
 *   · marketplaces the copy is allowed to name at all (sitewide rule 12: Amazon, Walmart, Stripe —
 *     eBay appears inside a delivered scope note about platform review)
 *   · the locked product vocabulary (verdict names, certainty words, area names)
 *   · calendar months, which carry no identity
 * A COMPANY NAME CANNOT BE ADDED HERE WITHOUT SOMEONE NOTICING WHAT THEY ARE DOING.
 */
const APPROVED = new Set([
  // marketplaces — nameable by ruling
  "Amazon", "Walmart", "eBay",
  // months
  "January", "February", "March", "April", "May", "June", "July", "August", "September",
  "October", "November", "December",
  // locked product vocabulary — verdicts, certainty words, area names
  "Verified", "Assessed", "Not", "Supplier", "Brand", "Selective", "Distribution", "Agreement",
  "Letter", "Authorization", "Category", "Consistency", "Informational", "Legitimacy",
  "Supplier Legitimacy", "Chain Relationship",
  // a generic contract type named in a delivered finding — a kind of document, not a company
  "Selective Distribution Agreement",
  // a government office and a continent: neither identifies a party
  "Secretary", "State", "European",
  // acronyms carried by the delivered checklist
  "IP", "MAP",
  // section headings in the delivered text
  "Remaining",
  // regions the delivered text names (jurisdictions, not parties)
  "US", "UK",
  // sentence-initial ordinary words
  "The", "This", "These", "That", "What", "For", "No", "Multiple", "Key", "Put", "Can", "Does",
  "Has", "Who", "Whether", "Following", "If", "Is", "Any", "Further", "Resolution", "Grey",
  "Platforms", "Additional", "All", "Best", "Selling", "It", "In", "Risk", "Every", "Both",
  "Supply", "Could", "They", "Satisfactory", "Where", "There", "Same", "When", "Their", "Its",
]);

describe("LOCK — the sample report's masking held", () => {
  it("every proper noun in the published copy is on the approved list", () => {
    // Bracketed mask tokens are validated by their own test below; blank them so "[Brand A]" does
    // not read as a proper noun here.
    const literals = [...publishedCode.matchAll(/"((?:[^"\\\n]|\\.)*)"/g)]
      .map((m) => m[1].replace(/\[[^\]]*\]/g, " "))
      .join(" ");

    const found = new Set<string>();
    for (const m of literals.matchAll(/\b[A-Z][A-Za-z']{1,}\b/g)) found.add(m[0]);
    // A domain or a lowercase hyphenated brand token would both be identity leaks.
    for (const m of literals.matchAll(/\b[a-z0-9-]{3,}\.(?:com|net|org|co\.uk)\b/g)) found.add(m[0]);

    const unapproved = [...found].filter((w) => !APPROVED.has(w));
    expect(
      unapproved,
      `unapproved proper nouns in the published sample report — mask them, or approve them here deliberately: ${unapproved.join(", ")}`,
    ).toEqual([]);
  });

  it("cross-checks the published copy against the untracked source case, where it exists", () => {
    if (!fs.existsSync(SOURCE)) {
      // Stated, never silent: this machine has no source dump, so the cross-check cannot run. The
      // approved-vocabulary test above is the one that always holds.
      expect(fs.existsSync(SOURCE), "source dump absent — cross-check skipped by design").toBe(false);
      return;
    }
    const raw = fs
      .readFileSync(SOURCE, "utf8")
      .replace(/<script[\s\S]*?<\/script>/g, " ")
      .replace(/<style[\s\S]*?<\/style>/g, " ")
      .replace(/<[^>]+>/g, " ");

    // Only high-signal identifiers: domains, and multi-word Capitalised sequences (company names).
    const candidates = new Set<string>();
    for (const m of raw.matchAll(/\b[a-z0-9-]{3,}\.(?:com|net|org|co\.uk)\b/g)) candidates.add(m[0]);
    for (const m of raw.matchAll(/\b[A-Z][a-z]{2,}(?: [A-Z][a-z]{2,})+\b/g)) candidates.add(m[0]);

    const leaked = [...candidates].filter(
      (c) =>
        !APPROVED.has(c) &&
        new RegExp(`\\b${c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(publishedCode),
    );
    expect(
      leaked,
      `these appear in BOTH the source case and the published sample report: ${leaked.join(", ")}`,
    ).toEqual([]);
  });

  it("every masked token is a bracketed placeholder, and they are used consistently", () => {
    // The supplier must be the SAME token everywhere. A reader who sees two different stand-ins for
    // one company reads it as two companies.
    const all = [
      ...sampleChecklist,
      ...sampleMonitor,
      ...sampleAreas.flatMap((a) => a.blocks.flatMap((b) => [b.body ?? "", ...(b.bullets ?? [])])),
    ].join(" ");
    const tokens = new Set([...all.matchAll(/\[[^\]]+\]/g)].map((m) => m[0]));
    const allowed = new Set([
      "[Supplier]", "[Brand A]", "[Brand B]", "[Brand A's parent]", "[supplier-website]",
      "[City, State]", "[State]",
    ]);
    const unexpected = [...tokens].filter((t) => !allowed.has(t));
    expect(unexpected, `unrecognised mask tokens: ${unexpected.join(", ")}`).toEqual([]);
    expect(tokens.has("[Supplier]"), "the supplier placeholder is missing entirely").toBe(true);
  });

  it("the published case reference is a reserved sample id, never a live-shaped one", () => {
    const page = stripComments(
      fs.readFileSync(path.join(repo, "app/(marketing)/sample-report/page.tsx"), "utf8"),
    );
    expect(LIVE_CASE_ID_RE.test(page), "a live-shaped case id reached the sample report page").toBe(false);
    expect(LIVE_CASE_ID_RE.test(publishedCode), "a live-shaped case id reached the sample report copy").toBe(false);
    expect(page).toContain("SAMPLE_CASE_ID");
    expect(SAMPLE_CASE_IDS.length).toBeGreaterThan(0);
  });

  it("the delivered verdict, findings and checklist are all still present", () => {
    // The ruling was: mask the names, change nothing else. A future "tidy" that trims the checklist
    // or drops an area would quietly turn a real report into a marketing summary of one.
    expect(sampleChecklist.length).toBe(17);
    expect(sampleAreas.map((a) => a.key)).toEqual([
      "supplier_identity", "supply_chain_relationship", "brand_risk_assessment", "documentation_review",
    ]);
    expect(sampleAreas.find((a) => a.key === "documentation_review")?.chip).toBe("Not assessed");
  });
});
