import type { TrackContext, TrackOutput, EvidenceItem } from "@/lib/research/contracts";
import { Orchestrator } from "@/lib/research/acquisition/orchestrator";
import { serperPlugin } from "@/lib/research/acquisition/plugins/serper";
import { nativeWebSearchPlugin } from "@/lib/research/acquisition/plugins/nativeWebSearch";
import { persistEvidencePack, persistAcquisitionMetrics, getEvidencePack } from "@/lib/data/acquisition";
import { runModel } from "@/lib/ai/runModel";
import { buildTrack3Requests } from "@/lib/research/tracks/track3.queries";
import { researchIdentityFor } from "@/lib/research/researchIdentity";
import { buildTrack3Prompt, parseTrack3Output } from "@/lib/research/track3.prompt";
import { validateWeights, VALIDATION_VERSION } from "@/lib/research/weightValidation";
import { deriveTrackSignal } from "@/lib/research/signals";
import { applySourceDiversityCap } from "@/lib/research/sourceDiversity";
import { reconcileHardFailConsensus, type ConsensusOutcome } from "@/lib/research/hardFailConsensus";
import { weightFor } from "@/lib/research/weights";
import { buildValidationReport, type ReportAccepted, type ReportRejected } from "@/lib/research/track1.report";
import { EVIDENCE_PACK_SCHEMA_VERSION } from "@/lib/research/acquisition/pack";
import type { RawSource, EvidencePack, AcquisitionMetric } from "@/lib/research/acquisition/types";
import { normalizeBrandToken, type SourceProfile } from "@/lib/research/source_profile";
import { TRACK3_OUTPUT_SCHEMA } from "@/lib/research/schemas/track3.schema";
import { MARKETPLACE_ELIGIBILITY_DISCLAIMER } from "@/lib/research/track2.disclaimers";
import { containsProcurementLanguage } from "@/lib/research/procurementLanguage";

// Track 3 — Brand Risk Assessment (LIVE 2026-07-10 via the H7 firewall pre-freeze gate: registry
// entries + founder-ruled ADR-T1-001 collision audit; the failing-test procedure followed, never
// weakened). Mirrors Track 2: the orchestrator acquires (per brand — the BRAND is the subject,
// Amendment 2); the LLM proposes to the locked brand_risk keys; the firewall validates
// (all four vetoes corroboration-gated, SO-2 founder-corrected); consensus re-checks any validated
// veto (SO-3 — the third call site of the shared helper); deriveTrackSignal (unchanged) scores.
// Founder-signed 2026-07-11 — firewall-inert until the Keepa gate (see weightValidation ALLOWED_PROFILES note).
const KEEPA_INERT = new Set(["keepa_stable_no_cliff", "keepa_enforcement_cliff", "low_seller_count_stable"]);

export async function runTrack3(ctx: TrackContext): Promise<TrackOutput> {
  // H7 (OQ-D) — REPLAY: load attempt N's frozen pack instead of live acquisition.
  let pack: EvidencePack;
  let metrics: AcquisitionMetric[] = [];
  if (ctx.replay_from_attempt) {
    const stored = await getEvidencePack(ctx.case_id, "brand_risk_assessment", ctx.replay_from_attempt);
    if (stored.error || !stored.pack) throw new Error(`replay: stored track_3 pack missing for attempt ${ctx.replay_from_attempt}: ${stored.error ?? "no row"}`);
    pack = stored.pack;
  } else {
    const requests = buildTrack3Requests(ctx);
    const orchestrator = new Orchestrator([serperPlugin, nativeWebSearchPlugin]);
    const classification = {
      vendorHost: ctx.supplier_identity?.resolved_domain ?? ctx.vendor_website,
      brandTokens: (ctx.brands_submitted ?? []).map(normalizeBrandToken).filter(Boolean),
    };
    ({ pack, metrics } = await orchestrator.gather({ case_id: ctx.case_id, track_key: "brand_risk_assessment", requests, classification }));
  }
  // H2 — pack = frozen input-of-record: persist failure throws (step retries); metrics non-fatal.
  const packRes = await persistEvidencePack(pack, ctx.attempt_number ?? 1);
  if (packRes.error) throw new Error(`evidence pack persist failed: ${packRes.error}`);
  if (metrics.length > 0) {
    const metricsRes = await persistAcquisitionMetrics(ctx.case_id, "brand_risk_assessment", metrics);
    if (metricsRes.error) console.error(`[track3] metrics persist failed (non-fatal): ${metricsRes.error}`);
  }

  const provider_usage = metrics.map((m) => ({ plugin: m.plugin_id, latency_ms: m.latency_ms, api_cost_usd: m.api_cost_usd, evidence_items_returned: m.evidence_items_returned }));

  // ── Acquisition-failure guard (empty pack ⇒ could not research, not "found nothing"). ──
  if (pack.sources.length === 0) {
    const track_validation_report = buildValidationReport({
      track_key: "brand_risk_assessment", validation_version: VALIDATION_VERSION, schema_version: EVIDENCE_PACK_SCHEMA_VERSION,
      generated_at: new Date().toISOString(), validations: [], accepted: [], rejected: [],
      derived_signal: "n_a", current_verdict: "pending", provider_usage, llm_cost_usd: 0,
    });
    return {
      track_key: "brand_risk_assessment", evidence_items: [], evidence_weights_applied: [],
      reasoning_notes: "Acquisition produced no sources — could not research brand risk. Escalated for manual review.",
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

  // H4 — the vendor context is the RESOLVED entity; the SUBJECT is each brand (Amendment 2).
  const rid = researchIdentityFor(ctx);
  const { system, user } = buildTrack3Prompt({ vendor_name: rid.name, brands: ctx.brands_submitted ?? [], research_alias: rid.alias }, promptSources);
  let parsed: ReturnType<typeof parseTrack3Output>;
  let llmCost = 0;
  try {
    // H7 (OQ-C) — schema-constrained extraction; runAnthropic falls back schema-less if rejected.
    const res = await runModel({ task: "track", system, user, temperature: 0, schema: TRACK3_OUTPUT_SCHEMA });
    parsed = parseTrack3Output(res.json);
    llmCost = res.cost_usd;
  } catch {
    parsed = parseTrack3Output({ _parse_error: true });
  }
  // H2 — thrown API call OR unparseable text: a STATE, never a finding.
  const llmFailed = parsed.parse_failed === true;

  const validations = validateWeights({
    track: "brand_risk_assessment",
    sourceProfileById,
    proposals: parsed.items.map((it) => ({ evidence_id: it.evidence_id, proposed_weight_key: it.proposed_weight_key, cited_source_ids: it.supporting_source_ids })),
  });

  // ── SO-3 (founder-signed) — hard-fail consensus extends to Track 3: the H7 OQ-B rule applied to
  // the newest hard-fail-carrying track, not changed. Same shared helper, third call site; OQ-A
  // semantics identical (failed second call = veto kept + escalate via hard_fail_consensus). ──
  const validatedHardFails = [...new Set(validations
    .filter((v) => v.validated_weight_key && weightFor("brand_risk_assessment", v.validated_weight_key)?.hard_fail)
    .map((v) => v.validated_weight_key as string))];
  let consensus: ConsensusOutcome | undefined;
  if (validatedHardFails.length > 0 && !llmFailed) {
    let secondKeys: string[] | null = null;
    try {
      const second = await runModel({ task: "track", system, user, temperature: 0, schema: TRACK3_OUTPUT_SCHEMA });
      const secondParsed = parseTrack3Output(second.json);
      secondKeys = secondParsed.parse_failed ? null : secondParsed.items.map((it) => it.proposed_weight_key);
      llmCost += second.cost_usd;
    } catch {
      secondKeys = null;
    }
    consensus = reconcileHardFailConsensus(validatedHardFails, secondKeys);
    if (consensus.dropped.length > 0) {
      const droppedSet = new Set(consensus.dropped);
      for (const v of validations) {
        if (v.validated_weight_key && droppedSet.has(v.validated_weight_key)) {
          v.validated_weight_key = null;
          v.gate = "consensus";
          v.rejection_reason = "consensus";
        }
      }
    }
  }

  const itemById = new Map(parsed.items.map((it) => [it.evidence_id, it]));

  const evidence_items: EvidenceItem[] = [];
  const accepted: ReportAccepted[] = [];
  const rejected: ReportRejected[] = [];
  for (const v of validations) {
    const it = itemById.get(v.evidence_id);
    const primaryId = it?.supporting_source_ids.find((id) => byId.has(id));
    const src = primaryId ? byId.get(primaryId) : undefined;
    const profile = src?.provenance.source_profile ?? null;
    // Deterministic Keepa backstop (founder-signed 2026-07-11; the Track 2 loa_legitimate pattern):
    // the three Keepa keys never score until the Keepa plugin ships direct marketplace observation,
    // regardless of what the LLM proposed or the firewall returned. Registry stays honest; code decides.
    if (v.validated_weight_key && KEEPA_INERT.has(v.validated_weight_key)) { v.validated_weight_key = null; v.gate = "registry"; v.rejection_reason = "registry"; }
    if (v.validated_weight_key) {
      evidence_items.push({
        evidence_id: v.evidence_id,
        statement: it?.statement ?? "",
        certainty: it?.certainty ?? "unknown",
        source_type: src?.provenance.source_type ?? "inference",
        source_url: src?.url ?? null,
        claimant: "third_party",
        claimant_benefits: false,
        supports: "brand_risk_assessment",
        weight_key: v.validated_weight_key,
        provenance: src?.provenance,
        brand: it?.brand || undefined,
      });
      accepted.push({ evidence_id: v.evidence_id, validated_weight_key: v.validated_weight_key, certainty: it?.certainty ?? "unknown", confidence: it?.confidence ?? "low", source_profile: profile ?? "inference", source_url: src?.url ?? null });
    } else {
      rejected.push({ evidence_id: v.evidence_id, proposed_weight_key: v.proposed_weight_key, rejection_reason: v.rejection_reason ?? "", gate: v.gate, source_profile: profile, source_url: src?.url ?? null });
    }
  }

  // Dedupe so each evidence_type scores once (anti-gaming, matches the pipeline's derivation).
  const foundKeys = [...new Set(evidence_items.map((e) => e.weight_key).filter((k): k is string => !!k))];
  // H7 (SO-3) — same shared cap as stageFindingTrack so the report signal can never disagree with the row.
  const derived_signal = applySourceDiversityCap(deriveTrackSignal("brand_risk_assessment", foundKeys).signal, evidence_items).signal;

  const track_validation_report = buildValidationReport({
    track_key: "brand_risk_assessment", validation_version: VALIDATION_VERSION, schema_version: EVIDENCE_PACK_SCHEMA_VERSION,
    generated_at: new Date().toISOString(), validations, accepted, rejected,
    derived_signal, current_verdict: "pending", provider_usage, llm_cost_usd: llmCost,
  });

  // ADR-T2-002-pattern non-blocking guards (advisory only — H5: prevent at the prompt, never launder):
  const advisories: string[] = [];
  if (containsProcurementLanguage(parsed.brand_risk_finding)) {
    advisories.push("procurement language detected in brand_risk_finding — review; Track 3 must not imply a purchase decision.");
  }
  if (parsed.unknowns.length > 0 && parsed.questions_to_ask.length === 0) {
    advisories.push("unknowns present but questions_to_ask is empty — stated gaps produced no actionable questions; review.");
  }
  const reasoning_notes = advisories.length
    ? `${parsed.reasoning_notes}${advisories.map((a) => `\n[ADVISORY: ${a}]`).join("")}`
    : parsed.reasoning_notes;

  return {
    track_key: "brand_risk_assessment",
    evidence_items,
    evidence_weights_applied: [],
    reasoning_notes,
    // Client-facing prose. NOTE the advisories appended to reasoning_notes above are INTERNAL and
    // deliberately do NOT reach this field.
    client_summary: parsed.client_summary,
    unknowns: parsed.unknowns,
    weight_validation: validations,
    track_validation_report,
    llm_failed: llmFailed,
    questions_to_ask: parsed.questions_to_ask,
    brand_risk_finding: parsed.brand_risk_finding,
    // RESOLVED BRAND NAMES (founder-ruled 2026-08-20) — what each submitted token was taken to
    // mean; the pipeline writes cases.brands_confirmed from this and the PDF cover renders it.
    resolved_brands: parsed.resolved_brands.length ? parsed.resolved_brands : undefined,
    analyst_reading: parsed.analyst_reading ?? undefined,
    // The account-specific marketplace-eligibility boundary applies to brand risk exactly as it
    // does to authorization — ONE shared code-templated note (the H3 one-fn discipline).
    marketplace_eligibility_disclaimer: MARKETPLACE_ELIGIBILITY_DISCLAIMER,
    research_identity: { name: rid.name, alias: rid.alias },
    hard_fail_consensus: consensus ? { checked: validatedHardFails, dropped: consensus.dropped, second_call_failed: consensus.second_call_failed } : undefined,
  };
}
