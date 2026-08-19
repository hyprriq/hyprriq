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
// ⚠ NOT YET ASSERTED, PENDING A FOUNDER RULING: the `A\d{2}` citation vocabulary (A01, A05, A10).
// It is a real internal token — it is what defeated the cleaner's group matcher and carried three
// EV ids onto AWI-2608-034's delivered report — and AWI-2608-032 carries a residue the cleaner
// deliberately declines to touch ("(A10, unresolved)"). But `A10` collides with product model
// numbers exactly as `E-40` does, so asserting it trades a leak risk for a false-refusal risk.
// That trade is the founder's call, not this module's. Recorded, not silently decided either way.
import { deepStrings } from "./deepStrings";

// PRESENCE patterns. There is no grammar here and there must never be any.
const CHECKPOINT_TOKENS: { name: string; re: RegExp }[] = [
  { name: "src_N", re: /src_\d+/ },
  // (?!\d) anchors the three-digit form so EV-2000 (a model number) does not trip the gate.
  { name: "EV-NNN", re: /\bEV-\d{3}(?!\d)/ },
];

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
    for (const { name, re } of CHECKPOINT_TOKENS) {
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
