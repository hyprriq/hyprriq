// Phase 5.1c.5 — Track 0.5 conservative deterministic identity resolver (code-owned IP).
// The LLM PROPOSES candidate identities (+ cites sources); CODE derives the signal booleans
// (Task 6) and THIS resolver decides the winner + confidence. Conservative by design: it resolves a
// domain at high confidence ONLY when signals strongly converge AND beat the runner-up by a margin.
// When in doubt it resolves NOTHING (degrade gracefully) and flags — under-resolving (lose a benefit)
// beats over-resolving (false official classification poisoning Track 2 trust signals).
import type { SupplierIdentity } from "@/lib/research/contracts";
import { hostOf } from "./host";

// A proposed candidate carries code-derivable signals (the LLM never sets these booleans).
export interface IdentityCandidate {
  domain: string | null;
  name_match: boolean;       // domain label matches a vendor-name token (FUZZY/code-derived in Task 6)
  registry_hit: boolean;     // a cited source is registry/government_record profile
  address_consistent: boolean;
  self_identifies: boolean;  // a cited source on this domain is official_company-classified
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

// Canonical resolved domain = tolerant host parse, www-stripped (tdsynnex.com, not www.tdsynnex.com).
// The classifier re-normalizes via domainLabel downstream, so this is purely the canonical audit form.
function canonicalDomain(value: string): string | null {
  const host = hostOf(value);
  return host ? host.replace(/^www\./, "") : null;
}

export function resolveIdentity(input: ResolveInput): SupplierIdentity {
  const { vendor_name, vendor_website, candidates } = input;
  const original_input = { name: vendor_name, website: vendor_website };
  const candidate_domains = candidates.map((c) => c.domain).filter((d): d is string => !!d);
  const registration_signals = candidates.filter((c) => c.registry_hit && c.domain).map((c) => c.domain as string);

  // Fast-path: a parseable website provided → high-confidence, zero research. Behaviorally identical
  // to today when a client gives a website. (An unparseable string falls through to resolution.)
  const providedHost = vendor_website ? canonicalDomain(vendor_website) : null;
  if (providedHost) {
    return {
      original_input,
      resolved_name: vendor_name,
      resolved_domain: providedHost,
      candidate_domains,
      registration_signals,
      identity_confidence: "high",
      identity_unconfirmed: false,
      resolution_method: "provided",
      resolution_notes: `Client provided website ${vendor_website}; resolved_domain = ${providedHost}.`,
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
    };
  }

  // Rank candidates; a winner is DOMINANT only if it clears the absolute threshold AND beats the
  // runner-up by the margin (no "least-bad guess"). The dominance margin — not spelling — separates
  // a silently-normalized typo (one strong candidate) from genuine multi-company ambiguity.
  const ranked = [...candidates].sort((a, b) => scoreOf(b) - scoreOf(a));
  const top = ranked[0];
  const topScore = scoreOf(top);
  const runnerUpScore = ranked.length > 1 ? scoreOf(ranked[1]) : 0;
  const dominant = !!top.domain && topScore >= HIGH_THRESHOLD && topScore - runnerUpScore >= MARGIN;

  if (dominant) {
    const resolved_domain = canonicalDomain(top.domain as string);
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
    };
  }

  // Candidates exist but none is dominant → ambiguous: escalate, never guess.
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
  };
}
