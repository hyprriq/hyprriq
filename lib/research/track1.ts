import type { TrackContext, TrackOutput, EvidenceItem } from "@/lib/research/contracts";
import { Orchestrator } from "@/lib/research/acquisition/orchestrator";
import { whoisPlugin } from "@/lib/research/acquisition/plugins/whois";
import { serperPlugin } from "@/lib/research/acquisition/plugins/serper";
import { nativeWebSearchPlugin } from "@/lib/research/acquisition/plugins/nativeWebSearch";
import { persistEvidencePack, persistAcquisitionMetrics } from "@/lib/data/acquisition";
import { runModel } from "@/lib/ai/runModel";
import { buildTrack1Requests } from "@/lib/research/tracks/track1.queries";
import { buildTrack1Prompt, parseTrack1Output } from "@/lib/research/track1.prompt";
import { validateWeights, VALIDATION_VERSION } from "@/lib/research/weightValidation";
import { deriveTrackSignal } from "@/lib/research/signals";
import { buildValidationReport, type ReportAccepted, type ReportRejected } from "@/lib/research/track1.report";
import { EVIDENCE_PACK_SCHEMA_VERSION } from "@/lib/research/acquisition/pack";
import type { RawSource } from "@/lib/research/acquisition/types";
import type { SourceProfile } from "@/lib/research/source_profile";

// Track 1 — Supplier Identity. The orchestrator acquires; the LLM proposes; the firewall decides;
// deriveTrackSignal (unchanged) scores. Validated evidence_items carry the full provenance chain.
export async function runTrack1(ctx: TrackContext): Promise<TrackOutput> {
  const requests = buildTrack1Requests(ctx);
  const orchestrator = new Orchestrator([whoisPlugin, serperPlugin, nativeWebSearchPlugin]);
  const { pack, metrics } = await orchestrator.gather({ case_id: ctx.case_id, track_key: "supplier_identity", requests });
  // H2 — the pack is the frozen input-of-record (H1): if it cannot persist, the step must retry.
  // Metrics are ops data: failure is logged, never fatal.
  const packRes = await persistEvidencePack(pack, ctx.attempt_number ?? 1);
  if (packRes.error) throw new Error(`evidence pack persist failed: ${packRes.error}`);
  const metricsRes = await persistAcquisitionMetrics(ctx.case_id, "supplier_identity", metrics);
  if (metricsRes.error) console.error(`[track1] metrics persist failed (non-fatal): ${metricsRes.error}`);

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

  const { system, user } = buildTrack1Prompt({ vendor_name: ctx.vendor_name, vendor_website: ctx.vendor_website }, promptSources);
  let parsed: ReturnType<typeof parseTrack1Output>;
  let llmCost = 0;
  try {
    const res = await runModel({ task: "track", system, user, temperature: 0 });
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
      });
      accepted.push({ evidence_id: v.evidence_id, validated_weight_key: v.validated_weight_key, certainty: it?.certainty ?? "unknown", confidence: it?.confidence ?? "low", source_profile: profile ?? "inference" });
    } else {
      rejected.push({ evidence_id: v.evidence_id, proposed_weight_key: v.proposed_weight_key, rejection_reason: v.rejection_reason ?? "", gate: v.gate, source_profile: profile });
    }
  }

  // Dedupe so each evidence_type scores once (matches the pipeline's signal derivation; anti-gaming).
  const foundKeys = [...new Set(evidence_items.map((e) => e.weight_key).filter((k): k is string => !!k))];
  const derived_signal = deriveTrackSignal("supplier_identity", foundKeys).signal;
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
    unknowns: parsed.unknowns,
    weight_validation: validations,
    track_validation_report,
    llm_failed: llmFailed,
  };
}
