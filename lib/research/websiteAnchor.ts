import type { IdentityDiscrepancy, IdentityDiscrepancyKind } from "@/lib/research/contracts";
import { normalizeBrandToken } from "@/lib/research/source_profile";
import { canonicalDomain } from "@/lib/research/host";

// Spec-B — website-anchored identity DECISION (pure + deterministic; no I/O). track05.ts researches the
// website (and, when needed, the name) into EntityResolution results and calls this to pick the branch.
// FOUNDING PRINCIPLE: the client is NOT the source of truth — we DISCOVER the real supplier entity from
// the signals. A name/website mismatch is an INTELLIGENCE SIGNAL, never a validation error, never fraud.
// Decision-7 correction: the website is authoritative ONLY when it is overwhelmingly dominant; if the name
// ALSO resolves a different legitimate entity, ESCALATE — never silently pick.

// The outcome of researching one signal (website OR name) into its real entity.
export interface EntityResolution {
  resolved: boolean;             // did research find a DOMINANT, real, established entity?
  entity_name: string | null;   // the discovered entity name (null when unresolved)
  confidence: "high" | "medium" | "low";
  // SB-2 (SO-1) — the resolved entity's domain, the comparator's identity anchor. Pre-SB-2 this was
  // dropped by toEntityResolution, so the ambiguity check could not see that the name and website
  // resolved the SAME domain (the TD Synexx false-ambiguity root cause). null = unresolved.
  resolved_domain: string | null;
}

export interface WebsiteAnchorInput {
  entered_name: string;
  provided_host: string;         // canonicalDomain(vendor_website)
  brands: string[];
  website: EntityResolution;     // resolution of the PROVIDED WEBSITE's entity (the anchor)
  name: EntityResolution | null; // resolution of the ENTERED NAME's entity (for the ambiguity check); null if not researched
}

export interface WebsiteAnchorDecision {
  outcome: "resolve_from_website" | "escalate";
  resolved_name: string;
  resolved_domain: string | null;
  resolution_method: "resolved_from_website" | "ambiguous" | "unresolved";
  resolution_confidence: "high" | "medium" | "low"; // WHO the supplier is
  input_consistency: "high" | "medium" | "low";     // how consistent the client's input was (low on mismatch)
  identity_unconfirmed: boolean;                     // escalation only — NEVER a fraud/verdict penalty
  identity_discrepancy: IdentityDiscrepancy;
  resolution_notes: string;
}

// Plain client-facing copy — NO track/internal jargon (Spec-B Decision 6).
// SB-2 (SO-3) — `nameEntity` (the name-side resolution) is threaded for multiple_entities only,
// where the ruled copy names BOTH entities (founder signature-extension approval, 2026-07-10).
export function clientNote(kind: IdentityDiscrepancyKind, entered: string, resolved: string, nameEntity?: string): string {
  switch (kind) {
    case "name_is_brand":
    case "name_website_mismatch":
      return `Identity clarification: You entered "${entered}" as the supplier. Our investigation found that the website provided belongs to ${resolved}. This report's analysis is based on ${resolved}. If this was not your intended supplier, please contact us before relying on the findings.`;
    // SB-2 (SO-3, OQ-B founder-ruled exact copy 2026-07-10) — an EARNED finding stated unhedged
    // (post-SB-2 this fires only on two dominant resolutions across two distinct domains), about
    // the INPUTS, with the precise denial: a finding ABOUT them (they differ), never AGAINST anyone.
    case "multiple_entities":
      return nameEntity
        ? `Identity clarification: The supplier name "${entered}" resolves to ${nameEntity} in public sources, while the website you provided belongs to ${resolved}. Our research found these to be two different businesses, and we could not determine which is your intended supplier. This reflects what we found about the two inputs you provided — it is not a finding against either business. Please contact us to confirm your intended supplier before relying on the findings.`
        : `Identity clarification: The supplier name "${entered}" and the website you provided each resolve to a different business in public sources, and we could not determine which is your intended supplier. This reflects what we found about the two inputs you provided — it is not a finding against either business. Please contact us to confirm your intended supplier before relying on the findings.`;
    // SB-1 (SO-3, OQ-B founder-ruled exact copy 2026-07-09) — states OUR limitation, never a
    // conclusion about the supplier or its website; the re-verify offer turns a limitation into a
    // service action. The enum value stays `website_dead` (frozen records reference it) — only the
    // client-facing presentation changed, for NEW attempts.
    case "website_dead":
      return `Identity clarification: In this pass, we were unable to independently verify the website associated with "${entered}" from public sources. This reflects a limit of our verification in this investigation, not a finding about the supplier or its website. If you can confirm the supplier's official website, contact us and we will re-verify.`;
    default:
      return `Identity clarification: please confirm the intended supplier for "${entered}" before relying on the findings.`;
  }
}

const norm = (s: string) => normalizeBrandToken(s);

// SB-2 (SO-2) — corporate-suffix-normalized entity-name comparison. FALLBACK TIER ONLY: it decides
// sameness solely when a resolved entity carries no domain (defensive — toEntityResolution always
// supplies one). Per OQ-A, when domains are PRESENT they decide alone: "domain evidence beats name
// evidence, always; names speak only when domains are silent." Trailing suffixes strip repeatedly
// ("Acme Co Ltd" → "Acme"); never strips a name to nothing (a company literally named "Limited").
const CORPORATE_SUFFIXES = new Set([
  "corporation", "corp", "incorporated", "inc", "llc", "ltd", "limited", "company", "co",
  "gmbh", "plc", "llp", "lp", "sa", "srl", "bv", "pty", "pvt",
]);
export function entityNameMatch(a: string, b: string): boolean {
  const strip = (s: string) => {
    const tokens = s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    while (tokens.length > 1 && CORPORATE_SUFFIXES.has(tokens[tokens.length - 1])) tokens.pop();
    return tokens.join("");
  };
  const sa = strip(a), sb = strip(b);
  return !!sa && !!sb && sa === sb;
}

export function decideWebsiteAnchored(input: WebsiteAnchorInput): WebsiteAnchorDecision {
  const { entered_name, provided_host, brands, website, name } = input;
  const nameIsBrand = brands.map(norm).filter(Boolean).includes(norm(entered_name));

  const escalate = (kind: IdentityDiscrepancyKind, resolved_name: string, nameEntity?: string): WebsiteAnchorDecision => ({
    outcome: "escalate",
    resolved_name,
    resolved_domain: null,
    resolution_method: kind === "multiple_entities" ? "ambiguous" : "unresolved",
    resolution_confidence: "low",
    input_consistency: "low",
    identity_unconfirmed: true, // existing conservative escalation path — NOT fraud
    identity_discrepancy: { kind, entered_name, resolved_name, resolved_domain: null, client_note: clientNote(kind, entered_name, resolved_name, nameEntity) },
    resolution_notes: `Name/website mismatch (${kind}) → escalated to manual review. Never a fraud flag.`,
  });

  // 2c — the website did not resolve to a real established entity (dead/parked/no dominant entity).
  if (!website.resolved || !website.entity_name) return escalate("website_dead", entered_name);

  // 2b — the NAME also resolved its own entity: SB-2 domain-first comparator (SO-2, OQ-A).
  // Same domain ⇒ same entity (kills the TD Synexx same-entity false ambiguity — the variant name
  // string is irrelevant when both sides resolved the anchor itself). Different domains ⇒ escalate,
  // and a name-string match does NOT override the conflict (two dominant domains = two candidate
  // identities = the lookalike/impersonation shape — a human decides). Suffix-normalized name
  // equality decides ONLY in the defensive domain-absent case. SKIPPED when the name is a brand
  // (rule 3: that's a client-entry error). One-directional narrowing (SO-2 condition 1): every case
  // leaving this escalation falls through to 2a, which ALWAYS carries the mismatch disclosure note.
  if (!nameIsBrand && name?.resolved && name.entity_name) {
    const nameDomain = name.resolved_domain ? canonicalDomain(name.resolved_domain) : null;
    const sameEntity = nameDomain !== null
      ? nameDomain === canonicalDomain(provided_host)
      : entityNameMatch(name.entity_name, website.entity_name);
    if (!sameEntity) return escalate("multiple_entities", website.entity_name, name.entity_name);
  }

  // 2a / rule 3 — the website is the dominant real entity → RESOLVE FROM THE WEBSITE.
  const kind: IdentityDiscrepancyKind = nameIsBrand ? "name_is_brand" : "name_website_mismatch";
  return {
    outcome: "resolve_from_website",
    resolved_name: website.entity_name,
    resolved_domain: provided_host,
    resolution_method: "resolved_from_website",
    resolution_confidence: website.confidence, // high — we know WHO the supplier is
    input_consistency: "low",                  // the client mislabeled the name (informational only)
    identity_unconfirmed: false,               // NO verdict/confidence penalty
    identity_discrepancy: { kind, entered_name, resolved_name: website.entity_name, resolved_domain: provided_host, client_note: clientNote(kind, entered_name, website.entity_name) },
    resolution_notes: `Name/website mismatch (${kind}); resolved from website ${provided_host} → "${website.entity_name}". input_consistency lowered — not a penalty; identity holds.`,
  };
}
