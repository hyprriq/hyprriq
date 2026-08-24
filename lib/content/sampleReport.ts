// ── THE SAMPLE REPORT — A REAL DELIVERED CASE, MASKED ─────────────────────────────────────────
//
// SOURCE: AWI-2608-037. Growth plan, house account, delivered 2026-08-20, verdict
// verify_before_purchase. Named by the founder 2026-08-24, who supplies the case; every delivered
// case is his or the house account, so no third-party client data is involved.
//
// WHY A REAL ONE. The dev brief: "a fabricated report on this page would undo every honest thing
// on the other twelve." This replaces the constructed example that used to live in
// lib/content/sample-report.ts.
//
// WHY NOT AWI-2607-022: it is the standing verdict divergence on /admin/integrity — the engine no
// longer agrees with its stored verdict. Publishing it would put a report on the marketing site
// that the product would not produce today. AWI-2608-037 carries `diverges_from_stored: false` in
// lib/research/__fixtures__/goldenCases.json, which is the machine-checked way of saying the engine
// still agrees with it.
//
// WHAT WAS CHANGED: NAMES ONLY. The verdict, every finding, the could-not-confirm section and all
// seventeen checklist questions are the delivered text. Masking is pure substitution:
//
//   the supplier (three forms + domain) → [Supplier] / [supplier-website]
//   both brands in scope                → [Brand A] / [Brand B]
//   Brand A's parent company            → [Brand A's parent]
//   the two look-alike brands and the two named distributors in question 10 → generic descriptions
//   the supplier's city and state       → [City, State] / [State]
//
// Evidence SOURCE names (a business bureau, trade directories, a professional network) are kept.
// They identify no party, and stripping them would gut the one thing this page exists to show —
// that every finding names where it came from.
//
// ⚠ FLAGGED TO THE FOUNDER, NOT DECIDED HERE: two findings cite dated corporate events — a federal
// court ruling against counterfeit sellers in January 2023, and a June 2026 move of UK operations
// in-house. With the brand name removed those are still searchable, so a determined reader could
// re-identify Brand A. Generalising them would mean changing a finding, which the ruling forbids,
// so they are left exactly as delivered and raised instead. Say the word and they become "a recent
// federal ruling" and "a recent move".

export const SAMPLE_PLAN = "growth_279" as const;

export const sampleMeta = {
  delivered: "August 20, 2026",
  submitted: "August 19, 2026",
  supplier: "[Supplier]",
  website: "[supplier-website]",
  brands: "[Brand A] · [Brand B]",
  marketplace: "Amazon US",
};

export const sampleSummary =
  "Key items could not be verified (supply-chain authorization status for [Brand A] via [Supplier], and brand identity for [Brand B]). [Supplier] is a verifiably operating wholesale business with no documented authorization to resell [Brand A]; [Brand B]'s brand identity is unresolved.";

export const sampleRisk =
  "What remains unverified drives the risk: the primary risk is purchasing [Brand A] product through a supply chain that lacks documented authorization from [Brand A's parent]. Grey-market product — genuine goods sourced outside the brand's documented distribution network — may carry no manufacturer warranty, may be ineligible for return or recall support, and exposes the buyer to the same legal and reputational environment that [Brand A's parent] has actively enforced against. A secondary, distinct risk is that [Brand B]'s brand identity is entirely unresolved: without knowing who owns the brand or what their distribution policy is, no supply-chain risk assessment for those products is possible at this stage. [Supplier]'s absence from a professional network is a minor identity gap, not a finding of wrongdoing; the business is otherwise consistently documented.";

/** Certainty chip per area — the locked vocabulary: Verified / Assessed / Not assessed. */
export type SampleArea = {
  key: string;
  chip: "Verified" | "Assessed" | "Not assessed" | "Informational";
  blocks: { heading?: string; body?: string; bullets?: string[] }[];
};

export const sampleAreas: SampleArea[] = [
  {
    key: "supplier_identity",
    chip: "Verified",
    blocks: [
      {
        body: "[Supplier] is a [State]-based health and beauty wholesale distributor operating through [supplier-website], with a business start date recorded by a national business bureau as December 2018. The bureau lists the business in [City, State] with an A+ rating, and the phone number on the bureau profile matches the number published on the vendor's own website, indicating consistent contact information across independent sources. Multiple third-party directories — including the business bureau, a trade directory and a company-data provider — place the business at the same [State] location, supporting the vendor's stated identity. No government business registration record was included in the materials available for review; a [State] Secretary of State search was not part of the research conducted, and that gap should be addressed before finalizing any supplier relationship. No negative reviews, fraud allegations, or scam reports concerning [Supplier] were found in the available materials.",
      },
    ],
  },
  {
    key: "supply_chain_relationship",
    chip: "Assessed",
    blocks: [
      {
        heading: "Verified positives",
        bullets: [
          "For [Brand A] — [Brand A] operates a formal, publicly documented authorized-reseller and selective-distribution program (a US store locator, a UK selective distribution agreement, a reseller application process).",
          "The record does not show [Supplier] listed on [Brand A]'s official authorized-reseller pages or store locator.",
          "For [Brand B] — the pack contains no official [Brand B] dealer locator or distributor page, and no source in the pack links [Supplier] to [Brand B] in any capacity.",
        ],
      },
      {
        heading: "Remaining unknowns",
        body: "For [Brand A] — it is not known whether [Supplier] holds any documented authorization relationship with [Brand A] or any of its documented wholesale supply partners that is not publicly listed. For [Brand B] — the brand's authorization structure and whether [Supplier] has any relationship with it remain entirely unresolved due to thin evidence coverage in the pack.",
      },
      {
        heading: "What those unknowns do not imply",
        bullets: [
          "The absence of [Supplier] from [Brand A]'s public reseller list is not evidence of supplier-level wrongdoing and is not a vendor-wide conclusion.",
          "For [Brand B], the absence of any connection in the pack reflects limited evidence coverage, not a finding against [Supplier].",
          "These two brands must be assessed independently: the status of one does not extend to the other.",
        ],
      },
    ],
  },
  {
    key: "brand_risk_assessment",
    chip: "Verified",
    blocks: [
      {
        heading: "Verified positives",
        bullets: [
          "For [Brand A], the brand's own website documents a formal authorized-reseller network with a published application process, and a Selective Distribution Agreement in the UK contractually restricting resale to authorised purchasers.",
          "These are observable, brand-published channel-control mechanisms.",
          "For [Brand B], no brand-specific posture evidence of any kind was found in the evidence pack — no enforcement history, no channel policy, no marketplace restriction documentation.",
        ],
      },
      {
        heading: "Risk signals found — verification needed",
        bullets: [
          "[Brand A]'s parent company [Brand A's parent] has demonstrated active litigation capability, with a federal court win against counterfeit sellers as recently as January 2023. All documented legal actions are counterfeiter-directed, not reseller-directed — but they establish the brand as enforcement-capable and willing to litigate.",
          "The brand's June 2026 announcement of moving UK operations in-house signals a tightening of channel control that may extend to other markets over time.",
          "Whether [Brand A] is currently gated on Amazon in the US market is not established by any source in this pack — this requires direct marketplace verification.",
          "Whether [Brand A] enforces its selective-distribution terms against US-based third-party resellers of genuine product (as opposed to counterfeiters) is not documented in the pack and requires clarification.",
        ],
      },
      {
        heading: "What the unknowns do not imply",
        bullets: [
          "The absence of enforcement evidence against [Brand B] does not mean [Brand B] presents no reseller risk — it means the evidence pack contains no coverage of that brand.",
          "Risk signals found for [Brand A] do not generalise to [Brand B]; each brand must be assessed on its own evidence.",
          "The absence of a documented Amazon gating record for [Brand A] does not establish that the brand is freely listable — it establishes only that this pack does not resolve the question.",
        ],
      },
    ],
  },
  {
    key: "documentation_review",
    chip: "Not assessed",
    blocks: [
      {
        body: "No documents were provided for review, so this area was not assessed. It neither raises nor lowers the verdict.",
      },
    ],
  },
];

/** Track 5 renders under its own subhead — the ruled non-voting emitter. */
export const sampleNonVerdictArea = {
  key: "sourcing_logic",
  chip: "Informational" as const,
  body: "Consistency check — informational; does not affect the verdict",
};

export const sampleInterpretation =
  "Best available reading — not a confirmed account: [Supplier] is a legitimately operating business, in operation since at least December 2018, consistently located in [City, State], with an A+ business-bureau rating across multiple independent sources. The leading reading is that [Supplier] operates as a grey-market reseller of [Brand A]: a wholesale business that sources product through secondary channels without holding documented authorization from [Brand A's parent]. [Supplier] does not appear on any [Brand A] authorized-reseller page or territory-specific dealer list in the evidence record. [Brand A] operates an active, documented authorized distribution program, publicly warns consumers about unauthorized resellers, and its parent company has obtained a federal court ruling against counterfeit sellers as recently as January 2023. [Brand A]'s announced June 2026 move to bring UK operations in-house further signals a strategic direction toward tighter direct distribution control. For [Brand B], the brand's identity and ownership cannot be established from the evidence record, and no authorized-reseller information for that brand is available; this assessment area is unassessed, not a finding against [Supplier].";

export const sampleMonitor = [
  "[Brand A]'s authorized-reseller pages and store locator for any addition of [Supplier] as a listed reseller",
  "Further announcements from [Brand A's parent] or [Brand A] regarding distribution tightening, particularly following the June 2026 UK in-house operational move, which may signal similar changes in other markets",
  "Any legal enforcement actions filed by [Brand A's parent] that name [Supplier] or entities in [Supplier]'s described supply chain",
  "Resolution of [Brand B]'s brand identity and any public authorized-reseller program that brand may operate",
];

export const sampleChecklistIntro =
  "Put these to the supplier before you commit. Satisfactory answers do not guarantee marketplace acceptance.";

export const sampleChecklist = [
  "Can you provide a current Letter of Authorization or supply agreement from [Brand A's parent] or a [Brand A's parent]-documented distributor that establishes your right to resell [Brand A] products?",
  "Can you provide purchase invoices showing the upstream source from which your [Brand A] inventory was acquired, identifying the selling entity in the chain?",
  "Does [Brand A]'s authorized-reseller program gate wholesale or B2B accounts separately from its consumer-facing store locator, and if so, can you provide documentation showing [Supplier]'s standing within that program?",
  "Who is the brand owner or manufacturer of [Brand B], and can you provide contact details or documentation from that brand owner establishing [Supplier]'s relationship to their products?",
  "Does [Brand B] operate an authorized-reseller or distributor program, and if so, can you provide documentation showing [Supplier]'s status within it?",
  "Does [Supplier] maintain a company profile on a professional network or equivalent professional registry listing, and if not, what is the preferred channel for verifying [Supplier]'s wholesale trade credentials?",
  "Does [Supplier] hold any documented relationship — as a reseller, distributor, or sub-distributor — with [Brand A] or any of [Brand A]'s documented wholesale supply partners, and can documentation of that relationship be provided?",
  "Can [Supplier] provide purchase documentation — such as invoices or purchase orders — showing it sources [Brand A] products, and identifying the immediate upstream supplier?",
  "What is the brand '[Brand B]' as submitted — is it the same as a similarly-named European skincare brand, another similarly-named grooming line, or a different brand entirely? Can the client clarify the full brand name and manufacturer?",
  "If [Brand B] refers to the similarly-named European skincare brand: does [Supplier] source those products, and if so, through which distributor — given that two companies have been publicly identified as that brand's US-authorized distributors?",
  "Can [Supplier] provide any documentation from [Brand A] or a [Brand A]-authorized distributor that covers its territory of sale (US)?",
  "Does [Brand A] publish or enforce a selective distribution or authorized-reseller policy in the US market, and does that policy restrict who may resell its products through third-party marketplaces?",
  "Has [Brand A] or its parent company [Brand A's parent] issued any cease-and-desist letters or IP complaints directed at resellers of genuine (non-counterfeit) [Brand A] products within the past two years?",
  "Is [Brand A] currently gated or restricted on Amazon in the US marketplace, and if so, what documentation does the brand or Amazon require for a seller to obtain listing approval?",
  "What are [Brand B]'s distribution channel policies — does the brand sell through third-party resellers, and has it published any authorized-reseller, MAP, or marketplace-restriction policies?",
  "Has [Brand B] taken any enforcement actions — such as IP complaints, takedown requests, or legal proceedings — against third-party resellers or marketplace sellers within the past two years?",
  "Following [Brand A]'s June 2026 announcement of moving UK operations in-house, does the brand intend to extend direct-distribution or channel-restriction policies to other markets, including the US?",
];

export const sampleNotes = {
  heading: "Category requirements",
  body: "Selling these brands in their marketplace categories may require category approval or specific documentation before listing. This is a marketplace requirement independent of this report's verdict — confirm your category status before you commit.",
  closing:
    "This report reflects observable evidence available at the time of research. It is not a guarantee of marketplace approval, account safety, or brand action. The decision to purchase is yours.",
};

/** Scope notes the delivered report carries under two of the areas. */
export const sampleScopeNotes = {
  identity:
    "Supplier legitimacy and identity verification are assessed separately (see the Supplier Legitimacy findings); this analysis addresses the brand/supply-chain relationship only.",
  authorization:
    "This finding assesses the contractual and commercial authorization relationship between the vendor and the brand — whether the vendor is authorized, recognized, or connected as a source for the brand. It does not assess whether any specific online marketplace will approve resale.",
  marketplace:
    "A confirmed distributor or authorization relationship does not guarantee marketplace approval. Platforms such as Amazon, Walmart, and eBay apply seller-history, category, regional, and brand-specific review that cannot be verified by this analysis. Additional verification with the platform and brand may be required before purchasing inventory.",
};
