// ── S-1e — THE DERIVATION-RULE SCANNER (SO-S1-4; the G2 extension). The Rider-2 lesson: the
// protected thing escapes by DERIVATION — narrative derived from rejection records may state
// WHAT IS UNVERIFIED, never WHAT REFUSED IT OR WHY. This scanner class blocks the method
// vocabulary at delivery over M9's narrative, M8's questions, AND M7's rationale — including the
// case_synthesis client columns (the B4-EXT named gap, closed here). Pattern class, ruled:
// gate names · thresholds/corroboration counts ("two independent sources") · firewall vocabulary. ──

import { projectFindingJsonForClient } from "@/lib/portal/clientReport";
import { allWeightKeys } from "@/lib/research/weights";

interface MethodPattern {
  name: string;
  re: RegExp;
  /**
   * Optional PER-MATCH carve-out. Return false to let THIS match pass. Mirrors the `test` hook the
   * HARD tier in banned-language.ts has carried since H2 — the language gate learned years ago that
   * a presence-only rule over engine prose blocks honest sentences, and this scanner was shipped
   * without that machinery.
   */
  blocks?: (text: string, match: RegExpExecArray) => boolean;
}

// ── ATTRIBUTION CARVE-OUT (founder-ruled 2026-08-18, from the audit) — the corroboration rule
// exists to stop THRESHOLD disclosure ("two independent sources corroborated X"): how many agreed,
// and therefore what our bar is. It was presence-only, so it also blocked the sentence that NAMES
// its sources — "corroborated by the FDA, BBB, and LinkedIn" — which is the opposite of hiding the
// method, and is precisely what the locator's own fix text asks the engine to write ("say what the
// sources do or do not show, not how many agreed"). Measured before the change: across every
// synthesis row in the corpus the scanner had exactly ONE hit, ever — that sentence, on
// AWI-2608-034, a real client's report held with no other defect.
//
// Attribution to NAMED parties passes. Attribution to a COUNT still blocks, and the source-count
// patterns below catch it a second time regardless — the carve-out cannot open the threshold hole.

/** Countable/generic source phrasing — the threshold voice. "two independent sources", "3 sources". */
const GENERIC_SOURCES =
  /^(?:the\s+)?(?:at\s+least\s+|>=\s*)?(?:\d+|two|three|four|five|six|seven|eight|nine|ten|a\s+few|several|multiple|numerous|many|various|additional|other|independent|distinct|separate|corroborating|secondary|further)\b[^.?!]{0,30}?\bsources?\b/i;

/** "corroborated BY …" / "via" / "through" — the sentence is about to say who. */
const ATTRIBUTION_LEAD = /^\s*(?:by|via|through|against|with)\s+/i;

function isMethodVoiceCorroboration(text: string, m: RegExpExecArray): boolean {
  const rest = text.slice(m.index + m[0].length);
  const lead = ATTRIBUTION_LEAD.exec(rest);
  // Bare method voice — "this was corroborated", "the corroboration threshold" — still blocks.
  if (!lead) return true;
  const after = rest.slice(lead[0].length);
  // "by two independent sources" — a count, not a name. Still blocks.
  if (GENERIC_SOURCES.test(after)) return true;
  // Names something → the client is being told WHO says so. Passes.
  return !/[A-Za-z]/.test(after);
}

// The ruled classes (the naive gate-names-only version watched-failed on the corroboration
// threshold): gate names · corroboration counts/thresholds · firewall vocabulary. The safe
// paraphrase ("we could not independently verify this") must pass — patterns are scoped to
// the METHOD, never to honest uncertainty language.
/**
 * Every weight key in the registry, as one alternation. Built ONCE at module load and derived —
 * never copied — so a key added to weights.ts is covered here without anyone remembering to.
 *
 * Sorted longest-first so an alternation can never match a shorter key that is a prefix of a
 * longer one and report the wrong name.
 */
function weightKeyNamePattern(): RegExp {
  const keys = allWeightKeys()
    .filter((k) => k.includes("_"))            // single words would be far too broad
    .sort((a, b) => b.length - a.length)
    .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`\\b(?:${keys.join("|")})\\b`, "i");
}

const METHOD_PATTERNS: MethodPattern[] = [
  { name: "gate name", re: /\b(grounding|registry|provenance|authority|corroboration|contradiction|consensus)\s+gate\b/i },
  { name: "corroboration vocabulary", re: /\bcorroborat(?:e|ed|es|ion|ing)\b/i, blocks: isMethodVoiceCorroboration },
  { name: "source-count threshold", re: /\b(?:two|three|[0-9]+)\s+(?:independent|distinct)\s+sources?\b/i },
  { name: "source-count threshold", re: /(?:>=|at least)\s*[0-9]+\s+sources?\b/i },
  // FOUNDER-RULED 2026-08-19 — the PLURAL now matches. `weight[_\s]?key\b` did not, and the corpus
  // carries plurals ("tied to the relevant blocking weight keys", AWI-2607-030), so the sweep and
  // the gate were counting different things. They now count the same thing.
  { name: "firewall vocabulary", re: /\b(firewall|weight[_\s]?keys?|hard[_\s]?fail|validation\s+(?:gate|layer|version)|banned[_\s]?language)\b/i },
  // ── WEIGHT-KEY NAMES (founder-ruled 2026-08-19) ──
  // The rule above blocks the WORDS "weight key"; it never blocked the KEY NAMES, so
  // "registration_fabricated is not warranted" and "positive ones like no_enforcement_found"
  // reached client prose past every gate — real corpus shapes (AWI-2607-016, -023, -030).
  //
  // ⚠ LOW FALSE-POSITIVE BY CONSTRUCTION, WHICH IS WHY THIS IS NOT THE GRAMMAR-CHASING THE
  // FOUNDER RULED AGAINST TWICE: the keys are a CLOSED, CODE-OWNED set derived from the weights
  // registry, matched as exact snake_case identifiers on word boundaries. It cannot match ordinary
  // English — no client writes "registration_fabricated" in a product description.
  { name: "weight-key name", re: weightKeyNamePattern() },
];

/** Scan named text fields for method leakage. Returns violations as "field: pattern (excerpt)". */
export function scanForMethodLeakage(fields: Record<string, unknown>): string[] {
  const violations: string[] = [];
  const walk = (value: unknown, path: string): void => {
    if (typeof value === "string") {
      for (const p of METHOD_PATTERNS) {
        // Walk EVERY match, not just the first: with a carve-out in play, a passing match must
        // never mask a blocking one later in the same string. Still at most one violation per
        // pattern per field — the report shape is unchanged.
        const g = new RegExp(p.re.source, p.re.flags.includes("g") ? p.re.flags : `${p.re.flags}g`);
        let m: RegExpExecArray | null;
        while ((m = g.exec(value)) !== null) {
          if (p.blocks && !p.blocks(value, m)) continue;
          violations.push(`${path}: ${p.name} ("${m[0]}")`);
          break;
        }
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

// ── CLASS 4 — TRACK PROSE (founder-ruled 2026-08-18). THE COVERAGE HOLE, stated plainly:
//
//   scanner              | track prose | synthesis
//   banned language      |     yes     |    yes
//   derivation / method  |     NO      |    yes
//
// There are TWO client-facing prose surfaces and this scanner covered one. `weight[_\s]?key` has
// been in METHOD_PATTERNS the whole time — it simply never looked at track findings, so 9
// occurrences across 6 cases have been passing the publish gate and always have.
//
// ⚠ THE CENSUS NUMBER WILL RISE WHEN THIS LANDS. THAT IS THE CORRECT OUTCOME AND IT IS NOT A
// REGRESSION: nothing got worse today, the instrument stopped being blind. Read the rise as the
// measurement catching up with reality. (Same shape as the census/attempt skew: an instrument
// pinned to less than the thing it claims to measure.)
//
// SURFACE: the ALLOWLIST projection of each track row — the fields that actually cross to a
// client — NOT the whole raw row. Raw `compiled_findings_json` carries internal machinery
// (validation records, weight bookkeeping) whose field values legitimately contain this
// vocabulary and never reach anybody. Scanning it wholesale would manufacture false blocks, and a
// false refusal at publish is the failure mode this codebase has ruled against twice. No cleaning
// is applied first: the gate must see what the ENGINE wrote, not what a cleaner happened to hide.
export function scanTrackProseAtDelivery(
  rows: { track_key: string; compiled_findings_json?: unknown; questions_to_ask?: unknown }[],
): string[] {
  return rows.flatMap((r) =>
    scanForMethodLeakage({
      [`${r.track_key}`]: r.compiled_findings_json
        ? projectFindingJsonForClient(r.compiled_findings_json as Record<string, unknown>, r.track_key)
        : null,
      [`${r.track_key} (questions)`]: r.questions_to_ask ?? null,
    }),
  );
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
