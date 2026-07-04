import type { TrackContext, SupplierIdentity } from "@/lib/research/contracts";
import { Orchestrator } from "@/lib/research/acquisition/orchestrator";
import { serperPlugin } from "@/lib/research/acquisition/plugins/serper";
import { nativeWebSearchPlugin } from "@/lib/research/acquisition/plugins/nativeWebSearch";
import { runModel } from "@/lib/ai/runModel";
import { buildIdentityRequests, buildDomainIdentityRequests } from "@/lib/research/tracks/track05.queries";
import { buildIdentityPrompt, parseIdentityOutput } from "@/lib/research/identity.prompt";
import { resolveIdentity, type IdentityCandidate } from "@/lib/research/identityResolver";
import { canonicalDomain } from "@/lib/research/host";
import { nameMatch } from "@/lib/research/nameMatch";
import { normalizeBrandToken } from "@/lib/research/source_profile";
import { decideWebsiteAnchored, type EntityResolution } from "@/lib/research/websiteAnchor";
import type { ResearchQuestion } from "@/lib/research/acquisition/types";
import type { RawSource } from "@/lib/research/acquisition/types";

// Phase 5.1c.5 + Spec-B — Track 0.5 Supplier Identity Engine. The client is NOT the source of truth: we
// DISCOVER the real supplier from the signals. A provided website that MATCHES the name is the zero-
// research fast-path; a website that does NOT match the name triggers website-anchored discovery
// (Spec-B); no website → name-discovery. A name/website mismatch is an INTELLIGENCE SIGNAL, never fraud,
// never a verdict/confidence penalty (it lowers input_consistency only).

const REGISTRY_PROFILES = new Set(["registry", "government_record"]);

// Research one subject (a name or a domain) into candidates + a resolveIdentity outcome. Pure boundary
// preserved: the LLM proposes candidates (+ entity_name); CODE derives the signal booleans + resolves.
async function researchEntity(
  ctx: TrackContext, requests: { question: ResearchQuestion; input: string }[], subject: string,
): Promise<{ identity: SupplierIdentity; entityByDomain: Map<string, string>; candidates: IdentityCandidate[]; exactByDomain: Map<string, boolean> }> {
  const orchestrator = new Orchestrator([serperPlugin, nativeWebSearchPlugin]);
  const { pack } = await orchestrator.gather({ case_id: ctx.case_id, track_key: "supplier_identity", requests });

  const byId = new Map<string, RawSource>();
  const promptSources = pack.sources.map((s, idx) => {
    const id = `src_${idx}`;
    byId.set(id, s);
    return { source_id: id, url: s.url, title: s.title, snippet: s.snippet };
  });

  const { system, user } = buildIdentityPrompt(subject, promptSources);
  let proposed: ReturnType<typeof parseIdentityOutput>;
  try {
    const res = await runModel({ task: "track", system, user, temperature: 0 });
    proposed = parseIdentityOutput(res.json);
  } catch {
    proposed = parseIdentityOutput({ _parse_error: true });
  }

  const entityByDomain = new Map<string, string>();
  const exactByDomain = new Map<string, boolean>();
  const candidates: IdentityCandidate[] = proposed.candidates.map((c) => {
    const cited = c.supporting_source_ids.map((id) => byId.get(id)).filter((s): s is RawSource => !!s);
    const nm = nameMatch(subject, c.domain);
    const canonical = canonicalDomain(c.domain);
    if (canonical) { exactByDomain.set(canonical, nm.exact); if (c.entity_name) entityByDomain.set(canonical, c.entity_name); }
    return {
      domain: c.domain,
      name_match: nm.match,
      registry_hit: cited.some((s) => REGISTRY_PROFILES.has(s.provenance.source_profile)),
      self_identifies: cited.some((s) => s.url != null && canonical != null && canonicalDomain(s.url) === canonical),
      address_consistent: false,
      entity_name: c.entity_name,
    };
  });

  const identity = resolveIdentity({ vendor_name: subject, vendor_website: null, candidates });
  return { identity, entityByDomain, candidates, exactByDomain };
}

// Map a resolveIdentity outcome → EntityResolution (did research find a dominant real established entity?).
function toEntityResolution(r: { identity: SupplierIdentity; entityByDomain: Map<string, string> }): EntityResolution {
  const { identity, entityByDomain } = r;
  if (identity.resolved_domain && !identity.identity_unconfirmed && identity.identity_confidence !== "low") {
    const entity = entityByDomain.get(identity.resolved_domain);
    if (entity) return { resolved: true, entity_name: entity, confidence: identity.identity_confidence };
  }
  return { resolved: false, entity_name: null, confidence: "low" };
}

const withConsistency = (identity: SupplierIdentity, resolution_confidence: SupplierIdentity["identity_confidence"], input_consistency: SupplierIdentity["input_consistency"]): SupplierIdentity =>
  ({ ...identity, resolution_confidence, input_consistency, identity_discrepancy: null });

export async function resolveSupplierIdentity(ctx: TrackContext): Promise<SupplierIdentity> {
  const vendor_name = ctx.vendor_name ?? "";
  const providedHost = ctx.vendor_website ? canonicalDomain(ctx.vendor_website) : null;

  // ── Branch 1 — a parseable website that MATCHES the name → zero-research fast-path (unchanged). ──
  if (providedHost && nameMatch(vendor_name, providedHost).match) {
    const identity = resolveIdentity({ vendor_name, vendor_website: ctx.vendor_website, candidates: [] });
    return withConsistency(identity, identity.identity_confidence, "high");
  }

  // ── Spec-B — website present but does NOT match the name → website-anchored discovery. ──
  if (providedHost) {
    const site = await researchEntity(ctx, buildDomainIdentityRequests(providedHost), providedHost);
    const website = toEntityResolution(site);
    const brands = ctx.brands_submitted ?? [];
    const nameIsBrand = brands.map(normalizeBrandToken).filter(Boolean).includes(normalizeBrandToken(vendor_name));

    // Only research the NAME (for the multiple_entities ambiguity check) when the website resolved AND
    // the name is not a brand (rule 3: a brand in the name slot is a client-entry error, not ambiguity).
    let nameRes: EntityResolution | null = null;
    if (website.resolved && !nameIsBrand) {
      nameRes = toEntityResolution(await researchEntity(ctx, buildIdentityRequests(ctx), vendor_name));
    }

    const d = decideWebsiteAnchored({ entered_name: vendor_name, provided_host: providedHost, brands, website, name: nameRes });
    return {
      original_input: { name: vendor_name, website: ctx.vendor_website },
      resolved_name: d.resolved_name,
      resolved_domain: d.resolved_domain,
      candidate_domains: site.candidates.map((c) => c.domain).filter((x): x is string => !!x),
      registration_signals: site.candidates.filter((c) => c.registry_hit && c.domain).map((c) => c.domain as string),
      identity_confidence: d.resolution_confidence, // legacy axis mirrors resolution_confidence
      identity_unconfirmed: d.identity_unconfirmed,
      resolution_method: d.resolution_method,
      resolution_notes: d.resolution_notes,
      resolution_audit: { winner: d.resolved_domain, score: 0, runner_up: null, runner_up_score: 0, matched_by: ["website_anchored"], warnings: [] },
      resolution_confidence: d.resolution_confidence,
      input_consistency: d.input_consistency,
      identity_discrepancy: d.identity_discrepancy,
    };
  }

  // ── No parseable website → existing NAME-discovery path (unchanged). ──
  const r = await researchEntity(ctx, buildIdentityRequests(ctx), vendor_name);
  const identity = r.identity;
  // A dominant winner reached via a FUZZY (non-exact) name match is a silent normalization, not a clean
  // dominant match — relabel the method (point 5). Confidence + escalation unchanged.
  if (identity.resolution_method === "resolved_dominant" && identity.resolved_domain) {
    if (r.exactByDomain.get(identity.resolved_domain) === false) identity.resolution_method = "normalized";
    // Prefer the discovered entity_name as the canonical resolved_name when available.
    const entity = r.entityByDomain.get(identity.resolved_domain);
    if (entity) identity.resolved_name = entity;
  }
  return withConsistency(identity, identity.identity_confidence, "high");
}
