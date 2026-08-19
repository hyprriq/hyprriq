import { describe, it, expect } from "vitest";
import { CLIENT_SUMMARY_INSTRUCTION, parseClientSummary } from "./clientSummary.prompt";
import { TRACK_CLIENT_COPY } from "@/lib/content/trackClientCopy";
import { parseTrack1Output } from "./track1.prompt";
import { buildTrack1Prompt } from "./track1.prompt";
import { scanForMethodLeakage } from "./synthesisMethodScan";
import { scanHard } from "@/lib/utils/banned-language";
import { findInternalTokens } from "@/lib/portal/clientTokenCheckpoint";
import { TRACK1_OUTPUT_SCHEMA } from "@/lib/research/schemas/track1.schema";
import { TRACK2_OUTPUT_SCHEMA } from "@/lib/research/schemas/track2.schema";
import { TRACK3_OUTPUT_SCHEMA } from "@/lib/research/schemas/track3.schema";
import { TRACK4_OUTPUT_SCHEMA } from "@/lib/research/schemas/track4.schema";

// ── client_summary — THE ROOT-CAUSE FIX.
// `pipeline.steps.ts` assigned `summary: out.reasoning_notes` on all five write sites, and
// `summary` is client-allowlisted, so clients read the model's scratchpad. These fixtures lock the
// separation itself, not one case's text: the two fields are different things with different
// audiences, and nothing may reconnect them.

describe("the two fields stay separate — the whole point", () => {
  it("parses client_summary independently of reasoning_notes", () => {
    const parsed = parseTrack1Output({
      evidence_items: [],
      reasoning_notes: "No weight_key for domain age is proposed; src_12 is weak (E04).",
      client_summary: "The company has traded under the same name since 1998 and its registration is current.",
    });
    expect(parsed.reasoning_notes).toContain("weight_key");
    expect(parsed.client_summary).toBe("The company has traded under the same name since 1998 and its registration is current.");
  });

  it("⛔ NEVER falls back to reasoning_notes when client_summary is absent", () => {
    // A fallback would silently restore the defect AND look like it was working — the single most
    // important assertion in this file.
    const parsed = parseTrack1Output({ evidence_items: [], reasoning_notes: "internal scratchpad text" });
    expect(parsed.client_summary).toBe("");
    expect(parsed.client_summary).not.toContain("scratchpad");
  });

  it("returns \"\" for every non-string shape, so the writer's code-owned fallback takes over", () => {
    for (const v of [undefined, null, 42, {}, [], true]) {
      expect(parseClientSummary({ client_summary: v })).toBe("");
    }
    expect(parseClientSummary(null)).toBe("");
    expect(parseClientSummary(undefined)).toBe("");
  });

  it("a parse failure yields an empty client_summary, never a status string", () => {
    const parsed = parseTrack1Output({ _parse_error: true });
    expect(parsed.parse_failed).toBe(true);
    expect(parsed.client_summary).toBe("");
  });
});

// ── THE FROZEN-SURFACE PROOF. The founder's ruling that makes this buildable is precise: "the
// frozen rule protects the VERDICT — signals, weights, thresholds, vetoes. An added output field
// the verdict never reads does not touch it." That is a CHECKABLE claim, so it is checked here
// rather than asserted in a commit message. If a future edit makes scoring read client_summary,
// the ruling's premise is gone and this fails.
describe("PROOF: the verdict never reads client_summary", () => {
  const SCORING_SURFACES = [
    "lib/research/verdictEngine.ts",
    "lib/research/weights.ts",
    "lib/research/weightValidation.ts",
    "lib/research/synthesisCallB.ts",
    "lib/research/verdictViewModel.ts",
  ];

  it("no scoring, weighting or verdict module mentions the field", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const repo = path.resolve(__dirname, "../..");
    for (const rel of SCORING_SURFACES) {
      const full = path.join(repo, rel);
      if (!fs.existsSync(full)) continue; // the list is a superset; a missing file is not a failure
      expect(fs.readFileSync(full, "utf8"), `${rel} must never read client_summary`).not.toContain("client_summary");
    }
  });

  it("it is written ONLY to the client-facing summary, never to a scored field", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(path.resolve(__dirname, "../..", "lib/research/pipeline.steps.ts"), "utf8");
    // The single consuming site: compiled_findings_json.summary on the scored path.
    expect(src).toContain("summary: out.client_summary?.trim() || TRACK_CLIENT_COPY.missing_client_summary");
    // ⛔ And the defect it replaced must not come back anywhere in the file.
    expect(src).not.toContain("summary: out.reasoning_notes");
  });

  it("reasoning_notes is STILL STORED, unchanged — the operator keeps the scratchpad", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(path.resolve(__dirname, "../..", "lib/research/pipeline.steps.ts"), "utf8");
    expect(src).toContain("reasoning_notes: out.reasoning_notes");
  });
});

// ⚠⚠ THE LOCK THAT WAS MISSING, AND IT COST A LIVE CASE. The original fixtures proved the
// INSTRUCTION reached the prompt and that the PARSER handled the field — and never that the model
// was ALLOWED to return it. Every track uses a structured-output schema with
// additionalProperties:false, so client_summary was structurally FORBIDDEN: the model could not
// emit it, the parser correctly saw nothing, and the writer fell back to code-owned copy on every
// scored area. AWI-2608-039 — the first case ever run on p002 — rendered the placeholder three
// times instead of prose.
//
// A ban with no permission is not a contract. PROMPT, PARSER AND SCHEMA MUST ALL AGREE.
describe("SCHEMA PERMITS THE FIELD — the three-way contract, not two", () => {
  const SCHEMAS: [string, { required?: readonly string[]; properties?: Record<string, unknown>; additionalProperties?: boolean }][] = [
    ["track1", TRACK1_OUTPUT_SCHEMA],
    ["track2", TRACK2_OUTPUT_SCHEMA],
    ["track3", TRACK3_OUTPUT_SCHEMA],
    ["track4", TRACK4_OUTPUT_SCHEMA],
  ];

  for (const [name, schema] of SCHEMAS) {
    it(`${name}: additionalProperties is false, so the field MUST be declared to be emittable`, () => {
      expect(schema.additionalProperties).toBe(false);
      expect(schema.properties, `${name} schema must declare client_summary`).toHaveProperty("client_summary");
    });

    it(`${name}: client_summary is REQUIRED, so an omission is a schema violation, not a silent fallback`, () => {
      expect(schema.required).toContain("client_summary");
    });
  }
});

describe("the instruction reaches every finding track's prompt", () => {
  it("track 1 carries it, and names the field in the JSON contract", () => {
    const { system } = buildTrack1Prompt({ vendor_name: "X", vendor_website: null }, []);
    expect(system).toContain(CLIENT_SUMMARY_INSTRUCTION);
    expect(system).toContain("client_summary");
  });

  it("it bans the exact classes the corpus census found blocking track prose", () => {
    // Not aspirational wording — each of these was measured in real stored prose.
    for (const banned of ["weight_key", "first person", "src_N", "how many sources agreed"]) {
      expect(CLIENT_SUMMARY_INSTRUCTION).toContain(banned);
    }
  });

  it("it tells the model where the workings GO, rather than only banning them", () => {
    // A ban with no destination produces a model that hedges into the client field instead.
    expect(CLIENT_SUMMARY_INSTRUCTION).toContain("reasoning_notes");
  });
});

// ── THE CODE-OWNED COPY. These strings reach clients verbatim on the absence branches, where the
// model produced nothing to say. They are held to the same bar as any other client copy.
describe("code-owned client copy for tracks that produced no finding", () => {
  const all = Object.values(TRACK_CLIENT_COPY);

  it("carries no internal vocabulary of any kind", () => {
    for (const s of all) {
      expect(scanForMethodLeakage({ _: s })).toEqual([]);
      expect(findInternalTokens({ _: s })).toEqual([]);
      expect(s).not.toMatch(/track_\d|weight_key|acquisition|LLM|snake_case|_[a-z]+_/);
    }
  });

  it("passes the HARD banned-language gate — it ships to clients, so it must", () => {
    for (const s of all) expect(scanHard(s)).toEqual([]);
  });

  it("never accuses: absence is stated as a fact about the record", () => {
    expect(TRACK_CLIENT_COPY.nothing_to_review).toContain("No documents were provided");
    for (const s of all) expect(s).not.toMatch(/refus|fail(ed)? to provide|withheld|suspicious/i);
  });

  it("never claims a verdict effect we do not have", () => {
    for (const k of ["not_implemented", "nothing_to_review", "acquisition_failed", "llm_failed"] as const) {
      expect(TRACK_CLIENT_COPY[k]).toContain("neither raises nor lowers the verdict");
    }
  });

  it("the missing-summary fallback is NOT an error message — a client should not see machinery", () => {
    expect(TRACK_CLIENT_COPY.missing_client_summary).not.toMatch(/error|unavailable|missing|failed|null/i);
  });
});

// ── THE SHAPES THE AUTHOR DID NOT HAVE IN MIND. The acceptance bar: fixtures must cover what the
// rule was NOT written for. Each of these is a real way the model can hand back a bad field.
describe("adversarial client_summary content the writer must not pass through unnoticed", () => {
  const bad = [
    ["scratchpad copied verbatim", "No weight_key from the approved list can be responsibly proposed."],
    ["first person", "I could not determine whether the supplier is authorized."],
    ["source ids", "The registry lists the entity (src_4, EV-001)."],
    ["source counting", "Two independent sources corroborate the address."],
  ] as const;

  for (const [label, text] of bad) {
    it(`is DETECTED by the existing gates: ${label}`, () => {
      // client_summary is client-bound prose, so it is scanned by the same instruments as any
      // other client text. This proves the new field inherits the existing defences rather than
      // opening a fresh unscanned surface — the failure mode of every "just add a field" change.
      const caught =
        scanForMethodLeakage({ _: text }).length > 0 ||
        findInternalTokens({ _: text }).length > 0 ||
        scanHard(text).length > 0 ||
        /\b(I|we|my)\b/.test(text);
      expect(caught, `${label} slipped through every gate`).toBe(true);
    });
  }

  it("whitespace-only content is treated as absent, not as a summary", () => {
    expect(parseClientSummary({ client_summary: "   \n  " })).toBe("");
  });
  // ── CLOSED 2026-08-19 by founder ruling. This fixture found that a bare weight-key name passed
  // EVERY gate; the derivation scanner now carries the closed, registry-DERIVED key set.
  it("a raw weight-key name is now CAUGHT — the gap this fixture found, closed by ruling", () => {
    const text = "registration_fabricated is not warranted here.";
    expect(scanForMethodLeakage({ _: text }).join(" ")).toContain("weight-key name");
    // The instruction bans it too, so new prose should not contain it in the first place — belt
    // (the prompt) and braces (the gate).
    expect(CLIENT_SUMMARY_INSTRUCTION).toContain("snake_case");
  });
});
