import { describe, it, expect } from "vitest";
import { scoreToBand, legacyConfidenceToBand } from "./confidence";

describe("confidence bands", () => {
  it("maps scores to ADR-G003 bands", () => {
    expect(scoreToBand(0)).toBe("low");
    expect(scoreToBand(3)).toBe("low");
    expect(scoreToBand(4)).toBe("moderate");
    expect(scoreToBand(7)).toBe("moderate");
    expect(scoreToBand(8)).toBe("high");
    expect(scoreToBand(11)).toBe("high");
    expect(scoreToBand(12)).toBe("verified");
    expect(scoreToBand(15)).toBe("verified");
  });
  it("maps legacy confidence to bands", () => {
    expect(legacyConfidenceToBand("low")).toBe("low");
    expect(legacyConfidenceToBand("medium")).toBe("moderate");
    expect(legacyConfidenceToBand("high")).toBe("high");
  });
});
