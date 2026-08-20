import { describe, it, expect } from "vitest";
import { overrideKeyForHit } from "@/lib/portal/overrideKeys";
import { locateBannedLanguage } from "@/lib/utils/bannedLanguageReport";
import { locateMethodLeakage } from "@/lib/research/methodScanReport";
import { overlayTrackRecord, overlaySynthesisClient, overlayIdentityNote } from "@/lib/portal/overlayDelivery";

// The round-trip that matters: a hit from the gate's OWN locators, translated, saved as an
// override, must LAND when the overlay applies it — target and path both. Fixtures drive the real
// locators end-to-end into the real overlay, never hand-built hit shapes alone.

describe("banned-language locator hits translate and LAND", () => {
  it("track compiled field: summary", () => {
    const compiled = { summary: "Authorization is confirmed for the US." };
    const hit = locateBannedLanguage(compiled, "supply_chain_relationship")[0];
    const key = overrideKeyForHit(hit)!;
    expect(key).toEqual({ target: "track:supply_chain_relationship", field_path: "summary" });
    const r = overlayTrackRecord("supply_chain_relationship", compiled, null, [
      { ...key, original_text: hit.field_text, replacement_text: "Authorization is documented for the US." },
    ]);
    expect((r.compiled as { summary: string }).summary).toBe("Authorization is documented for the US.");
    expect(r.failures).toEqual([]);
  });

  it("track questions: '<key> (questions)' + '[0].reason'", () => {
    const questions = [{ question: "Q", reason: "The vendor is amazon approved for listings." }];
    const hit = locateBannedLanguage(questions, "brand_risk_assessment (questions)")[0];
    const key = overrideKeyForHit(hit)!;
    expect(key).toEqual({ target: "track:brand_risk_assessment", field_path: "questions_to_ask[0].reason" });
    const r = overlayTrackRecord("brand_risk_assessment", null, questions, [
      { ...key, original_text: hit.field_text, replacement_text: "Whether the brand gates marketplace listings." },
    ]);
    expect((r.questions as { reason: string }[])[0].reason).toBe("Whether the brand gates marketplace listings.");
    expect(r.failures).toEqual([]);
  });

  it("synthesis M9 array item", () => {
    const snap = { what_to_verify: ["Is the vendor amazon approved?"] };
    const hit = locateBannedLanguage({ decision_snapshot: snap, vendor_questions: null }, "synthesis")[0];
    const key = overrideKeyForHit(hit)!;
    expect(key).toEqual({ target: "synthesis", field_path: "decision_snapshot.what_to_verify[0]" });
    const r = overlaySynthesisClient(snap, null, [
      { ...key, original_text: hit.field_text, replacement_text: "Does the brand gate marketplace listings?" },
    ]);
    expect((r.decision_snapshot as { what_to_verify: string[] }).what_to_verify[0]).toBe("Does the brand gate marketplace listings?");
    expect(r.failures).toEqual([]);
  });

  it("identity note: 'supplier identity' → identity/client_note", () => {
    const note = "We can guarantee this identity.";
    const hit = locateBannedLanguage({ client_note: note }, "supplier identity")[0];
    const key = overrideKeyForHit(hit)!;
    expect(key).toEqual({ target: "identity", field_path: "client_note" });
    const r = overlayIdentityNote(note, [
      { ...key, original_text: hit.field_text, replacement_text: "The identity is documented." },
    ]);
    expect(r.note).toBe("The identity is documented.");
  });
});

describe("method-locator hits — the map-key-prefixed paths", () => {
  it("track summary through the method locator strips the display prefix", () => {
    const projected = { summary: "The finding is corroborated by multiple independent sources." };
    const hit = locateMethodLeakage({ supplier_identity: projected }, "supplier_identity")[0];
    expect(hit.path).toBe("supplier_identity.summary"); // the display shape, pinned
    const key = overrideKeyForHit(hit)!;
    expect(key).toEqual({ target: "track:supplier_identity", field_path: "summary" });
  });

  it("track questions through the method locator", () => {
    const hit = locateMethodLeakage(
      { "brand_risk_assessment (questions)": [{ reason: "the corroboration threshold decides" }] },
      "brand_risk_assessment",
    )[0];
    const key = overrideKeyForHit(hit)!;
    expect(key).toEqual({ target: "track:brand_risk_assessment", field_path: "questions_to_ask[0].reason" });
  });

  it("M7 doubt fields are NOT overridable — null, never a key that silently won't apply", () => {
    for (const p of ["doubt_rationale", "doubt_focus"]) {
      expect(overrideKeyForHit({ target: "synthesis", path: p })).toBeNull();
    }
  });
});
