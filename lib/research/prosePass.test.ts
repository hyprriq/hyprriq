import { describe, it, expect } from "vitest";
import { buildTrack2Prompt } from "@/lib/research/track2.prompt";
import { buildTrack3Prompt } from "@/lib/research/track3.prompt";
import { buildTrack4Prompt } from "@/lib/research/track4.prompt";
import { buildCallCPrompt } from "@/lib/research/synthesisCallC.prompt";
import { IOS } from "@/lib/research/ios";
import { scanHard } from "@/lib/utils/banned-language";
import type { WidenedM1Record, SynthesisAssertion, HypothesisSet, RiskGap } from "@/lib/research/contracts";

// ── THE ENGINE-PROSE PASS (founder-ruled 2026-08-17) — ITS ACCEPTANCE LOCK.
//
// The banned-language census measured ONE residual class across 9 of 39 cases: the word "confirm"
// standing next to authorization, arriving through four different grammatical shells. Two founder-
// ruled gate rounds (5541857, 8997d6d) chased the grammar and could not close it — the ruling was
// to stop amending the gate and change what the ENGINE writes. THE GATE IS NOT TOUCHED BY THIS
// PASS: every assertion below runs the UNCHANGED scanHard.
//
// What this file locks:
//   (a) all four prompts carry the vocabulary rule, naming every shell the census actually found —
//       a later prompt edit cannot quietly narrow it back to "our voice only";
//   (b) the rule is a WORD rule, not a strength rule — the positives-first law survives in each
//       track (that is the whole risk of a vocabulary pass: hedging the finding to satisfy it);
//   (c) the version bump moved, so stored synthesis from the OLD prompts can never be reused;
//   (d) two-sided, on the census's OWN sentences: every real blocking sentence still blocks, and
//       its rule-compliant rewrite passes the gate. (d) is the one that proves the pass works. ──

const PROMPTS: Record<string, string> = {
  "track 2 (brand_relationship_finding)": buildTrack2Prompt(
    { vendor_name: "TD Synnex", brands: ["Lenovo", "Bosch"] },
    [{ source_id: "src_0", url: "u", title: "t", snippet: "s" }],
  ).system,
  "track 3 (brand_risk_finding)": buildTrack3Prompt(
    { vendor_name: "TD Synnex", brands: ["Lenovo"] },
    [{ source_id: "src_0", url: "u", title: "t", snippet: "s" }],
  ).system,
  "track 4 (documentation_finding)": buildTrack4Prompt(
    { vendor_name: "Acme Corp", brands: ["Lenovo"], unreadable: [] },
    [{ source_id: "src_0", url: "u", title: "t", snippet: "s" }],
  ).system,
  "synthesis call C (M9/M8)": buildCallCPrompt(
    { accepted: { items: [] } } as unknown as WidenedM1Record,
    [] as SynthesisAssertion[],
    { hypotheses: [], what_would_change_the_leader: "" } as HypothesisSet,
    [] as RiskGap[],
    [],
    ["Lenovo"],
  ).system,
};

describe("(a) every prompt in the pass carries the vocabulary rule, with every census shell named", () => {
  for (const [name, system] of Object.entries(PROMPTS)) {
    it(`${name}: bans the word next to authorization and gives the substitutes`, () => {
      expect(system).toContain("AUTHORIZATION VOCABULARY (ruled)");
      // the banned forms, spelled out (a partial list is a hole the census already paid for)
      for (const form of ["'confirm'", "'confirms'", "'confirmed'", "'confirming'", "'certified'"]) {
        expect(system, `${name} must name ${form}`).toContain(form);
      }
      // the substitutes — without them the model hedges instead of rewording
      // whitespace-tolerant: the prompt arrays wrap, so the phrase can carry a newline mid-list
      expect(system).toMatch(/SUPPORTS\s+\/\s+INDICATES\s+\/\s+ESTABLISHES\s+\/\s+SHOWS/);
      expect(system).toMatch(/VERIFIED\s+\/\s+DOCUMENTED\s+\/\s+ON RECORD/);
    });

    it(`${name}: names all four shells the census found (own voice, subject, passive, attributive) + questions`, () => {
      expect(system).toMatch(/own voice|your own voice/i);
      expect(system).toMatch(/named (artifact|document)/i);
      expect(system).toMatch(/passive/i);
      expect(system).toMatch(/attributive/i);
      expect(system).toMatch(/questions/i);
    });
  }
});

describe("(b) a WORD rule, never a strength rule — the positives-first law survives the pass", () => {
  for (const [name, system] of Object.entries(PROMPTS)) {
    it(`${name}: says so explicitly and forbids hedging as the fix`, () => {
      expect(system).toMatch(/WORD rule, not a strength rule/i);
      expect(system).toMatch(/never hedge/i);
    });
  }

  it("the three tracks still lead with the positives — and no longer INSTRUCT the banned word to do it", () => {
    for (const key of ["track 2 (brand_relationship_finding)", "track 3 (brand_risk_finding)", "track 4 (documentation_finding)"]) {
      expect(PROMPTS[key], `${key} lost positives-first`).toMatch(/VERIFIED POSITIVES FIRST/);
      expect(PROMPTS[key], `${key} still seeds the banned word as an instruction`).not.toMatch(/CONFIRMED POSITIVES/);
    }
  });
});

describe("(c) the version bump — stored synthesis from the old prompts can never be reused", () => {
  // ⚠ UPDATED 2026-08-19 (client_summary pass). These pinned the 08-17 literals exactly, so the
  // next prose pass necessarily broke them — which is the lock working, but it made the test a
  // maintenance item rather than an invariant. It now asserts THE PROPERTY THAT MATTERS (the
  // version left the placeholder and is not ANY previously-shipped value) plus the current pin,
  // and carries the history so a future pass adds one line instead of rewriting the intent.
  const SHIPPED_PROMPT_VERSIONS = ["0.0.0", "p001-1.0.0"];
  const SHIPPED_IOS_VERSIONS = ["HyprrIQ IOS v0.1-skeleton", "HyprrIQ IOS v0.2-prose"];

  it("prompt_version has left the inert placeholder and every previously-shipped value", () => {
    for (const old of SHIPPED_PROMPT_VERSIONS) expect(IOS.prompt_version).not.toBe(old);
    expect(IOS.prompt_version).toBe("p002-1.0.0");
  });
  it("ios_version — the memoization key (getSynthesisByEvidenceHash matches on it) — moved in the SAME commit", () => {
    for (const old of SHIPPED_IOS_VERSIONS) expect(IOS.ios_version).not.toBe(old);
    expect(IOS.ios_version).toBe("HyprrIQ IOS v0.3-client-summary");
  });
  it("synthesis_version is NOT touched by a prose pass (the S-2 forward pins stay valid)", () => {
    expect(IOS.synthesis_version).toBe("g005-1.0.0");
  });
});

// ── (d) TWO-SIDED, ON THE CENSUS'S OWN SENTENCES. Left column: verbatim from the 2026-08-17 census
// run (9/39), abridged only in length. Right column: the same claim under the ruled vocabulary —
// same strength, same scope, same specificity, one verb changed. ──
const CENSUS_PAIRS: { shell: string; blocks: string; rewritten: string }[] = [
  {
    shell: "passive + scope (AWI-2607-023, track 2 summary)",
    blocks: "PRODUCT LINE SCOPE: Authorization is confirmed across multiple Samsung product lines: mobile accessories, enterprise printing, and professional displays.",
    rewritten: "PRODUCT LINE SCOPE: Authorization is documented across multiple Samsung product lines: mobile accessories, enterprise printing, and professional displays.",
  },
  {
    shell: "passive + territory (AWI-2608-033, track 2 question reason)",
    blocks: "While Lenovo authorization is confirmed for US, UK, Belgium, and Mexico, the client's transaction territory should be matched to that scope.",
    rewritten: "While Lenovo authorization is documented for US, UK, Belgium, and Mexico, the client's transaction territory should be matched to that scope.",
  },
  {
    shell: "named-artifact subject (AWI-2608-033, track 2 auth_level_reasoning)",
    blocks: "Ingram Micro's 2025 Lenovo Playbook lists the vendor, and regional portals in Indonesia and ANZ confirm authorization.",
    rewritten: "Ingram Micro's 2025 Lenovo Playbook lists the vendor, and regional portals in Indonesia and ANZ support current authorization.",
  },
  {
    shell: "attributive noun phrase (AWI-2607-021, synthesis the_real_risk)",
    blocks: "Third-party resellers without confirmed authorization face counterfeit claim exposure and enforcement risk on Amazon.",
    rewritten: "Third-party resellers without documented authorization face counterfeit claim exposure and enforcement risk on Amazon.",
  },
];

describe("(d) the census's real sentences: each still blocks, each rewrite clears the UNCHANGED gate", () => {
  for (const { shell, blocks, rewritten } of CENSUS_PAIRS) {
    it(`${shell}: the sentence the engine used to write still blocks`, () => {
      expect(scanHard(blocks)).toContain("confirms/certifies authorization");
    });
    it(`${shell}: the sentence the ruled vocabulary produces passes`, () => {
      expect(scanHard(rewritten)).toEqual([]);
    });
  }
});
