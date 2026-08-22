import { describe, it, expect } from "vitest";
import { scanHard, scanFindingsForBannedLanguage } from "./banned-language";
import { VERDICT_SENTENCES } from "@/lib/research/synthesisEngine";
import { CATEGORY_CLIENT_SUMMARY } from "@/lib/research/categoryStep";
import { CATEGORY_FLAGS_TABLE, CATEGORY_FLAGS_GOVERNING_LAW } from "@/lib/research/categoryFlagsTable";
import { clientNote } from "@/lib/research/websiteAnchor";
import { subscriptionPlans, oneTimePlans, creditExplainer, pricingHero, comparison, COMING_SOON_LABEL, COMING_SOON_NOTE } from "@/lib/content/pricing";
import { PARTNER_REQUEST_COPY, INVITE_LINK_INACTIVE_COPY, GRANT_CODE_ENTRY_COPY } from "@/lib/content/partnerRequest";
import { VERDICT_ABSENT_TITLE, VERDICT_ABSENT_BODY, VERDICT_ABSENT_PREVIEW_NOTE } from "@/lib/portal/verdictPresence";
import { DOC_TITLE, ISSUER, confidentialityLine, runningFooter } from "@/lib/content/documentIdentity";
import { SECTIONS, CONTENTS_TITLE, AREAS_TABLE, CHECKLIST_TABLE, MONITOR_TABLE_CAPTION, BOUNDARY_CALLOUT_LABEL, SCOPE_NOTE_LABEL, COVER_META_LABELS, coverInsideLine, documentFooter } from "@/lib/content/reportDocument";

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
  // — PDF document identity (spec 2026-08-15, standing rule 8: same commit; imported, never copied) —
  ["PDF document title", DOC_TITLE],
  ["PDF issuer line", ISSUER],
  ["PDF confidentiality line", confidentialityLine("Marcus Chen (Chen Trading Co.)")],
  ["PDF running footer", runningFooter("AWI-2607-022", 4, 9, "August 13, 2026")],
  // — PDF document structural copy (rebuild 2026-08-16; imported, never copied) —
  ...SECTIONS.flatMap((s): [string, string][] => [[`PDF section title ${s.no}`, `${s.no} · ${s.title}`], [`PDF toc line ${s.no}`, s.toc]]),
  ["PDF contents title", CONTENTS_TITLE],
  ["PDF areas table", `${AREAS_TABLE.caption} — ${AREAS_TABLE.colArea} / ${AREAS_TABLE.colStatus}`],
  ["PDF checklist table", `${CHECKLIST_TABLE.colNo} ${CHECKLIST_TABLE.colQuestion} — ${CHECKLIST_TABLE.analystNote}`],
  ["PDF monitor caption", MONITOR_TABLE_CAPTION],
  ["PDF boundary callout label", BOUNDARY_CALLOUT_LABEL],
  ["PDF scope note label", SCOPE_NOTE_LABEL],
  ["PDF cover meta labels", `${COVER_META_LABELS.preparedFor} · ${COVER_META_LABELS.delivered} · ${COVER_META_LABELS.caseRef} · ${COVER_META_LABELS.inside}`],
  ["PDF cover inside line", coverInsideLine(17)],
  ["PDF document footer", documentFooter("Marcus Chen (Chen Trading Co.)", 6, 12)],
  // — pricing-ladder / intake strings (2026-08-07 pass — standing rule 8: same commit) —
  ["upload upsell ($99 gate)", "Document review is included from the $149 report up."],
  ["upload authority copy", "Optional. A PO or letterhead helps us confirm the vendor's entity and address. The brands and vendor you enter above are what we research."],
  ["uploads_not_included server message", "Document upload is not part of the $99 report — document review is included from the $149 report up."],
  ["file limit message (2)", "Maximum 2 files — contact support if you need more."],
  ["doc-review description (entity/address)", "We check that the paperwork's entity and address line up with what our other research found independently. Documents usually cannot confirm the brands you plan to buy — that comes from the research areas above."],
  ["brand helper (corrected)", "The brands and vendor you enter here are what we research. An uploaded document helps confirm the vendor's entity and address — it is not expected to list your brands."],
  ["$149 tier name (re-ruled 2026-08-10)", "Single Deep Report"],
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
  // — submission confirmation email (2026-08-10 gap-close — standing rule 8: same commit) —
  ["submission email subject", "We received your case AWI-2608-030"],
  ["submission email body line 1", "Your research request for Acme Distribution (case AWI-2608-030) has been submitted and is now in the queue."],
  ["submission email body line 2", "Track your case in your portal — its status updates as the work progresses."],
  ["submission email body line 3", "You'll get another email when your report is delivered. Questions in the meantime? Use the support page in your portal."],
  // — checkout state-guard messages (2026-08-10 gap-close) —
  ["checkout guard: already subscribed", "You already have a subscription. Plan changes and payment updates are handled in Stripe — use Manage subscription on the Billing page."],
  ["checkout guard: topup requires subscription", "Top-up packs are part of the subscription plans. On a one-time plan, buy another report instead."],
  // — sale gate (2026-08-22 money-surfaces ruling — standing rule 8: same commit) —
  ["checkout sale gate: plan coming soon", "This plan isn't available for purchase yet — it's coming soon."],
  ["checkout sale gate: topups off sale", "Top-up packs aren't available right now."],
  ["pricing coming-soon chip", COMING_SOON_LABEL],
  ["pricing coming-soon note", COMING_SOON_NOTE],
  ["dashboard upgrade CTA (tier-naming retired 2026-08-22)", "Move to a monthly plan →"],
  // — verdict-absence refusals (2026-08-22 — standing rule 8: same commit; imported) —
  ["verdict-absent refusal title", VERDICT_ABSENT_TITLE],
  ["verdict-absent refusal body", VERDICT_ABSENT_BODY],
  ["verdict-absent operator preview note", VERDICT_ABSENT_PREVIEW_NOTE],
  // "plan-change card copy" pin REMOVED 2026-08-22: the Change Plan card is gone — its only
  // function was the Growth↔Scale portal switch, and Scale is off sale.
  // — 24h SLA copy ruling (2026-08-12): every client-facing delivery statement, as rendered —
  ["submit estimated completion", "Within 24 hours"],
  ["onboarding plan bullet", "Delivered within 24 hours"],
  ["onboarding ready screen", "Submit your first request and receive a structured verdict on your supplier within 24 hours."],
  ["pricing one-time bullet", "Ready in your portal within 24 hours"],
  ["pricing comparison delivery value", "24 hours"],
  ["marketing FAQ delivery answer", "Within 24 hours on every plan. Every report is reviewed and approved by the founder before it reaches you."],
  ["marketing checking-first card", "One report. Delivered within 24 hours. A clear verdict and the questions to ask — before a dollar moves."],
  ["marketing how-it-works heading", "Three steps. 24 hours. One clear answer."],
  ["how-it-works snapshot body", "A one-page Decision Snapshot — a plain-English verdict, the evidence behind it, and the questions to ask your vendor. Delivered within 24 hours."],
  ["billing upgrade nudge (priority framing retired)", "Ready for more? Move to a monthly plan for recurring reports and credit rollover."],
  ["case table SLA countdown", "Due in 3h"],
  ["case table SLA due", "Due now"],
  // — client report renderer (full-build 2026-08-13) — every static UI string on the report —
  ["report verdict means: source clear", "The evidence supported this source at the time of research. Standard diligence still applies — the decision stays yours."],
  ["report verdict means: usable", "Workable — with the stated conditions handled first. The conditions are part of the verdict, not a footnote."],
  ["report verdict means: verify", "Do not place a large order — resolve the listed items first. Re-submit for an updated review once resolved."],
  ["report verdict means: do not rely", "The evidence does not support relying on this source. The report explains what drove this."],
  ["report verdict tooltip", "The verdict is one of four levels, strongest to weakest: Source Clear, Usable With Conditions, Verify Before Purchase, Do Not Rely. It reflects what the observable evidence supported at the time of research — not a guarantee. The verdict is the recommendation."],
  ["report area def: legitimacy", "Whether the supplier is a real, verifiable wholesale business."],
  ["report area def: supply chain", "Whether the supplier credibly sources the brands in scope, and whether an authorization link could be confirmed."],
  ["report area def: brand risk", "The brands' reseller environment and any enforcement signals against resellers of this profile."],
  ["report area def: documentation", "What any documents you provided corroborate. Documents can add support but never raise the verdict above what the research on its own supports."],
  ["report area def: sourcing logic", "A consistency check across the assessed areas. Informational — it does not change the verdict."],
  ["report chip def: verified", "Independently corroborated — multiple independent sources confirm this."],
  ["report chip def: assessed", "We evaluated the available evidence and formed a view, but could not independently corroborate it. A reasoned read, not an independent confirmation."],
  ["report chip def: not assessed", "We did not evaluate this area — for example, because no documents were provided. It neither raises nor lowers the verdict."],
  ["report how-to-read (claims ruling 2026-08-14)", "This report gives you one clear verdict, the single most important risk in plain language, findings across the assessment areas your plan includes, an honest split between what we confirmed and what we could not, and a short checklist to run before you commit."],
  ["report honesty tooltip", "What we looked for but public evidence did not confirm. This marks the limits of the research — not a finding against the supplier. Absence of evidence is not evidence of a problem."],
  ["report checklist intro", "Put these to the supplier before you commit. Satisfactory answers do not guarantee marketplace acceptance."],
  ["report category note", "Selling these brands in their marketplace categories may require category approval or specific documentation before listing. This is a marketplace requirement independent of this report's verdict — confirm your category status before you commit."],
  ["report disclaimer", "This report reflects observable evidence available at the time of research. It is not a guarantee of marketplace approval, account safety, or brand action. The decision to purchase is yours."],
  ["report question source: research", "From our research"],
  ["report question source: review team", "From our review team"],
  ["report summary fallback", "Your report is ready — the findings below carry the detail."],
  ["report questions empty", "No supplier questions were recorded for this report."],
  ["report honesty fallback", "The findings above carry what was and was not confirmed for this case."],
  ["active case review line", "Every report is reviewed by a human analyst before delivery, and you'll get an email when it's ready."],
  ["active case about row", "Question about this case? Message support — include the case ID"],
  // — submit 4-step (full-build §4) — step subs, hints, tips, review copy —
  ["submit page sub (dedup 2026-08-15)", "One case covers one supplier and their brands, for one credit. You'll review everything before it's submitted."],
  ["submit brands sub (single statement)", "Up to 5 brands per case — one credit covers them all."],
  ["submit brands counter", "2 of 5 brands added"],
  ["credits widget detail", "plan adds 12 at renewal · 3 used this cycle"],
  ["submit supplier sub", "Who are you planning to buy from?"],
  ["submit name hint", "The full legal name from their invoice or quote — spelling matters."],
  ["submit website hint", "If they gave you a storefront, portal, or catalog link, paste it here."],
  ["submit marketplace hint", "The Amazon marketplace where you'll resell these goods."],
  ["submit brands sub", "Up to 5 brands per case on your plan — one credit covers them all."],
  ["submit documents heading", "What they've sent you"],
  ["submit documents sub", "An invoice, quote, or price list gives our review something concrete to check. Nothing is shared with the supplier."],
  ["submit dropzone line", "or drag & drop — PDF, JPG, PNG · up to 2 files · 10MB each"],
  ["submit files counter", "1 of 2 files attached"],
  ["submit notes label", "Anything specific on your mind?"],
  ["submit notes placeholder", "e.g. They say they ship from a EU warehouse — the pricing feels low for this brand."],
  ["submit review sub", "A minute here protects the credit — check the supplier, brands, and marketplace are exactly right, then submit."],
  ["submit review empty supplier", "No supplier name yet — add it before submitting."],
  ["submit review empty brands", "No brands entered yet."],
  ["submit review empty docs", "No documents attached"],
  ["submit credit line", "You have 3 available · estimated completion within 24 hours. If research can't start, your credit is returned automatically."],
  ["submit tip supplier", "Use the supplier's full legal name, exactly as it appears on their invoice or quote — spelling matters for research."],
  ["submit tip brands", "The brands and vendor you enter here are what we research — one case covers one supplier and the brands you list."],
  ["submit tip documents", "A PO or letterhead helps us confirm the vendor's entity and address. The brands and vendor you entered are what we research."],
  ["submit tip review", "A minute here protects the credit — check the supplier, brands, and marketplace are exactly right, then submit."],
  // — guides shell + settings reword + auth pill (full-build §0/§1) —
  ["guides page sub", "Short, practical guides. This section will grow — the entries below are the launch set."],
  ["guides row: read report", "How to read your report"],
  ["guides row: strong case", "Submitting a strong case"],
  ["guides row: checklist", "Working the verification checklist"],
  ["guides row: five areas", "What the five assessment areas cover"],
  ["settings page sub (reworded)", "Keep your contact and billing details up to date. These are saved to your account for your records."],
  ["settings billing hint (reworded)", "Saved to your account for your records. Separate from your Stripe card details."],
  ["settings tax hint (reworded)", "Saved to your account for your records. Leave blank if not applicable."],
  ["auth pill (60+ removed; five→structured 2026-08-20, plan-dependent count)", "Structured assessment areas, one clear verdict"],
  // — humanise pass (2026-08-14) —
  ["dashboard reports-ready sub", "Ready to read"],
  ["onboarding document bullet", "Document review when you upload paperwork"],
  ["onboarding research bullet (all-5 tiers)", "Research across all five assessment areas"],
  ["onboarding research bullet ($99, plan-derived)", "Research across 3 assessment areas: Supplier Legitimacy, Brand Risk, Sourcing Logic"],
  // — marketing pricing copy (2026-08-08 batch — IMPORTED, cannot drift) —
  ["pricing hero title", pricingHero.title],
  ["pricing hero subtitle", pricingHero.subtitle],
  ["credit explainer", creditExplainer],
  ...[...subscriptionPlans, ...oneTimePlans].flatMap((p) =>
    p.points.map((pt): [string, string] => [`pricing point (${p.id})`, pt]),
  ),
  ...comparison.map((r): [string, string] => [`comparison row: ${r.feature}`, `${r.feature}: ${r.values.join(" / ")}`]),
  // Top-up sentence removed from the FAQ answer (founder-ruled 2026-08-22, item 2 — supersedes
  // the 2026-08-14 wording on this one point; the rest of the vocab ruling stands verbatim).
  ["FAQ credits answer (vocab ruling 2026-08-14; top-up sentence removed 2026-08-22)", "One credit = one report — one supplier, up to your plan's brand limit, across the assessment areas your plan includes. Subscriptions include a set number of credits each month, and unused credits roll over up to your plan's limit. A single report is just one credit's worth, bought on its own."],
  // $149 offer removed from the try-first answer (sale ruling 2026-08-22 — supersedes the
  // 2026-08-14 wording on that clause; the tier is off sale while Keepa is unbuilt).
  ["FAQ try-first answer (vocab 2026-08-14; $149 offer removed 2026-08-22)", "Yes. Buy a Single Report for $99 to see how we work before committing to a monthly plan."],
  // — partner request flow (2026-08-22 item 1 — standing rule 8: same commit; imported, never copied) —
  ...Object.entries(PARTNER_REQUEST_COPY).map(([k, v]): [string, string] => [`partner request copy: ${k}`, v]),
  ["inactive invite-link landing (click-time honesty 2026-08-22)", INVITE_LINK_INACTIVE_COPY],
  // — code entry at registration (2026-08-22 item 2 — standing rule 8: same commit; imported) —
  ...Object.entries(GRANT_CODE_ENTRY_COPY).map(([k, v]): [string, string] => [`grant code entry: ${k}`, v]),
  ["help areas sub (claims ruling 2026-08-14)", "Which areas run depends on your plan — your report states exactly what it covered."],
  ["report areas header ($99 case)", "The 3 assessment areas in this report"],
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

// ── GATE RULING 2026-08-16 — two-sided proof for the four census-driven changes. PASS side is
// REAL corpus sentences the old gate wrongly blocked; BLOCK side is constructed violations
// proving every ban still bites. Advisory: the demoted evidence-subject form must flag, not block.
import { scanAssertion } from "./banned-language";

describe("gate ruling 2026-08-16 — census corpus passes, real violations still block", () => {
  const CORPUS_MUST_PASS: [string, string][] = [
    ["#1 request-voice with e.g. abbreviation", "Can TD SYNNEX provide documentation (e.g., distributor agreement, vendor portal screenshot, or Lenovo partner portal confirmation) confirming its authorized distributor status for Lenovo in the specific geography?"],
    ["#3 fraud clearing", "No scam reports naming NVE Pharmaceuticals as a fraudulent vendor were found; src_1 and src_18 concern unrelated parties."],
    ["#3 fraud attribution (impersonation)", "The only negative signals are a low-volume Trustpilot score and third-party recruitment fraud impersonation - the latter concerns scammers posing AS TD SYNNEX, not TD SYNNEX itself."],
    ["#3 legitimacy inside a whether-question", "It is ambiguous whether the seller was a legitimate reseller or counterfeit."],
    ["#4 ungating subject-matter (gating state)", "Broad resale is supported through authorized channels, but unauthorized or ungated marketplace resale faces friction."],
    ["#4 ungating reported speech", "Multiple seller forum posts consistently report that the brand requires a brand-issued LOA and that Amazon ungating alone is insufficient."],
    ["#4 mandated service denial still passes", "We do not provide ungating services."],
  ];
  it.each(CORPUS_MUST_PASS)("PASS %s", (_n, s) => expect(scanHard(s)).toEqual([]));

  const MUST_BLOCK: [string, string][] = [
    ["our-voice confirm", "We confirm your authorization with the brand."],
    ["this-confirms form", "This document confirms the authorization of the vendor."],
    ["passive without evidence subject", "Authorization is confirmed for this vendor."],
    ["fraud accusation", "The vendor is a fraudulent operation run by scammers."],
    ["attributive fraud accusation", "This is a fraudulent vendor."],
    ["bare legitimacy verdict", "The supplier is legitimate."],
    ["ungating service offer", "We can handle ungating for your account."],
    ["ungating service noun", "Our package includes ungating services for restricted categories."],
  ];
  it.each(MUST_BLOCK)("BLOCK %s", (_n, s) => expect(scanHard(s).length).toBeGreaterThan(0));

  it("#2 evidence-subject form: demoted to ADVISORY - never silently released", () => {
    const s = "The evidence confirms authorization in at least three distinct geographic contexts.";
    expect(scanHard(s)).toEqual([]);
    expect(scanAssertion(s)).toContain("evidence-voice authorization confirmation (reword to 'supports')");
  });
});

describe("gate ruling 2026-08-16(b) — evidence-attributed passive demoted, bare passive stays HARD", () => {
  const attributed = "For Lenovo: DIRECT manufacturer authorization is confirmed across multiple territories via TD SYNNEX's own official domain pages, Lenovo-issued awards, and a 2025 press release.";
  it("PASS (hard) + ADVISORY fires: the attributed passive", () => {
    expect(scanHard(attributed)).toEqual([]);
    expect(scanAssertion(attributed)).toContain("evidence-voice authorization confirmation (reword to 'supports')");
  });
  it("BLOCK: the bare passive, nothing behind it", () => {
    expect(scanHard("Authorization is confirmed for this vendor.").length).toBeGreaterThan(0);
    expect(scanHard("Authorization is confirmed.").length).toBeGreaterThan(0);
  });
});
