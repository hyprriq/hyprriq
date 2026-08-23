// ── THE FIVE ASSESSMENT AREAS — ONE SOURCE, TWO SURFACES ─────────────────────────────────────
//
// The dev brief's build note 4: "The homepage service rail and /what-we-check share copy
// deliberately. The rail is the summary, the page is the full version. A change to one needs the
// same change to the other. Put it in the ticket."
//
// A ticket is a person remembering. This module is the structural version of that instruction:
// both renderings of every area live in ONE object, three lines apart, so editing the summary
// without seeing the full version — or the reverse — takes deliberate effort rather than luck.
// It is the same failure the report copy module exists to prevent (portal vs PDF drifting on the
// same sentence), and it nearly happened there before the shared module landed.
//
// AREA NAMES ARE NOT RETYPED. They come from AREA_NAMES in reportCopy.ts, the registry the paid
// deliverable renders from, so a prospect reading this page and a client reading their report see
// the same five names. The `key` is the canonical track_key.
//
// ⛔ CLIENT-FACING COPY. The banned-language lock walks this directory and scans every string
// literal automatically. Sitewide rules that govern every sentence here: never promise an outcome
// we do not control · show what is examined, never how it is weighed · absence of evidence is a
// gap, never an accusation · no system names ("AI", "algorithm", "model", "engine").

import { AREA_NAMES } from "@/lib/content/reportCopy";

export type AreaCopy = {
  /** canonical track_key — the reference, never a display string */
  key: string;
  /** client-facing name, from the report's own registry */
  name: string;
  /** the question the area answers, used as the heading on both surfaces */
  question: string;
  /** HOMEPAGE RAIL — the summary. One paragraph. */
  summary: string;
  /** HOMEPAGE RAIL — the one-line limit. */
  summaryLimit: string;
  /** /what-we-check — the full version. Paragraphs. */
  full: string[];
  /** /what-we-check — the stated limit, in body copy, never a footnote. */
  limit: string;
  /** shared by both surfaces */
  examines: string;
  /** shared by both surfaces */
  delivers: string;
};

export const AREAS: readonly AreaCopy[] = [
  {
    key: "supplier_identity",
    name: AREA_NAMES.supplier_identity,
    question: "Does this business actually exist?",
    summary:
      "First question: is there a real business behind the name on that invoice? We start with public records, then look for someone other than the supplier saying the same thing. A state filing on its own means very little. Plenty of companies are registered and nobody is trading.",
    summaryLimit: "a missing record is a gap, not proof of anything.",
    full: [
      "Before anything else: is there a real commercial operation behind the name on that invoice.",
      "The assessment works outward from public records to confirmation from someone other than the supplier. A single source is never treated as settled. One registry entry proves a filing exists. It does not prove a business trades.",
    ],
    limit:
      "we cannot prove a business is fraudulent. Absence of a record is a gap in evidence, never an accusation.",
    examines:
      "State business records · how old the website is · signs of a real premises · listings from elsewhere",
    delivers: "A straight answer on whether this is a real business, and every source we used.",
  },
  {
    key: "supply_chain_relationship",
    name: AREA_NAMES.supply_chain_relationship,
    question: "Is the brand relationship real?",
    summary:
      "The supplier says they carry the brand. We look for anyone other than the supplier saying so. Their own word is the weakest kind of proof there is, and we write it down as exactly that. A letter they wrote about themselves is still just them talking.",
    summaryLimit: "nobody can confirm authorization from outside — those deals are private.",
    full: [
      "The supplier says they carry the brand. The platform looks for anyone other than the supplier saying so.",
      "A vendor's own word is the weakest kind of proof there is, and the report records it as exactly that. A Letter of Authorization a distributor wrote about itself is the same claim in a more official-looking format, and it is treated accordingly.",
    ],
    limit:
      "we cannot confirm authorization. Those agreements are private contracts between a brand and a distributor, and anyone claiming otherwise is guessing.",
    examines:
      "What they claim · whether the brand backs it up · trade directories · what this brand normally issues",
    delivers: "What we could confirm, what is only their word, and exactly what to ask them.",
  },
  {
    key: "brand_risk_assessment",
    name: AREA_NAMES.brand_risk_assessment,
    question: "How does this brand treat resellers?",
    summary:
      "Brands leave a trail of how they treat third-party sellers. We read it — what they have done before, what they have gated, and how many sellers have come and gone on that listing over a year. A brand that has never touched a seller looks nothing like one that cleared a listing last month.",
    summaryLimit: "we show you the pattern, not the future.",
    full: [
      "Brands leave a trail of how they treat third-party sellers. The assessment reads it — what a brand has done before, what it has gated, and how many sellers have come and gone on a listing across a full year.",
      "A brand that has never acted and a brand that acted last month look different in the data.",
    ],
    limit:
      "we cannot predict whether a brand will act against you. The report shows the pattern, not the future.",
    examines:
      "How many sellers are on the listing over a year · past enforcement · gating · how the brand behaves",
    delivers: "How this brand has treated other sellers, and what that does and does not prove.",
  },
  {
    key: "documentation_review",
    name: AREA_NAMES.documentation_review,
    question: "Will the paperwork stand up?",
    summary:
      "A fourteen-point read of your paperwork, judged against the deal in front of you rather than ticked off a list. A missing field is not automatically a problem. What matters is whether a supplier like this, selling this brand, at this quantity, would normally leave it out.",
    summaryLimit: "good paperwork is not protection — a brand complaint is a separate risk.",
    full: [
      "A fourteen-point read of your paperwork, judged against the deal in front of you rather than ticked off a list.",
      "A missing field is not automatically a problem. What matters is whether a supplier like this, selling this brand, at this quantity, would normally leave it out.",
    ],
    limit:
      "clean paperwork is not protection. Invoice acceptance and brand IP enforcement are independent risks, and the report keeps them apart rather than letting one stand in for the other.",
    examines:
      "Fourteen document fields · whether it all matches up · whether the paperwork fits the company on file",
    delivers: "Whether the paperwork will hold up, and exactly which fields need fixing first.",
  },
  {
    key: "sourcing_logic",
    name: AREA_NAMES.sourcing_logic,
    question: "Does the whole story hold together?",
    summary:
      "The last area checks the other four against each other. Does the price make sense for this kind of supplier? Would a company this size really carry these brands? Is the route they described the one you can actually see? Anything that does not add up gets said out loud.",
    summaryLimit: "we can't tell you a deal is good — only whether it's what it looks like.",
    full: [
      "The last area checks the other four against each other. Does the price make sense for this kind of supplier? Would a company this size really carry these brands? Is the route they described the one you can actually see?",
      "Any single signal is ambiguous on its own. A supplier can look like a regional distributor and be a broker. A liquidator's invoice can be immaculate. What decides it is the pattern across all of them, read against how that kind of supplier normally behaves — and every contradiction is named rather than smoothed.",
    ],
    limit:
      "we cannot tell you a deal is good. The report tells you whether the deal is what it appears to be.",
    examines: "Whether the story adds up across all five areas · anything that contradicts anything else",
    delivers: "Every contradiction we found and the questions it raises for your supplier.",
  },
];

/** The two certainty words, and the fact that there is no third one. */
export const CERTAINTY = {
  heading: "Two words, and the difference between them",
  intro: "Every finding carries one of two certainty levels.",
  verified: "means a source independent of the supplier confirmed it.",
  assessed: "means it is a reading of the available evidence, and the report states what that evidence was.",
  closing:
    "There is no third word. Nothing is presented as more certain than it is, and where we could not reach either level, the report says so under what we could not confirm — a section that appears in every report, including the good ones.",
} as const;
