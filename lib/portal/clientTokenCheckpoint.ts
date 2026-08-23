// ── THE PRESENCE CHECKPOINT (founder-ruled 2026-08-18) — A BACKSTOP, NOT ANOTHER CLEANER.
//
// The founder's framing, recorded here because it IS the design: "every cleaner matches KNOWN BAD
// SHAPES, so any shape nobody imagined passes. A wider regex just moves the edge of imagination."
//
// ⛔ TWO LAWS. THEY ARE WRITTEN HERE SO NOBODY MERGES THEM LATER:
//   1. The cleaners in clientReport.ts are SHAPE-based. They may always miss. That is accepted.
//   2. This checkpoint is PRESENCE-based and MAY NEVER BE WIDENED INTO A SHAPE MATCHER. It does
//      not care about grammar, punctuation, position, or context. It asks one question — is the
//      token THERE — and refuses if it is. The moment someone adds grammar-awareness here to fix
//      a false positive, it stops being a backstop and becomes a third cleaner with the same
//      blind spot as the other two.
//
// ⚠ PLACEMENT IS COUNTER-INTUITIVE AND IS THE THING MOST LIKELY TO BE GOT WRONG. This sits on the
// CLIENT side of the projection — the OPPOSITE side from every other gate in this codebase. The
// delivery gate scans RAW `compiled_findings_json`, which is correct for banned language (cleaning
// only removes, so raw is a superset of projected). For internal tokens it INVERTS: raw ALWAYS
// legitimately carries `src_N` by founder ruling — it is the operator's source-checking leverage —
// so a token assertion built on raw would refuse every case on day one. Build it on raw and you
// have not made a stricter gate, you have made a gate that is wrong about every case.
//
// TOKEN RULES (ruled, and the exclusions matter as much as the inclusions):
//   · `src_\d+`         — asserted freely. Nothing legitimate in client prose looks like this.
//   · `EV-\d{3}`        — ANCHORED to exactly three digits. `EV-2000` is a product model, not a
//                         citation; asserting it would refuse a publish over a client's own SKU.
//   · bare `E-\d+`      — DROPPED. It collides with real product model numbers (E-40), and A FALSE
//                         REFUSAL AT PUBLISH IS THE WORST FAILURE MODE A BACKSTOP CAN HAVE.
//   · snake_case keys   — NOT asserted. They are safe in prose and the cleaners substitute them.
//
// ── A-NN AND RG-NN ARE ASSERTED (founder-locked 2026-08-22 — the open question, settled with
// numbers rather than judgement). The trade was a leak risk against a false-refusal risk from
// product-model collisions. A census over all 45 cases through the REAL client projection
// (scripts/marker-shape-census.ts) measured both sides:
//   · GENUINE LEAKS: 17 internal markers reaching a client surface across 4 cases — including
//     THREE ALREADY-DELIVERED reports (AWI-2608-033 "(RG02)", -038 "(A-010)", -039 "(A-014,
//     RG-002)"). Not theoretical. Two vocabularies the enumerated list never knew about did it:
//     the HYPHENATED A-NNN form, and RG entirely.
//   · FALSE POSITIVES in the A/RG space: ZERO — not one legitimate A-NN or RG-NN in 45 cases.
//   · REAL COLLISIONS EXIST, BUT IN OTHER PREFIXES: "(S-1, S-3, 10-K)" (true SEC filing names in
//     a true sentence) and the ASIN "B007EARF3O". That is precisely why this stays an ENUMERATED
//     corpus-derived vocabulary and must never become a general [A-Z]+-?\d+ matcher — that rule
//     would delete a client's own filings and SKUs to remove a marker.
// The cleaner strips these in grouped AND mixed citations now, so the corpus projects clean;
// these patterns are the BACKSTOP for the next shape, in the two prefixes measured collision-free.
// A false refusal is recoverable (operator edits prose via the override path, republishes); a
// marker on a paid report is not.
import { deepStrings } from "./deepStrings";
import { INTERNAL_CONTENT_PATTERNS } from "@/lib/integrity/checks";

// PRESENCE patterns. There is no grammar here and there must never be any.
const CHECKPOINT_TOKENS: { name: string; re: RegExp }[] = [
  { name: "src_N", re: /src_\d+/ },
  // (?!\d) anchors the three-digit form so EV-2000 (a model number) does not trip the gate.
  { name: "EV-NNN", re: /\bEV-\d{3}(?!\d)/ },
  // Corpus-measured 2026-08-22 (see the header): ZERO legitimate occurrences in 45 cases, while
  // the leaks that reached three DELIVERED reports lived here. The leading guard keeps these off
  // the tail of a longer identifier (an ASIN, a SKU); the trailing guard keeps A-1 out of A-1000.
  { name: "A-NN", re: /(?<![A-Za-z0-9_-])A-?\d{1,3}(?![A-Za-z0-9])/ },
  { name: "RG-NN", re: /(?<![A-Za-z0-9_-])RG-?\d{1,3}(?![A-Za-z0-9])/i },
];

// ── THE WIDER CLASS JOINS THE BACKSTOP (founder-locked 2026-08-22, item 1e). The marker leak
// was ONE INSTANCE of "internal content in a client-facing field". The class was measured across
// all 45 cases and found one more live example — "(brand_risk)" on a DELIVERED report, a track
// key the hand-written substitution list did not know in its short form. The substitution now
// derives from AREA_NAMES, and these patterns are the backstop for the next form nobody wrote
// down. Measured false positives across the corpus: ZERO for every pattern.
//
// The same law as above applies: PRESENCE ONLY, no grammar. These ask "is internal vocabulary
// there", never "does it read like a citation".
const CONTENT_TOKENS = INTERNAL_CONTENT_PATTERNS;

export interface TokenPresence {
  token: string;   // which pattern fired
  match: string;   // the literal text that matched
  path: string;    // where it was found, for the operator to go and look
  excerpt: string; // enough surrounding text to recognise it
}

// ── review_additions carry operator-pasted URLs. An operator pasting `/img/src_1.png` must not
// refuse a publish, so URL-valued content is normalised out BEFORE the assertion, per the ruling.
// This is NOT grammar-awareness about tokens (which is forbidden above) — it is a scope rule about
// which BYTES are in scope at all, applied before the presence test ever runs.
const URL_RE = /\b(?:https?:\/\/|www\.)\S+|\/\S+\.(?:png|jpe?g|gif|webp|svg|pdf)\b/gi;

const withoutUrls = (s: string): string => s.replace(URL_RE, " ");

/**
 * Find every internal token present in a client-bound value. Pure; returns findings rather than
 * throwing, so callers choose their own enforcement (publish REFUSES, diagnostics report).
 */
export function findInternalTokens(value: unknown): TokenPresence[] {
  const found: TokenPresence[] = [];
  for (const { path, value: raw } of deepStrings(value)) {
    const text = withoutUrls(raw);
    for (const { name, re } of [...CHECKPOINT_TOKENS, ...CONTENT_TOKENS]) {
      const m = new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`);
      let hit: RegExpExecArray | null;
      while ((hit = m.exec(text)) !== null) {
        found.push({
          token: name,
          match: hit[0],
          path,
          excerpt: raw.slice(Math.max(0, hit.index - 60), hit.index + hit[0].length + 60).trim(),
        });
      }
    }
  }
  return found;
}

export class InternalTokenLeak extends Error {
  readonly findings: TokenPresence[];
  constructor(context: string, findings: TokenPresence[]) {
    const detail = findings
      .slice(0, 5)
      .map((f) => `${f.token} "${f.match}" at ${f.path}: …${f.excerpt}…`)
      .join("\n  ");
    super(
      `Internal tokens present in client-bound content (${context}): ${findings.length} occurrence(s).\n  ${detail}` +
        (findings.length > 5 ? `\n  …and ${findings.length - 5} more.` : ""),
    );
    this.name = "InternalTokenLeak";
    this.findings = findings;
  }
}

/**
 * REFUSE if any internal token is present. This is the enforcement form, for the publish gate,
 * the PDF render and the email assembly — the points where bytes leave for a client.
 *
 * Loud by design. It must never be caught and defaulted into "send it anyway with the token in".
 */
export function assertNoInternalTokens(value: unknown, context: string): void {
  const findings = findInternalTokens(value);
  if (findings.length > 0) throw new InternalTokenLeak(context, findings);
}
