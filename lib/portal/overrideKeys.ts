// ── LOCATOR HIT → OVERRIDE KEY (the "Show + Fix" round-trip, 2026-08-20) ─────────────────────
//
// The publish gate's locators label hits for DISPLAY (`supplier_identity`, `brand_risk_assessment
// (questions)`, `supplier identity`, `synthesis`, and the method locator's map-key-prefixed
// paths), while the override overlay addresses records by ONE canonical convention
// (lib/portal/overlayDelivery.ts): `track:<key>` over { ...compiled, questions_to_ask },
// `synthesis` over { decision_snapshot, vendor_questions }, `identity` over { client_note }.
// This translator is the seam between the two — pure, fixture-locked, and the ONLY place the
// mapping lives. Returns null for hits that are NOT operator-overridable (M7 doubt fields are
// internal inputs, not client columns — a reword there would silently not apply).

export interface OverrideKey {
  target: string;     // 'track:<track_key>' | 'synthesis' | 'identity'
  field_path: string; // the overlay walker's path within that record
}

const QUESTIONS_SUFFIX = / \(questions\)$/;

export function overrideKeyForHit(hit: { target: string; path: string }): OverrideKey | null {
  const t = hit.target;
  const p = hit.path;

  if (t === "synthesis") {
    // M7 fields ride the method scan but are not client columns — not overridable.
    if (p === "doubt_rationale" || p === "doubt_focus") return null;
    return { target: "synthesis", field_path: p };
  }
  if (t === "supplier identity") return { target: "identity", field_path: "client_note" };

  // Banned-language questions locator: target "<key> (questions)", path "[0].reason".
  if (QUESTIONS_SUFFIX.test(t)) {
    const key = t.replace(QUESTIONS_SUFFIX, "");
    return { target: `track:${key}`, field_path: `questions_to_ask${p}` };
  }

  // Track hits. The banned-language locator paths are relative ("summary"); the METHOD locator
  // walks a map keyed by display label, so its paths arrive prefixed ("<key>.summary",
  // "<key> (questions)[0].reason") — strip the prefix back to the overlay's composite paths.
  const key = t;
  const qPrefix = `${key} (questions)`;
  if (p.startsWith(qPrefix)) return { target: `track:${key}`, field_path: `questions_to_ask${p.slice(qPrefix.length)}` };
  if (p.startsWith(`${key}.`)) return { target: `track:${key}`, field_path: p.slice(key.length + 1) };
  return { target: `track:${key}`, field_path: p };
}
