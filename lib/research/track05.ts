import type { TrackContext, SupplierIdentity, ResolutionResearchRecord } from "@/lib/research/contracts";
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
// SB-1 (SO-1) — `mode` selects the subject-match derivation: in NAME mode a candidate matches via the
// fuzzy name↔label matcher; in DOMAIN mode the subject IS a domain, so "matches the subject" means
// anchor IDENTITY (canonicalDomain equality). The fuzzy matcher structurally fails on a domain subject
// (TLD-included subject vs TLD-stripped label = 3 edits vs tolerance 2 — the confirmed root cause of
// the tdsynnex/globaldist website_dead false negatives). Dominance must still be EARNED: anchor
// identity alone scores 2 < HIGH_THRESHOLD 4; registry_hit / self_identifies stay code-derived from
// cited sources. resolveIdentity (weights/threshold/margin) is untouched — fix the signal, not the logic.
async function researchEntity(
  ctx: TrackContext, requests: { question: ResearchQuestion; input: string }[], subject: string,
  mode: "name" | "domain",
): Promise<{ identity: SupplierIdentity; entityByDomain: Map<string, string>; candidates: IdentityCandidate[]; exactByDomain: Map<string, boolean>; research: { subject: string; sources: number; llm_failed: boolean } }> {
  const orchestrator = new Orchestrator([serperPlugin, nativeWebSearchPlugin]);
  const { pack } = await orchestrator.gather({ case_id: ctx.case_id, track_key: "supplier_identity", requests });

  const byId = new Map<string, RawSource>();
  const promptSources = pack.sources.map((s, idx) => {
    const id = `src_${idx}`;
    byId.set(id, s);
    return { source_id: id, url: s.url, title: s.title, snippet: s.snippet };
  });

  // SB-1 (SO-2) — H2's llm_failed discipline for the resolver: a thrown model call OR unparseable
  // output is a recorded STATE, never silently "no candidates"; an empty pack means we could not
  // research at all, so the model is never asked to reason over nothing (sources: 0 records it).
  let llmFailed = false;
  let proposed: ReturnType<typeof parseIdentityOutput>;
  if (pack.sources.length === 0) {
    proposed = parseIdentityOutput({ candidates: [] });
  } else {
    const { system, user } = buildIdentityPrompt(subject, promptSources);
    try {
      const res = await runModel({ task: "track", system, user, temperature: 0 });
      const o = res.json as { candidates?: unknown; _parse_error?: boolean } | null;
      llmFailed = !o || typeof o !== "object" || o._parse_error === true || !Array.isArray(o.candidates);
      proposed = parseIdentityOutput(res.json);
    } catch {
      llmFailed = true;
      proposed = parseIdentityOutput({ _parse_error: true });
    }
  }

  const anchor = mode === "domain" ? canonicalDomain(subject) : null;
  const entityByDomain = new Map<string, string>();
  const exactByDomain = new Map<string, boolean>();
  const candidates: IdentityCandidate[] = proposed.candidates.map((c) => {
    const cited = c.supporting_source_ids.map((id) => byId.get(id)).filter((s): s is RawSource => !!s);
    const canonical = canonicalDomain(c.domain);
    const isAnchor = !!anchor && !!canonical && canonical === anchor;
    const nm = mode === "domain" ? { match: isAnchor, exact: isAnchor } : nameMatch(subject, c.domain);
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
  return { identity, entityByDomain, candidates, exactByDomain, research: { subject, sources: pack.sources.length, llm_failed: llmFailed } };
}

// SB-1 (SO-2, OQ-A ruling) — the research-failure identity: unresolved + escalated with a truthful
// internal reason and NO identity_discrepancy. An infra failure is OURS — it never becomes a
// client-facing claim about the supplier or its website (never a website_dead); the truth lives
// admin-side in resolution_notes + resolution_research, and manual review resolves before delivery.
const researchFailureIdentity = (
  vendor_name: string, vendor_website: string | null,
  resolution_research: ResolutionResearchRecord[], notes: string,
): SupplierIdentity => ({
  original_input: { name: vendor_name, website: vendor_website },
  resolved_name: vendor_name,
  resolved_domain: null,
  candidate_domains: [],
  registration_signals: [],
  identity_confidence: "low",
  identity_unconfirmed: true, // existing conservative escalation routing (manual_override_required)
  resolution_method: "unresolved",
  resolution_notes: notes,
  resolution_audit: { winner: null, score: 0, runner_up: null, runner_up_score: 0, matched_by: [], warnings: [] },
  resolution_confidence: "low",
  input_consistency: "low",
  identity_discrepancy: null, // OQ-A: no client note — our failure, not a supplier signal
  resolution_research,
});

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

  // ── Branch 1 — a parseable website that EXACTLY matches the name → zero-research fast-path. ──
  // H4 (SO-1): exact match only. A FUZZY near-miss (a client typo — or a DIFFERENT company one
  // letter away: Medline vs medlink.com) must not silently bind with high confidence; it falls
  // through to the Spec-B website-anchored discovery below, which resolves the real entity and
  // records the input-consistency signal (never fraud, never a verdict penalty).
  if (providedHost && nameMatch(vendor_name, providedHost).exact) {
    const identity = resolveIdentity({ vendor_name, vendor_website: ctx.vendor_website, candidates: [] });
    return { ...withConsistency(identity, identity.identity_confidence, "high"), resolution_research: [] };
  }

  // ── Spec-B — website present but does NOT match the name → website-anchored discovery. ──
  if (providedHost) {
    const site = await researchEntity(ctx, buildDomainIdentityRequests(providedHost), providedHost, "domain");
    const research: ResolutionResearchRecord[] = [{ role: "website", ...site.research }];
    // SB-1 (SO-2, OQ-A) — research failure is OUR state, never a website finding: no website_dead,
    // no client note; escalate for a human with the truthful reason recorded.
    if (site.research.llm_failed || site.research.sources === 0) {
      return researchFailureIdentity(vendor_name, ctx.vendor_website, research, site.research.llm_failed
        ? `Identity research model call failed for the provided website ${providedHost} — resolution not attempted; escalated (never a website finding).`
        : `Identity research produced no sources for the provided website ${providedHost} — could not research; escalated (never a website finding).`);
    }
    const website = toEntityResolution(site);
    const brands = ctx.brands_submitted ?? [];
    const nameIsBrand = brands.map(normalizeBrandToken).filter(Boolean).includes(normalizeBrandToken(vendor_name));

    // Only research the NAME (for the multiple_entities ambiguity check) when the website resolved AND
    // the name is not a brand (rule 3: a brand in the name slot is a client-entry error, not ambiguity).
    let nameRes: EntityResolution | null = null;
    if (website.resolved && !nameIsBrand) {
      const nr = await researchEntity(ctx, buildIdentityRequests(ctx), vendor_name, "name");
      research.push({ role: "name", ...nr.research });
      // SB-1 (OQ-C) — the ambiguity check could not run → we can neither confirm nor rule out
      // multiple_entities: escalate, never fail open past a guard (the H7 OQ-A precedent).
      if (nr.research.llm_failed || nr.research.sources === 0) {
        return researchFailureIdentity(vendor_name, ctx.vendor_website, research,
          `Website ${providedHost} resolved, but the name ambiguity check could not run (${nr.research.llm_failed ? "identity research model call failed" : "no sources"}) — escalated; never auto-pick.`);
      }
      nameRes = toEntityResolution(nr);
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
      resolution_research: research,
    };
  }

  // ── No parseable website → existing NAME-discovery path (unchanged decision; failures recorded). ──
  const r = await researchEntity(ctx, buildIdentityRequests(ctx), vendor_name, "name");
  const identity = r.identity;
  // SB-1 (SO-2) — the path already escalates as "unresolved" on failure; the NOTES must now be
  // truthful ("we could not research" ≠ "we researched and found nothing").
  if (r.research.llm_failed) {
    identity.resolution_notes = "Identity research model call failed — resolution not attempted; proceeding degraded (unresolved).";
  } else if (r.research.sources === 0) {
    identity.resolution_notes = "Identity research produced no sources — could not research; proceeding degraded (unresolved).";
  }
  // A dominant winner reached via a FUZZY (non-exact) name match is a silent normalization, not a clean
  // dominant match — relabel the method (point 5). Confidence + escalation unchanged.
  if (identity.resolution_method === "resolved_dominant" && identity.resolved_domain) {
    if (r.exactByDomain.get(identity.resolved_domain) === false) identity.resolution_method = "normalized";
    // Prefer the discovered entity_name as the canonical resolved_name when available.
    const entity = r.entityByDomain.get(identity.resolved_domain);
    if (entity) identity.resolved_name = entity;
  }
  return { ...withConsistency(identity, identity.identity_confidence, "high"), resolution_research: [{ role: "name", ...r.research }] };
}
