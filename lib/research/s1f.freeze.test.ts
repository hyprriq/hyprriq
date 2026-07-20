import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { SYNTHESIS_GAP_THRESHOLDS } from "@/lib/research/synthesisEngine";
import { deriveGapLevel } from "@/lib/research/doubtMatrix";
import { IOS } from "@/lib/research/ios";

// ── S-1f STEP 4 — THE FREEZE COMMIT'S LOCKS.
//
// (a) THE GAP-THRESHOLD RULING (founder, 2026-07-19, STOP #1): narrow 3 / material 8 / wide 13
//     over (unresolved_assertions + stored_unknowns). PROVISIONAL-PENDING-G4 — recorded as such.
//     These replace the loudly-flagged TEST_ONLY fixture that stood in through Steps 1–3.
// (b) THE VERSION BUMP: synthesis_version leaves the inert "0.0.0" placeholder, and BOTH forward
//     pins move in the SAME commit (the S-2 checklist law — the scripts fail loud until repinned).
//
// No threshold tuning lives here and none may be added: the numbers are the founder's authorship.
// A change to any value in this file is a founder ruling, not a refactor. ──

const SYNTHESIS_VERSION_AT_S1_FREEZE = "g005-1.0.0";

describe("S-1f Step 4 (a) — the founder-ruled gap thresholds are wired", () => {
  it("SYNTHESIS_GAP_THRESHOLDS is the RULING: narrow 3 / material 8 / wide 13 (not the TEST_ONLY 1/3/6)", () => {
    expect(SYNTHESIS_GAP_THRESHOLDS).toEqual({ narrow: 3, material: 8, wide: 13 });
  });

  it("the ruled boundaries derive the ruled levels at each edge (the thresholds are MINIMUMS, one below each is the level down)", () => {
    const at = (total: number) => deriveGapLevel({ unresolved_assertions: 0, stored_unknowns: total }, SYNTHESIS_GAP_THRESHOLDS);
    expect(at(0)).toBe("none");
    expect(at(2)).toBe("none");
    expect(at(3)).toBe("narrow");
    expect(at(7)).toBe("narrow");
    expect(at(8)).toBe("material");
    expect(at(12)).toBe("material");
    expect(at(13)).toBe("wide");
  });

  it("the axis sums BOTH terms — unresolved assertions and stored unknowns cross the boundary together", () => {
    expect(deriveGapLevel({ unresolved_assertions: 2, stored_unknowns: 1 }, SYNTHESIS_GAP_THRESHOLDS)).toBe("narrow");
    expect(deriveGapLevel({ unresolved_assertions: 4, stored_unknowns: 4 }, SYNTHESIS_GAP_THRESHOLDS)).toBe("material");
  });

  it("THE TEST-FIXTURE LOCK: production code no longer imports TEST_ONLY_GAP_THRESHOLDS (importing it outside tests is a defect, by the S-1e law)", () => {
    const src = readFileSync(join(__dirname, "synthesisEngine.ts"), "utf8");
    expect(src.includes("TEST_ONLY_GAP_THRESHOLDS"), "synthesisEngine.ts must not import the test-only fixture").toBe(false);
  });
});

describe("S-1f Step 4 (b) — the synthesis_version bump and BOTH forward pins move together", () => {
  it("synthesis_version has left the inert placeholder", () => {
    expect(IOS.synthesis_version).not.toBe("0.0.0");
    expect(IOS.synthesis_version).toBe(SYNTHESIS_VERSION_AT_S1_FREEZE);
  });

  it("BOTH forward pins carry the SAME value in this commit — a stale pin stops the script, which is the point of the law", () => {
    for (const script of ["scripts/rerun-batch.ts", "scripts/dispute-rerun.ts"]) {
      const src = readFileSync(join(process.cwd(), script), "utf8");
      expect(src.includes(`"${SYNTHESIS_VERSION_AT_S1_FREEZE}"`), `${script} must be repinned to ${SYNTHESIS_VERSION_AT_S1_FREEZE} in the freeze commit`).toBe(true);
      expect(src.includes('!== "0.0.0"'), `${script} still preflights against the retired placeholder`).toBe(false);
    }
  });
});
