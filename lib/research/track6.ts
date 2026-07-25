import type { TrackContext } from "@/lib/research/contracts";
import {
  CATEGORY_FLAGS_TABLE, CATEGORY_FLAGS_CONTRACT_VERSION,
  SUBCATEGORY_KEYS, type CategoryRiskLevel,
} from "@/lib/research/categoryFlagsTable";
import { findCategoryLanguageViolations } from "@/lib/research/categoryLanguage";

// ── Category Compliance V1 — Track 6 (spec 2026-07-23, founder-APPROVED; brand-level ruling).
//
// THE TWO-HOP DESIGN: Hop 1 (research) — per brand, what categories does it observably sell in?
// The LLM PROPOSES categories + subcategory candidates from the CLOSED nine-key table. Hop 2
// (code) — CODE DECIDES: closed-key validation, VERBATIM flag-language injection from the
// founder's table, matched_via provenance. The electronics partner-programme row is BRAND-KEYED:
// fired in code against brands_submitted, no research hop, works on empty acquisition.
//
// STRUCTURALLY OUTSIDE THE ENGINE (the §5 trap ruling, APPROVED — and the frozen core enforces
// it): `category_compliance` is deliberately NOT a TrackKey. The union is load-bearing in TWO
// frozen files (synthesisCallB's exhaustive DIMENSION_TOKENS; verdictEngine's closed
// SCORING_TRACKS), so this track has its OWN output type, its own key-space, zero evidence items,
// zero unknowns — nothing can reach M1, any signal, or the doubt axis. Verdict-inertia is
// absolute because the engine is never entered.
//
// THE HONESTY LAW (§3, the founder's own governing law): flag language is code-injected verbatim
// and locked byte-identical to the recovered doc; LLM narrative fields are scrubbed by the
// Condition-1 scanner (polarity-blind, alternation-complete, evasion-proven) — a verdictive note
// is nulled and audited, never delivered.
//
// category_verdict is an INTERNAL FIELD NAME ONLY (Condition 3): client rendering never uses
// the word "verdict" for it — recorded as a client-surface-gate constraint.
// LIVE WIRING (orchestration step, acquisition plumbing, persistence) awaits the described-and-
// stopped migration + orchestration ruling — deps are REQUIRED so nothing here can silently run
// against the frozen acquisition union. ──

export interface CategoryFlagHit {
  subcategory: string;
  flag_language: string;                      // VERBATIM from the table — never LLM text
  risk_level: CategoryRiskLevel;
  matched_via: "category_research" | "brand_keyed";
}

export interface CategoryFound {
  category: string;                           // as researched (Hop 1), LLM-worded, scanner-scrubbed
  evidence_ids: string[];
  confidence: "high" | "medium" | "low";
  flags: CategoryFlagHit[];
}

export interface CategoryBrandAssessment {
  brand: string;                              // from cases.brands_submitted ONLY (roster lock)
  categories_found: CategoryFound[];
  brand_category_note: string | null;
}

export interface CategoryComplianceAssessment {
  contract_version: typeof CATEGORY_FLAGS_CONTRACT_VERSION;
  scope: "brand_level";                       // V1 truth-in-labeling (V2's ASIN hinge)
  // The governing law is deliberately NOT embedded in the payload: its verbatim text contains
  // "Amazon approval" (in denial form), and the delivery gate's H4 scan has no negation
  // carve-out — an embedded copy would block every case carrying a category block (RED-proven
  // in track6.test.ts). The law is derivable from contract_version via the table module; the
  // H4-carve-out question belongs to the banned-language fix gate (Condition-2 finding).
  per_brand: CategoryBrandAssessment[];
  category_verdict: "no_known_requirements" | "requirements_identified" | "could_not_determine";
  category_verdict_basis: string;             // code-templated — the LLM never writes it
  audits: { field: string; reason: string }[];
}

// The track's own output row shape — deliberately NOT contracts.TrackOutput (see header).
export interface CategoryTrackOutput {
  track_key: "category_compliance";
  evidence_items: [];                         // NEVER — nothing vote-bearing can exist (Track 5's law)
  unknowns: [];                               // category gaps live in could_not_determine, not the doubt axis
  non_voting: true;
  reasoning_notes: string;
  category_compliance: CategoryComplianceAssessment;
  cost_usd: number;
}

// Injectable seams — REQUIRED (no live defaults until the wiring gate; see header).
export interface Track6Deps {
  gather: (ctx: TrackContext) => Promise<{ pack: { sources: unknown[] }; metrics: unknown[] }>;
  model: (input: { brands: string[]; sources: unknown[]; tableAid: { subcategory: string; trigger_keywords: string[] }[] }) => Promise<{ json: unknown; cost_usd: number }>;
}

interface RawCategory { category?: unknown; evidence_ids?: unknown; confidence?: unknown; subcategory?: unknown }
interface RawBrand { brand?: unknown; categories_found?: unknown; brand_category_note?: unknown }

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const CONFIDENCES = new Set(["high", "medium", "low"]);

export async function runTrack6(ctx: TrackContext, deps: Track6Deps): Promise<CategoryTrackOutput> {
  const roster = ctx.brands_submitted ?? [];
  const audits: CategoryComplianceAssessment["audits"] = [];

  // ── HOP 1 — research + LLM proposal (empty acquisition ⇒ no proposals; never a throw:
  // could_not_determine is the honest state, not an escalation — this is advisory, not a vote). ──
  const { pack } = await deps.gather(ctx);
  const researched = pack.sources.length > 0
    ? await deps.model({
        brands: roster, sources: pack.sources,
        tableAid: CATEGORY_FLAGS_TABLE.filter((r) => !r.brand_keyed).map((r) => ({ subcategory: r.subcategory, trigger_keywords: [...r.trigger_keywords] })),
      })
    : null;
  const rawBrands: RawBrand[] = Array.isArray((researched?.json as { per_brand?: unknown })?.per_brand)
    ? ((researched!.json as { per_brand: RawBrand[] }).per_brand)
    : [];

  // ── HOP 2 — CODE DECIDES. Roster lock, closed-key validation, verbatim injection. ──
  const rosterSet = new Set(roster.map((b) => b.toLowerCase()));
  const byBrand = new Map<string, CategoryBrandAssessment>();
  for (const b of roster) byBrand.set(b.toLowerCase(), { brand: b, categories_found: [], brand_category_note: null });

  for (const rb of rawBrands) {
    const key = str(rb.brand).toLowerCase();
    if (!rosterSet.has(key)) {
      audits.push({ field: "per_brand", reason: `dropped brand not in the submitted roster: ${str(rb.brand) || "(unnamed)"} (the roster lock)` });
      continue;
    }
    const target = byBrand.get(key)!;
    const cats: RawCategory[] = Array.isArray(rb.categories_found) ? (rb.categories_found as RawCategory[]) : [];
    for (const rc of cats) {
      const category = str(rc.category);
      if (!category) continue;
      const flags: CategoryFlagHit[] = [];
      const proposed = rc.subcategory == null ? null : str(rc.subcategory);
      if (proposed) {
        if (SUBCATEGORY_KEYS.has(proposed)) {
          const row = CATEGORY_FLAGS_TABLE.find((r) => r.subcategory === proposed)!;
          if (!row.brand_keyed) {
            flags.push({ subcategory: row.subcategory, flag_language: row.flag_language, risk_level: row.risk_level, matched_via: "category_research" });
          }
        } else {
          audits.push({ field: "subcategory", reason: `dropped subcategory outside the closed cc-1.0.0 key set: ${proposed} (LLM proposes, code decides)` });
        }
      }
      // The narrative category label is LLM text — scanner-scrubbed like every narrative field.
      const catViolations = findCategoryLanguageViolations(category);
      target.categories_found.push({
        category: catViolations.length > 0 ? "(category label withheld — language violation)" : category,
        evidence_ids: Array.isArray(rc.evidence_ids) ? (rc.evidence_ids as unknown[]).filter((x): x is string => typeof x === "string") : [],
        confidence: CONFIDENCES.has(str(rc.confidence)) ? (str(rc.confidence) as "high" | "medium" | "low") : "low",
        flags,
      });
      if (catViolations.length > 0) audits.push({ field: "category", reason: `category label scrubbed: ${catViolations.join(", ")}` });
    }
    // CONDITION 1 — the honesty scanner over the brand note: nulled and audited, never delivered.
    const note = rb.brand_category_note == null ? null : str(rb.brand_category_note) || null;
    if (note) {
      const violations = findCategoryLanguageViolations(note);
      if (violations.length > 0) {
        audits.push({ field: "brand_category_note", reason: `note scrubbed (Condition-1 scanner): ${violations.join(", ")}` });
        target.brand_category_note = null;
      } else {
        target.brand_category_note = note;
      }
    }
  }

  // ── THE BRAND-KEYED ROW — deterministic, hop-free, research-independent (case-insensitive
  // EXACT match only: "HP" fires on "HP", never inside another brand's name). ──
  for (const row of CATEGORY_FLAGS_TABLE.filter((r) => r.brand_keyed)) {
    const triggers = new Set(row.trigger_keywords.map((k) => k.toLowerCase()));
    for (const b of roster) {
      if (!triggers.has(b.toLowerCase())) continue;
      byBrand.get(b.toLowerCase())!.categories_found.push({
        category: row.subcategory, evidence_ids: [], confidence: "high",
        flags: [{ subcategory: row.subcategory, flag_language: row.flag_language, risk_level: row.risk_level, matched_via: "brand_keyed" }],
      });
    }
  }

  // ── The category verdict — CODE-DERIVED from counts; the LLM's opinion of it is never read. ──
  const per_brand = [...byBrand.values()];
  const flagCount = per_brand.reduce((n, b) => n + b.categories_found.reduce((m, c) => m + c.flags.length, 0), 0);
  const categoryCount = per_brand.reduce((n, b) => n + b.categories_found.length, 0);
  const researchRan = pack.sources.length > 0;
  const category_verdict: CategoryComplianceAssessment["category_verdict"] =
    flagCount > 0 ? "requirements_identified"
    : researchRan && categoryCount > 0 ? "no_known_requirements"
    : "could_not_determine";
  const category_verdict_basis =
    flagCount > 0
      ? `${flagCount} category flag(s) across ${categoryCount} categorie(s) found for ${per_brand.length} brand(s)${researchRan ? "" : " — brand-keyed match only; category research returned no sources"}`
      : researchRan && categoryCount > 0
        ? `${categoryCount} categorie(s) found across ${per_brand.length} brand(s); none matched a flagged subcategory`
        : "category research returned no usable sources — requirements could not be determined (stated as absence of research, never as clearance)";

  return {
    track_key: "category_compliance",
    evidence_items: [], unknowns: [], non_voting: true,
    reasoning_notes: `category compliance (brand-level, non-voting, engine-external): ${category_verdict} — ${category_verdict_basis}`,
    category_compliance: {
      contract_version: CATEGORY_FLAGS_CONTRACT_VERSION, scope: "brand_level",
      per_brand, category_verdict, category_verdict_basis, audits,
    },
    cost_usd: researched?.cost_usd ?? 0,
  };
}
