import { supabaseAdmin } from "@/lib/supabase/admin";
import type { SynthesisOutput, IosVersion } from "@/lib/research/contracts";

// case_synthesis data layer (admin/service-role). Modules 1–8 are role-gated IP; only the
// client-facing Module 9 (decision_snapshot) + Module 8 (vendor_questions) are exposed to
// clients, via a column-scoped read (never the reasoning modules).
export async function upsertCaseSynthesis(
  caseId: string,
  output: SynthesisOutput,
  ios: IosVersion,
): Promise<{ error: string | null }> {
  const { error } = await supabaseAdmin.from("case_synthesis").upsert(
    {
      case_id: caseId,
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
    { onConflict: "case_id" },
  );
  return { error: error?.message ?? null };
}

// Client-facing: ONLY Module 9 + vendor questions (reasoning modules never exposed).
export type ClientSnapshot = { decision_snapshot: unknown; vendor_questions: unknown };
export async function getClientDecisionSnapshot(caseId: string): Promise<ClientSnapshot | null> {
  const { data } = await supabaseAdmin
    .from("case_synthesis")
    .select("decision_snapshot, vendor_questions")
    .eq("case_id", caseId)
    .is("deleted_at", null)
    .maybeSingle();
  return (data as ClientSnapshot) ?? null;
}
