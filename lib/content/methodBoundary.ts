import { AREAS } from "@/lib/content/whatWeCheck";

/**
 * THE BOUNDARY — what can be checked before you pay, and what sits outside anyone's reach.
 *
 * Two lists that are already the site's own claims, moved here so the /method prose and the boundary
 * graphic READ THE SAME ARRAYS. They were about to be written twice: the four structural limits
 * lived as a `CANNOT` literal inside method/page.tsx, and the graphic needed the same four. Two
 * copies of a refusal is the exact failure mode this codebase keeps finding — the copy drifts, and
 * the version a reader sees depends on which surface they landed on.
 *
 * THE LEFT COLUMN IS DERIVED FROM THE ASSESSMENT AREAS, one line each, so a sixth area appears in
 * the graphic the day it is added rather than the day somebody remembers. What is knowable is a
 * property of the method, not a list to maintain beside it.
 *
 * ⚠ COOL ACCENTS BOTH SIDES. The right-hand column is NOT coloured red: it is a boundary, not a
 * warning, and warm hues mean a verdict. It is also the strongest argument for the left-hand column,
 * which is why it is drawn as an equal — not as a failure state.
 */

/** One knowable line per assessment area, keyed so the graphic and the areas cannot come apart. */
const CHECKABLE_BY_AREA: Record<string, string> = {
  supplier_identity: "Whether the business is registered and trading, and how old its domain is",
  supply_chain_relationship: "Whether anyone other than the supplier confirms the brand relationship",
  brand_risk_assessment: "How the seller population on a listing has moved",
  documentation_review: "Whether the paperwork carries the fields you will later be asked for",
  sourcing_logic: "Whether the story is internally consistent",
};

export const CHECKABLE: readonly { key: string; area: string; line: string }[] = AREAS.map((a) => ({
  key: a.key,
  area: a.name,
  // An area with no line yet falls back to its own `examines` string rather than vanishing from the
  // graphic — a missing entry must be visible, not silently dropped.
  line: CHECKABLE_BY_AREA[a.key] ?? a.examines,
}));

/**
 * The four structural limits. `t`/`b` are the /method page's own headings and bodies, unchanged;
 * `short` is the same limit compressed to one drawable line for the graphic.
 *
 * ⚠ THE SPEC'S FIFTH BOUNDARY ITEM IS CUT — FOUNDER-RULED, 2026-08-25, NOT AN OVERSIGHT. The visual
 * spec's right column carried "where the stock came from before your supplier". Adding it would have
 * meant writing a NEW REFUSAL into product copy, and the ruling is that there are enough already.
 * This column therefore draws the four limits /method actually publishes and no more. If a fifth is
 * ever wanted, it is added to CANNOT first — as prose the site stands behind — and the graphic picks
 * it up on its own. NEVER the other way round: a graphic must not be where a product claim debuts.
 */
export const CANNOT: readonly { t: string; b: string; short: string }[] = [
  {
    t: "It cannot confirm authorization.",
    b: "Distribution agreements are private contracts. They are not filed anywhere public, and no method reaches them.",
    short: "Whether a distribution agreement exists — those are private contracts",
  },
  {
    t: "It cannot predict a brand's behavior.",
    b: "The report shows how a brand has acted. What it decides next quarter is a decision inside a company neither of us can see into.",
    short: "What a brand decides to do next quarter",
  },
  {
    t: "It cannot make a document acceptable to a marketplace.",
    b: "The report names which fields would need correcting. The acceptance decision belongs to the marketplace and happens after you have bought.",
    // ⚠ THE SCANNER SHAPED THIS LINE, AND IT WAS RIGHT TO. "Whether an invoice will be accepted"
    // trips the outcome-prediction rule — the banned construction is "<document> will be accepted",
    // and the rule cannot tell a question from an assertion, correctly refusing to try. The other
    // three shorts already carry their refusal inside the line ("those are private contracts",
    // "that judgement is yours"); this one was leaning on the column heading to do that work. Now
    // it names whose decision it is, which is what the limit above actually says.
    short: "Whether a marketplace accepts your paperwork — that call is theirs",
  },
  {
    t: "It cannot tell you a deal is good.",
    b: "It tells you whether the deal is what it appears to be. What you do about that is a commercial judgement, and it is yours.",
    short: "Whether a deal is a good deal — that judgement is yours",
  },
];

/** The line under the right-hand column. The point of the whole graphic, said once. */
export const BOUNDARY_CLOSING = "This column does not shrink with effort.";
