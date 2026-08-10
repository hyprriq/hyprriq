import { describe, it, expect } from "vitest";
import { scanHard, scanFindingsForBannedLanguage } from "./banned-language";
import { VERDICT_SENTENCES } from "@/lib/research/synthesisEngine";
import { CATEGORY_CLIENT_SUMMARY } from "@/lib/research/categoryStep";
import { CATEGORY_FLAGS_TABLE, CATEGORY_FLAGS_GOVERNING_LAW } from "@/lib/research/categoryFlagsTable";
import { clientNote } from "@/lib/research/websiteAnchor";

// ── BANNED-LANGUAGE FIX GATE (spec 2026-07-24, ALL SIX OQs founder-ruled) — the new HARD rules
// H10–H15 + the H4 negation carve-out, TWO-SIDED BY LAW.
//
// SIDE 1 — every NEVER-column evasion the 2026-07-23 runtime audit proved passes today must BLOCK.
// SIDE 2 — THE MUST-PASS SET (BL5, founder-ruled): every mandated denial, instead-column string,
// §8 flag string, Spec-B template, verdict sentence, and ruled disclaimer must KEEP passing.
// "A fix that gags the platform's honest denials is a worse defect than the holes it closes."
//
// THE VERDICT-IS-THE-RECOMMENDATION RULING (BL5 point 2): the verdict IS the recommendation;
// the product never issues a purchase recommendation beyond it. H10 blocks recommendation
// language BEYOND the verdict and must whitelist the four VERDICT_SENTENCES by name —
// "Verify Before Purchase" and "Do Not Rely" are the two named explicit fixtures.
//
// STANDING RULE (founder-adopted 2026-07-24): any NEW client-facing string added later joins
// MUST_PASS in the SAME commit — the fixture can never silently fall behind the emitted strings
// (the category-flags casualty lesson). Real constants are IMPORTED, never copied, so constant
// changes flow into this fixture automatically. ──

// ═══ SIDE 1 — the NEVER-column evasions (each label names its audit hole) ═══
const MUST_BLOCK: [string, string][] = [
  // H10 — purchase-recommendation, negation-complete (the "you should NOT buy" hole + promotion to HARD)
  ["H10 negation escape", "You should not buy from this vendor."],
  ["H10 affirmative", "You should buy from this vendor."],
  ["H10 do-not-purchase", "Do not purchase from this supplier."],
  ["H10 avoid-supplier", "We advise you to avoid this supplier."],
  ["H10 recommend-purchase", "We recommend purchasing from them."],
  ["H10 buy-with-confidence", "You can buy with confidence."],
  // H11 — safe/unsafe, alternation-complete (the "safe to SELL" hole)
  ["H11 safe to sell", "This is safe to sell."],
  ["H11 safe to list", "These products are safe to list."],
  ["H11 unsafe classification", "This listing is unsafe."],
  // H12 — confirm/certify authorization (no rule today; standing philosophy)
  ["H12 confirms authorization", "This confirms authorization from the brand."],
  ["H12 certified authorized", "The supplier is certified as an authorized distributor."],
  // H13 — the predict-Amazon's-behavior class (no rule today)
  ["H13 will accept", "Amazon will accept this invoice."],
  ["H13 invoice will be accepted", "This invoice will be accepted."],
  ["H13 will not take action", "Amazon will not take action against this listing."],
  ["H13 suspension-proof literal", "This vendor is suspension-proof."],
  // H14 — legitimacy/fraud verdicts + quality guarantees (the supplier-language principle)
  ["H14 bare legitimate", "The supplier is legitimate."],
  ["H14 fraudulent", "The supplier is fraudulent."],
  ["H14 fake", "This vendor is fake."],
  ["H14 authentic-vendor guarantee", "This is an authentic vendor."],
  ["H14 genuine-supplier guarantee", "They are a genuine supplier."],
  // H15 — approved, word-order-complete (the adjacency hole)
  ["H15 predicate order", "This supplier is approved."],
  ["H15 approved-to-sell", "The vendor is approved to sell this brand."],
];

// ═══ SIDE 2 — THE MUST-PASS SET (BL5, founder-ruled 2026-07-24) ═══
const MUST_PASS: [string, string][] = [
  // — pricing-ladder / intake strings (2026-08-07 pass — standing rule 8: same commit) —
  ["upload upsell ($99 gate)", "Document review is included from the $149 report up."],
  ["upload authority copy", "Optional. A PO or letterhead helps us confirm the vendor's entity and address. The brands and vendor you enter above are what we research."],
  ["uploads_not_included server message", "Document upload is not part of the $99 report — document review is included from the $149 report up."],
  ["file limit message (2)", "Maximum 2 files — contact support if you need more."],
  ["doc-review description (entity/address)", "We check that the paperwork's entity and address line up with what our other research found independently. Documents usually cannot confirm the brands you plan to buy — that comes from the research areas above."],
  ["brand helper (corrected)", "The brands and vendor you enter here are what we research. An uploaded document helps confirm the vendor's entity and address — it is not expected to list your brands."],
  ["$149 tier name", "Complete Report"],
  ["how-it-works doc-review body", "If you upload a document, we check that its entity and address line up with what our other research found independently. Only runs when a document is provided — no documents, no penalty."],
  ["unconfirmed-brands FAQ (corrected)", "The brands and vendor you enter on the form are what we research — every brand gets the full research treatment regardless of what your paperwork shows."],
  // — Verified/Assessed vocabulary (founder-ruled 2026-08-07) + upload-security messages —
  ["certainty chip: Assessed", "Assessed"],
  ["verified/assessed FAQ", "Verified: at least one piece of evidence behind the finding comes from a source we could confirm directly. Assessed: the finding rests on our research and judgment without a directly confirmed source — this is the normal state for many findings and never means something is wrong; it means we are telling you exactly how firm the ground is."],
  ["file size message", "File must be 10MB or smaller."],
  ["file type message", "Only PDF, JPG, or PNG files are accepted."],
  ["dashboard attention line", "needs your attention"],
  // — pre-design batch (2026-08-08 — standing rule 8: same commit) —
  ["change-request entry link", "Spotted something off? Request a change (one included, 7-day window)"],
  ["delivery email subject", "Your HyprrIQ report AWI-2607-022 is ready"],
  ["delivery email body line 1", "Your source intelligence report for Acme Distribution (case AWI-2607-022) has been delivered."],
  ["delivery email body line 2", "View your report — the verdict, the evidence behind it, and the questions to ask your supplier are ready in your portal."],
  ["delivery email body line 3", "Questions about the report? Use the support page in your portal and we'll pick it up."],
  // — the spec §6 explicit denials —
  ["ungating denial", "We do not provide ungating services."],
  ["confirm-authorization denial", "We could not confirm authorization."],
  ["§8 law denial clause", "does not confirm or deny Amazon approval"],
  ["OQ-CC5 denial clause", "not confirmation of Amazon approval or refusal"],
  ["mandated disclaimer denial list", "We do not guarantee: marketplace approval, account safety, or brand authorization."],
  ["no-auth-visibility", "No authorization visibility was located during this review."],
  ["identity-unconfirmed", "Supplier identity could not be confirmed through available public sources."],
  ["no-elevated-risk", "No elevated risk indicators observed based on available evidence."],
  // — the §12 instead-column strings (verbatim) —
  ["instead: observable-suggest", "Observable indicators suggest [classification]"],
  ["instead: consistent-with", "Observable indicators are consistent with..."],
  ["instead: invoice structure", "Invoice structure is consistent with / has gaps relative to standard wholesale documentation"],
  ["instead: auth level", "Authorization visibility indicators observed at Level [A-E]"],
  ["instead: identity consistent", "Supplier identity indicators are consistent with an operational wholesale business"],
  ["instead: invoice consistent", "Invoice structure is consistent with standard wholesale documentation requirements"],
  ["instead: legitimate-consistent (the H14 two-sided pair)", "Supplier identity indicators are consistent with a legitimate wholesale operation"],
  ["instead: no-enforcement", "No elevated brand enforcement signals were observed based on available evidence"],
  // — the BL5 additions (founder-ruled) —
  ["CATEGORY_CLIENT_SUMMARY", CATEGORY_CLIENT_SUMMARY],
  ["supplier language: established wholesaler", "This is an established wholesaler with a verifiable presence."],
  ["supplier language: operational", "Indicators are consistent with an operational wholesale business."],
  ["the beyond-our-control enforcement alert", "Amazon and the brand may change requirements or take enforcement action at any time. These decisions are outside this analysis and outside your control; verify current status before committing inventory."],
  ["the closing disclaimer", "This report reflects what we could observe from available public sources at the time of research. It is not a guarantee of marketplace approval, account safety, or brand authorization — Amazon and the brand may change requirements or act at any time, which is outside this analysis and outside your control. Verify current status with the relevant parties before committing inventory. The decision to purchase is yours."],
  // — the §8 flag strings + governing law (IMPORTED — cannot drift) —
  ...CATEGORY_FLAGS_TABLE.map((r): [string, string] => [`§8 flag: ${r.subcategory}`, r.flag_language]),
  ["§8 governing law (requires the H4 carve-out)", CATEGORY_FLAGS_GOVERNING_LAW],
  // — the Spec-B templates (IMPORTED via the real template fn) —
  ["Spec-B name mismatch", clientNote("name_website_mismatch", "Acme", "Global Distribution LLC")],
  ["Spec-B multiple entities (named)", clientNote("multiple_entities", "Medline", "Medlink Inc", "Medline Industries")],
  ["Spec-B multiple entities (fallback)", clientNote("multiple_entities", "Medline", "Medlink Inc")],
  ["Spec-B website dead", clientNote("website_dead", "Acme Corp", "Acme Corp")],
  ["Spec-B default", clientNote("dba", "Acme", "Acme LLC")],
  // — the VERDICT_SENTENCES (IMPORTED; the verdict IS the recommendation) —
  ...Object.values(VERDICT_SENTENCES).map((s): [string, string] => [`verdict sentence: ${s}`, s]),
];

describe("BL fix — SIDE 1: every runtime-proven evasion now BLOCKS (HARD)", () => {
  for (const [label, text] of MUST_BLOCK) {
    it(`BLOCKS ${label}: "${text}"`, () => {
      expect(scanHard(text).length, `must block: ${text}`).toBeGreaterThan(0);
    });
  }
});

describe("BL fix — SIDE 2: the BL5 must-pass set KEEPS passing (the load-bearing guarantee)", () => {
  for (const [label, text] of MUST_PASS) {
    it(`PASSES ${label}`, () => {
      expect(scanHard(text), `must pass: ${text}`).toEqual([]);
    });
  }
});

describe("BL fix — the verdict-is-the-recommendation ruling, named fixtures", () => {
  it('"Verify Before Purchase" and "Do Not Rely" can NEVER trip the scanner built to protect them', () => {
    expect(scanHard(VERDICT_SENTENCES.verify_before_purchase)).toEqual([]);
    expect(scanHard(VERDICT_SENTENCES.do_not_rely)).toEqual([]);
    // In-context too: an M9 snapshot leading with the verdict sentence.
    expect(scanHard(`${VERDICT_SENTENCES.verify_before_purchase} The leading interpretation is a genuine-wholesaler scenario resting on the vendor's own statements.`)).toEqual([]);
  });

  it("THE M9 STRUCTURAL GAP CLOSES: recommendation language inside an M9 snapshot now fails the DELIVERY walk (both polarities)", () => {
    const m9 = (lead: string) => ({ decision_snapshot: { headline: "h", leading_interpretation: lead, the_real_risk: "r", what_to_verify: [], what_to_monitor: [] } });
    expect(scanFindingsForBannedLanguage(m9("You should buy from this vendor.")).length).toBeGreaterThan(0);
    expect(scanFindingsForBannedLanguage(m9("You should not buy from this vendor.")).length).toBeGreaterThan(0);
    expect(scanFindingsForBannedLanguage(m9(`${VERDICT_SENTENCES.usable_with_conditions} Conditions are listed below.`))).toEqual([]);
  });
});

describe("BL fix — POST-FREEZE AMENDMENT (founder-authorized bug-hunt, 2026-07-24): research vocabulary vs OUR verdicts", () => {
  // THE BUG (runtime-proven right after the freeze): H14's fraud side and H11's bare "unsafe"
  // were PRESENCE-based — but the pipeline RESEARCHES scam reports (Track 1's scam_reports
  // question), so its own absence-reporting narrative ("No scam reports were found") blocked
  // delivery of clean cases. The rules are now VERDICT-SHAPED: our-voice conclusions block;
  // research-artifact and absence-reporting vocabulary passes. Same two-sided law, third surface.
  const RESEARCH_MUST_PASS = [
    "No scam reports were found for this vendor across consumer-complaint sources.",
    "Scam reports search returned no relevant complaints.",
    "No fake or counterfeit product complaints were located.",
    "The CPSC recall notice deemed the product unsafe for infants.",
    "Reviews mention fraudulent charges by a similarly-named company.",
  ];
  for (const s of RESEARCH_MUST_PASS) {
    it(`research/absence vocabulary PASSES: "${s.slice(0, 60)}…"`, () => expect(scanHard(s)).toEqual([]));
  }
  it("OUR verdict shapes still BLOCK (the audit's holes stay closed)", () => {
    expect(scanHard("The supplier is fraudulent.").length).toBeGreaterThan(0);
    expect(scanHard("This vendor is fake.").length).toBeGreaterThan(0);
    expect(scanHard("This listing is unsafe.").length).toBeGreaterThan(0);
    expect(scanHard("They are running a scam.").length).toBeGreaterThan(0);
    expect(scanHard("A fraudulent vendor operating from a rented address.").length).toBeGreaterThan(0);
  });
});

describe("BL amendments 2026-07-28 (founder-authorized) — the REAL-OUTPUT probe's false block + false pass", () => {
  // (a) H12 REQUEST-VOICE CARVE-OUT — M8's mandated job is REQUESTING evidence, not asserting.
  it("PASSES the real 021 M8 sentence (request voice): asking the vendor for confirming documentation", () => {
    expect(scanHard("Are the specific Bosch product lines in this procurement designated as open-distribution or select-partner-exclusive by Bosch, and can you provide documentation from Bosch confirming your authorization to distribute those lines?")).toEqual([]);
  });
  it("PASSES equivalent request/interrogative forms", () => {
    expect(scanHard("Please provide proof confirming your authorization for this product line.")).toEqual([]);
    expect(scanHard("Does documentation confirming the authorization appear in your records?")).toEqual([]);
  });
  it("STILL BLOCKS our-voice confirmation assertions (the carve-out is voice-scoped, not word-scoped)", () => {
    expect(scanHard("We confirm your authorization to distribute these lines.").length).toBeGreaterThan(0);
    expect(scanHard("This confirms authorization from the brand.").length).toBeGreaterThan(0);
    expect(scanHard("The authorization is confirmed.").length).toBeGreaterThan(0);
  });
  it("denials keep passing (the mandated language, unchanged)", () => {
    expect(scanHard("We could not confirm authorization.")).toEqual([]);
    expect(scanHard("The authorization could not be confirmed through available public sources.")).toEqual([]);
  });

  // (b) H14 WIDENED — alternation-complete, not one adverb slot.
  it("BLOCKS the real 021 the_real_risk sentence (the false PASS): intensified our-voice legitimacy", () => {
    expect(scanHard("The operative risk is not supplier identity fraud — TD SYNNEX is a verifiably legitimate corporate entity.").length).toBeGreaterThan(0);
  });
  it("BLOCKS the intensifier family (genuinely/clearly/demonstrably/entirely/fully/wholly/completely)", () => {
    for (const adv of ["genuinely", "clearly", "demonstrably", "evidently", "entirely", "fully", "wholly", "completely"]) {
      expect(scanHard(`This is a ${adv} legitimate operation.`).length, adv).toBeGreaterThan(0);
    }
  });
  it("BLOCKS the verb variation on ENTITY claims: 'holds/remains a legitimate business'", () => {
    expect(scanHard("The vendor holds a legitimate business here.").length).toBeGreaterThan(0);
    expect(scanHard("TD SYNNEX remains a legitimate distributor.").length).toBeGreaterThan(0);
  });
  it("TWO-SIDED, MANDATORY: consistent-with framing, 'legitimately registered', and 022's borderline relationship sentence ALL stay passing", () => {
    expect(scanHard("Supplier identity indicators are consistent with a legitimate wholesale operation")).toEqual([]);
    expect(scanHard("TD SYNNEX is a legitimately registered, large-scale corporate entity with verifiable government contracts.")).toEqual([]);
    expect(scanHard("The evidence record strongly supports that TD SYNNEX holds a legitimate, award-recognized authorized distribution relationship with Lenovo.")).toEqual([]);
  });
});

describe("BL fix — the H4 negation carve-out (BL4)", () => {
  it("affirmative Amazon-approval claims STILL block", () => {
    expect(scanHard("This supplier has Amazon approval.").length).toBeGreaterThan(0);
    expect(scanHard("Amazon approved this listing.").length).toBeGreaterThan(0);
  });
  it("denial forms pass — both founder-authored strings become embeddable", () => {
    expect(scanHard(CATEGORY_FLAGS_GOVERNING_LAW)).toEqual([]);
    expect(scanHard("Category requirements are stated as 'may require'; they are not confirmation of Amazon approval or refusal.")).toEqual([]);
  });
});
