import type { TrackContext, TrackOutput, EvidenceItem } from "@/lib/research/contracts";
import { Orchestrator } from "@/lib/research/acquisition/orchestrator";
import { serperPlugin } from "@/lib/research/acquisition/plugins/serper";
import { nativeWebSearchPlugin } from "@/lib/research/acquisition/plugins/nativeWebSearch";
import { persistEvidencePack, persistAcquisitionMetrics } from "@/lib/data/acquisition";
import { runModel } from "@/lib/ai/runModel";
import { buildTrack2Requests } from "@/lib/research/tracks/track2.queries";
import { buildTrack2Prompt, parseTrack2Output } from "@/lib/research/track2.prompt";
import { validateWeights, VALIDATION_VERSION } from "@/lib/research/weightValidation";
import { deriveTrackSignal } from "@/lib/research/signals";
import { buildValidationReport, type ReportAccepted, type ReportRejected } from "@/lib/research/track1.report";
import { EVIDENCE_PACK_SCHEMA_VERSION } from "@/lib/research/acquisition/pack";
import type { RawSource } from "@/lib/research/acquisition/types";
import { normalizeBrandToken, type SourceProfile } from "@/lib/research/source_profile";
import { IDENTITY_SCOPE_NOTE, AUTHORIZATION_SCOPE_NOTE, MARKETPLACE_ELIGIBILITY_DISCLAIMER } from "@/lib/research/track2.disclaimers";
import { containsProcurementLanguage } from "@/lib/research/procurementLanguage";

// Track 2 — Supply Chain Relationship. Mirrors Track 1: the orchestrator acquires (per vendor×brand);
// the LLM proposes; the firewall decides; deriveTrackSignal (unchanged) scores. Evidence is
// brand-isolated. LOA is excluded (ADR-T2-001): not a proposable key, firewall-rejected if proposed,
// and dropped here pre-scoring as a deterministic backstop.
export async function runTrack2(ctx: TrackContext): Promise<TrackOutput> {
  const requests = buildTrack2Requests(ctx);
  const orchestrator = new Orchestrator([serperPlugin, nativeWebSearchPlugin]);
  // Official-domain metadata so the classifier tags the brand's own pages official_brand and the
  // vendor's own pages official_company (instead of defaulting to "news"). Drives the provenance gate.
  const classification = {
    // Phase 5.1c.5 — prefer the Track 0.5 resolved domain (high-confidence identity); fall back to the
    // raw website so behavior is unchanged when an identity wasn't resolved. (Track 1 still uses vendor_website.)
    vendorHost: ctx.supplier_identity?.resolved_domain ?? ctx.vendor_website,
    brandTokens: (ctx.brands_submitted ?? []).map(normalizeBrandToken).filter(Boolean),
  };
  const { pack, metrics } = await orchestrator.gather({ case_id: ctx.case_id, track_key: "supply_chain_relationship", requests, classification });
  // H2 — pack = frozen input-of-record: persist failure throws (step retries); metrics non-fatal.
  const packRes = await persistEvidencePack(pack, ctx.attempt_number ?? 1);
  if (packRes.error) throw new Error(`evidence pack persist failed: ${packRes.error}`);
  const metricsRes = await persistAcquisitionMetrics(ctx.case_id, "supply_chain_relationship", metrics);
  if (metricsRes.error) console.error(`[track2] metrics persist failed (non-fatal): ${metricsRes.error}`);

  const provider_usage = metrics.map((m) => ({ plugin: m.plugin_id, latency_ms: m.latency_ms, api_cost_usd: m.api_cost_usd, evidence_items_returned: m.evidence_items_returned }));

  // ── Acquisition-failure guard (empty pack ⇒ could not research, not "found nothing"). ──
  if (pack.sources.length === 0) {
    const track_validation_report = buildValidationReport({
      track_key: "supply_chain_relationship", validation_version: VALIDATION_VERSION, schema_version: EVIDENCE_PACK_SCHEMA_VERSION,
      generated_at: new Date().toISOString(), validations: [], accepted: [], rejected: [],
      derived_signal: "n_a", current_verdict: "pending", provider_usage, llm_cost_usd: 0,
    });
    return {
      track_key: "supply_chain_relationship", evidence_items: [], evidence_weights_applied: [],
      reasoning_notes: "Acquisition produced no sources — could not research the supply-chain relationship. Escalated for manual review.",
      unknowns: [], weight_validation: [], track_validation_report, acquisition_failed: true,
    };
  }

  const byId = new Map<string, RawSource>();
  const sourceProfileById: Record<string, SourceProfile> = {};
  const promptSources = pack.sources.map((s, idx) => {
    const id = `src_${idx}`;
    byId.set(id, s);
    sourceProfileById[id] = s.provenance.source_profile;
    return { source_id: id, url: s.url, title: s.title, snippet: s.snippet };
  });

  // D2 (ADR-T2-002): if Track 0.5 resolved the identity (not low/unconfirmed), tell Track 2 it is settled
  // so its narrative does not re-litigate identity. Track 0.5 runs upstream, so ctx.supplier_identity is set.
  const si = ctx.supplier_identity;
  const identity = si && si.identity_confidence !== "low"
    ? { confidence: si.identity_confidence, resolved_name: si.resolved_name }
    : null;
  const { system, user } = buildTrack2Prompt({ vendor_name: ctx.vendor_name, brands: ctx.brands_submitted ?? [], identity }, promptSources);
  let parsed: ReturnType<typeof parseTrack2Output>;
  let llmCost = 0;
  try {
    const res = await runModel({ task: "track", system, user, temperature: 0 });
    parsed = parseTrack2Output(res.json);
    llmCost = res.cost_usd;
  } catch {
    parsed = parseTrack2Output({ _parse_error: true });
  }
  // H2 — thrown API call OR unparseable text: the model produced nothing usable → a STATE, never a finding.
  const llmFailed = parsed.parse_failed === true;

  const validations = validateWeights({
    track: "supply_chain_relationship",
    sourceProfileById,
    proposals: parsed.items.map((it) => ({ evidence_id: it.evidence_id, proposed_weight_key: it.proposed_weight_key, cited_source_ids: it.supporting_source_ids })),
  });
  const itemById = new Map(parsed.items.map((it) => [it.evidence_id, it]));

  const evidence_items: EvidenceItem[] = [];
  const accepted: ReportAccepted[] = [];
  const rejected: ReportRejected[] = [];
  for (const v of validations) {
    const it = itemById.get(v.evidence_id);
    const primaryId = it?.supporting_source_ids.find((id) => byId.has(id));
    const src = primaryId ? byId.get(primaryId) : undefined;
    const profile = src?.provenance.source_profile ?? null;
    // Deterministic LOA backstop: loa_legitimate never scores in Track 2 (ADR-T2-001), regardless of
    // what the LLM proposed or the firewall returned. Registry stays frozen; this is code-decides.
    if (v.validated_weight_key && v.validated_weight_key !== "loa_legitimate") {
      evidence_items.push({
        evidence_id: v.evidence_id,
        statement: it?.statement ?? "",
        certainty: it?.certainty ?? "unknown",
        source_type: src?.provenance.source_type ?? "inference",
        source_url: src?.url ?? null,
        claimant: "third_party",
        claimant_benefits: false,
        supports: "supply_chain_relationship",
        weight_key: v.validated_weight_key,
        provenance: src?.provenance,
        brand: it?.brand || undefined,
      });
      accepted.push({ evidence_id: v.evidence_id, validated_weight_key: v.validated_weight_key, certainty: it?.certainty ?? "unknown", confidence: it?.confidence ?? "low", source_profile: profile ?? "inference", source_url: src?.url ?? null });
    } else if (v.validated_weight_key !== "loa_legitimate") {
      rejected.push({ evidence_id: v.evidence_id, proposed_weight_key: v.proposed_weight_key, rejection_reason: v.rejection_reason ?? "", gate: v.gate, source_profile: profile, source_url: src?.url ?? null });
    }
  }

  // Dedupe so each evidence_type scores once (matches the pipeline's signal derivation; anti-gaming).
  const foundKeys = [...new Set(evidence_items.map((e) => e.weight_key).filter((k): k is string => !!k))];
  const derived_signal = deriveTrackSignal("supply_chain_relationship", foundKeys).signal;

  const track_validation_report = buildValidationReport({
    track_key: "supply_chain_relationship", validation_version: VALIDATION_VERSION, schema_version: EVIDENCE_PACK_SCHEMA_VERSION,
    generated_at: new Date().toISOString(), validations, accepted, rejected,
    derived_signal, current_verdict: "pending", provider_usage, llm_cost_usd: llmCost,
  });

  // ADR-T2-002 non-blocking guards (advisory only — never rewrite/block the finding):
  //  (1) brand_relationship_finding must never imply a purchase decision;
  //  (2) a case with structured unknowns must not ship zero questions (the analyst/client needs actionable gaps).
  const advisories: string[] = [];
  if (containsProcurementLanguage(parsed.brand_relationship_finding)) {
    advisories.push("procurement language detected in brand_relationship_finding — review; Track 2 must not imply a purchase decision.");
  }
  if (parsed.unknowns.length > 0 && parsed.questions_to_ask.length === 0) {
    advisories.push("unknowns present but questions_to_ask is empty — stated gaps produced no actionable questions; review.");
  }
  const reasoning_notes = advisories.length
    ? `${parsed.reasoning_notes}${advisories.map((a) => `\n[ADVISORY: ${a}]`).join("")}`
    : parsed.reasoning_notes;

  return {
    track_key: "supply_chain_relationship",
    evidence_items,
    evidence_weights_applied: [],
    reasoning_notes,
    unknowns: parsed.unknowns,
    weight_validation: validations,
    track_validation_report,
    llm_failed: llmFailed,
    auth_level: parsed.auth_level ?? undefined,
    auth_level_reasoning: parsed.auth_level_reasoning,
    b2b_only_detected: parsed.b2b_only_detected,
    b2b_only_brands: parsed.b2b_only_brands,
    questions_to_ask: parsed.questions_to_ask,
    // ADR-T2-002 — lane-isolated narrative + code-templated boundary notes (deterministic, never LLM-varied).
    brand_relationship_finding: parsed.brand_relationship_finding,
    identity_scope_note: IDENTITY_SCOPE_NOTE,
    authorization_scope_note: AUTHORIZATION_SCOPE_NOTE,
    marketplace_eligibility_disclaimer: MARKETPLACE_ELIGIBILITY_DISCLAIMER,
  };
}
