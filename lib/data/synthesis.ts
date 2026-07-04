import { supabaseAdmin } from "@/lib/supabase/admin";
import type { SynthesisOutput, IosVersion } from "@/lib/research/contracts";

// case_synthesis data layer (admin/service-role). Modules 1–8 are role-gated IP; only the
// client-facing Module 9 (decision_snapshot) + Module 8 (vendor_questions) are exposed to
// clients, via a column-scoped read (never the reasoning modules).
// H1 — one synthesis row per (case, attempt): a re-investigation writes its own row and can never
// overwrite the reasoning behind a prior (possibly delivered) attempt.
export async function upsertCaseSynthesis(
  caseId: string,
  output: SynthesisOutput,
  ios: IosVersion,
  attemptNumber: number,
): Promise<{ error: string | null }> {
  const { error } = await supabaseAdmin.from("case_synthesis").upsert(
    {
      case_id: caseId,
      attempt_number: attemptNumber,
      normalized_evidence: output.module_1_normalized_evidence,
      claim_attributions: output.module_2_claim_attributions,
      assertions: output.module_3_assertions,
      contradictions: output.module_4_contradictions,
      hypotheses: output.module_5_hypotheses,
      risk_gaps: output.module_6_risk_gaps,
      doubt_calibration: output.module_7_doubt_calibration,
      vendor_questions: output.module_8_vendor_questions,
      decision_snapshot: output.module_9_decision_snapshot,
      evidence_hash: ios.evidence_hash,
      prompt_version: ios.prompt_version,
      rubric_version: ios.rubric_version,
      synthesis_version: ios.synthesis_version,
      corpus_version: ios.corpus_version,
      configuration_version: ios.configuration_version,
      model_provider: ios.model_provider,
      model_version: ios.model_version,
      ios_version: ios.ios_version,
    },
    { onConflict: "case_id,attempt_number" },
  );
  return { error: error?.message ?? null };
}

// Evidence-hash memoization (enhancement #2): if a prior case produced synthesis from the
// IDENTICAL normalized evidence under the SAME IOS version, reuse it instead of regenerating.
// This makes "same evidence → same synthesis → same verdict" demonstrably reproducible.
type SynthRow = {
  normalized_evidence: unknown; claim_attributions: unknown; assertions: unknown;
  contradictions: SynthesisOutput["module_4_contradictions"]; hypotheses: SynthesisOutput["module_5_hypotheses"];
  risk_gaps: unknown; doubt_calibration: SynthesisOutput["module_7_doubt_calibration"];
  vendor_questions: string[]; decision_snapshot: SynthesisOutput["module_9_decision_snapshot"];
};
export async function getSynthesisByEvidenceHash(
  evidenceHash: string,
  iosVersion: string,
): Promise<SynthesisOutput | null> {
  const { data } = await supabaseAdmin
    .from("case_synthesis")
    .select("normalized_evidence, claim_attributions, assertions, contradictions, hypotheses, risk_gaps, doubt_calibration, vendor_questions, decision_snapshot")
    .eq("evidence_hash", evidenceHash)
    .eq("ios_version", iosVersion)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const r = data as SynthRow;
  return {
    module_1_normalized_evidence: (r.normalized_evidence as unknown[]) ?? [],
    module_2_claim_attributions: (r.claim_attributions as unknown[]) ?? [],
    module_3_assertions: (r.assertions as unknown[]) ?? [],
    module_4_contradictions: r.contradictions ?? [],
    module_5_hypotheses: r.hypotheses ?? { hypotheses: [], what_would_change_the_leader: "" },
    module_6_risk_gaps: (r.risk_gaps as unknown[]) ?? [],
    module_7_doubt_calibration: r.doubt_calibration ?? { doubt_level: "", doubt_focus: "", rationale: "" },
    module_8_vendor_questions: r.vendor_questions ?? [],
    module_9_decision_snapshot: r.decision_snapshot,
  };
}

// Admin/QA-facing (Phase 4): the FULL case_synthesis row for a case — all 9 modules + the IOS
// version vector — mapped back to the canonical contracts. Feeds buildVerdictViewModel(). Service-
// role; callers are admin-guarded. Returns null until the engine has written synthesis.
export async function getCaseIntelligence(
  caseId: string,
): Promise<{ synthesis: SynthesisOutput; ios: IosVersion } | null> {
  const { data } = await supabaseAdmin
    .from("case_synthesis")
    .select(
      "normalized_evidence, claim_attributions, assertions, contradictions, hypotheses, risk_gaps, doubt_calibration, vendor_questions, decision_snapshot, evidence_hash, prompt_version, rubric_version, synthesis_version, corpus_version, configuration_version, model_provider, model_version, ios_version",
    )
    .eq("case_id", caseId)
    .is("deleted_at", null)
    .order("attempt_number", { ascending: false }) // H1 — latest investigation (case_id alone is no longer unique)
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const r = data as SynthRow & {
    evidence_hash: string; prompt_version: string; rubric_version: string; synthesis_version: string;
    corpus_version: string; configuration_version: string; model_provider: string;
    model_version: string; ios_version: string;
  };
  const synthesis: SynthesisOutput = {
    module_1_normalized_evidence: (r.normalized_evidence as unknown[]) ?? [],
    module_2_claim_attributions: (r.claim_attributions as unknown[]) ?? [],
    module_3_assertions: (r.assertions as unknown[]) ?? [],
    module_4_contradictions: r.contradictions ?? [],
    module_5_hypotheses: r.hypotheses ?? { hypotheses: [], what_would_change_the_leader: "" },
    module_6_risk_gaps: (r.risk_gaps as unknown[]) ?? [],
    module_7_doubt_calibration: r.doubt_calibration ?? { doubt_level: "", doubt_focus: "", rationale: "" },
    module_8_vendor_questions: r.vendor_questions ?? [],
    module_9_decision_snapshot: r.decision_snapshot,
  };
  const ios: IosVersion = {
    prompt_version: r.prompt_version, rubric_version: r.rubric_version,
    synthesis_version: r.synthesis_version, corpus_version: r.corpus_version,
    configuration_version: r.configuration_version, model_provider: r.model_provider,
    model_version: r.model_version, evidence_hash: r.evidence_hash, ios_version: r.ios_version,
  };
  return { synthesis, ios };
}

// Client-facing: ONLY Module 9 + vendor questions (reasoning modules never exposed).
// H1 — client reads are pinned to the DELIVERED attempt (immutability); latest attempt pre-delivery.
export type ClientSnapshot = { decision_snapshot: unknown; vendor_questions: unknown };
export async function getClientDecisionSnapshot(caseId: string): Promise<ClientSnapshot | null> {
  const { data: c } = await supabaseAdmin
    .from("cases").select("delivered_attempt").eq("id", caseId).maybeSingle();
  const deliveredAttempt = (c as { delivered_attempt?: number | null } | null)?.delivered_attempt ?? null;
  let q = supabaseAdmin
    .from("case_synthesis")
    .select("decision_snapshot, vendor_questions")
    .eq("case_id", caseId)
    .is("deleted_at", null);
  q = deliveredAttempt != null
    ? q.eq("attempt_number", deliveredAttempt)
    : q.order("attempt_number", { ascending: false }).limit(1);
  const { data } = await q.maybeSingle();
  return (data as ClientSnapshot) ?? null;
}
