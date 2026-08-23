import { SAMPLE_CASE_ID } from "@/lib/content/sampleIdentifiers";
// ── THE SAMPLE REPORT (tracker 1.8 / 2.x — "the highest-converting page not yet built") ──────
//
// ⚠ JUDGEMENT CALL, FLAGGED FOR THE FOUNDER, NOT SLIPPED IN: this sample is ANONYMIZED. The five
// real delivered PDFs exist and their structure/voice is reproduced here faithfully — but naming a
// REAL vendor beside a public "Verify Before Purchase" verdict is a defamation exposure and a
// decision about what we publish about a third party, which is a founder call, not an engineering
// one. "Northgate Wholesale Co." is the mock identity already used by components/marketing/
// report-preview.tsx, so the marketing surface stays consistent. To publish a real case instead,
// the safe routes are (a) a source_clear verdict, or (b) written consent from the vendor.
//
// EVERYTHING ELSE IS REAL: the verdict vocabulary, the four-level scale, the section order, the
// limitation lines, and the shape of the prose all come from the delivered corpus. The checklist
// items are the genuine article — that is the product's actual value and the reason this page
// converts.

export const sampleMeta = {
  caseNumber: SAMPLE_CASE_ID,
  vendor: "Northgate Wholesale Co.",
  brands: ["Bioderma", "RevitaLash"],
  plan: "Single Deep Report · $149",
  delivered: "Delivered in 19 hours",
  verdict: "Verify Before Purchase",
  verdictLevel: "Level 3 of 4",
};

export const sampleHeadline =
  "Northgate reads as a real, operating wholesale business; brand channel compliance for RevitaLash is the material open question.";

export const sampleRealRisk =
  "The primary risk is purchasing RevitaLash inventory from a supplier that does not hold documented standing in the brand's authorized reseller program, in a category where the brand actively enforces its channel. If the brand issues channel-compliance demands to non-listed resellers, a buyer holding inventory sourced through Northgate without a documented supply chain back to an authorized reseller would have limited recourse. Bioderma's risk is unquantified rather than elevated: the absence of a documented US policy means a future restriction cannot be ruled out, but no current enforcement signal exists.";

export const sampleInterpretation =
  "Northgate presents consistent primary-source identity signals: a BBB A+ rating at a stable address, a clean third-party safety assessment, and matching contact data across its own website, BBB profile, and business directories. The absence of a LinkedIn company profile and an unresolved state registration are genuine gaps, but on the available evidence they do not overturn the leading reading that Northgate is a real, operating wholesale intermediary. RevitaLash is the brand where channel-compliance risk is most concrete: it maintains a public authorized reseller list and has obtained legal remedies against counterfeit sellers. Its documented US enforcement targets counterfeit goods rather than gray-market resale of genuine product — but a structured reseller program means resellers without documented standing carry real, if unquantified, exposure.";

/** The checklist — the product's actual deliverable, verbatim in shape from the corpus. */
export const sampleChecklist = [
  "Do you hold a current Letter of Authorization or written documentation from the brand establishing your standing in their authorized reseller program for the US market?",
  "Can you provide your state entity number or DBA filing reference so your formal business registration can be located on the public record?",
  "Can you identify the specific supply chain step — brand, master distributor, or sub-distributor — from which you acquire these products?",
  "Does the brand require any specific documentation from downstream buyers before you may resell to them, and can you provide a copy of that requirement?",
  "Can you explain the alternate phone numbers listed for your business on third-party directories — do they correspond to a prior identity or a listing you did not create?",
  "Does the brand publish a written policy governing which sellers may list its products on online marketplaces, and what documentation does it require?",
];

export const sampleAreas = [
  {
    name: "Supplier Legitimacy",
    state: "Assessed",
    body: "Northgate Wholesale Co. is a health and beauty wholesale distributor operating from a stable commercial address. Its address, primary phone number, and website are consistent across the Better Business Bureau, its own business page, and multiple third-party trade directories. The BBB lists the business with an A+ rating. No scam reports, fraud allegations, or negative reviews attributable to this vendor were found in the available record. A formal state business registration was not located on the public record as reviewed.",
  },
  {
    name: "Brand Risk",
    state: "Assessed",
    body: "RevitaLash maintains a publicly accessible authorized reseller program with an open application form and a published list of authorized resellers. The brand also has a documented history of enforcement against counterfeit sellers, including a federal court award. Bioderma publishes no reseller restriction or channel policy for the US market in the evidence record, and engages with reseller channels in international markets; no affirmative signal elevates its resale risk above baseline.",
  },
  {
    name: "Supply Chain Relationship",
    state: "Assessed",
    body: "The record does not show Northgate listed on any official public dealer or distributor directory for either brand, and no brand-issued authorization document appears in the evidence. Northgate's own materials describe wholesale distribution but do not identify the tier it purchases from. This is the area where documentation from the vendor would move the verdict most.",
  },
  {
    name: "Documentation Review",
    state: "Not assessed",
    body: "No documents were provided for review, so this area was not assessed. It neither raises nor lowers the verdict.",
  },
  {
    name: "Sourcing Logic",
    state: "Informational",
    body: "Consistency check across the areas above — informational; does not affect the verdict.",
  },
];

/** What the report deliberately does NOT claim — the honesty that makes the rest credible. */
export const sampleLimits = [
  "We do not confirm or deny marketplace approval, and we never predict what a marketplace will decide about your account.",
  "Absence of evidence is reported as absence — never as an accusation. “Not found” is a fact about the record, not a finding against the supplier.",
  "We are not a legal opinion and not a guarantee. The verdict is our reading of the evidence we could gather before you commit capital.",
  "Areas your plan does not include are stated as limitations in the report itself, never left to look like findings.",
];
