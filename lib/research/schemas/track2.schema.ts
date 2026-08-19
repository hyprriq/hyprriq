// H7 (OQ-C) — the structured-output schema for Track 2 extraction. Field-for-field mirror of what
// parseTrack2Output reads (track2.prompt.ts ParsedTrack2/ProposedTrack2Item) and what the prompt
// demands (incl. the rich questions_to_ask objects whose earlier shape-drift dropped questions).
// The tolerant parser remains the fallback — never removed.
export const TRACK2_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "evidence_items", "auth_level", "auth_level_reasoning", "brand_relationship_finding",
    "b2b_only_detected", "b2b_only_brands", "questions_to_ask", "client_summary", "reasoning_notes", "unknowns",
  ],
  properties: {
    evidence_items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["evidence_id", "brand", "statement", "proposed_weight_key", "supporting_source_ids", "mapping_justification", "counter_evidence", "certainty", "confidence"],
        properties: {
          evidence_id: { type: "string" },
          brand: { type: "string" },
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
    auth_level: { type: "string", enum: ["A", "B", "C", "D", "E"] },
    auth_level_reasoning: { type: "string" },
    brand_relationship_finding: { type: "string" },
    b2b_only_detected: { type: "boolean" },
    b2b_only_brands: { type: "array", items: { type: "string" } },
    questions_to_ask: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "reason", "blocking_weight_key", "priority", "brand"],
        properties: {
          question: { type: "string" },
          reason: { type: "string" },
          blocking_weight_key: { type: "string" },
          priority: { type: "string", enum: ["high", "medium", "low"] },
          brand: { type: "string" },
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
