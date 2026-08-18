// ── DELIVERABILITY PRECONDITION (founder-ruled 2026-08-17) — PURE. No IO.
//
// WHY THIS EXISTS: on 2026-08-17 a case was DELIVERED whose latest attempt held one track row
// (intake_scope_guard, n_a) and no synthesis. It passed the banned-language gate for the worst
// possible reason — THERE WAS NOTHING IN IT TO SCAN. An empty report cannot trip a language gate,
// so before this file an incomplete attempt was MORE publishable than a complete one.
//
// THE RULING: "A report with nothing to read must never be publishable by ANY path — operator or
// automated. In agency mode nobody is looking, so this check is the only thing standing between a
// failed pipeline and a client receiving a blank report."
//
// It is deliberately NOT part of the banned-language gate: that gate answers "may these words
// ship?", this answers "is there a report here at all?". Two different questions, two different
// failures, and conflating them is how the first one ended up covering for the second.
import { requiredFindingTracks } from "@/lib/constants/tracks";
import type { PlanType } from "@/lib/constants/plans";
import type { SynthesisOutput, TrackSignal } from "@/lib/research/contracts";

export type DeliverabilityRow = {
  track_key: string;
  track_number: number;
  attempt_number: number | null;
  track_verdict_signal: TrackSignal | null;
  compiled_findings_json: Record<string, unknown> | null;
};

export type DeliverabilityInput = {
  attempt: number;                       // the attempt being delivered
  rows: DeliverabilityRow[];             // track rows FOR THAT ATTEMPT
  synthesis: SynthesisOutput | null;     // synthesis FOR THAT ATTEMPT (never "latest that exists")
  synthesisAttempt: number | null;       // which attempt the synthesis actually belongs to
  planType: PlanType;
  verdict: string | null;
  // VERDICT PROVENANCE (audit 2026-08-18, founder-ruled) — which attempt the STORED verdict belongs
  // to, i.e. cases.delivered_attempt. null on a case that has never been delivered.
  deliveredAttempt: number | null;
  // True when the founder is supplying the verdict explicitly (the override action). An explicit
  // verdict IS the adoption decision, so provenance cannot be stale by definition.
  verdictIsExplicit: boolean;
};

/** Client-facing prose anywhere in a track's compiled findings — the "something to read" test. */
const MIN_PROSE = 40;
function hasClientText(cf: Record<string, unknown> | null): boolean {
  if (!cf) return false;
  let total = 0;
  const walk = (v: unknown) => {
    if (typeof v === "string") total += v.trim().length;
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(cf);
  return total >= MIN_PROSE;
}

/**
 * Returns [] when the attempt is deliverable. Any entry names what is missing, in the operator's
 * language — the ruling requires this to fail LOUD and say what is wrong, like the gate does.
 */
export function checkDeliverable(input: DeliverabilityInput): string[] {
  const missing: string[] = [];

  // (a) SYNTHESIS FOR THIS ATTEMPT. The skew that caused the incident: track rows came from the
  //     latest attempt while synthesis came from "the latest synthesis row that exists" — June's.
  //     Tracks and synthesis must never come from different investigations.
  if (!input.synthesis) {
    missing.push(`no synthesis for attempt ${input.attempt} — the engine did not finish this investigation`);
  } else if (input.synthesisAttempt !== null && input.synthesisAttempt !== input.attempt) {
    missing.push(
      `synthesis belongs to attempt ${input.synthesisAttempt}, not the attempt being delivered (${input.attempt}) — tracks and synthesis must come from the SAME investigation`,
    );
  }

  // (b) THE PLAN'S REQUIRED FINDING TRACKS ARE PRESENT AT THIS ATTEMPT.
  const present = new Set(input.rows.filter((r) => (r.attempt_number ?? 1) === input.attempt).map((r) => r.track_number));
  const absent = requiredFindingTracks(input.planType).filter((n) => !present.has(n));
  if (absent.length) {
    missing.push(`attempt ${input.attempt} is missing track(s) ${absent.join(", ")} required by plan ${input.planType}`);
  }

  // (c) SOMETHING TO READ: at least one scored area carrying client-facing text.
  const scored = input.rows.filter(
    (r) => (r.attempt_number ?? 1) === input.attempt && r.track_verdict_signal !== null && r.track_verdict_signal !== "n_a",
  );
  if (!scored.some((r) => hasClientText(r.compiled_findings_json))) {
    missing.push("no scored area carries client-facing text — the report would be blank");
  }

  // (d) A VERDICT.
  if (!input.verdict) missing.push("no verdict on the case");

  // (d2) THE VERDICT BELONGS TO *THIS* ATTEMPT (audit 2026-08-18, founder-ruled).
  //      (d) only asks whether a verdict EXISTS. `cases.verdict` is a CASE-LEVEL pointer, and
  //      stageFinalize deliberately refuses to update it once a case is delivered — so a delivered
  //      case that was re-investigated holds attempt-N findings and attempt-M's verdict, and
  //      publishing again would ship the new findings under the old verdict. That is a wrong
  //      answer that looks right, which is exactly what this file exists to stop.
  //      NOT a dead end: the founder adopts the re-investigation through the OVERRIDE action,
  //      which supplies the verdict explicitly — so the guard names that remedy rather than
  //      freezing the case forever.
  if (
    !input.verdictIsExplicit &&
    input.deliveredAttempt !== null &&
    input.deliveredAttempt !== input.attempt
  ) {
    missing.push(
      `the stored verdict belongs to attempt ${input.deliveredAttempt}, not the attempt being delivered (${input.attempt}) — this re-investigation has not been adopted; publish it with an explicit override verdict to adopt it`,
    );
  }

  // (e) A RISK STATEMENT — M9's the_real_risk is the sentence the client actually acts on.
  const risk = input.synthesis?.module_9_decision_snapshot?.the_real_risk;
  if (typeof risk !== "string" || risk.trim().length < MIN_PROSE) {
    missing.push("no risk statement in the decision snapshot");
  }

  return missing;
}
