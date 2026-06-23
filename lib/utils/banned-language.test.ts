import { describe, it, expect } from "vitest";
import { scanForBannedLanguage, scanFindingsForBannedLanguage } from "./banned-language";

describe("banned language", () => {
  it("catches prohibited phrases", () => {
    expect(scanForBannedLanguage("This is an authorized seller")).toContain("authorized seller/distributor");
    expect(scanForBannedLanguage("we guarantee results")).toContain("guarantee");
    expect(scanForBannedLanguage("ungating service")).toContain("ungating");
    expect(scanForBannedLanguage("a verified supplier")).toContain("safe/approved/verified supplier");
  });
  it("passes clean evidence language", () => {
    expect(scanForBannedLanguage("No observable risk signals were found.")).toEqual([]);
    expect(scanForBannedLanguage("")).toEqual([]);
  });
  it("walks nested findings json", () => {
    const f = { summary: "official distributor", claims: [{ statement: "ok" }] };
    expect(scanFindingsForBannedLanguage(f)).toContain("official distributor");
  });
  it("returns empty for clean findings json", () => {
    const f = { summary: "Registration found in state registry.", claims: [] };
    expect(scanFindingsForBannedLanguage(f)).toEqual([]);
  });
});
