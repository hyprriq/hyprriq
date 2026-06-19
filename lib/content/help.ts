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
    action: "→ Do not purchase from this supplier",
  },
];

export const verdictDisclaimer =
  "Important: HyprrIQ reports reflect what we can observe externally. We cannot confirm whether Amazon will accept an invoice.";

export const dimensions = [
  { icon: "🏢", name: "Supplier Identity", desc: "We verify the supplier is a real, operating business — registration, address, web presence, domain age, contact consistency." },
  { icon: "🔗", name: "Supply Chain Relationship", desc: "We surface any observable connection between the supplier and the brands you're sourcing — distributor listings, brand references, marketplace history." },
  { icon: "🛡", name: "Brand Risk Assessment", desc: "We assess the brand's enforcement posture — how aggressively they pursue IP complaints and whether their distribution model creates risk." },
  { icon: "📄", name: "Documentation Review", desc: "If you upload an invoice or LOA, we check it against 14 fields Amazon evaluates — buyer name, address, product specificity, formatting, and more." },
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
    q: "What if I want to research a brand that isn't on my uploaded invoice?",
    a: "You can — but be aware of how we evaluate it. HyprrIQ's core research validates the vendor relationship first. Brands that appear on your uploaded invoice or document are treated as vendor-confirmed evidence. Brands you add that aren't on the document are still fully researched, but your report will show them as unconfirmed against this specific vendor unless we find independent public evidence linking them. This isn't a limitation — it's an honest answer to the real question: can you trust this vendor for this brand. If you're investigating a brand from a different vendor relationship, that's a separate submission for a more accurate result.",
  },
  {
    id: "scope-confirmation",
    q: "What happens if my submission is flagged for scope confirmation?",
    a: "If our intake check detects a mismatch between the brands you entered and the brands in your uploaded document, we pause the case and ask you to confirm. Your SLA pauses during this time and restarts once you confirm.",
  },
  {
    id: "certainty-levels",
    q: "What do Verified, Inferred, and No Public Signal mean?",
    a: "Verified: we found direct evidence in an official source. Inferred: we found indirect signals that support the conclusion. No Public Signal: we searched and found nothing — this doesn't mean the relationship doesn't exist, just that we couldn't confirm it externally.",
  },
  {
    id: "upgrade-midmonth",
    q: "Can I upgrade my plan mid-month?",
    a: "Yes. Stripe handles the upgrade immediately with prorated billing. Your new credit allowance takes effect at your next renewal date. Your current month's remaining credits are unchanged.",
  },
];
