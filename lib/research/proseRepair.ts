// ── PROSE REPAIR INVARIANTS (Part A, founder-ruled 2026-08-17) — PURE. No IO, no model call.
//
// The self-correcting loop regenerates ONE client-facing field when the engine's own output trips
// the HARD gate. This file is the guard on that regeneration: it decides whether the rewrite is
// allowed to replace the original, or whether the case escalates to a human instead.
//
// THE RISK IT EXISTS FOR (founder's words): "a reword that quietly softens 'no positive
// confirmation of authorization exists' into something weaker is a correctness failure, not a
// style one" — and the gate would happily pass it, because the gate reads words, not claims.
//
// ⚠ FOUND WHILE BUILDING — READ THIS BEFORE TRUSTING THE FIVE (flagged, not slipped in):
//   The five ruled invariants DO NOT catch the founder's own example.
//     original: "No positive confirmation of authorization exists for Belgium (src_3)."
//     softened: "Authorization was not fully documented for Belgium (src_3)."
//   Citations survive, entities survive, numbers survive, LENGTH survives — and the NEGATION COUNT
//   is 1 on both sides ("No" -> "not"). All five pass. The claim still got weaker.
//   The five are necessary and not sufficient: each one guards against DELETION, and softening is
//   not a deletion — it is a substitution.
//   So a SIXTH is implemented here, and it is the one that actually holds the line:
//   LOCALIZED EDIT — the rewrite may only differ from the original NEAR a place the gate actually
//   matched. A wholesale reword of an untouched clause is refused no matter how clean it scans.
//   That is the mechanical form of the instruction "change only the flagged words", and it turns
//   "trust the model to preserve the claim" into "the model cannot reach the rest of the sentence".
//   The sixth is ON by default. Ruling it out is a founder call; leaving it out reopens the class.
import { scanHard } from "@/lib/utils/banned-language";

export type InvariantFailure = { invariant: string; detail: string };

const SRC = /\bsrc_\d+\b/g;
const NUMERIC = /\b\d[\d,.\/-]*%?\b/g;
// Proper nouns: ALL-CAPS tokens and mid-sentence capitalised words (sentence-initial words are
// capitalised by grammar, not by being names, so they are excluded to avoid false rejections).
const PROPER = /(?<![.!?]\s|^)\b[A-Z][A-Za-z0-9&'’.-]{2,}\b/g;
const NEGATION = /\b(?:no|not|never|none|neither|nor|without|absent|absence|cannot|can't|isn't|aren't|doesn't|don't|unverified|undocumented|unconfirmed|unable|lacks?|lacking|missing)\b/gi;

const setOf = (text: string, re: RegExp): string[] => (text.match(re) ?? []).map((s) => s.toLowerCase());
const countOf = (text: string, re: RegExp): number => (text.match(re) ?? []).length;
const missing = (a: string[], b: string[]): string[] => {
  const pool = [...b];
  const gone: string[] = [];
  for (const x of a) {
    const i = pool.indexOf(x);
    if (i === -1) gone.push(x); else pool.splice(i, 1);
  }
  return [...new Set(gone)];
};

/** Word-level regions that changed between original and repaired, as word indices into original. */
function changedWordRegions(original: string, repaired: string): { start: number; end: number }[] {
  const a = original.split(/\s+/), b = repaired.split(/\s+/);
  let head = 0;
  while (head < a.length && head < b.length && a[head] === b[head]) head++;
  let tail = 0;
  while (tail < a.length - head && tail < b.length - head && a[a.length - 1 - tail] === b[b.length - 1 - tail]) tail++;
  if (head === a.length && a.length === b.length) return [];
  return [{ start: head, end: Math.max(head, a.length - tail) }];
}

/** Word indices in `original` where the gate actually matched — the only places a repair may touch. */
function flaggedWordIndices(original: string): Set<number> {
  const out = new Set<number>();
  const words = original.split(/\s+/);
  // A word is "flagged" when removing it from its 6-word window changes what the gate reports —
  // approximated by scanning each sliding window and marking the window when it trips.
  for (let i = 0; i < words.length; i++) {
    const window = words.slice(Math.max(0, i - 3), i + 4).join(" ");
    if (scanHard(window).length) out.add(i);
  }
  return out;
}

export type RepairCheckOptions = {
  /** Founder-ruled floor: a repair may not collapse the field. */
  lengthFloor?: number;
  /** The sixth guard (see header). Default ON. */
  localizedEdit?: boolean;
  /** How far from a flagged word an edit may reach, in words. */
  editWindow?: number;
};

/**
 * Returns [] when the repair may replace the original. Any entry = REFUSE and escalate.
 * Every check is mechanical; none of them is a judgment about meaning.
 */
export function checkRepairInvariants(
  original: string,
  repaired: string,
  opts: RepairCheckOptions = {},
): InvariantFailure[] {
  const { lengthFloor = 0.6, localizedEdit = true, editWindow = 6 } = opts;
  const fails: InvariantFailure[] = [];

  // (1) CITATIONS — every src_N the engine cited must survive. Losing one strands a claim.
  const lostSrc = missing(setOf(original, SRC), setOf(repaired, SRC));
  if (lostSrc.length) fails.push({ invariant: "citations", detail: `dropped ${lostSrc.join(", ")}` });

  // (2) NAMED ENTITIES — brands, vendors, portals. A dropped brand silently widens or narrows scope.
  const lostProper = missing(setOf(original, PROPER), setOf(repaired, PROPER));
  if (lostProper.length) fails.push({ invariant: "entities", detail: `dropped ${lostProper.join(", ")}` });

  // (3) NUMBERS / TERRITORIES / DATES — "US, UK, Belgium, and Mexico" losing one is a scope change.
  const lostNum = missing(setOf(original, NUMERIC), setOf(repaired, NUMERIC));
  if (lostNum.length) fails.push({ invariant: "numbers", detail: `dropped ${lostNum.join(", ")}` });

  // (4) NEGATION COUNT — never fewer than the original carried. Guards deletion of a negation.
  const nBefore = countOf(original, NEGATION), nAfter = countOf(repaired, NEGATION);
  if (nAfter < nBefore) fails.push({ invariant: "negation", detail: `negation markers ${nBefore} -> ${nAfter}` });

  // (5) LENGTH FLOOR — a repair that collapses the field has dropped content, whatever else passed.
  if (repaired.trim().length < original.trim().length * lengthFloor) {
    fails.push({ invariant: "length", detail: `${original.trim().length} -> ${repaired.trim().length} chars (floor ${lengthFloor})` });
  }

  // (6) LOCALIZED EDIT — see the header. The one that catches SUBSTITUTION rather than deletion.
  if (localizedEdit) {
    const flagged = flaggedWordIndices(original);
    for (const region of changedWordRegions(original, repaired)) {
      let touchesFlagged = false;
      for (let i = Math.max(0, region.start - editWindow); i <= region.end + editWindow; i++) {
        if (flagged.has(i)) { touchesFlagged = true; break; }
      }
      if (!touchesFlagged) {
        fails.push({
          invariant: "localized_edit",
          detail: `rewrote words ${region.start}-${region.end}, which the gate never flagged — a repair may only change what it was asked to change`,
        });
      }
    }
  }

  // The repair is pointless if it still trips the gate; checked last so the report is complete.
  const still = scanHard(repaired);
  if (still.length) fails.push({ invariant: "still_blocked", detail: still.join(", ") });

  return fails;
}
