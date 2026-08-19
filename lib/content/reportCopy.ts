// ── SHARED REPORT DISPLAY COPY — ONE SOURCE, TWO SURFACES (founder-ruled) ───────────────────
//
// WHY THIS EXISTS: the portal (components/portal/report-view.tsx) and the PDF
// (lib/pdf/reportTemplate.ts) render THE SAME PAID DELIVERABLE. Every string below was duplicated
// verbatim between them, and the PDF's own comment admitted it — "Locked display copy — verbatim
// from the shipping report". Verbatim-by-convention is not a lock; it is a promise that holds
// until someone edits one file.
//
// IT ALREADY NEARLY BROKE. `HOW_TO_READ` was reworded in the portal by one lane while the design
// lane was working in the PDF. Nothing failed, nothing flagged, and the two copies were compared by
// hand. A client reading the portal and the PDF side by side must NEVER see two versions of the
// same sentence about the same report — that is not a typo class, it is a trust class.
//
// ⛔ COPY LIVES HERE; PRESENTATION DOES NOT. The portal keeps its Tailwind classes and the PDF
// keeps its hex palette and point sizes — those are genuinely different media and forcing them
// together would be the opposite mistake. What is shared is WHAT WE SAY, never how it looks.
//
// ⛔ EVERY STRING HERE IS CLIENT-FACING AND FOUNDER-RULED. Changing one changes what a paying
// client reads on both surfaces at once. That is the point of the file, and the reason to be
// careful in it: reportCopy.test.ts holds it to the banned-language gate.

/** The four verdict levels: the NAME a client reads and what the level MEANS. */
export const VERDICT_COPY: Record<string, { name: string; level: number; means: string }> = {
  source_clear: {
    name: "Source Clear", level: 1,
    means: "The evidence supported this source at the time of research. Standard diligence still applies — the decision stays yours.",
  },
  usable_with_conditions: {
    name: "Usable With Conditions", level: 2,
    means: "Workable — with the stated conditions handled first. The conditions are part of the verdict, not a footnote.",
  },
  verify_before_purchase: {
    name: "Verify Before Purchase", level: 3,
    means: "Do not place a large order — resolve the listed items first. Re-submit for an updated review once resolved.",
  },
  do_not_rely: {
    name: "Do Not Rely", level: 4,
    means: "The evidence does not support relying on this source. The report explains what drove this.",
  },
};

/** Strongest → weakest. The scale renders in this order on both surfaces. */
export const VERDICT_SCALE_ORDER = ["source_clear", "usable_with_conditions", "verify_before_purchase", "do_not_rely"] as const;

/**
 * Client-facing names for each track. FOUR copies of this existed — reviewView, reportTemplate,
 * report-view, and the Track 6 entry I added to two of them separately during §2 and §4, which is
 * exactly how drift starts.
 *
 * `category_compliance` is ADVISORY and not a sold assessment area (it is deliberately absent from
 * the canonical TrackKey union); it is named here so neither surface ever prints the raw key.
 */
export const AREA_NAMES: Record<string, string> = {
  supplier_identity: "Supplier Legitimacy",
  supply_chain_relationship: "Supply-Chain Relationship",
  brand_risk_assessment: "Brand Risk",
  documentation_review: "Documentation Review",
  sourcing_logic: "Sourcing Logic",
  category_compliance: "Category compliance",
};

/** What each area covers — the tooltip in the portal, the scope note in the document. */
export const AREA_DEFS: Record<string, string> = {
  supplier_identity: "Whether the supplier is a real, verifiable wholesale business.",
  supply_chain_relationship: "Whether the supplier credibly sources the brands in scope, and whether an authorization link could be confirmed.",
  brand_risk_assessment: "The brands' reseller environment and any enforcement signals against resellers of this profile.",
  documentation_review: "What any documents you provided corroborate. Documents can add support but never raise the verdict above what the research on its own supports.",
  sourcing_logic: "A consistency check across the assessed areas. Informational — it does not change the verdict.",
};

/** Verified / Assessed / Not assessed — the evidence-strength chips and their definitions. */
export const CHIP_DEFS = {
  verified: "Independently corroborated — multiple independent sources confirm this.",
  assessed: "We evaluated the available evidence and formed a view, but could not independently corroborate it. A reasoned read, not an independent confirmation.",
  not_assessed: "We did not evaluate this area — for example, because no documents were provided. It neither raises nor lowers the verdict.",
} as const;

export const CHECKLIST_INTRO =
  "Put these to the supplier before you commit. Satisfactory answers do not guarantee marketplace acceptance.";

export const CATEGORY_NOTE =
  "Selling these brands in their marketplace categories may require category approval or specific documentation before listing. This is a marketplace requirement independent of this report’s verdict — confirm your category status before you commit.";

export const CLOSING_STATEMENT =
  "This report reflects observable evidence available at the time of research. It is not a guarantee of marketplace approval, account safety, or brand action. The decision to purchase is yours.";

export const HOW_TO_READ =
  "This report gives you one clear verdict, the single most important risk in plain language, findings across the assessment areas your plan includes, an honest split between what we confirmed and what we could not, and a short checklist to run before you commit. A few things worth knowing: the verdict is a position on a four-level scale, not a pass/fail — it reflects what the observable evidence supported at the time of research; “could not confirm” is not an accusation — it marks the limits of what public evidence shows; “not assessed” means we did not evaluate that area — it neither helps nor harms the verdict; the decision stays yours — a report is not a guarantee of an outcome; it tells you what the evidence supports.";

// ── SOURCING LOGIC — FOUNDER-RULED OPTION (b), 2026-08-19 ────────────────────────────────────
// The area renders a fixed sentence that says nothing about the client's own supplier
// ("Consistency check — informational; does not affect the verdict"). Omitting the row was
// considered and REJECTED: sourcing_logic is one of the five areas the pricing page sells by name
// ("Three assessment areas: Supplier Legitimacy, Brand Risk, Sourcing Logic"), so dropping it
// would make a $99 report show two areas against a page promising three. THE COUNT AND THE ROW
// BOTH STAY; what changes is that it no longer sits among the verdict-bearing findings as though
// it were one.
//
// ⚠ FOUNDER'S NOTE CARRIED FORWARD, deliberately unresolved: a fixed sentence that says nothing
// about the client's supplier is DEAD TEXT on a paid report. Option (a) — making it say something
// case-specific — is the real fix and is not this change.
export const NON_VERDICT_SUBHEAD = "Checks that don’t affect the verdict";
export const NON_VERDICT_SUBHEAD_NOTE =
  "These run on every report and are included in your plan’s assessment areas. They are consistency checks — they never raise or lower the verdict.";

/** Areas that render under the non-verdict subhead. Track 5 is the ruled non-voting emitter. */
export const NON_VERDICT_AREAS: readonly string[] = ["sourcing_logic"];
export const isNonVerdictArea = (trackKey: string): boolean => NON_VERDICT_AREAS.includes(trackKey);
