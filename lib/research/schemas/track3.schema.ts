// Track 3 (H7 OQ-C pattern) — the structured-output schema for brand-risk extraction. Field-for-field
// mirror of what parseTrack3Output reads (track3.prompt.ts ParsedTrack3/ProposedTrack3Item) incl. the
// analyst quartet. The tolerant parser remains the fallback — never removed.
export const TRACK3_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["evidence_items", "brand_risk_finding", "analyst_reading", "questions_to_ask", "client_summary", "reasoning_notes", "unknowns"],
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
    brand_risk_finding: { type: "string" },
    analyst_reading: {
      type: "object",
      additionalProperties: false,
      required: ["most_likely", "alternative", "confidence", "what_would_change_my_mind"],
      properties: {
        most_likely: { type: "string" },
        alternative: { type: "string" },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        what_would_change_my_mind: { type: "string" },
      },
    },
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
