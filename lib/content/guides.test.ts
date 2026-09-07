import { describe, it, expect } from "vitest";
import { scanHard, scanAssertion } from "@/lib/utils/banned-language";
import { ASSESSMENT_AREA_KEYS } from "@/lib/constants/tracks";
import { AREA_NAMES } from "@/lib/content/reportCopy";
import { checklistGuide, areasGuide, areaGuideEntries } from "./guides";

// ── GUIDES 3 & 4 LOCKS (founder-directed 2026-09-07) ─────────────────────────────────────────
//
// Two locks, both derivation-shaped:
//   1. REGISTRY COVERAGE — the areas guide's per-area prose is keyed by track_key and the page
//      renders AREA_NAMES over ASSESSMENT_AREA_KEYS. If the registry gains, loses or renames an
//      area, this test fails BEFORE a client sees a guide describing a product that no longer
//      matches the registry. Both directions: an entry without a registry key is as much a drift
//      as a registry key without an entry.
//   2. THE GATE, BOTH TIERS — guide prose is HyprrIQ's OWN VOICE, so the assertion tier blocks
//      here rather than advising (the tier model's own rule: assertion vocabulary "blocks in
//      HyprrIQ's OWN-VOICE (code-templated) strings"). BL6 already scans this directory's
//      literals with the hard tier at commit; this adds the own-voice assertion-tier hold that
//      BL6 deliberately does not apply directory-wide.

function allStrings(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => allStrings(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => allStrings(x, out));
  return out;
}

const GUIDE_STRINGS = [
  ...allStrings(checklistGuide),
  ...allStrings(areasGuide),
  ...allStrings(areaGuideEntries),
];

describe("guides 3 & 4 — registry derivation", () => {
  it("area guide entries cover exactly the registry's assessment areas", () => {
    expect(Object.keys(areaGuideEntries).sort()).toEqual([...ASSESSMENT_AREA_KEYS].sort());
  });

  it("every registry area has a client-facing name for the guide to render", () => {
    for (const key of ASSESSMENT_AREA_KEYS) {
      expect(AREA_NAMES[key], `AREA_NAMES missing for ${key}`).toBeTruthy();
    }
  });
});

describe("guides 3 & 4 — banned-language gate (own-voice: both tiers block)", () => {
  it("HARD tier: no banned language in any guide string", () => {
    const offenders = GUIDE_STRINGS.flatMap((s) =>
      scanHard(s).map((label) => `[${label}] "${s.slice(0, 100)}"`),
    );
    expect(offenders, `hard-tier hits in guide prose:\n${offenders.join("\n")}`).toEqual([]);
  });

  it("ASSERTION tier: no status vocabulary in any guide string (own-voice ⇒ blocking)", () => {
    const offenders = GUIDE_STRINGS.flatMap((s) =>
      scanAssertion(s).map((label) => `[${label}] "${s.slice(0, 100)}"`),
    );
    expect(offenders, `assertion-tier hits in guide prose:\n${offenders.join("\n")}`).toEqual([]);
  });
});
