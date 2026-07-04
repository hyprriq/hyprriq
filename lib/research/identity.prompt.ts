// Phase 5.1c.5 — Track 0.5 candidate-proposal prompt + tolerant parser. The LLM PROPOSES candidate
// business identities for a vendor name (each a { domain, registration_hint, address_hint } citing
// pack source_id(s)); it never sets the resolver's signal booleans — CODE (track05.ts Task 6) derives
// name_match/registry_hit/self_identifies from the cited sources' profiles + the domain vs the name.
// Pack-only (no browsing), honest UNKNOWN, never invent — same LLM↔code boundary as the firewall.

export interface PackSourceForPrompt { source_id: string; url: string | null; title: string; snippet: string }
export interface ProposedCandidate {
  domain: string;
  entity_name: string;   // Spec-B — the company's legal/operating name for this domain (e.g. "Global Distribution LLC")
  registration_hint: string;
  address_hint: string;
  supporting_source_ids: string[];
}
export interface ParsedIdentity { candidates: ProposedCandidate[]; reasoning_notes: string }

export function buildIdentityPrompt(vendor_name: string | null, sources: PackSourceForPrompt[]): { system: string; user: string } {
  const system = [
    "You are a supplier-identity analyst for a vendor due-diligence platform.",
    "You are given an Evidence Pack of PRE-COLLECTED sources. Do NOT browse or search — reason ONLY over the pack.",
    "Propose candidate business identities for the given vendor name OR website. Each candidate is the official web",
    "domain of a real company PLUS its entity_name (the company's legal/operating name, e.g. 'Global Distribution LLC'),",
    "a registration_hint and address_hint, and MUST cite the supporting source_id(s) from the pack.",
    "If multiple genuinely-distinct companies share the name, propose each as a separate candidate (the platform decides",
    "ambiguity). Do NOT invent domains, entity names, registrations, or addresses — if the pack does not support a",
    "candidate, omit it. An honest empty list beats a fabricated identity the resolver would have to escalate anyway.",
    "Return STRICT JSON: { candidates: [{ domain, entity_name, registration_hint, address_hint, supporting_source_ids }],",
    "reasoning_notes }.",
  ].join("\n");
  const packLines = sources.map((s) => `- ${s.source_id}: ${s.title} (${s.url ?? "no-url"}) — ${s.snippet}`).join("\n");
  const user = [
    `Vendor name (as the client typed it, possibly with typos): ${vendor_name ?? "unknown"}`,
    "Evidence Pack:", packLines || "(empty)",
  ].join("\n");
  return { system, user };
}

export function parseIdentityOutput(json: unknown): ParsedIdentity {
  const o = (json ?? {}) as { candidates?: unknown; reasoning_notes?: unknown; _parse_error?: boolean };
  if (!o || typeof o !== "object" || o._parse_error || !Array.isArray(o.candidates)) {
    return { candidates: [], reasoning_notes: typeof o?.reasoning_notes === "string" ? o.reasoning_notes : "" };
  }
  const candidates: ProposedCandidate[] = [];
  for (const raw of o.candidates as Record<string, unknown>[]) {
    if (typeof raw?.domain !== "string" || !raw.domain.trim()) continue; // a candidate without a usable domain is unusable
    candidates.push({
      domain: raw.domain.trim(),
      entity_name: typeof raw.entity_name === "string" ? raw.entity_name.trim() : "",
      registration_hint: typeof raw.registration_hint === "string" ? raw.registration_hint : "",
      address_hint: typeof raw.address_hint === "string" ? raw.address_hint : "",
      supporting_source_ids: Array.isArray(raw.supporting_source_ids)
        ? raw.supporting_source_ids.filter((x): x is string => typeof x === "string") : [],
    });
  }
  return { candidates, reasoning_notes: typeof o.reasoning_notes === "string" ? o.reasoning_notes : "" };
}
