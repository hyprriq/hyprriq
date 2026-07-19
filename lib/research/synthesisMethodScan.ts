// ── S-1e — THE DERIVATION-RULE SCANNER (SO-S1-4; the G2 extension). The Rider-2 lesson: the
// protected thing escapes by DERIVATION — narrative derived from rejection records may state
// WHAT IS UNVERIFIED, never WHAT REFUSED IT OR WHY. This scanner class blocks the method
// vocabulary at delivery over M9's narrative, M8's questions, AND M7's rationale — including the
// case_synthesis client columns (the B4-EXT named gap, closed here). Pattern class, ruled:
// gate names · thresholds/corroboration counts ("two independent sources") · firewall vocabulary. ──

interface MethodPattern { name: string; re: RegExp }

// The ruled classes (the naive gate-names-only version watched-failed on the corroboration
// threshold): gate names · corroboration counts/thresholds · firewall vocabulary. The safe
// paraphrase ("we could not independently verify this") must pass — patterns are scoped to
// the METHOD, never to honest uncertainty language.
const METHOD_PATTERNS: MethodPattern[] = [
  { name: "gate name", re: /\b(grounding|registry|provenance|authority|corroboration|contradiction|consensus)\s+gate\b/i },
  { name: "corroboration vocabulary", re: /\bcorroborat(?:e|ed|es|ion|ing)\b/i },
  { name: "source-count threshold", re: /\b(?:two|three|[0-9]+)\s+(?:independent|distinct)\s+sources?\b/i },
  { name: "source-count threshold", re: /(?:>=|at least)\s*[0-9]+\s+sources?\b/i },
  { name: "firewall vocabulary", re: /\b(firewall|weight[_\s]?key|hard[_\s]?fail|validation\s+(?:gate|layer|version)|banned[_\s]?language)\b/i },
];

/** Scan named text fields for method leakage. Returns violations as "field: pattern (excerpt)". */
export function scanForMethodLeakage(fields: Record<string, unknown>): string[] {
  const violations: string[] = [];
  const walk = (value: unknown, path: string): void => {
    if (typeof value === "string") {
      for (const p of METHOD_PATTERNS) {
        const m = p.re.exec(value);
        if (m) violations.push(`${path}: ${p.name} ("${m[0]}")`);
      }
      return;
    }
    if (Array.isArray(value)) { value.forEach((v, i) => walk(v, `${path}[${i}]`)); return; }
    if (value && typeof value === "object") {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) walk(v, `${path}.${k}`);
    }
  };
  for (const [k, v] of Object.entries(fields)) walk(v, k);
  return violations;
}

/** The delivery-gate composition (G2): scan a stored synthesis row's client-bound + derived
 *  narrative — decision_snapshot (M9), vendor_questions (M8), and the M7 rationale/focus. */
export function scanSynthesisAtDelivery(synthesis: {
  module_9_decision_snapshot?: unknown;
  module_8_vendor_questions?: unknown;
  module_7_doubt_calibration?: { doubt_focus?: string; rationale?: string };
}): string[] {
  return scanForMethodLeakage({
    decision_snapshot: synthesis.module_9_decision_snapshot ?? null,
    vendor_questions: synthesis.module_8_vendor_questions ?? null,
    doubt_rationale: synthesis.module_7_doubt_calibration?.rationale ?? null,
    doubt_focus: synthesis.module_7_doubt_calibration?.doubt_focus ?? null,
  });
}
