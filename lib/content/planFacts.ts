// ── PLAN FACTS, DERIVED — the label/value rows the pricing cards render ───────────────────────
//
// hyprriq_flow_v2.html's pricing cards show a table of facts per plan (credits, brands covered,
// assessment areas, document review, delivery). Every one of those numbers already exists in a
// ruled registry, and standing rule 7 is explicit: prices, credits, caps and SLA are never typed
// by hand. A hardcoded "3 of 5" or "24 hours" in JSX is a defect even while it is correct, because
// it becomes wrong silently at the next ruling and no test catches a correct hardcoded value.
//
// So the rows DERIVE:
//   credits   ← PLAN_CREDITS_PER_CYCLE
//   brands    ← PLAN_BRAND_CAPS
//   areas     ← TRACK_CONFIG, counted through FINDING tracks (1-5) against the canonical registry
//   delivery  ← CASE_SLA_HOURS
//
// THE AREAS ROW IS THE ONE THAT MATTERS. "3 of 5" for the $99 tier was correct on the pricing page
// and hand-typed in two places. Counting it from TRACK_CONFIG means the day a tier's track list
// changes, every surface that sells it changes with it — rather than a founder remembering which
// pages mention the number.
//
// ⛔ UPLOAD CAPS ARE ABSENT ON PURPOSE. The spec's cards print "Document upload — 2 per case", but
// a standing law (lib/content/pricing.ts header) forbids upload caps in pricing copy. The row here
// keeps the meaningful distinction — whether document review is part of the plan at all — and
// drops the number. Flagged to the founder rather than silently shipped either way.

import {
  PLAN_BRAND_CAPS, PLAN_CREDITS_PER_CYCLE, PLAN_CATEGORY, PLAN_NAME, PLAN_TYPES,
  PLAN_ROLLOVER_LIMIT, CASE_SLA_HOURS, planOnSale, type PlanType,
} from "@/lib/constants/plans";
import { planAcceptsUploads } from "@/lib/constants/uploads";
import {
  requiredFindingTracks, trackByNumber, isAssessmentArea, ASSESSMENT_AREA_KEYS,
} from "@/lib/constants/tracks";
import { AREAS, type AreaCopy } from "@/lib/content/whatWeCheck";

export type PlanFact = { label: string; value: string };

/**
 * Sold assessment areas a plan runs, over the total the product sells.
 *
 * Counted by MEMBERSHIP in the canonical registry — the basis the 2026-08-18 ruling settled on
 * after measuring two wrong ones on the corpus: counting rendered rows makes a Scale case claim
 * six areas the moment Track 6 lands, and counting `non_voting !== true` gives the SAME track a
 * different answer on different cases. Advisory surfaces are excluded by `isAssessmentArea`, so
 * adding Track 6 to a plan's track list cannot inflate the number a client is sold.
 */
export function areasForPlan(plan: PlanType): { included: number; total: number; label: string } {
  const total = ASSESSMENT_AREA_KEYS.length;
  const included = requiredFindingTracks(plan).filter((n) =>
    isAssessmentArea(trackByNumber(n).track_key),
  ).length;
  return { included, total, label: included === total ? `All ${total}` : `${included} of ${total}` };
}

/**
 * Which assessment areas a plan RUNS and which it does not — both sides, derived.
 *
 * This is the honest answer to the question the pricing page now asks out loud: a $99 buyer gets
 * three of five areas, and the two that are absent (Supply-Chain Relationship, Documentation
 * Review) are the pair that answers "can this supplier actually supply this brand". They are gated
 * at RESEARCH time, so no row exists and nothing renders — the research does not happen, so there
 * is nothing withheld.
 *
 * Deriving BOTH lists from TRACK_CONFIG means the copy cannot go stale: change a tier's tracks and
 * the page's "answers" and "does not answer" lists move together, in the same direction, with no
 * one remembering to edit prose.
 */
export function areaSplitForPlan(plan: PlanType): { included: AreaCopy[]; excluded: AreaCopy[] } {
  const runs = new Set<string>(
    requiredFindingTracks(plan)
      .map((n) => trackByNumber(n).track_key as string)
      .filter(isAssessmentArea),
  );
  return {
    included: AREAS.filter((a) => runs.has(a.key)),
    excluded: AREAS.filter((a) => !runs.has(a.key)),
  };
}

/**
 * The plans A BUYER CAN ACTUALLY BUY TODAY that accept a document upload.
 *
 * FOUNDER RULING 3 (2026-08-24) said "$99 has no upload; uploads are Growth and above". The first
 * half is the invariant; the second half is true only of what is ON SALE. `planAcceptsUploads` is
 * "every plan except single_99", which INCLUDES Single Deep ($149) — a one-time tier priced BELOW
 * Growth. It is off sale today only because KEEPA_LIVE is false, so "Growth and above" would become
 * wrong the day it opens, on a page nobody would think to re-read.
 *
 * Deriving it from PLANS_ON_SALE ∩ planAcceptsUploads means the sentence is right today and right
 * the moment a tier returns to sale, without anyone editing prose.
 */
export function uploadPlanNames(): string[] {
  return PLAN_TYPES.filter((p) => planOnSale(p) && planAcceptsUploads(p)).map((p) => PLAN_NAME[p]);
}

/** Rollover, in the words a client reads. Derived from PLAN_ROLLOVER_LIMIT (founder ruling 5). */
export function rolloverAnswer(): string {
  const rolling = PLAN_TYPES.filter((p) => planOnSale(p) && PLAN_ROLLOVER_LIMIT[p] > 0)
    .map((p) => `${PLAN_NAME[p]} carries up to ${PLAN_ROLLOVER_LIMIT[p]}`)
    .join(", ");
  return rolling
    ? `Yes, on the monthly plans — ${rolling} unused credits into the next cycle. A single report does not roll over: it is a one-time purchase rather than a monthly allowance, so there is no cycle for it to roll into.`
    : "Single reports do not roll over — they are one-time purchases rather than a monthly allowance.";
}

export function factsForPlan(plan: PlanType): PlanFact[] {
  const credits = PLAN_CREDITS_PER_CYCLE[plan];
  const recurring = PLAN_CATEGORY[plan] === "subscription";
  const areas = areasForPlan(plan);
  return [
    {
      label: "Credits",
      value: recurring ? `${credits} per month` : String(credits),
    },
    {
      label: recurring ? "Brands per credit" : "Brands covered",
      value: `Up to ${PLAN_BRAND_CAPS[plan]}`,
    },
    { label: "Assessment areas", value: areas.label },
    { label: "Delivery", value: `${CASE_SLA_HOURS} hours` },
  ];
}
