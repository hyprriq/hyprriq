// ── DERIVATION-RULE LOCATOR (founder-ruled 2026-08-17) — the second half of the publish gate,
// given the same treatment Piece 1 gave the first.
//
// WHY: the publish path runs TWO scanners — scanFindingsForBannedLanguage (language) and
// scanSynthesisAtDelivery (derivation-rule: gate names, corroboration counts, firewall vocabulary).
// Piece 1 taught the first to name its sentence, field and fix. The second still returns
// "decision_snapshot.leading_interpretation: corroboration vocabulary (\"corroborated\")" — a label
// and nothing else — which is why AWI-2608-034 has been held with no actionable diagnosis.
//
// IT RETURNS BannedHit, DELIBERATELY. Same type as the language locator, so the publish route can
// concatenate both into ONE findings array and the blocked-publish panel renders them identically
// with no UI change. Two scanners, one worklist, one number — which is the whole point of the
// ruling: the census measuring one of two instruments is the same defect class as the attempt skew.
//
// THE SCANNER ITSELF IS NOT TOUCHED. This file imports it and asks it, exactly as the language
// locator asks scanHard — so a rule change there can never drift from what the operator is told.
import { scanForMethodLeakage } from "@/lib/research/synthesisMethodScan";
import type { BannedHit } from "@/lib/utils/bannedLanguageReport";

const SENT = /(?<=[.!?])\s+/;
const MAX = 400;

// What to write instead, per ruled pattern class. The scanner names the class; this names the fix.
const FIX: Record<string, string> = {
  "gate name":
    "State WHAT IS UNVERIFIED, never what refused it or why. Drop the gate name entirely — the client never learns our internal stage names.",
  "corroboration vocabulary":
    "Say what the sources do or do not show, not how many agreed. \"The record does not show an authorisation relationship\" — never \"this was not corroborated\".",
  "source-count threshold":
    "Never state counts or thresholds. Describe what the evidence shows, not how much of it there was.",
  "firewall vocabulary":
    "Internal machinery — remove it. Weight keys, firewall, hard-fail and validation-layer vocabulary never reach a client in any form.",
};
const DEFAULT_FIX =
  "This is method narration — how the conclusion was reached. The client gets the conclusion and what is unverified, never the machinery.";

const clip = (s: string): string => {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > MAX ? `${t.slice(0, MAX)}…` : t;
};

/** Walk `fields` exactly as the scanner walks it, returning the sentence behind each violation. */
export function locateMethodLeakage(fields: Record<string, unknown>, target = "synthesis"): BannedHit[] {
  const hits: BannedHit[] = [];
  const seen = new Set<string>();

  const walk = (node: unknown, path: string) => {
    if (typeof node === "string") {
      // ASK THE SCANNER, never re-implement its patterns: one field at a time, so every violation
      // it reports is anchored to the string that produced it.
      const violations = scanForMethodLeakage({ _: node });
      for (const v of violations) {
        // Shape: "_: <pattern name> (\"<excerpt>\")"
        const m = /^_: (.+?) \("(.*)"\)$/.exec(v);
        const label = m?.[1] ?? v;
        const excerpt = m?.[2] ?? "";
        const sentence =
          (excerpt && node.split(SENT).find((s) => s.toLowerCase().includes(excerpt.toLowerCase()))) || node;
        const where = path ? `${target} › ${path}` : target;
        const key = `${label}|${where}|${excerpt}`;
        if (seen.has(key)) continue;
        seen.add(key);
        hits.push({
          label: `${label} ("${excerpt}")`,
          target, path, where,
          field_text: node,
          sentence: clip(sentence),
          fix: FIX[label] ?? DEFAULT_FIX,
        });
      }
      return;
    }
    if (Array.isArray(node)) { node.forEach((v, i) => walk(v, path ? `${path}[${i}]` : `[${i}]`)); return; }
    if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node)) walk(v, path ? `${path}.${k}` : k);
    }
  };

  for (const [k, v] of Object.entries(fields)) walk(v, k);
  return hits;
}

/** The delivery-gate composition, mirroring scanSynthesisAtDelivery's field set exactly. */
export function locateSynthesisMethodLeakage(synthesis: {
  module_9_decision_snapshot?: unknown;
  module_8_vendor_questions?: unknown;
  module_7_doubt_calibration?: { doubt_focus?: string; rationale?: string };
}): BannedHit[] {
  return locateMethodLeakage({
    decision_snapshot: synthesis.module_9_decision_snapshot ?? null,
    vendor_questions: synthesis.module_8_vendor_questions ?? null,
    doubt_rationale: synthesis.module_7_doubt_calibration?.rationale ?? null,
    doubt_focus: synthesis.module_7_doubt_calibration?.doubt_focus ?? null,
  });
}
