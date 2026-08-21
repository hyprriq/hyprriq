import type { TrackContext, TrackOutput, EvidenceItem } from "@/lib/research/contracts";
import { Orchestrator } from "@/lib/research/acquisition/orchestrator";
import { whoisPlugin } from "@/lib/research/acquisition/plugins/whois";
import { serperPlugin } from "@/lib/research/acquisition/plugins/serper";
import { nativeWebSearchPlugin } from "@/lib/research/acquisition/plugins/nativeWebSearch";
import { persistEvidencePack, persistAcquisitionMetrics, getEvidencePack } from "@/lib/data/acquisition";
import { runModel } from "@/lib/ai/runModel";
import { buildTrack1Requests } from "@/lib/research/tracks/track1.queries";
import { researchIdentityFor } from "@/lib/research/researchIdentity";
import { buildTrack1Prompt, parseTrack1Output } from "@/lib/research/track1.prompt";
import { validateWeights, VALIDATION_VERSION } from "@/lib/research/weightValidation";
import { deriveTrackSignal } from "@/lib/research/signals";
import { applySourceDiversityCap } from "@/lib/research/sourceDiversity";
import { reconcileHardFailConsensus, type ConsensusOutcome } from "@/lib/research/hardFailConsensus";
import { weightFor } from "@/lib/research/weights";
import { TRACK1_OUTPUT_SCHEMA } from "@/lib/research/schemas/track1.schema";
import { buildValidationReport, type ReportAccepted, type ReportRejected } from "@/lib/research/track1.report";
import { EVIDENCE_PACK_SCHEMA_VERSION } from "@/lib/research/acquisition/pack";
import type { RawSource, EvidencePack, AcquisitionMetric } from "@/lib/research/acquisition/types";
import type { SourceProfile } from "@/lib/research/source_profile";

// Track 1 — Supplier Identity. The orchestrator acquires; the LLM proposes; the firewall decides;
// deriveTrackSignal (unchanged) scores. Validated evidence_items carry the full provenance chain.
export async function runTrack1(ctx: TrackContext): Promise<TrackOutput> {
  // H7 (OQ-D) — REPLAY: load attempt N's frozen pack instead of live acquisition. Same evidence in;
  // extraction → firewall → signals run fresh; the result lands as a genuine NEW attempt.
  let pack: EvidencePack;
  let metrics: AcquisitionMetric[] = [];
  if (ctx.replay_from_attempt) {
    const stored = await getEvidencePack(ctx.case_id, "supplier_identity", ctx.replay_from_attempt);
    if (stored.error || !stored.pack) throw new Error(`replay: stored track_1 pack missing for attempt ${ctx.replay_from_attempt}: ${stored.error ?? "no row"}`);
    pack = stored.pack;
  } else {
    const requests = buildTrack1Requests(ctx);
    const orchestrator = new Orchestrator([whoisPlugin, serperPlugin, nativeWebSearchPlugin]);
    ({ pack, metrics } = await orchestrator.gather({ case_id: ctx.case_id, track_key: "supplier_identity", requests }));
  }
  // H2 — the pack is the frozen input-of-record (H1): if it cannot persist, the step must retry.
  // (On replay this freezes the SAME evidence under the new attempt — identical evidence_hash.)
  // Metrics are ops data: failure is logged, never fatal; a replay has no acquisition metrics.
  const packRes = await persistEvidencePack(pack, ctx.attempt_number ?? 1);
  if (packRes.error) throw new Error(`evidence pack persist failed: ${packRes.error}`);
  if (metrics.length > 0) {
    const metricsRes = await persistAcquisitionMetrics(ctx.case_id, "supplier_identity", metrics);
    if (metricsRes.error) console.error(`[track1] metrics persist failed (non-fatal): ${metricsRes.error}`);
  }

  // ── Acquisition-failure guard: an EMPTY pack means we could not research (provider unavailable /
  // no results) — NOT "researched and found nothing". Do not call the model, do not score, flag for
  // escalation. The pipeline maps acquisition_failed → n_a (no verdict drag) + manual review + no
  // memory write. (A non-empty pack with no validated evidence is a legitimate soft_fail, not this.)
  if (pack.sources.length === 0) {
    const provider_usage = metrics.map((m) => ({ plugin: m.plugin_id, latency_ms: m.latency_ms, api_cost_usd: m.api_cost_usd, evidence_items_returned: m.evidence_items_returned }));
    const track_validation_report = buildValidationReport({
      track_key: "supplier_identity", validation_version: VALIDATION_VERSION, schema_version: EVIDENCE_PACK_SCHEMA_VERSION,
      generated_at: new Date().toISOString(), validations: [], accepted: [], rejected: [],
      derived_signal: "n_a", current_verdict: "pending", provider_usage, llm_cost_usd: 0,
    });
    return {
      track_key: "supplier_identity", evidence_items: [], evidence_weights_applied: [],
      reasoning_notes: "Acquisition produced no sources — could not research this vendor (provider unavailable or no results). Escalated for manual review.",
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

  // H4 — investigate the RESOLVED entity (same selector as the query builders — one decision point).
  const rid = researchIdentityFor(ctx);
  const { system, user } = buildTrack1Prompt({ vendor_name: rid.name, vendor_website: ctx.vendor_website, research_alias: rid.alias }, promptSources);
  let parsed: ReturnType<typeof parseTrack1Output>;
  let llmCost = 0;
  try {
    // H7 (OQ-C) — schema-constrained extraction; runAnthropic falls back schema-less if rejected.
    const res = await runModel({ task: "track", system, user, temperature: 0, schema: TRACK1_OUTPUT_SCHEMA });
    parsed = parseTrack1Output(res.json);
    llmCost = res.cost_usd;
  } catch {
    parsed = parseTrack1Output({ _parse_error: true });
  }
  // H2 — BOTH failure classes flow through parse_failed: a thrown API call (catch above) AND
  // unparseable model text (parseModelJson returns {_parse_error} without throwing). Either way
  // the model produced nothing usable — that is a STATE (n_a + hold), never "found nothing".
  const llmFailed = parsed.parse_failed === true;

  const validations = validateWeights({
    track: "supplier_identity",
    sourceProfileById,
    proposals: parsed.items.map((it) => ({ evidence_id: it.evidence_id, proposed_weight_key: it.proposed_weight_key, cited_source_ids: it.supporting_source_ids, declared_polarity: it.polarity, declared_subject_is_target: it.subject_is_target })),
  });

  // ── H7 (SO-4) — hard-fail consensus: any VALIDATED hard-fail key triggers ONE re-extraction over
  // the SAME frozen pack; the key vetoes only if both passes proposed it. OQ-A: a failed second
  // call keeps the veto and escalates (flag rides on hard_fail_consensus → stageFindingTrack). ──
  const validatedHardFails = [...new Set(validations
    .filter((v) => v.validated_weight_key && weightFor("supplier_identity", v.validated_weight_key)?.hard_fail)
    .map((v) => v.validated_weight_key as string))];
  let consensus: ConsensusOutcome | undefined;
  if (validatedHardFails.length > 0 && !llmFailed) {
    let secondKeys: string[] | null = null;
    try {
      const second = await runModel({ task: "track", system, user, temperature: 0, schema: TRACK1_OUTPUT_SCHEMA });
      const secondParsed = parseTrack1Output(second.json);
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
    if (v.validated_weight_key) {
      evidence_items.push({
        evidence_id: v.evidence_id,
        statement: it?.statement ?? "",
        certainty: it?.certainty ?? "unknown",
        source_type: src?.provenance.source_type ?? "inference",
        source_url: src?.url ?? null,
        claimant: "independent_registry",
        claimant_benefits: false,
        supports: "supplier_identity",
        weight_key: v.validated_weight_key,
        provenance: src?.provenance,
        polarity: it?.polarity,
        subject_is_target: it?.subject_is_target,
      });
      accepted.push({ evidence_id: v.evidence_id, validated_weight_key: v.validated_weight_key, certainty: it?.certainty ?? "unknown", confidence: it?.confidence ?? "low", source_profile: profile ?? "inference" });
    } else {
      rejected.push({ evidence_id: v.evidence_id, proposed_weight_key: v.proposed_weight_key, rejection_reason: v.rejection_reason ?? "", gate: v.gate, source_profile: profile });
    }
  }

  // Dedupe so each evidence_type scores once (matches the pipeline's signal derivation; anti-gaming).
  const foundKeys = [...new Set(evidence_items.map((e) => e.weight_key).filter((k): k is string => !!k))];
  // H7 (SO-3) — same shared cap as stageFindingTrack so the report signal can never disagree with the row.
  const derived_signal = applySourceDiversityCap(deriveTrackSignal("supplier_identity", foundKeys).signal, evidence_items).signal;
  const provider_usage = metrics.map((m) => ({ plugin: m.plugin_id, latency_ms: m.latency_ms, api_cost_usd: m.api_cost_usd, evidence_items_returned: m.evidence_items_returned }));

  const track_validation_report = buildValidationReport({
    track_key: "supplier_identity", validation_version: VALIDATION_VERSION, schema_version: EVIDENCE_PACK_SCHEMA_VERSION,
    generated_at: new Date().toISOString(), validations, accepted, rejected,
    derived_signal, current_verdict: "pending", provider_usage, llm_cost_usd: llmCost,
  });

  return {
    track_key: "supplier_identity",
    evidence_items,
    evidence_weights_applied: [],
    reasoning_notes: parsed.reasoning_notes,
    // Client-facing prose, carried straight through — the operator's notes above stay internal.
    client_summary: parsed.client_summary,
    unknowns: parsed.unknowns,
    weight_validation: validations,
    track_validation_report,
    llm_failed: llmFailed,
    research_identity: { name: rid.name, alias: rid.alias },
    hard_fail_consensus: consensus ? { checked: validatedHardFails, dropped: consensus.dropped, second_call_failed: consensus.second_call_failed } : undefined,
  };
}
