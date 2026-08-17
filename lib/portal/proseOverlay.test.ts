import { describe, it, expect } from "vitest";
import { applyProseOverrides, notApplied, type ProseOverride } from "@/lib/portal/proseOverlay";
import { scanFindingsForBannedLanguage } from "@/lib/utils/banned-language";
import { locateBannedLanguage } from "@/lib/utils/bannedLanguageReport";

// The real shape: a blocked Track 2 record from the 2026-08-17 census.
const BLOCKED = {
  brand_relationship_finding: "Authorization is confirmed for US, UK, Belgium, and Mexico.",
  auth_level_reasoning: "Auth level B: direct manufacturer relationship.",
  questions_to_ask: [
    { question: "Can you provide the distributor agreement?", reason: "Regional portals confirm authorization." },
  ],
};
const ov = (field_path: string, original_text: string, replacement_text: string): ProseOverride =>
  ({ target: "track:supply_chain_relationship", field_path, original_text, replacement_text });

describe("the override closes the block — the point of the whole feature", () => {
  it("a gate-blocked record becomes publishable once the operator's rewording is applied", () => {
    expect(scanFindingsForBannedLanguage(BLOCKED)).toContain("confirms/certifies authorization");

    const overrides = [
      ov("brand_relationship_finding", BLOCKED.brand_relationship_finding,
        "Authorization is documented for US, UK, Belgium, and Mexico."),
      ov("questions_to_ask[0].reason", BLOCKED.questions_to_ask[0].reason,
        "Regional portals support current authorization."),
    ];
    const r = applyProseOverrides(BLOCKED, "track:supply_chain_relationship", overrides);

    expect(r.applied).toHaveLength(2);
    expect(notApplied(r)).toEqual([]);
    expect(scanFindingsForBannedLanguage(r.value)).toEqual([]);   // <- publishable
  });

  it("the locator's own path is the key — locate then override round-trips with no translation", () => {
    const hit = locateBannedLanguage(BLOCKED, "track:supply_chain_relationship")
      .find((h) => h.path === "questions_to_ask[0].reason")!;
    expect(hit.field_text).toBe(BLOCKED.questions_to_ask[0].reason);

    const r = applyProseOverrides(BLOCKED, hit.target,
      [ov(hit.path, hit.field_text, "Regional portals support current authorization.")]);
    expect(r.applied).toEqual(["track:supply_chain_relationship›questions_to_ask[0].reason"]);
  });
});

describe("the frozen record is never touched", () => {
  it("returns a new structure and leaves the input byte-identical", () => {
    const before = JSON.stringify(BLOCKED);
    const r = applyProseOverrides(BLOCKED, "track:supply_chain_relationship",
      [ov("brand_relationship_finding", BLOCKED.brand_relationship_finding, "Reworded.")]);
    expect(JSON.stringify(BLOCKED)).toBe(before);
    expect(r.value).not.toBe(BLOCKED);
    expect((r.value as typeof BLOCKED).brand_relationship_finding).toBe("Reworded.");
  });

  it("untouched fields keep their exact values, including non-strings", () => {
    const src = { note: "confirm authorization", score: 12, flags: [true, null], nested: { keep: "me" } };
    const r = applyProseOverrides(src, "t", [{ target: "t", field_path: "note", original_text: "confirm authorization", replacement_text: "supports authorization" }]);
    expect(r.value).toEqual({ note: "supports authorization", score: 12, flags: [true, null], nested: { keep: "me" } });
  });
});

describe("staleness is a refusal, never a merge", () => {
  it("does NOT apply when the underlying text has moved on, and says so", () => {
    const r = applyProseOverrides(BLOCKED, "track:supply_chain_relationship",
      [ov("brand_relationship_finding", "text from a PREVIOUS attempt", "Reworded.")]);
    expect(r.applied).toEqual([]);
    expect(r.stale).toEqual(["track:supply_chain_relationship›brand_relationship_finding"]);
    // the engine's wording survives untouched — the override is inert, not destructive
    expect((r.value as typeof BLOCKED).brand_relationship_finding).toBe(BLOCKED.brand_relationship_finding);
  });

  it("separates a vanished PATH from moved TEXT — different problems, different fixes", () => {
    const r = applyProseOverrides(BLOCKED, "track:supply_chain_relationship", [
      ov("brand_relationship_finding", "old text", "x"),          // path exists, text moved -> stale
      ov("a_field_that_no_longer_exists", "old text", "y"),       // path gone -> unmatched
    ]);
    expect(r.stale).toEqual(["track:supply_chain_relationship›brand_relationship_finding"]);
    expect(r.unmatched).toEqual(["track:supply_chain_relationship›a_field_that_no_longer_exists"]);
    expect(notApplied(r)).toHaveLength(2);
  });

  it("a stale override can never re-open the gate: the blocked text stays blocked", () => {
    const r = applyProseOverrides(BLOCKED, "track:supply_chain_relationship",
      [ov("brand_relationship_finding", "stale", "Authorization is documented for the US.")]);
    expect(scanFindingsForBannedLanguage(r.value)).toContain("confirms/certifies authorization");
  });
});

describe("targeting", () => {
  it("ignores overrides belonging to another record — a synthesis edit never touches a track", () => {
    const r = applyProseOverrides(BLOCKED, "track:supply_chain_relationship",
      [{ target: "synthesis", field_path: "brand_relationship_finding", original_text: BLOCKED.brand_relationship_finding, replacement_text: "WRONG" }]);
    expect(r.applied).toEqual([]);
    expect((r.value as typeof BLOCKED).brand_relationship_finding).toBe(BLOCKED.brand_relationship_finding);
  });

  it("no overrides is a pass-through — the identity case costs nothing", () => {
    const r = applyProseOverrides(BLOCKED, "track:supply_chain_relationship", []);
    expect(r.value).toBe(BLOCKED);
  });
});
