import type { TrackKey } from "@/lib/constants/tracks";
import type { SourceProfile, AuthorityScore } from "@/lib/research/source_profile";
import { authorityFor } from "@/lib/research/source_profile";
import { weightFor, weightKeyExistsInAnyTrack, alternativeGroupFor } from "@/lib/research/weights";
import type { WeightValidation, ValidationGate, RejectionReason } from "@/lib/research/contracts";

// Firewall version (independent of the Evidence Pack schema_version). Bump on gate / ALLOWED_PROFILES
// / MIN_AUTHORITY / contradiction-rule changes — NOT when a weight_key is added to the registry.
// 1.1.0 (2026-06-28): provenance gate now accepts when ANY cited source matches an allowed profile
// (was: highest-authority cited source only); + Track 2 ALLOWED_PROFILES corrections (ADR-T2-001 area).
export const VALIDATION_VERSION = "1.1.0";

// ── Gate config (code-owned trust rules; same pattern as weights.ts / source_profile.ts) ──
const ALLOWED_PROFILES: Record<string, SourceProfile[]> = {
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
};
const MIN_AUTHORITY: Record<string, AuthorityScore> = {
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
};
// Authority gate (⑤) runs ONLY for variable-trust profiles; fixed-trust profiles skip it (no audit
// entry) because authority is already implied by provenance. 'inference' has no external source → skip.
const VARIABLE_TRUST_PROFILES: SourceProfile[] = ["news", "forum", "social", "marketplace", "user_upload"];
const AUTH_RANK: Record<AuthorityScore, number> = { low: 0, medium: 1, high: 2 };

export interface ProposedMapping { evidence_id: string; proposed_weight_key: string; cited_source_ids: string[] }
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
    const sourceId = matching.reduce((best, id) =>
      AUTH_RANK[authorityFor(sourceProfileById[id])] > AUTH_RANK[authorityFor(sourceProfileById[best])] ? id : best);
    const profile = sourceProfileById[sourceId];
    if (VARIABLE_TRUST_PROFILES.includes(profile)) {
      if (AUTH_RANK[authorityFor(profile)] < AUTH_RANK[MIN_AUTHORITY[key] ?? "low"]) { out.push(rec(p.evidence_id, key, null, "authority", "authority")); continue; }
    } // fixed-trust profiles skip authority (no audit entry)
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
