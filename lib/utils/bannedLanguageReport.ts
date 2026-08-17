// ── PUBLISH-BLOCK LOCATOR (founder-ruled 2026-08-17, "Show + Fix" piece 1).
//
// THE GATE IS NOT TOUCHED BY THIS FILE. It imports scanHard and adds nothing to it — no rule, no
// carve-out, no tier change. Its only job is to answer the question the operator could not answer:
// the delivery gate returned "prohibited language: confirms/certifies authorization" and nothing
// else — not which sentence, not which field, not which track. The only ways past it were a code
// deploy or a full case re-run, with a paying client waiting. That is the launch risk this closes.
//
// It walks the SAME structure the delivery gate walks, keeps the path it walked, and localises each
// label to the sentence that produced it — so the block becomes a five-second diagnosis and (piece
// 2) an editable target.
import { scanHard } from "@/lib/utils/banned-language";

export type BannedHit = {
  label: string;      // the gate's own label, verbatim — never re-worded here
  target: string;     // MACHINE key: 'track:supply_chain_relationship' | 'synthesis' | 'identity'
  path: string;       // MACHINE path within that record: 'questions_to_ask[1].reason'
  field_text: string; // the WHOLE field the hit lives in — what piece 2 gives the operator to edit
  where: string;      // display form of target › path
  sentence: string;   // the sentence that reproduces the label (or the field, if it spans sentences)
  fix: string;        // what to write instead — operator guidance, not a rule
};

// Same sentence split the census uses, so "which sentence" means the same thing in both tools.
const SENT = /(?<=[.!?])\s+/;
const MAX = 400;

// Operator guidance per label. Deliberately NOT exhaustive: the default covers every rule, and a
// specific entry is added only where the reword is non-obvious. This table cannot change what
// blocks — only what the operator is told to do about it.
const FIX: Record<string, string> = {
  "confirms/certifies authorization":
    "Reword the verb: 'supports', 'indicates', 'establishes' or 'shows' — e.g. \"the dealer locator listing supports current US authorization\". For the adjective use 'verified', 'documented' or 'on record' ('without documented authorization'). Never 'confirm/confirmed/confirmation' next to authorization, approval or authenticity, in any voice.",
  guarantee:
    "Remove the guarantee. State what the evidence shows, not what we promise. A denial ('we do not guarantee…') is mandated language and passes.",
  ungating:
    "We do not offer an ungating service. Describe the gating state as observed ('the listing is gated'), never as something we provide or promise.",
  "bare legitimacy verdict":
    "Describe rather than rule: 'consistent with an established wholesale operation', 'registered since 2014'. Do not write that the vendor is or is not legitimate.",
  "fraud verdict":
    "Attribute or drop it. 'Scam reports were found on X' is evidence; 'the vendor is a scam' is our verdict and cannot ship.",
  "purchase recommendation (either polarity)":
    "The verdict IS the recommendation. Remove buy/don't-buy language — the client reads the verdict for that.",
};
const DEFAULT_FIX =
  "This phrasing cannot ship to a client. Describe the observable signal and attribute it to its source instead of stating it as our conclusion.";

const clip = (s: string): string => {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > MAX ? `${t.slice(0, MAX)}…` : t;
};

/**
 * Walk `source` exactly as the delivery gate walks it, returning one hit per (label, location).
 * `target` names the record the structure came from — 'track:<key>', 'synthesis' or 'identity'.
 * `display` is the human label for it; defaults to the target.
 *
 * target + path + field_text are the MACHINE handle piece 2 keys an override on; where/sentence/fix
 * are what the operator reads. Both come from one walk so they can never disagree.
 */
export function locateBannedLanguage(source: unknown, target: string, display?: string): BannedHit[] {
  const hits: BannedHit[] = [];
  const seen = new Set<string>();
  const origin = display ?? target;

  const walk = (node: unknown, path: string) => {
    if (typeof node === "string") {
      const labels = scanHard(node);
      if (!labels.length) return;
      const where = path ? `${origin} › ${path}` : origin;
      for (const label of labels) {
        // Localise to the sentence that reproduces the label. A rule can span a sentence break
        // (the passive forms do), in which case no single sentence reproduces it — then the field
        // itself is the location, which is still infinitely more than a bare label.
        const sentence = node.split(SENT).find((s) => scanHard(s).includes(label)) ?? node;
        const key = `${label}|${where}|${sentence.slice(0, 80)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        hits.push({
          label, target, path, where,
          field_text: node,                       // WHOLE field, unclipped — the operator edits this
          sentence: clip(sentence),
          fix: FIX[label] ?? DEFAULT_FIX,
        });
      }
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((v, i) => walk(v, path ? `${path}[${i}]` : `[${i}]`));
      return;
    }
    if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node)) walk(v, path ? `${path}.${k}` : k);
    }
  };

  walk(source, "");
  return hits;
}

/** One-line summary for the audit row — the labels stay the record, the locations join them. */
export const summariseHits = (hits: BannedHit[]): string =>
  hits.map((h) => `${h.label} @ ${h.where}`).join(" | ");
