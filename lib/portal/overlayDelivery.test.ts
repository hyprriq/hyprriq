import { describe, it, expect } from "vitest";
import { overlayTrackRecord, overlaySynthesisClient, overlayIdentityNote, overlayTrackRows } from "@/lib/portal/overlayDelivery";
import type { ProseOverride } from "@/lib/portal/proseOverlay";

const t2 = (field_path: string, original_text: string, replacement_text: string): ProseOverride =>
  ({ target: "track:supply_chain_relationship", field_path, original_text, replacement_text });

describe("overlayTrackRecord — the composite convention", () => {
  const compiled = { summary: "Authorization is confirmed.", score: 3, nested: { keep: true } };
  const questions = [{ question: "Q1", reason: "the weight key fires" }, "a legacy plain-string question"];

  it("rewords a compiled field and a question reason through ONE target", () => {
    const r = overlayTrackRecord("supply_chain_relationship", compiled, questions, [
      t2("summary", "Authorization is confirmed.", "Authorization is documented."),
      t2("questions_to_ask[0].reason", "the weight key fires", "a published policy would show the source of the restriction"),
    ]);
    expect((r.compiled as { summary: string }).summary).toBe("Authorization is documented.");
    expect((r.questions as { reason: string }[])[0].reason).toBe("a published policy would show the source of the restriction");
    expect(r.failures).toEqual([]);
  });

  it("legacy plain-string questions are addressable — the corpus still contains them", () => {
    const r = overlayTrackRecord("supply_chain_relationship", compiled, questions, [
      t2("questions_to_ask[1]", "a legacy plain-string question", "a reworded legacy question"),
    ]);
    expect((r.questions as unknown[])[1]).toBe("a reworded legacy question");
  });

  it("never touches non-string machinery, and never mutates the inputs", () => {
    const before = JSON.stringify({ compiled, questions });
    const r = overlayTrackRecord("supply_chain_relationship", compiled, questions, [
      t2("summary", "Authorization is confirmed.", "Reworded."),
    ]);
    expect(JSON.stringify({ compiled, questions })).toBe(before);
    expect((r.compiled as { score: number }).score).toBe(3);
    expect((r.compiled as { nested: { keep: boolean } }).nested).toEqual({ keep: true });
  });

  it("null compiled with a question override still lands, and compiled stays null", () => {
    const r = overlayTrackRecord("supply_chain_relationship", null, questions, [
      t2("questions_to_ask[0].reason", "the weight key fires", "reworded"),
    ]);
    expect(r.compiled).toBeNull();
    expect((r.questions as { reason: string }[])[0].reason).toBe("reworded");
  });

  it("an override for ANOTHER track is invisible here — no apply, no failure", () => {
    const r = overlayTrackRecord("supplier_identity", compiled, questions, [
      t2("summary", "Authorization is confirmed.", "WRONG TRACK"),
    ]);
    expect(r.compiled).toBe(compiled);
    expect(r.failures).toEqual([]);
  });

  it("stale text and vanished paths surface as failures — never silently dropped", () => {
    const r = overlayTrackRecord("supply_chain_relationship", compiled, questions, [
      t2("summary", "text from a previous attempt", "x"),
      t2("a_field_that_never_existed", "y", "z"),
    ]);
    expect((r.compiled as { summary: string }).summary).toBe("Authorization is confirmed.");
    expect(r.failures).toHaveLength(2);
  });

  it("a compiled key literally named questions_to_ask cannot be shadowed silently", () => {
    // The composite spreads compiled first, then questions_to_ask overwrites — an override
    // addressed at questions_to_ask always hits the QUESTIONS column, never a compiled field of
    // that name. This test pins the precedence so a future collision is a visible decision.
    const weird = { questions_to_ask: "compiled-side text", summary: "s" };
    const r = overlayTrackRecord("supply_chain_relationship", weird, ["real question"], [
      t2("questions_to_ask[0]", "real question", "reworded question"),
    ]);
    expect((r.questions as unknown[])[0]).toBe("reworded question");
    expect((r.compiled as { questions_to_ask: string }).questions_to_ask).toBe("compiled-side text");
  });
});

describe("overlaySynthesisClient", () => {
  const snap = { headline: "h", what_to_verify: ["a", "the vendor is amazon approved", "c"] };
  const vq = [{ question: "is the vendor amazon approved?" }];

  it("rewords M9 array items and M8 questions", () => {
    const r = overlaySynthesisClient(snap, vq, [
      { target: "synthesis", field_path: "decision_snapshot.what_to_verify[1]", original_text: "the vendor is amazon approved", replacement_text: "whether the brand gates marketplace listings" },
      { target: "synthesis", field_path: "vendor_questions[0].question", original_text: "is the vendor amazon approved?", replacement_text: "does the brand restrict marketplace listings?" },
    ]);
    expect((r.decision_snapshot as { what_to_verify: string[] }).what_to_verify[1]).toBe("whether the brand gates marketplace listings");
    expect((r.vendor_questions as { question: string }[])[0].question).toBe("does the brand restrict marketplace listings?");
    expect(r.failures).toEqual([]);
  });

  it("track-targeted overrides never bleed into synthesis", () => {
    const r = overlaySynthesisClient(snap, vq, [
      { target: "track:supplier_identity", field_path: "decision_snapshot.headline", original_text: "h", replacement_text: "WRONG" },
    ]);
    expect(r.decision_snapshot).toBe(snap);
    expect(r.failures).toEqual([]);
  });

  it("null snapshot passes through — a stub attempt cannot crash the overlay", () => {
    const r = overlaySynthesisClient(null, null, [
      { target: "synthesis", field_path: "decision_snapshot.headline", original_text: "h", replacement_text: "x" },
    ]);
    expect(r.decision_snapshot).toBeNull();
    expect(r.failures).toHaveLength(1); // unmatched — reported, not swallowed
  });
});

describe("overlayIdentityNote", () => {
  it("rewords the client note when byte-identical", () => {
    const r = overlayIdentityNote("You entered X; we found Y.", [
      { target: "identity", field_path: "client_note", original_text: "You entered X; we found Y.", replacement_text: "Reworded note." },
    ]);
    expect(r.note).toBe("Reworded note.");
  });

  it("a null note stays null and reports the failure", () => {
    const r = overlayIdentityNote(null, [
      { target: "identity", field_path: "client_note", original_text: "gone", replacement_text: "x" },
    ]);
    expect(r.note).toBeNull();
    expect(r.failures).toHaveLength(1);
  });
});

describe("overlayTrackRows", () => {
  it("applies per-row by track_key and aggregates every failure", () => {
    const rows = [
      { track_key: "supply_chain_relationship", compiled_findings_json: { summary: "old" }, questions_to_ask: null },
      { track_key: "brand_risk_assessment", compiled_findings_json: { summary: "keep" }, questions_to_ask: null },
    ];
    const { rows: out, failures } = overlayTrackRows(rows, [
      t2("summary", "old", "new"),
      { target: "track:brand_risk_assessment", field_path: "summary", original_text: "stale", replacement_text: "x" },
    ]);
    expect((out[0].compiled_findings_json as { summary: string }).summary).toBe("new");
    expect((out[1].compiled_findings_json as { summary: string }).summary).toBe("keep");
    expect(failures).toEqual(["track:brand_risk_assessment›summary"]);
    // frozen inputs
    expect((rows[0].compiled_findings_json as { summary: string }).summary).toBe("old");
  });

  it("zero overrides is a pass-through of the SAME array — the identity case costs nothing", () => {
    const rows = [{ track_key: "supplier_identity", compiled_findings_json: null, questions_to_ask: null }];
    expect(overlayTrackRows(rows, []).rows).toBe(rows);
  });
});
