// Help Centre content — static, editable without a code review/redeploy of the
// page logic. Rendered by app/(portal)/portal/help/page.tsx.

export const howItWorks = {
  title: "How HyprrIQ Works",
  sub: "A quick overview of our research process from submission to delivery.",
  steps: [
    { icon: "📝", label: "Submit", detail: "supplier & brands" },
    { icon: "🔍", label: "Research", detail: "5 dimensions" },
    { icon: "📍", label: "Founder reviews", detail: "findings" },
    { icon: "📄", label: "Verdict", detail: "delivered" },
  ],
};

export type VerdictInfo = {
  key: "source_clear" | "usable_with_conditions" | "verify_before_purchase" | "do_not_rely";
  name: string;
  desc: string;
  action: string;
};

export const verdicts: VerdictInfo[] = [
  {
    key: "source_clear",
    name: "Source Clear",
    desc: "Observable indicators are consistent with a credible wholesale supplier. Identity confirmed, no significant red flags found.",
    action: "→ Proceed with standard due diligence",
  },
  {
    key: "usable_with_conditions",
    name: "Usable With Conditions",
    desc: "Credible supplier but specific concerns noted. Review the conditions before purchasing.",
    action: "→ Review conditions before proceeding",
  },
  {
    key: "verify_before_purchase",
    name: "Verify Before Purchase",
    desc: "Significant signals require independent verification. Additional documentation recommended.",
    action: "→ Get more information first",
  },
  {
    key: "do_not_rely",
    name: "Do Not Rely",
    desc: "Observable concerns are significant enough that relying on this supplier carries material risk.",
    // BL fix gate (2026-07-24): "Do not purchase from this supplier" was recommendation language
    // beyond the verdict — the exact class the verdict-is-the-recommendation ruling bans, caught
    // by the BL6 static lock. PROPOSED rewording (evidence-status framing); the client-surface
    // gate confirms exact wording.
    action: "→ Resolve the listed concerns before relying on this source",
  },
];

export const verdictDisclaimer =
  "Important: HyprrIQ reports reflect what we can observe externally. We cannot confirm whether Amazon will accept an invoice.";

export const dimensions = [
  { icon: "🏢", name: "Supplier Identity", desc: "We verify the supplier is a real, operating business — registration, address, web presence, domain age, contact consistency." },
  { icon: "🔗", name: "Supply Chain Relationship", desc: "We surface any observable connection between the supplier and the brands you're sourcing — distributor listings, brand references, marketplace history." },
  { icon: "🛡", name: "Brand Risk Assessment", desc: "We assess the brand's enforcement posture — how aggressively they pursue IP complaints and whether their distribution model creates risk." },
  { icon: "📄", name: "Documentation Review", desc: "We check that the paperwork's entity and address line up with what our other research found independently. Documents usually cannot confirm the brands you plan to buy — that comes from the research areas above." },
  { icon: "🧠", name: "Sourcing Logic", desc: "We assess whether the entire picture makes commercial sense — category risks, scenario coherence, and B2B archetype analysis." },
];

export type Faq = { id: string; q: string; a: string };

// Order matters: the vendor-brand vetting entry ("unconfirmed-brands") is placed
// directly after "How do credits work?" per the Session F spec, and the submit
// form deep-links to its #unconfirmed-brands anchor.
export const faqs: Faq[] = [
  {
    id: "supplier-authorized",
    q: "Can you confirm my supplier is authorized to sell this brand?",
    a: "No — brand authorization is a private agreement between a supplier and a brand. It is not publicly verifiable from the outside. HyprrIQ surfaces every observable signal we can find, but we cannot confirm the existence of a private authorization agreement. Our verdicts reflect what we can observe, not what Amazon will decide.",
  },
  {
    id: "change-request",
    q: "What is a change request?",
    a: "A change request lets you flag a specific part of a delivered report that you believe is incorrect. You have 7 days from delivery to submit one. We review within 1 business day and either update the finding or explain why the current assessment stands. One change request is included per report.",
  },
  {
    id: "how-credits-work",
    q: "How do credits work?",
    a: "1 credit = 1 research case (1 supplier + up to 5 brands on Growth and Single Report). Credits are deducted at submission, not at delivery. Unused credits carry forward at renewal — up to 2 on Growth, up to 4 on Scale.",
  },
  {
    id: "unconfirmed-brands",
    q: "Do the brands I enter need to appear on my uploaded document?",
    a: "No. The brands and vendor you enter on the form are what we research — every brand gets the full research treatment regardless of what your paperwork shows. Vendor documents usually carry the vendor's own item codes rather than brand names, so a brand missing from a document is expected and never counts against the vendor. Documents help us confirm the vendor's entity and address; the brand-level findings come from independent research.",
  },
  {
    id: "certainty-levels",
    q: "What do Verified and Assessed mean?",
    a: "Verified: at least one piece of evidence behind the finding comes from a source we could confirm directly. Assessed: the finding rests on our research and judgment without a directly confirmed source — this is the normal state for many findings and never means something is wrong; it means we are telling you exactly how firm the ground is.",
  },
  {
    id: "upgrade-midmonth",
    q: "Can I upgrade my plan mid-month?",
    a: "Yes. Stripe handles the upgrade immediately with prorated billing. Your new credit allowance takes effect at your next renewal date. Your current month's remaining credits are unchanged.",
  },
];
