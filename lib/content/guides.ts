// ── HOW-TO GUIDES 3 & 4 (founder-directed 2026-09-07, reversing the earlier cut ruling) ──────
//
// CLIENT-FACING PROSE, DERIVED — NEVER INVENTED. The constraints these two guides were written
// under, verbatim from the direction:
//   · derive from what exists — the five areas and their limits from the registry
//     (lib/constants/tracks.ts + lib/content/reportCopy.ts), the checklist guide from how the
//     questions are actually generated (the track prompts' mandatory-coverage law: every open gap
//     named in a finding emits a tailored, brand-scoped question; review-team additions are
//     labelled on the checklist);
//   · never promise an outcome we do not control — guide 3 is about getting answers from a
//     supplier, never what those answers achieve with a marketplace;
//   · show WHAT we examine, never HOW we score it — no weights, priorities, bands or signals;
//   · "assessment areas", never the internal word for them;
//   · both guides pass the banned-language gate (BL6 scans this directory's literals at commit;
//     guides.test.ts additionally locks area coverage to the registry).
//
// AREA NAMES ARE NOT WRITTEN HERE. The areas guide renders AREA_NAMES over ASSESSMENT_AREA_KEYS,
// so a renamed or added area flows in from the registry; this module carries only the per-area
// examines/limit prose, keyed by track_key. guides.test.ts fails the build if the keys here and
// the registry ever disagree in either direction.

import { CHIP_DEF_VERIFIED_CLAUSE } from "@/lib/content/reportCopy";

export type GuideSection = { heading: string; paras: string[]; bullets?: string[] };

export const checklistGuide = {
  slug: "verification-checklist",
  title: "Working the verification checklist",
  sub: "Turning the report’s questions into supplier answers.",
  intro:
    "Your report’s Checklist tab lists numbered questions to put to your supplier before you commit. This guide covers why each question is there, how to put the list to a supplier, and how to read what comes back.",
  sections: [
    {
      heading: "Why these questions exist",
      paras: [
        "Every question on the checklist marks something specific that research could not settle from the outside. When a finding names an open point, a question is written for it — tailored to that gap, not pulled from a template. Most questions come from the research itself; some are added by our review team, and those are labelled on the checklist.",
        "A question is never an accusation. Many of the things a checklist asks about — supply arrangements, territory coverage, document trails — are private commercial matters that leave little public record. The question exists because only your supplier can settle it.",
      ],
    },
    {
      heading: "Before you send anything",
      paras: [],
      bullets: [
        "Read each question next to the finding it came from. The report states what was found and what stayed open — that is the context the question was written in.",
        "Note which brand each question concerns. Where a question names a brand, keep the answer scoped to that brand — an answer about one brand does not settle the same point for another.",
        "Decide what would settle each question for you before you ask it. A question about a document trail is settled by a document; a question about territory is settled by a named territory.",
      ],
    },
    {
      heading: "Putting the questions to your supplier",
      paras: [],
      bullets: [
        "Send them in writing, in one message. Written answers can be re-read, compared against the report, and kept — a reassurance on a phone call cannot.",
        "Use the questions as written, or in your own words — what matters is that the specific point survives. Each question was written for one gap; a softened version that no longer names the gap invites an answer that no longer closes it.",
        "This is a normal, professional request. Wholesale buyers ask suppliers about sourcing and paperwork all the time; a supplier who deals in the brands you named has heard these questions before.",
      ],
    },
    {
      heading: "Reading the answers",
      paras: [],
      bullets: [
        "A useful answer is specific and checkable: a name, a date, a territory, a document, a reference you could follow up. General reassurance — “we’ve been doing this for years, nobody has had a problem” — answers the mood, not the question.",
        "An answer that points to a document beats an answer that does not. Where a supplier offers paperwork, take it and keep it.",
        "It is fine for some answers to stay open. A supplier may genuinely be unable to share a private agreement. What you then hold is an accurate picture — which points are settled and which are not — and that picture, not any single answer, is what to weigh before committing.",
      ],
    },
    {
      heading: "Where the answers can and cannot take you",
      paras: [
        "Your report is a record of what the evidence supported at the time of research. Answers you collect afterwards do not change the delivered report by themselves — if what you learn materially changes the picture, you can submit the case again and have the new evidence assessed.",
        "The answers are between you and your supplier. They can settle what outside research could not see; they do not speak for any marketplace, and neither do we — satisfactory answers do not guarantee marketplace acceptance. The decision to purchase stays yours.",
      ],
    },
  ] satisfies GuideSection[],
};

/** Per-area guide prose, keyed by the registry's track_key. Names render from AREA_NAMES —
 *  never written here. `examines` states what the area looks at; `limit` states where it stops.
 *  The limits are part of the product, not small print — each one derives from a standing rule:
 *  absence-is-not-accusation (Supplier Legitimacy), private-agreements-are-unreadable and
 *  per-brand isolation (Supply-Chain Relationship), environment-not-prediction (Brand Risk),
 *  documents-never-raise (Documentation Review), never-votes (Sourcing Logic). */
export const areaGuideEntries: Record<string, { examines: string; limit: string }> = {
  supplier_identity: {
    examines:
      "Whether the supplier is a real, operating wholesale business: registration records, addresses, web presence, domain history, and whether the contact details hold together.",
    limit:
      "Public records can show that a business exists and operates — they cannot prove intent. The absence of a record is a gap in evidence, never an accusation, and this area describes what the record shows rather than passing a character judgment on the business.",
  },
  supply_chain_relationship: {
    examines:
      "Whether the supplier credibly sources the brands you named: distributor listings, dealer locators, brand references, and trade history — assessed separately for each brand.",
    limit:
      "Supply arrangements are private agreements, and no outside research can read them directly. Evidence can support a relationship, but the absence of public evidence is neutral — and for some brands expected, because many sell only through private business-to-business channels that leave no public reseller trail. Unverified is not disproven, and one brand’s status never extends to another.",
  },
  brand_risk_assessment: {
    examines:
      "The environment around each brand: its distribution model, how actively it enforces against resellers with a profile like yours, and what enforcement signals are on record.",
    limit:
      "This area reads the environment, not the future. It describes the conditions around a brand — it does not predict what any brand or marketplace will decide about you, and no report can.",
  },
  documentation_review: {
    examines:
      "What the documents you provide corroborate: whether the entity, address, and details on your paperwork line up with what the research found independently.",
    limit:
      "Documents can add support, but they never raise the verdict above what the research on its own supports. Supplier paperwork usually carries the supplier’s own item codes rather than brand names, so a brand missing from an invoice is expected and never counts against the supplier. If you provide no documents, this area is marked not assessed — it neither helps nor harms the verdict.",
  },
  sourcing_logic: {
    examines:
      "Whether the whole picture holds together commercially — a consistency check across the assessed areas.",
    limit:
      "Informational by design: it never raises or lowers the verdict. It exists so an inconsistency between areas is looked at rather than passed over.",
  },
};

export const areasGuide = {
  slug: "assessment-areas",
  title: "What the five assessment areas cover",
  sub: "What each area examines — and, just as deliberately, where each one stops.",
  intro:
    "Every report is built from the same set of assessment areas. Which ones run depends on your plan — your report states exactly what it covered. The limits below are part of the product, not small print: an honest account of where outside research ends is what makes the findings inside it worth relying on.",
  examinesLabel: "What we examine",
  limitLabel: "Where it stops",
  closing: {
    heading: "What every area has in common",
    paras: [
      // Verified READS the single ruled definition (founder-ruled 2026-09-07).
      `Each finding tells you how firm the ground is. Verified means ${CHIP_DEF_VERIFIED_CLAUSE} Assessed means we evaluated the available evidence and formed a view without independent corroboration — a normal state for many findings, not a defect. Not assessed means the area was not evaluated, and it moves the verdict neither way.`,
      "Everything above is about what we examine — how findings combine into a verdict is the engine’s job, and what reaches you is the verdict, the findings, and an honest split between what could and could not be corroborated. The report reflects observable evidence at the time of research, and the decision stays yours.",
    ],
  },
};
