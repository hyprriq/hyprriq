import { describe, it, expect } from "vitest";
import { buildIdentityPrompt, parseIdentityOutput } from "./identity.prompt";

const sources = [
  { source_id: "s1", url: "https://opencorporates.com/td-synnex", title: "TD SYNNEX Corp — registry", snippet: "Reg. NYSE: SNX" },
  { source_id: "s2", url: "https://tdsynnex.com", title: "TD SYNNEX — official", snippet: "Global distributor" },
];

describe("buildIdentityPrompt", () => {
  it("is pack-only, names the vendor, forbids invention, and lists the pack sources", () => {
    const { system, user } = buildIdentityPrompt("TD Synexx", sources);
    expect(system.toLowerCase()).toContain("do not browse");
    expect(system.toLowerCase()).toContain("do not invent");
    expect(user).toContain("TD Synexx");
    expect(user).toContain("s1");
    expect(user).toContain("s2");
  });
});

describe("parseIdentityOutput", () => {
  it("parses proposed candidates with domain + hints + cited source ids", () => {
    const r = parseIdentityOutput({
      candidates: [
        { domain: "tdsynnex.com", registration_hint: "NYSE: SNX", address_hint: "Fremont, CA", supporting_source_ids: ["s1", "s2"] },
      ],
      reasoning_notes: "one dominant entity",
    });
    expect(r.candidates).toHaveLength(1);
    expect(r.candidates[0].domain).toBe("tdsynnex.com");
    expect(r.candidates[0].supporting_source_ids).toEqual(["s1", "s2"]);
    expect(r.reasoning_notes).toBe("one dominant entity");
  });
  it("skips entries without a usable domain string", () => {
    const r = parseIdentityOutput({ candidates: [{ registration_hint: "x" }, { domain: 5 }] });
    expect(r.candidates).toEqual([]);
  });
  it("degrades to empty candidates on unparseable / error output", () => {
    expect(parseIdentityOutput({ _parse_error: true }).candidates).toEqual([]);
    expect(parseIdentityOutput(null).candidates).toEqual([]);
    expect(parseIdentityOutput("garbage").candidates).toEqual([]);
  });
});
