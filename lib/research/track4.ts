import type { TrackContext, TrackOutput, EvidenceItem } from "@/lib/research/contracts";
import { loadDocumentPack } from "@/lib/research/acquisition/documentPack";
import { persistEvidencePack, persistAcquisitionMetrics, getEvidencePack } from "@/lib/data/acquisition";
import { runModel } from "@/lib/ai/runModel";
import { researchIdentityFor } from "@/lib/research/researchIdentity";
import { buildTrack4Prompt, parseTrack4Output } from "@/lib/research/track4.prompt";
import { validateWeights, VALIDATION_VERSION } from "@/lib/research/weightValidation";
import { deriveTrackSignal } from "@/lib/research/signals";
import { applySourceDiversityCap } from "@/lib/research/sourceDiversity";
import { reconcileHardFailConsensus, type ConsensusOutcome } from "@/lib/research/hardFailConsensus";
import { weightFor } from "@/lib/research/weights";
import { buildValidationReport, type ReportAccepted, type ReportRejected } from "@/lib/research/track1.report";
import { EVIDENCE_PACK_SCHEMA_VERSION } from "@/lib/research/acquisition/pack";
import type { RawSource, EvidencePack, AcquisitionMetric } from "@/lib/research/acquisition/types";
import type { SourceProfile } from "@/lib/research/source_profile";
import { TRACK4_OUTPUT_SCHEMA } from "@/lib/research/schemas/track4.schema";
import { containsProcurementLanguage } from "@/lib/research/procurementLanguage";

// Track 4 — Documentation Review (LIVE 2026-07-11 via sub-gate A: registry entries + the
// founder-ruled collision audit incl. the OQ-A4 observed-artifact corroboration ruling). The
// acquisition mode is the document-pack builder (frozen packs CARRY extracted content — documents
// self-delete at 12 months); everything downstream is the Track 2/3 mirror: LLM proposes to the
// locked keys, firewall validates, consensus re-checks vetoes (FOURTH call site), deriveTrackSignal
// scores. OQ-A3: zero uploads = nothing_to_review (absence, never a failure, never scored).
export async function runTrack4(ctx: TrackContext): Promise<TrackOutput> {
  // H7 (OQ-D) — REPLAY: load attempt N's frozen pack (which carries the document CONTENT).
  let pack: EvidencePack;
  let metrics: AcquisitionMetric[] = [];
  let unreadable: { file_name: string; reason: string }[] = [];
  if (ctx.replay_from_attempt) {
    const stored = await getEvidencePack(ctx.case_id, "documentation_review", ctx.replay_from_attempt);
    if (stored.error || !stored.pack) throw new Error(`replay: stored track_4 pack missing for attempt ${ctx.replay_from_attempt}: ${stored.error ?? "no row"}`);
    pack = stored.pack;
  } else {
    ({ pack, metrics, unreadable } = await loadDocumentPack(ctx.case_id));
  }
  const packRes = await persistEvidencePack(pack, ctx.attempt_number ?? 1);
  if (packRes.error) throw new Error(`evidence pack persist failed: ${packRes.error}`);
  if (metrics.length > 0) {
    const metricsRes = await persistAcquisitionMetrics(ctx.case_id, "documentation_review", metrics);
    if (metricsRes.error) console.error(`[track4] metrics persist failed (non-fatal): ${metricsRes.error}`);
  }

  const provider_usage = metrics.map((m) => ({ plugin: m.plugin_id, latency_ms: m.latency_ms, api_cost_usd: m.api_cost_usd, evidence_items_returned: m.evidence_items_returned }));

  if (pack.sources.length === 0) {
    // ── OQ-A3 (founder-ruled): zero uploads = ABSENCE — nothing_to_review, excluded from the
    // verdict, never escalated ("paperwork comes after commitment"; the N2 anti-pattern killed). ──
    if (unreadable.length === 0) {
      return {
        track_key: "documentation_review", evidence_items: [], evidence_weights_applied: [],
        reasoning_notes: "no documents were provided for review — dimension excluded from scoring (absence, not a finding)",
        unknowns: [], nothing_to_review: true,
      };
    }
    // ── Uploaded but ALL unreadable — DISTINCT from absence: the client provided documents v1
    // cannot read (image-only / failed extraction). A human can; escalate via the acquisition
    // guard (n_a + manual review), never score, never treat as absence. ──
    return {
      track_key: "documentation_review", evidence_items: [], evidence_weights_applied: [],
      reasoning_notes: `documents were provided but none could be read (v1 text-layer extraction): ${unreadable.map((u) => `${u.file_name} — ${u.reason}`).join("; ")}. Escalated for human review.`,
      unknowns: unreadable.map((u) => ({ unknown: `content of ${u.file_name}`, why_unresolvable: u.reason, resolvable_by_client: true })),
      weight_validation: [], acquisition_failed: true,
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

  const rid = researchIdentityFor(ctx);
  const { system, user } = buildTrack4Prompt({ vendor_name: rid.name, brands: ctx.brands_submitted ?? [], unreadable }, promptSources);
  let parsed: ReturnType<typeof parseTrack4Output>;
  let llmCost = 0;
  try {
    const res = await runModel({ task: "track", system, user, temperature: 0, schema: TRACK4_OUTPUT_SCHEMA });
    parsed = parseTrack4Output(res.json);
    llmCost = res.cost_usd;
  } catch {
    parsed = parseTrack4Output({ _parse_error: true });
  }
  const llmFailed = parsed.parse_failed === true;

  let validations = validateWeights({
    track: "documentation_review",
    sourceProfileById,
    proposals: parsed.items.map((it) => ({ evidence_id: it.evidence_id, proposed_weight_key: it.proposed_weight_key, cited_source_ids: it.supporting_source_ids, declared_polarity: it.polarity, declared_subject_is_target: it.subject_is_target })),
  });

  // ── Consensus — the FOURTH call site of the shared helper (SO-A2; the H7 OQ-B rule applied,
  // not changed). OQ-A semantics identical: failed second call keeps the veto + escalates. ──
  const validatedHardFails = [...new Set(validations
    .filter((v) => v.validated_weight_key && weightFor("documentation_review", v.validated_weight_key)?.hard_fail)
    .map((v) => v.validated_weight_key as string))];
  let consensus: ConsensusOutcome | undefined;
  if (validatedHardFails.length > 0 && !llmFailed) {
    let secondKeys: string[] | null = null;
    try {
      const second = await runModel({ task: "track", system, user, temperature: 0, schema: TRACK4_OUTPUT_SCHEMA });
      const secondParsed = parseTrack4Output(second.json);
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
      // ── FIX 1 (founder-ruled pre-freeze, 2026-07-12 — from A1/Mazel, the first live case). In
      // single-document mode the ONE document is the sole source of everything, so the firewall's
      // same-source hard-fail-wins rule suppresses ALL coexisting findings whenever a veto
      // validates. A veto that consensus then REVOKES must not leave that suppression behind:
      // re-validate the SAME proposals WITHOUT the consensus-dropped items — the same frozen
      // firewall, a pure function, judging the world as if the revoked veto had never validated —
      // and adopt that result. The dropped vetoes keep their consensus rejection records (the
      // audit trail stays truthful); a consensus-CONFIRMED veto is not re-run, so its suppression
      // stands. Track-4-scoped: the shared firewall rule itself is untouched (correct for
      // multi-source web tracks). The empty-set → soft_fail floor is untouched — the bug was the
      // set being wrongly emptied, not the floor.
      const droppedRecords = validations.filter((v) => v.rejection_reason === "consensus");
      const droppedIds = new Set(droppedRecords.map((v) => v.evidence_id));
      const rerun = validateWeights({
        track: "documentation_review",
        sourceProfileById,
        proposals: parsed.items
          .filter((it) => !droppedIds.has(it.evidence_id))
          .map((it) => ({ evidence_id: it.evidence_id, proposed_weight_key: it.proposed_weight_key, cited_source_ids: it.supporting_source_ids, declared_polarity: it.polarity, declared_subject_is_target: it.subject_is_target })),
      });
      validations = [...rerun, ...droppedRecords];
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
        claimant: "vendor", // documents are vendor-supplied artifacts (user_upload = vendor_self_assertion)
        claimant_benefits: true,
        supports: "documentation_review",
        weight_key: v.validated_weight_key,
        provenance: src?.provenance,
        brand: it?.brand || undefined,
        polarity: it?.polarity,
        subject_is_target: it?.subject_is_target,
      });
      accepted.push({ evidence_id: v.evidence_id, validated_weight_key: v.validated_weight_key, certainty: it?.certainty ?? "unknown", confidence: it?.confidence ?? "low", source_profile: profile ?? "inference", source_url: src?.url ?? null });
    } else {
      rejected.push({ evidence_id: v.evidence_id, proposed_weight_key: v.proposed_weight_key, rejection_reason: v.rejection_reason ?? "", gate: v.gate, source_profile: profile, source_url: src?.url ?? null });
    }
  }

  const foundKeys = [...new Set(evidence_items.map((e) => e.weight_key).filter((k): k is string => !!k))];
  // H7 (SO-3) — the shared cap. Note the inherent consequence for documents: a single-document
  // pass caps to infer (one source), by the frozen rule — recorded honestly in source_diversity.
  const derived_signal = applySourceDiversityCap(deriveTrackSignal("documentation_review", foundKeys).signal, evidence_items).signal;

  const track_validation_report = buildValidationReport({
    track_key: "documentation_review", validation_version: VALIDATION_VERSION, schema_version: EVIDENCE_PACK_SCHEMA_VERSION,
    generated_at: new Date().toISOString(), validations, accepted, rejected,
    derived_signal, current_verdict: "pending", provider_usage, llm_cost_usd: llmCost,
  });

  const advisories: string[] = [];
  if (containsProcurementLanguage(parsed.documentation_finding)) {
    advisories.push("procurement language detected in documentation_finding — review; Track 4 must not imply a purchase decision.");
  }
  if (parsed.unknowns.length > 0 && parsed.questions_to_ask.length === 0) {
    advisories.push("unknowns present but questions_to_ask is empty — stated gaps produced no actionable questions; review.");
  }
  const reasoning_notes = advisories.length
    ? `${parsed.reasoning_notes}${advisories.map((a) => `\n[ADVISORY: ${a}]`).join("")}`
    : parsed.reasoning_notes;

  return {
    track_key: "documentation_review",
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
    documentation_finding: parsed.documentation_finding,
    analyst_reading: parsed.analyst_reading ?? undefined,
    research_identity: { name: rid.name, alias: rid.alias },
    hard_fail_consensus: consensus ? { checked: validatedHardFails, dropped: consensus.dropped, second_call_failed: consensus.second_call_failed } : undefined,
  };
}
