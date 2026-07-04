// Phase 5.1c.5 — Track 0.5 conservative deterministic identity resolver (code-owned IP).
// The LLM PROPOSES candidate identities (+ cites sources); CODE derives the signal booleans
// (Task 6) and THIS resolver decides the winner + confidence. Conservative by design: it resolves a
// domain at high confidence ONLY when signals strongly converge AND beat the runner-up by a margin.
// When in doubt it resolves NOTHING (degrade gracefully) and flags — under-resolving (lose a benefit)
// beats over-resolving (false official classification poisoning Track 2 trust signals).
import type { SupplierIdentity, ResolutionAudit } from "@/lib/research/contracts";
import { canonicalDomain } from "./host";
import { nameMatch } from "./nameMatch";

// A proposed candidate carries code-derivable signals (the LLM never sets these booleans).
export interface IdentityCandidate {
  domain: string | null;
  name_match: boolean;       // domain label matches a vendor-name token (FUZZY/code-derived in Task 6)
  registry_hit: boolean;     // a cited source is registry/government_record profile
  address_consistent: boolean;
  self_identifies: boolean;  // a cited source on this domain is official_company-classified
  entity_name?: string;      // Spec-B — the discovered legal/company name for this candidate (LLM-proposed; resolver ignores it for scoring)
}
export interface ResolveInput { vendor_name: string; vendor_website: string | null; candidates: IdentityCandidate[] }

// Code-owned scoring config (the weights.ts/source_profile.ts pattern — never an LLM or a UI).
const WEIGHTS = { name_match: 2, registry_hit: 2, self_identifies: 2, address_consistent: 1 } as const;
const HIGH_THRESHOLD = 4; // absolute score a candidate must clear to be dominant
const MARGIN = 2;         // and it must beat the runner-up by at least this much

function scoreOf(c: IdentityCandidate): number {
  return (c.name_match ? WEIGHTS.name_match : 0)
    + (c.registry_hit ? WEIGHTS.registry_hit : 0)
    + (c.self_identifies ? WEIGHTS.self_identifies : 0)
    + (c.address_consistent ? WEIGHTS.address_consistent : 0);
}

// The signal names that fired for a candidate (for the resolution_audit dispute record).
function signalsOf(c: IdentityCandidate): string[] {
  const s: string[] = [];
  if (c.name_match) s.push("name_match");
  if (c.registry_hit) s.push("registry_hit");
  if (c.self_identifies) s.push("self_identifies");
  if (c.address_consistent) s.push("address_consistent");
  return s;
}

export function resolveIdentity(input: ResolveInput): SupplierIdentity {
  const { vendor_name, vendor_website, candidates } = input;
  const original_input = { name: vendor_name, website: vendor_website };
  const candidate_domains = candidates.map((c) => c.domain).filter((d): d is string => !!d);
  const registration_signals = candidates.filter((c) => c.registry_hit && c.domain).map((c) => c.domain as string);

  // Fast-path: a parseable website provided → resolve on it, zero research. (An unparseable string
  // falls through to resolution.) ADVISORY sanity check (never blocks): if the host does NOT relate to
  // the vendor name, we STILL resolve on the client's website (pipeline continues) but lower confidence
  // high→medium and attach a visible warning for the reviewer. identity_unconfirmed stays false — this
  // is advisory, not an escalation. Semantic aliases (IBM ↔ ibm.com) will warn (accepted v1 limitation).
  const providedHost = vendor_website ? canonicalDomain(vendor_website) : null;
  if (providedHost) {
    const related = nameMatch(vendor_name, providedHost).match;
    const warnings = related ? [] : [
      `Provided website ${providedHost} does not appear to match the vendor name "${vendor_name}". Using it as supplied, but with lowered confidence — verify the website belongs to this supplier.`,
    ];
    return {
      original_input,
      resolved_name: vendor_name,
      resolved_domain: providedHost,
      candidate_domains,
      registration_signals,
      identity_confidence: related ? "high" : "medium",
      identity_unconfirmed: false,
      resolution_method: "provided",
      resolution_notes: related
        ? `Client provided website ${vendor_website}; resolved_domain = ${providedHost}.`
        : `Client provided website ${vendor_website}; resolved_domain = ${providedHost}. WARNING: host does not match vendor name "${vendor_name}" — advisory confidence lowered, not blocked.`,
      resolution_audit: { winner: providedHost, score: 0, runner_up: null, runner_up_score: 0, matched_by: ["provided"], warnings },
    };
  }

  // No candidates at all → unresolved (degrade as today + flag).
  if (candidates.length === 0) {
    return {
      original_input,
      resolved_name: vendor_name,
      resolved_domain: null,
      candidate_domains,
      registration_signals,
      identity_confidence: "low",
      identity_unconfirmed: true,
      resolution_method: "unresolved",
      resolution_notes: "No candidate identities found for the vendor name; proceeding degraded.",
      resolution_audit: { winner: null, score: 0, runner_up: null, runner_up_score: 0, matched_by: [], warnings: [] },
    };
  }

  // Rank candidates; a winner is DOMINANT only if it clears the absolute threshold AND beats the
  // runner-up by the margin (no "least-bad guess"). The dominance margin — not spelling — separates
  // a silently-normalized typo (one strong candidate) from genuine multi-company ambiguity.
  const ranked = [...candidates].sort((a, b) => scoreOf(b) - scoreOf(a));
  const top = ranked[0];
  const topScore = scoreOf(top);
  const runnerUpScore = ranked.length > 1 ? scoreOf(ranked[1]) : 0;
  const runnerUpDomain = ranked.length > 1 ? (ranked[1].domain ?? null) : null;
  const dominant = !!top.domain && topScore >= HIGH_THRESHOLD && topScore - runnerUpScore >= MARGIN;

  if (dominant) {
    const resolved_domain = canonicalDomain(top.domain as string);
    const audit: ResolutionAudit = { winner: resolved_domain, score: topScore, runner_up: runnerUpDomain, runner_up_score: runnerUpScore, matched_by: signalsOf(top), warnings: [] };
    return {
      original_input,
      resolved_name: vendor_name,
      resolved_domain,
      candidate_domains,
      registration_signals,
      identity_confidence: "high",
      identity_unconfirmed: false,
      resolution_method: "resolved_dominant",
      resolution_notes: `Dominant candidate ${top.domain} (score ${topScore} vs runner-up ${runnerUpScore}).`,
      resolution_audit: audit,
    };
  }

  // Candidates exist but none is dominant → ambiguous: escalate, never guess. Record the near-miss
  // leader + runner-up (winner stays null — nothing was resolved) for future dispute resolution.
  return {
    original_input,
    resolved_name: vendor_name,
    resolved_domain: null,
    candidate_domains,
    registration_signals,
    identity_confidence: "low",
    identity_unconfirmed: true,
    resolution_method: "ambiguous",
    resolution_notes: `No dominant candidate (top score ${topScore}, runner-up ${runnerUpScore}); ${candidate_domains.length} candidate(s) considered.`,
    resolution_audit: { winner: null, score: topScore, runner_up: runnerUpDomain, runner_up_score: runnerUpScore, matched_by: signalsOf(top), warnings: [] },
  };
}
