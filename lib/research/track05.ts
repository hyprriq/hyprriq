import type { TrackContext, SupplierIdentity } from "@/lib/research/contracts";
import { Orchestrator } from "@/lib/research/acquisition/orchestrator";
import { serperPlugin } from "@/lib/research/acquisition/plugins/serper";
import { nativeWebSearchPlugin } from "@/lib/research/acquisition/plugins/nativeWebSearch";
import { runModel } from "@/lib/ai/runModel";
import { buildIdentityRequests } from "@/lib/research/tracks/track05.queries";
import { buildIdentityPrompt, parseIdentityOutput } from "@/lib/research/identity.prompt";
import { resolveIdentity, type IdentityCandidate } from "@/lib/research/identityResolver";
import { canonicalDomain, domainLabel, hostOf } from "@/lib/research/host";
import { normalizeBrandToken } from "@/lib/research/source_profile";
import type { RawSource } from "@/lib/research/acquisition/types";

// Phase 5.1c.5 — Track 0.5 stage entry. Resolves the supplier's identity ONCE: a provided website is
// the zero-research high-confidence fast-path; otherwise it runs identity-discovery research, has the
// LLM PROPOSE candidates, then CODE derives the resolver's signal booleans (the LLM never sets them).
// The conservative deterministic resolveIdentity() decides the winner + confidence.

// Levenshtein edit distance (small strings; pure + deterministic).
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[n];
}

// FUZZY name match between the vendor name and a candidate domain label (point 1/5): a one-character
// typo ("TD Synexx" vs tdsynnex) still matches, so typos resolve silently rather than look ambiguous.
// `exact` distinguishes a clean match (resolved_dominant) from a normalized one (typo/alias).
function nameMatch(vendorName: string, domain: string): { match: boolean; exact: boolean } {
  const name = normalizeBrandToken(vendorName);
  const label = normalizeBrandToken(domainLabel(hostOf(domain) ?? domain));
  if (!name || !label) return { match: false, exact: false };
  if (name === label) return { match: true, exact: true };
  const tolerance = Math.max(1, Math.floor(Math.min(name.length, label.length) * 0.25));
  return { match: levenshtein(name, label) <= tolerance, exact: false };
}

const REGISTRY_PROFILES = new Set(["registry", "government_record"]);

export async function resolveSupplierIdentity(ctx: TrackContext): Promise<SupplierIdentity> {
  const vendor_name = ctx.vendor_name ?? "";

  // Fast-path: a parseable website was provided → high-confidence, zero research (no model/orchestrator).
  if (ctx.vendor_website && hostOf(ctx.vendor_website)) {
    return resolveIdentity({ vendor_name, vendor_website: ctx.vendor_website, candidates: [] });
  }

  // Discovery path: research the vendor name, let the LLM propose candidates, derive signals in code.
  const requests = buildIdentityRequests(ctx);
  const orchestrator = new Orchestrator([serperPlugin, nativeWebSearchPlugin]);
  const { pack } = await orchestrator.gather({ case_id: ctx.case_id, track_key: "supplier_identity", requests });

  const byId = new Map<string, RawSource>();
  const promptSources = pack.sources.map((s, idx) => {
    const id = `src_${idx}`;
    byId.set(id, s);
    return { source_id: id, url: s.url, title: s.title, snippet: s.snippet };
  });

  const { system, user } = buildIdentityPrompt(ctx.vendor_name, promptSources);
  let proposed: ReturnType<typeof parseIdentityOutput>;
  try {
    const res = await runModel({ task: "track", system, user, temperature: 0 });
    proposed = parseIdentityOutput(res.json);
  } catch {
    proposed = parseIdentityOutput({ _parse_error: true });
  }

  // Code-derive each candidate's signal booleans from the cited sources (boundary: LLM proposes, code decides).
  const exactByDomain = new Map<string, boolean>();
  const candidates: IdentityCandidate[] = proposed.candidates.map((c) => {
    const cited = c.supporting_source_ids.map((id) => byId.get(id)).filter((s): s is RawSource => !!s);
    const nm = nameMatch(vendor_name, c.domain);
    const canonical = canonicalDomain(c.domain);
    if (canonical) exactByDomain.set(canonical, nm.exact);
    return {
      domain: c.domain,
      name_match: nm.match,
      registry_hit: cited.some((s) => REGISTRY_PROFILES.has(s.provenance.source_profile)),
      // self-identifies: a cited source lives on the candidate's own domain (official_company by host,
      // or any on-domain corroborating source — vendorHost isn't known yet during discovery).
      self_identifies: cited.some((s) => s.url != null && canonical != null && canonicalDomain(s.url) === canonical),
      address_consistent: false, // conservative this phase — address cross-checking deferred (under-resolve > over-resolve)
    };
  });

  const identity = resolveIdentity({ vendor_name, vendor_website: ctx.vendor_website, candidates });

  // A dominant winner resolved via a FUZZY (non-exact) name match is a silent normalization (typo/alias),
  // not a clean dominant match — relabel the method (point 5). Confidence + escalation are unchanged.
  if (identity.resolution_method === "resolved_dominant" && identity.resolved_domain) {
    const wasExact = exactByDomain.get(identity.resolved_domain);
    if (wasExact === false) identity.resolution_method = "normalized";
  }
  return identity;
}
