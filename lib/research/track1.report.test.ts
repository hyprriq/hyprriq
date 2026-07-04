import { describe, it, expect } from "vitest";
import { buildValidationReport } from "./track1.report";
import type { WeightValidation } from "@/lib/research/contracts";

const v = (id: string, validated: string | null, reason: WeightValidation["rejection_reason"]): WeightValidation =>
  ({ evidence_id: id, proposed_weight_key: "k", validated_weight_key: validated, gate: reason ? "provenance" : null, rejection_reason: reason, validation_version: "1.0.0" });

// Structural view of the jsonb report for assertions (lint: no `any`).
type ReportView = {
  artifact_type: string; evidence_summary: unknown; gate_rejection_summary: Record<string, number>;
  total_acquisition_cost_usd: number; llm_cost_usd: number; total_track_cost_usd: number;
};

const base = {
  track_key: "supplier_identity", validation_version: "1.0.0", schema_version: "1.0.0",
  generated_at: "2026-06-28T00:00:00.000Z",
  accepted: [], rejected: [], derived_signal: "pass", current_verdict: "pending",
  provider_usage: [{ plugin: "serper", latency_ms: 10, api_cost_usd: 0.0015, evidence_items_returned: 3 }, { plugin: "whois", latency_ms: 5, api_cost_usd: 0.002, evidence_items_returned: 1 }],
  llm_cost_usd: 0.01,
};

describe("buildValidationReport", () => {
  it("computes the evidence summary deterministically", () => {
    const r = buildValidationReport({ ...base, validations: [v("e1", "k", null), v("e2", null, "provenance"), v("e3", null, "llm_returned_unknown")] }) as unknown as ReportView;
    expect(r.artifact_type).toBe("track_validation_report");
    expect(r.evidence_summary).toEqual({ total_proposed: 3, accepted: 1, rejected: 1, unknown: 1, acceptance_rate: 0.33 });
    expect(r.gate_rejection_summary.provenance).toBe(1);
    expect(r.gate_rejection_summary.llm_returned_unknown).toBe(1);
  });
  it("sums acquisition + llm costs", () => {
    const r = buildValidationReport({ ...base, validations: [] }) as unknown as ReportView;
    expect(r.total_acquisition_cost_usd).toBeCloseTo(0.0035, 4);
    expect(r.llm_cost_usd).toBeCloseTo(0.01, 4);
    expect(r.total_track_cost_usd).toBeCloseTo(0.0135, 4);
  });
  it("is byte-stable for identical inputs (regression artifact)", () => {
    const input = { ...base, validations: [v("e1", "k", null)] };
    expect(JSON.stringify(buildValidationReport(input))).toBe(JSON.stringify(buildValidationReport(input)));
  });
});
