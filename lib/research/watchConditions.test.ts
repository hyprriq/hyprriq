import { describe, it, expect } from "vitest";
import { deriveWatchConditions } from "@/lib/research/watchConditions";
import type { HypothesisSet } from "@/lib/research/contracts";

// ── S-1f STEP 3 — A6 (ADDENDUM-1, APPROVED): per-hypothesis watch conditions + the
// prediction_correct scoring hook. WRITE-SIDE and UNBACKFILLABLE (G006's own law) — a case run
// before this lands has no watch conditions, forever; only cases from the next live one carry them.
//
// THE LAW THIS FILE ENFORCES: the derivation is a DETERMINISTIC STRUCTURAL PROJECTION of what the
// LLM already wrote in M5. It invents no semantics, paraphrases nothing, and asks no model. Every
// text field is carried VERBATIM or is null. Scoring is G4's half — at write time every scoring
// slot is null, which is precisely what makes the slot the unbackfillable artifact. ──

const set = (over: Partial<HypothesisSet> = {}): HypothesisSet => ({
  what_would_change_the_leader: "a distributor invoice naming the vendor",
  hypotheses: [
    { label: "genuine-wholesaler", interpretation: "A genuine wholesale operation.", supporting_evidence: ["e1", "e2"], contradicting_evidence: [], likelihood: "leading" },
    { label: "grey-market-reseller", interpretation: "Stock sourced outside authorized channels.", supporting_evidence: ["e3"], contradicting_evidence: ["e1"], likelihood: "alternative" },
  ],
  ...over,
});

describe("S-1f Step 3 — A6 watch conditions are derived per hypothesis, deterministically", () => {
  it("emits exactly one watch condition per hypothesis, in M5 order, with deterministic ids", () => {
    const w = deriveWatchConditions(set());
    expect(w).toHaveLength(2);
    expect(w.map((x) => x.watch_id)).toEqual(["wc-1", "wc-2"]);
    expect(w.map((x) => x.hypothesis_label)).toEqual(["genuine-wholesaler", "grey-market-reseller"]);
  });

  it("carries the M5 fields VERBATIM — labels, likelihood, and both evidence-id sides (nothing invented, nothing paraphrased)", () => {
    const [leading, alternative] = deriveWatchConditions(set());
    expect(leading).toMatchObject({
      hypothesis_label: "genuine-wholesaler", likelihood: "leading",
      rests_on: ["e1", "e2"], disconfirmed_by: [],
    });
    expect(alternative).toMatchObject({
      hypothesis_label: "grey-market-reseller", likelihood: "alternative",
      rests_on: ["e3"], disconfirmed_by: ["e1"],
    });
  });

  it("attaches the set-level what_would_change_the_leader to the LEADING hypothesis ONLY, verbatim — alternatives carry null (it is not their condition)", () => {
    const [leading, alternative] = deriveWatchConditions(set());
    expect(leading.what_would_change_the_leader).toBe("a distributor invoice naming the vendor");
    expect(alternative.what_would_change_the_leader).toBeNull();
  });

  it("THE SCORING HOOK: every slot is unscored at write time — prediction_correct and scored_at are null (G4 owns scoring; this is the slot it will fill)", () => {
    const all = deriveWatchConditions(set());
    expect(all, "the scoring-hook lock must run over real rows, never vacuously over []").toHaveLength(2);
    for (const w of all) {
      expect(w.prediction_correct).toBeNull();
      expect(w.scored_at).toBeNull();
    }
  });

  it("an empty hypothesis set derives no watch conditions (never a placeholder row)", () => {
    expect(deriveWatchConditions({ hypotheses: [], what_would_change_the_leader: "" })).toEqual([]);
  });

  it("an empty set-level what_would_change_the_leader stays null rather than becoming an empty string (absence is recorded as absence)", () => {
    const [leading] = deriveWatchConditions(set({ what_would_change_the_leader: "" }));
    expect(leading.what_would_change_the_leader).toBeNull();
  });

  it("determinism: identical input derives a deep-equal record", () => {
    const one = deriveWatchConditions(set());
    expect(one, "the determinism lock must compare real rows, never [] to []").toHaveLength(2);
    expect(one).toEqual(deriveWatchConditions(set()));
  });
});
