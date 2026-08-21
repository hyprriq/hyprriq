import type { TrackKey } from "@/lib/constants/tracks";
import type { SourceProfile, AuthorityScore } from "@/lib/research/source_profile";
import { authorityFor } from "@/lib/research/source_profile";
import { weightFor, weightKeyExistsInAnyTrack, alternativeGroupFor } from "@/lib/research/weights";
import type { WeightValidation, ValidationGate, RejectionReason } from "@/lib/research/contracts";

// Firewall version (independent of the Evidence Pack schema_version). Bump on gate / ALLOWED_PROFILES
// / MIN_AUTHORITY / contradiction-rule changes — NOT when a weight_key is added to the registry.
// 1.1.0 (2026-06-28): provenance gate now accepts when ANY cited source matches an allowed profile
// (was: highest-authority cited source only); + Track 2 ALLOWED_PROFILES corrections (ADR-T2-001 area).
// 1.2.0 (2026-07-03): corroboration gate — scam_reports_corroborated (a fraud hard_fail whose ALLOWED_
// PROFILES + MIN_AUTHORITY are identical to the mild negative_reputation) now requires ≥2 DISTINCT valid
// cited sources. Prevents a single low-authority source (one Facebook post → MotoTec USA false hard_fail)
// from triggering an irreversible veto. Strictly more conservative — cannot produce a false PASS.
// 1.3.0 (2026-07-07, H7 SO-2 founder-signed): corroboration BREADTH — website_fraudulent and
// address_fraudulent join the ≥2-distinct-sources class (every irreversible-veto key; aligns with the
// standing principle that a single unverified fraud-flag is never load-bearing). Post-SO-1 pack dedupe,
// "distinct" finally means distinct real-world URLs. Strictly more conservative.
// 1.4.0 (2026-07-10, Track 3 SO-1+SO-2 founder-signed): brand_risk_assessment goes live — provenance +
// authority entries for all 12 keys (per the ruled ADR-T1-001 collision audit) and ALL FOUR brand-risk
// vetoes join the ≥2-distinct-sources class (the confirmed_amazon_restrictions single-source exception
// REVERSED — no marketplace-observation capability until Keepa). Strictly more conservative.
// 1.5.0 (2026-07-11, founder-signed): the three Keepa keys made firewall-INERT (entries removed +
// RULED_EXCLUSIONS + track3 code drop) — the ["marketplace"] profiles met MIN via amazon/ebay
// classification, so a sellercentral snippet could earn +3 prompt-gated-only (the website_fraudulent
// anti-pattern, positive-key flavor). Strictly more conservative; the Keepa gate ships real entries.
// 1.6.0 (2026-07-11, Track 4 sub-gate A, founder-signed): documentation_review goes live — entries
// for all 10 keys (user_upload-only; loa_legitimate's first entry, Track-4-proposable per
// ADR-T2-001 with Track 2's code backstop now load-bearing); both vetoes single-source per the
// OQ-A4 observed-artifact ruling (NO corroboration rows — the deliberate opposite of Keepa).
// 1.6.0 → 1.7.0 (S-0, founder-signed 2026-07-16): the synthesis→verdict certification is firewall
// config — the enum law, the structural critical/load-bearing conditions (SO-S0-2 split), and the
// m4c origin cap join the validation layer's contract. Pins updated same commit (rerun-batch,
// dispute-rerun).
// 1.7.0 → 1.8.0 (POLARITY GATE, founder-ruled 2026-08-21 after the polarity census — 941 items read,
// ~2.9% strict sign contradictions + ~6.4% subject inversion, both directions on delivered cases,
// incl. an FDA warning letter earning +4): the model now DECLARES each item's polarity
// (favorable|adverse|neutral_absence) and subject_is_target; gate ⑧ rejects deterministically when
// the declaration contradicts the key's sign, or when the fact is declared not-about-the-target.
// This is a CONSISTENCY check, not a truth check — a model wrong twice consistently still passes
// (limit stated in the census, accepted in the ruling). UNDECLARED items SKIP the gate (fail-open):
// the schema makes the fields required on the mainline path, but the schema-less fallback parse may
// omit them, and zeroing out an entire track's evidence on a fallback would be an outage, not a
// safety win (CTO-DECIDED 2026-08-21; mirrors the RLS wired-early lesson). Strictly more conservative
// on the declared path — cannot produce a false PASS it wouldn't have produced before.
export const VALIDATION_VERSION = "1.8.0";

// ── Gate config (code-owned trust rules; same pattern as weights.ts / source_profile.ts) ──
// Exported for the H7 registry-coverage lock (firewallRegistry.test.ts) ONLY — read-only there;
// gate logic below is the single consumer that decides anything with these.
export const ALLOWED_PROFILES: Record<string, SourceProfile[]> = {
  government_registration: ["government_record", "registry"],
  domain_age_5_plus: ["whois"], domain_age_2_5: ["whois"], domain_age_under_2_established: ["whois"],
  address_verifiable: ["government_record", "registry", "official_company"],
  linkedin_company: ["social", "official_company"],
  phone_verifiable: ["official_company", "registry", "government_record"],
  website_quality: ["official_company", "official_brand"],
  bbb_or_trade_association: ["registry"],
  negative_reputation: ["forum", "social", "news", "marketplace"],
  registration_fabricated: ["government_record", "registry"],
  address_fraudulent: ["government_record", "registry", "news"],
  website_fraudulent: ["news", "forum", "marketplace"],
  scam_reports_corroborated: ["forum", "social", "news", "marketplace"],
  // Track 2 — supply_chain_relationship. loa_legitimate is intentionally ABSENT: an LOA is NOT an
  // authorization-discovery signal here (pre-purchase, unverifiable) — it routes to the Compliance
  // Documentation layer (ADR-T2-001). It remains a Track 4 (documentation_review) key.
  // dealer_page_listed = the BRAND's own page lists/recognises the vendor → official_brand ONLY.
  // A vendor self-claim ("we are an authorized distributor") is official_company → it must map to
  // claims_authorization_unverified instead (vendor self-assertion), not dealer_page_listed.
  dealer_page_listed: ["official_brand"],
  invoice_matches_distributor: ["user_upload", "official_company"],
  purchases_from_mega_distributor: ["user_upload", "official_company", "registry"],
  trade_press_connection: ["news", "official_company"],
  claims_authorization_unverified: ["official_company", "user_upload", "inference"],
  // An ABSENCE finding necessarily cites the official pages it examined (brand dealer/distributor
  // pages, registries, news) — so it must accept those profiles, not just inference.
  no_connection_found: ["official_brand", "official_company", "registry", "news", "inference"],
  grey_market_signals: ["forum", "social", "news", "marketplace"],
  counterfeit_channel: ["government_record", "news", "forum", "marketplace"],
  conflicting_authorization: ["official_brand", "official_company", "registry", "news"],
  // Track 3 — brand_risk_assessment (gate spec 2026-07-10; provenance per the founder-ruled
  // ADR-T1-001 collision audit — the recency windows + carve-outs are PROMPT law; provenance/
  // authority/corroboration are enforced here). Keepa keys carry entries NOW (registry lock stays
  // honest) but are inert until the Keepa plugin ships (OQ-A: no pack source can earn them).
  reseller_friendly: ["official_brand", "news"],
  // keepa_stable_no_cliff / keepa_enforcement_cliff / low_seller_count_stable are deliberately
  // ABSENT (founder-signed 2026-07-11 — the loa_legitimate pattern): the ["marketplace"] profiles
  // met MIN via amazon/ebay CLASSIFICATION, so a sellercentral snippet could earn +3 prompt-gated-
  // only. "No marketplace-observation capability means no key asserting it, veto or positive."
  // The Keepa plugin gate ships real entries + removes the RULED_EXCLUSIONS rows.
  // An ABSENCE finding cites the pages it examined (the no_connection_found pattern).
  no_enforcement_found: ["official_brand", "news", "forum", "marketplace", "inference"],
  map_policy_present: ["official_brand", "news"],
  brand_enforcement_signals: ["news", "forum", "social", "marketplace"],
  brand_restricts_amazon: ["news", "forum", "marketplace", "official_brand"],
  // The brand's OWN channel policy — nothing softer qualifies (ruled definition).
  b2b_only_confirmed: ["official_brand"],
  active_ip_complaints: ["government_record", "news", "official_brand"],
  confirmed_amazon_restrictions: ["marketplace", "official_brand", "news"],
  cease_and_desist_distributed: ["news", "forum", "official_brand", "government_record"],
  // Track 4 — documentation_review (sub-gate A, founder-signed 2026-07-11). Documents are the ONLY
  // source: every key is user_upload. loa_legitimate's FIRST entry — proposable in Track 4 only per
  // ADR-T2-001; NOTE this reopens the provenance gate for Track 2 citations, so ADR-T2-001 now
  // rests on Track 2's code backstop (load-bearing, locked in track2.test.ts). Both vetoes are
  // single-source-capable per the OQ-A4 ruling: the artifact is OBSERVED (we hold the document) —
  // the deliberate opposite of the Keepa ruling by the same standard. The guardrail is PROMPT law:
  // single-source covers what the document SAYS; what it is claimed to PROVE is an inference.
  invoice_full: ["user_upload"],
  loa_legitimate: ["user_upload"],
  po_on_letterhead: ["user_upload"],
  catalog_or_pricelist: ["user_upload"],
  email_correspondence: ["user_upload"],
  screenshot_only: ["user_upload"],
  no_documents: ["user_upload", "inference"], // registered for coverage; unreachable by design (OQ-A3: zero uploads = n_a, never scored)
  document_missing_fields: ["user_upload"],
  document_alteration: ["user_upload"],
  retail_receipt_as_wholesale: ["user_upload"],
};
export const MIN_AUTHORITY: Record<string, AuthorityScore> = {
  government_registration: "high", domain_age_5_plus: "high", domain_age_2_5: "high",
  domain_age_under_2_established: "high", address_verifiable: "medium", linkedin_company: "low",
  phone_verifiable: "low", website_quality: "low", bbb_or_trade_association: "low",
  negative_reputation: "low", registration_fabricated: "high", address_fraudulent: "medium",
  website_fraudulent: "low", scam_reports_corroborated: "low",
  // Track 2 (supply_chain_relationship)
  dealer_page_listed: "high", invoice_matches_distributor: "low",
  purchases_from_mega_distributor: "low", trade_press_connection: "low",
  claims_authorization_unverified: "low", no_connection_found: "low", grey_market_signals: "low",
  counterfeit_channel: "medium", conflicting_authorization: "medium",
  // Track 3 (brand_risk_assessment) — keepa keys deliberately absent (see ALLOWED_PROFILES note).
  reseller_friendly: "medium",
  no_enforcement_found: "low", map_policy_present: "low",
  brand_enforcement_signals: "low", brand_restricts_amazon: "low",
  b2b_only_confirmed: "high", active_ip_complaints: "medium",
  confirmed_amazon_restrictions: "medium", cease_and_desist_distributed: "low",
  // Track 4 (documentation_review) — user_upload authority is "low" by profile, so "low" everywhere
  // (the trust decision for documents lives in the review itself + the consensus gate, not authority).
  invoice_full: "low", loa_legitimate: "low", po_on_letterhead: "low", catalog_or_pricelist: "low",
  email_correspondence: "low", screenshot_only: "low", no_documents: "low",
  document_missing_fields: "low", document_alteration: "low", retail_receipt_as_wholesale: "low",
};
// Corroboration gate — keys whose meaning REQUIRES multiple independent sources. scam_reports_corroborated
// is a hard_fail (irreversible veto) that the profile/authority gates cannot distinguish from the mild
// negative_reputation (identical ALLOWED_PROFILES + MIN_AUTHORITY) — so a single low-authority source must
// not be able to trigger it. Value = minimum DISTINCT valid cited sources required. Default (unlisted) = 1.
// See docs/adr-t1-001-scam-corroboration-gate.md (collision-class audit + KNOWN RESIDUAL SEAM: 2+
// reseller-scoped scams mis-attributed to the vendor still pass — the prompt is then the only guard).
const CORROBORATION_REQUIRED: Record<string, number> = {
  scam_reports_corroborated: 2,
  // H7 (SO-2, v1.3.0) — every irreversible-veto key whose profiles include variable-trust sources
  // requires ≥2 DISTINCT valid sources. Post-SO-1 dedupe, distinct means distinct real-world URLs.
  website_fraudulent: 2,
  address_fraudulent: 2,
  // Track 3 (SO-2, v1.4.0, founder-corrected 2026-07-10) — ALL FOUR brand-risk vetoes, including
  // confirmed_amazon_restrictions: the single-source "self-evidencing artifact" exception was
  // REVERSED because without Keepa the engine cannot OBSERVE a gated listing, only read claims
  // about one (different epistemic objects). RIDER (Keepa-gate entry condition): revisit
  // single-source for confirmed_amazon_restrictions when direct marketplace observation ships.
  active_ip_complaints: 2,
  cease_and_desist_distributed: 2,
  confirmed_amazon_restrictions: 2,
  b2b_only_confirmed: 2,
};

// Authority gate (⑤) runs ONLY for variable-trust profiles; fixed-trust profiles skip it (no audit
// entry) because authority is already implied by provenance. 'inference' has no external source → skip.
const VARIABLE_TRUST_PROFILES: SourceProfile[] = ["news", "forum", "social", "marketplace", "user_upload"];

// Gate ⑧ (v1.8.0) — keys whose MEANING is a searched-and-nothing-found result: an honest polarity
// declaration for them is neutral_absence even when the registry signs them (no_enforcement_found
// is +2 by ruled registry). They accept neutral_absence in addition to their sign's expectation.
const ABSENCE_SEMANTICS_KEYS = new Set(["no_enforcement_found", "no_connection_found", "no_documents"]);
const AUTH_RANK: Record<AuthorityScore, number> = { low: 0, medium: 1, high: 2 };

export interface ProposedMapping {
  evidence_id: string;
  proposed_weight_key: string;
  cited_source_ids: string[];
  // v1.8.0 — the model's own declaration of the statement's direction and subject (gate ⑧).
  // Optional: undeclared (schema-less fallback parse) skips the gate — see the version note.
  declared_polarity?: "favorable" | "adverse" | "neutral_absence";
  declared_subject_is_target?: boolean;
}
export interface FirewallInput { track: TrackKey; proposals: ProposedMapping[]; sourceProfileById: Record<string, SourceProfile> }

const rec = (
  evidence_id: string, proposed: string, validated: string | null,
  gate: ValidationGate | null, reason: RejectionReason | null,
): WeightValidation => ({ evidence_id, proposed_weight_key: proposed, validated_weight_key: validated, gate, rejection_reason: reason, validation_version: VALIDATION_VERSION });

export function validateWeights(input: FirewallInput): WeightValidation[] {
  const { track, proposals, sourceProfileById } = input;
  type Pass = { evidence_id: string; key: string; profile: SourceProfile; sourceId: string; hardFail: boolean };
  const passed: Pass[] = [];
  const out: WeightValidation[] = [];

  // ── Per-item: UNKNOWN → grounding → registry → track → provenance → authority(conditional) ──
  for (const p of proposals) {
    const key = p.proposed_weight_key;
    if (key === "UNKNOWN") { out.push(rec(p.evidence_id, key, null, null, "llm_returned_unknown")); continue; }
    const cited = p.cited_source_ids.filter((id) => id in sourceProfileById);
    if (cited.length === 0) { out.push(rec(p.evidence_id, key, null, "grounding", "no_valid_citation")); continue; }
    if (!weightKeyExistsInAnyTrack(key)) { out.push(rec(p.evidence_id, key, null, "registry", "registry")); continue; }
    const w = weightFor(track, key);
    if (!w) { out.push(rec(p.evidence_id, key, null, "track", "track")); continue; }
    // Provenance gate (v1.1.0): evaluate EACH cited source — accept if ANY cited source's profile is
    // allowed for this key (an item is not rejected just because a DIFFERENT, higher-authority cited
    // source happens not to match). Among the matching sources, use the highest-authority one.
    const allowed = ALLOWED_PROFILES[key] ?? [];
    const matching = cited.filter((id) => allowed.includes(sourceProfileById[id]));
    if (matching.length === 0) { out.push(rec(p.evidence_id, key, null, "provenance", "provenance")); continue; }
    // Corroboration gate — a "_corroborated" fraud hard_fail needs ≥N DISTINCT valid sources (not one,
    // and not the same id repeated). Runs after provenance (we know which cited sources are valid).
    if (new Set(matching).size < (CORROBORATION_REQUIRED[key] ?? 1)) { out.push(rec(p.evidence_id, key, null, "corroboration", "corroboration")); continue; }
    const sourceId = matching.reduce((best, id) =>
      AUTH_RANK[authorityFor(sourceProfileById[id])] > AUTH_RANK[authorityFor(sourceProfileById[best])] ? id : best);
    const profile = sourceProfileById[sourceId];
    if (VARIABLE_TRUST_PROFILES.includes(profile)) {
      if (AUTH_RANK[authorityFor(profile)] < AUTH_RANK[MIN_AUTHORITY[key] ?? "low"]) { out.push(rec(p.evidence_id, key, null, "authority", "authority")); continue; }
    } // fixed-trust profiles skip authority (no audit entry)
    // ── Gate ⑧ — POLARITY (v1.8.0). The key's sign and the model's own declaration must agree:
    //   points > 0            → favorable        · points < 0 or hard_fail → adverse
    //   points === 0 (absence keys like no_connection_found) → neutral_absence
    //   ABSENCE_SEMANTICS_KEYS additionally accept neutral_absence whatever their sign —
    //   no_enforcement_found is +2 by ruled registry, yet an honest declaration of a searched-and-
    //   nothing-found finding IS neutral_absence; without this allowance the gate would systematically
    //   reject a legitimate key (the exact fixture-rule failure shape).
    // In every declared case the fact must be ABOUT THE TARGET (subject_is_target). This is the
    // census's whole delivered flag-set turned into code: "…reference the seasonings positively" under
    // a −3, an FDA warning letter under a +4, "not by TD SYNNEX itself" penalising the vendor — in
    // each, the model's own declaration would contradict its key. Undeclared skips (fallback path).
    if (p.declared_polarity !== undefined) {
      const expected: ProposedMapping["declared_polarity"] =
        w.hard_fail || w.points < 0 ? "adverse" : w.points > 0 ? "favorable" : "neutral_absence";
      const polarityOk = p.declared_polarity === expected
        || (ABSENCE_SEMANTICS_KEYS.has(key) && p.declared_polarity === "neutral_absence");
      const subjectOk = p.declared_subject_is_target !== false; // undeclared subject → not a rejection on its own
      if (!polarityOk || !subjectOk) { out.push(rec(p.evidence_id, key, null, "polarity", "polarity")); continue; }
    }
    passed.push({ evidence_id: p.evidence_id, key, profile, sourceId, hardFail: !!w.hard_fail });
  }

  // ── Cross-item: dedupe → hard_fail-wins (same source) → mutually-exclusive buckets ──
  const seen = new Set<string>();
  const deduped: Pass[] = [];
  for (const x of passed) {
    const k = `${x.key} ${x.sourceId}`;
    if (seen.has(k)) { out.push(rec(x.evidence_id, x.key, null, "contradiction", "contradiction")); continue; }
    seen.add(k); deduped.push(x);
  }
  const killed = new Set<string>();
  const bySource = new Map<string, Pass[]>();
  for (const x of deduped) bySource.set(x.sourceId, [...(bySource.get(x.sourceId) ?? []), x]);
  for (const group of bySource.values()) {
    if (group.some((x) => x.hardFail) && group.some((x) => !x.hardFail)) {
      for (const x of group) if (!x.hardFail) { killed.add(x.evidence_id); out.push(rec(x.evidence_id, x.key, null, "contradiction", "contradiction")); }
    }
  }
  const survivors = deduped.filter((x) => !killed.has(x.evidence_id));
  const byGroup = new Map<string, Pass[]>();
  for (const x of survivors) {
    const g = alternativeGroupFor(x.key);
    if (!g) continue;
    byGroup.set(g.join("|"), [...(byGroup.get(g.join("|")) ?? []), x]);
  }
  for (const members of byGroup.values()) {
    if (members.length < 2) continue;
    const max = Math.max(...members.map((m) => AUTH_RANK[authorityFor(m.profile)]));
    const top = members.filter((m) => AUTH_RANK[authorityFor(m.profile)] === max);
    if (top.length === 1) {
      for (const m of members) if (m !== top[0]) { killed.add(m.evidence_id); out.push(rec(m.evidence_id, m.key, null, "contradiction", "contradiction")); }
    } else {
      for (const m of top) { killed.add(m.evidence_id); out.push(rec(m.evidence_id, m.key, null, "contradiction", "contradiction_equal_authority")); }
    }
  }
  for (const x of deduped) if (!killed.has(x.evidence_id)) out.push(rec(x.evidence_id, x.key, x.key, null, null));
  return out;
}
