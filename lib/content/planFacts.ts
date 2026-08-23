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
  PLAN_BRAND_CAPS, PLAN_CREDITS_PER_CYCLE, PLAN_CATEGORY, CASE_SLA_HOURS, type PlanType,
} from "@/lib/constants/plans";
import {
  requiredFindingTracks, trackByNumber, isAssessmentArea, ASSESSMENT_AREA_KEYS,
} from "@/lib/constants/tracks";

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
