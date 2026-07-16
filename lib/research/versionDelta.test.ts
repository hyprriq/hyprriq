import { describe, it, expect } from "vitest";
import { buildVersionDelta, formatVersionDelta } from "./versionDelta";

// ── S-2 (c) — R1, founder-RULED principle: the replay preflight's job is ATTRIBUTION, NOT
// PREVENTION. A5's backtest replays frozen attempts spanning VALIDATION 1.3.0 → 1.7.0 BY DESIGN —
// a hard stop would block the corpus it exists to measure (rerun-batch's STOP stays correct for
// batches spending money under changed rules). The delta is recorded and reported on EVERY replay
// so a divergence can never be misattributed to extraction noise. ──
describe("buildVersionDelta (attribution, never prevention)", () => {
  it("classifies changed / same / unknown — never throws, never blocks", () => {
    const d = buildVersionDelta(
      { validation_version: "1.3.0", synthesis_version: "0.0.0", prompt_version: null },
      { validation_version: "1.7.0", synthesis_version: "0.0.0", prompt_version: "0.0.0" },
    );
    expect(d.changed).toEqual([{ key: "validation_version", stored: "1.3.0", current: "1.7.0" }]);
    expect(d.same).toEqual(["synthesis_version"]);
    expect(d.unknown).toEqual(["prompt_version"]); // pre-IOS attempts: stated honestly, not guessed
  });

  it("all-same delta says so plainly", () => {
    const d = buildVersionDelta({ validation_version: "1.7.0" }, { validation_version: "1.7.0" });
    expect(d.changed).toEqual([]);
    expect(formatVersionDelta(d)).toContain("no version drift");
  });

  it("a changed delta names every key both-sided (the attribution record)", () => {
    const d = buildVersionDelta({ validation_version: "1.5.0" }, { validation_version: "1.7.0" });
    const line = formatVersionDelta(d);
    expect(line).toContain("validation_version");
    expect(line).toContain("1.5.0");
    expect(line).toContain("1.7.0");
    expect(line).toMatch(/ATTRIBUTION/i); // divergence on this replay is attributable, not noise
  });
});
