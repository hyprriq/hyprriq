import type { IdentityDiscrepancy, IdentityDiscrepancyKind } from "@/lib/research/contracts";
import { normalizeBrandToken } from "@/lib/research/source_profile";

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
export function clientNote(kind: IdentityDiscrepancyKind, entered: string, resolved: string): string {
  switch (kind) {
    case "name_is_brand":
    case "name_website_mismatch":
      return `Identity clarification: You entered "${entered}" as the supplier. Our investigation found that the website provided belongs to ${resolved}. This report's analysis is based on ${resolved}. If this was not your intended supplier, please contact us before relying on the findings.`;
    case "multiple_entities":
      return `Identity clarification: The supplier name "${entered}" and the website you provided appear to refer to different businesses. We could not confirm which is your intended supplier — please contact us to confirm before relying on the findings.`;
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

export function decideWebsiteAnchored(input: WebsiteAnchorInput): WebsiteAnchorDecision {
  const { entered_name, provided_host, brands, website, name } = input;
  const nameIsBrand = brands.map(norm).filter(Boolean).includes(norm(entered_name));

  const escalate = (kind: IdentityDiscrepancyKind, resolved_name: string): WebsiteAnchorDecision => ({
    outcome: "escalate",
    resolved_name,
    resolved_domain: null,
    resolution_method: kind === "multiple_entities" ? "ambiguous" : "unresolved",
    resolution_confidence: "low",
    input_consistency: "low",
    identity_unconfirmed: true, // existing conservative escalation path — NOT fraud
    identity_discrepancy: { kind, entered_name, resolved_name, resolved_domain: null, client_note: clientNote(kind, entered_name, resolved_name) },
    resolution_notes: `Name/website mismatch (${kind}) → escalated to manual review. Never a fraud flag.`,
  });

  // 2c — the website did not resolve to a real established entity (dead/parked/no dominant entity).
  if (!website.resolved || !website.entity_name) return escalate("website_dead", entered_name);

  // 2b — the NAME also resolves to a DIFFERENT legitimate entity → genuinely ambiguous → escalate,
  //      never auto-pick. SKIPPED when the name is a brand (rule 3: that's a client-entry error).
  if (!nameIsBrand && name?.resolved && name.entity_name && norm(name.entity_name) !== norm(website.entity_name)) {
    return escalate("multiple_entities", website.entity_name);
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
