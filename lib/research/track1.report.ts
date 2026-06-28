import type { WeightValidation } from "@/lib/research/contracts";

export interface ReportAccepted { evidence_id: string; validated_weight_key: string; certainty: string; confidence: string; source_profile: string }
export interface ReportRejected { evidence_id: string; proposed_weight_key: string; rejection_reason: string; gate: string | null; source_profile: string | null }
export interface ReportProvider { plugin: string; latency_ms: number; api_cost_usd: number; evidence_items_returned: number }
export interface ValidationReportInput {
  track_key: string; validation_version: string; schema_version: string; generated_at: string;
  validations: WeightValidation[];
  accepted: ReportAccepted[]; rejected: ReportRejected[];
  derived_signal: string; current_verdict: string;
  provider_usage: ReportProvider[]; llm_cost_usd: number;
}

// Deterministic regression artifact (CTO R7). generated_at is an INPUT — never Date.now() here.
// gate_rejection_summary uses the firewall's actual rejection_reason taxonomy: a single
// `contradiction` bucket (dedup / hard_fail-wins / unequal-authority) + a distinct
// `contradiction_equal_authority`.
export function buildValidationReport(i: ValidationReportInput): Record<string, unknown> {
  const total = i.validations.length;
  const unknown = i.validations.filter((v) => v.rejection_reason === "llm_returned_unknown").length;
  const accepted = i.validations.filter((v) => v.validated_weight_key !== null).length;
  const rejected = total - accepted - unknown;
  const acceptance_rate = total > 0 ? Number((accepted / total).toFixed(2)) : 0;
  const count = (r: string) => i.validations.filter((v) => v.rejection_reason === r).length;
  const acquisition_cost = Number(i.provider_usage.reduce((s, p) => s + p.api_cost_usd, 0).toFixed(4));
  const llm = Number(i.llm_cost_usd.toFixed(4));
  return {
    artifact_type: "track_validation_report",
    track_key: i.track_key,
    validation_version: i.validation_version,
    schema_version: i.schema_version,
    generated_at: i.generated_at,
    evidence_summary: { total_proposed: total, accepted, rejected, unknown, acceptance_rate },
    gate_rejection_summary: {
      no_valid_citation: count("no_valid_citation"), registry: count("registry"), track: count("track"),
      provenance: count("provenance"), authority: count("authority"),
      contradiction: count("contradiction"), contradiction_equal_authority: count("contradiction_equal_authority"),
      llm_returned_unknown: unknown,
    },
    accepted_evidence: i.accepted,
    rejected_evidence: i.rejected,
    derived_signal: i.derived_signal,
    current_verdict: i.current_verdict,
    provider_usage: i.provider_usage,
    total_acquisition_cost_usd: acquisition_cost,
    llm_cost_usd: llm,
    total_track_cost_usd: Number((acquisition_cost + llm).toFixed(4)),
  };
}
