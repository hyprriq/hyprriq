// ── client_summary — THE CLIENT-FACING TRACK FIELD (founder-ruled 2026-08-19) ────────────────
//
// THE ROOT CAUSE THIS CLOSES, stated plainly because every fix before it treated a symptom:
// `lib/research/pipeline.steps.ts` assigned `summary: out.reasoning_notes` on the scored path AND
// on all four failure branches, and `summary` is in FINDING_CLIENT_ALLOWLIST. So the per-area
// summary every client has ever read WAS THE MODEL'S INTERNAL REASONING FIELD, VERBATIM — the
// client was reading the scratchpad. That single assignment explains the whole recurring class:
// the weight-key narration ("no weight_key for domain age is proposed"), the corroboration
// vocabulary, the raw internal key names ("registration_fabricated is not warranted"), the
// first-person voice. Every strip, clean and substitution built this week treated symptoms of it.
//
// THE FIX IS A SECOND FIELD, NOT A DISCIPLINED FIRST ONE. `reasoning_notes` stays exactly as it is
// — internal, unpoliced, the operator's scratchpad. ⛔ DO NOT make reasoning_notes client-safe:
// that degrades the operator's diagnostics to serve the client, and doing so is precisely why this
// class kept coming back. Two audiences, two fields.
//
// FROZEN-SURFACE BOUNDARY (founder's ruling, and the reason this is buildable): the frozen rule
// protects THE VERDICT — signals, weights, thresholds, vetoes. `client_summary` is an ADDED OUTPUT
// FIELD THE VERDICT NEVER READS. Nothing downstream of scoring consumes it; it is projected to the
// client and nowhere else. Keep any future change inside that boundary and the ruling still holds.
//
// ONE DEFINITION, FOUR TRACKS. This block is shared rather than pasted into each prompt: four
// copies of a client-copy rule is the same drift class as the three copies of AREA_NAMES, and this
// codebase has been bitten by that twice.

/**
 * The instruction block appended to every finding track's system prompt.
 *
 * The vocabulary rules here are the 08-17 engine-prose pass applied to the field where it is
 * CHEAP — corroboration voice and source-count thresholds are banned in prose written for a
 * reader, while `reasoning_notes` may still say whatever the operator needs it to say.
 */
// ── ⚠ THE FINDING THAT RESCOPED THIS INSTRUCTION (founder-ruled 2026-08-19) ──────────────────
//
// The first version governed A FIELD BY ITS OWN WORDING — "client_summary MUST NOT contain…" —
// while the SAME prompts separately instruct the model to emit `blocking_weight_key` per question.
// The model then named that key in the adjacent `reason` sentence. IT WAS OBEYING BOTH
// INSTRUCTIONS. p002 produced clean summaries and question prose still full of key names, and
// nothing was wrong with the model's behaviour — the discipline simply had a seam in it.
//
// ⛔ THE RULE IS SCOPED TO THE SURFACE, NOT TO A FIELD NAME: everything a client could read.
// Naming fields one at a time guarantees the next field added is uncovered by default, which is
// the same class as the four AREA_NAMES copies and the missing questions projection — a rule that
// enumerates instances instead of defining a boundary.
export const CLIENT_PROSE_SURFACE_RULE = [
  "CLIENT-READABLE PROSE — THIS RULE COVERS EVERY FIELD A CLIENT CAN READ, not one named field:",
  "client_summary, and the `question` and `reason` of every questions_to_ask item. If you add prose",
  "anywhere a client might see it, it is covered too.",
  "NONE of that prose may contain: any internal key or field name (weight_key, proposed_weight_key,",
  "blocking_weight_key, no_enforcement_found, cease_and_desist_distributed, active_ip_complaints,",
  "confirmed_amazon_restrictions, brand_enforcement_signals, map_policy_present, and anything else in",
  "snake_case); any narration of your own scoring or classification decisions ('this would determine",
  "whether X or Y is the correct classification', 'this would support X', 'determinative for the X",
  "classification'); first person; source ids; or commentary on how many sources agreed.",
  "⚠ blocking_weight_key IS STILL A REQUIRED FIELD and you must still populate it — it is structured",
  "data we consume internally. What is forbidden is NAMING it, or any other key, IN PROSE. Put the key",
  "in the key field; keep it out of the sentence.",
  "A question's `reason` says WHY THE ANSWER MATTERS TO THE BUYER — 'a published policy would show",
  "whether the restriction comes from the brand or from the marketplace' — never which classification",
  "it would let us apply.",
].join("\n");

export const CLIENT_SUMMARY_INSTRUCTION = [
  "CLIENT_SUMMARY — WRITTEN FOR THE BUYER, NOT FOR YOURSELF. In addition to reasoning_notes, return",
  "client_summary: 2–5 sentences of plain prose that the person who paid for this report will read as",
  "this area's finding. reasoning_notes remains your own working record and is NEVER shown to them —",
  "put your workings there, not here.",
  "client_summary MUST NOT contain: any internal key or field name (weight_key, proposed_weight_key,",
  "no_enforcement_found, registration_fabricated, and anything else in snake_case); any narration of",
  "your own scoring decisions ('no weight_key is proposed', 'I cannot classify', 'returned as UNKNOWN');",
  "first person of any kind ('I', 'we', 'my'); source ids (src_N, EV-000, E00, A00); or commentary on",
  "how many sources agreed.",
  "SAY WHAT THE EVIDENCE SHOWS OR DOES NOT SHOW — never how the conclusion was reached, and never how",
  "much evidence there was. Write 'the record does not show an authorization relationship', never 'this",
  "could not be corroborated' and never 'two independent sources confirm'. Naming a source is fine",
  "('the state registry lists…'); counting them is not.",
  "Absence is not an accusation: 'no documents were provided for review' is a fact about the record,",
  "not a finding against the supplier. Say it plainly and move on.",
  "If you have nothing to say for this area, return a single honest sentence saying so. NEVER leave",
  "client_summary empty and NEVER copy reasoning_notes into it.",
].join("\n");

/** The JSON key list fragment — kept beside the instruction so the two can never drift apart. */
export const CLIENT_SUMMARY_JSON_KEY = "client_summary";

/**
 * Extract `client_summary` from a parsed model response.
 *
 * ⚠ RETURNS "" WHEN ABSENT, DELIBERATELY, AND THE CALLER MUST NOT FALL BACK TO reasoning_notes.
 * A fallback would silently restore the exact defect this field exists to remove — the scratchpad
 * would reach the client again on every response that happened to omit the key, and it would look
 * like it was working. `pipeline.steps.ts` treats "" as "no client text" instead.
 */
export function parseClientSummary(json: unknown): string {
  const o = (json ?? {}) as { client_summary?: unknown };
  return typeof o.client_summary === "string" ? o.client_summary.trim() : "";
}
