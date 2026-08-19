// H7 (OQ-C) — the structured-output schema for Track 1 extraction. Field-for-field mirror of what
// parseTrack1Output reads (track1.prompt.ts ParsedTrack1/ProposedEvidenceItem) and what the prompt
// demands. Constraints per the API's schema limits: every object carries additionalProperties:false;
// no min/max or recursive constructs. The tolerant parser remains the fallback — this schema makes
// parse failures stop happening at the source, it never replaces the guard.
export const TRACK1_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["evidence_items", "client_summary", "reasoning_notes", "unknowns"],
  properties: {
    evidence_items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["evidence_id", "statement", "proposed_weight_key", "supporting_source_ids", "mapping_justification", "counter_evidence", "certainty", "confidence"],
        properties: {
          evidence_id: { type: "string" },
          statement: { type: "string" },
          proposed_weight_key: { type: "string" },
          supporting_source_ids: { type: "array", items: { type: "string" } },
          mapping_justification: { type: "string" },
          counter_evidence: { type: "string" },
          certainty: { type: "string", enum: ["verified", "inferred", "unknown"] },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
        },
      },
    },
    // ── CLIENT-FACING (founder-ruled 2026-08-19). ⚠ THE SCHEMA MUST PERMIT IT OR THE MODEL
    // CANNOT RETURN IT: every track object carries additionalProperties:false, so adding the field
    // to the prompt and the parser WITHOUT adding it here left the model structurally forbidden
    // from emitting it — every response omitted it and the writer fell back to code-owned copy.
    // Proven on AWI-2608-039, the first case ever run on these prompts.
    client_summary: { type: "string" },
    reasoning_notes: { type: "string" },
    unknowns: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["unknown", "why_unresolvable", "resolvable_by_client"],
        properties: {
          unknown: { type: "string" },
          why_unresolvable: { type: "string" },
          resolvable_by_client: { type: "boolean" },
        },
      },
    },
  },
} as const;
