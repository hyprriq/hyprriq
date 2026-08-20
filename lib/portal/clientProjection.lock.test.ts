import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  projectQuestionsForClient, projectQuestionForClient, QUESTION_CLIENT_ALLOWLIST,
  FINDING_CLIENT_ALLOWLIST,
} from "./clientReport";
import { CLIENT_PROSE_SURFACE_RULE } from "@/lib/research/clientSummary.prompt";

// ═══════════════════════════════════════════════════════════════════════════════════════════
// THE CLASS, NOT THE INSTANCE.
//
// Three separate defects shipped with one cause: `questions_to_ask` had NO PROJECTION, so every
// consumer improvised and each improvised differently.
//   1. the Class 4 scanner read the raw row and blocked on `blocking_weight_key`
//   2. the publish-route LOCATOR did the same — written in the SAME commit as the fix for (1),
//      so the twin was missed and the panel over-reported 16 phrases when only 3 could block
//   3. `getCaseFindings` returned the whole object, so internal fields crossed the RSC boundary
//
// There was nothing to be right about. These tests assert the BOUNDARY now exists and that every
// consumer reads it — so a fourth instance cannot be written.
// ═══════════════════════════════════════════════════════════════════════════════════════════

const repo = path.resolve(__dirname, "../..");
const read = (rel: string) => fs.readFileSync(path.join(repo, rel), "utf8");

describe("the questions projection — allowlist by construction", () => {
  const raw = {
    question: "Can you provide a current authorization letter?",
    reason: "It would show whether the restriction is brand-level.",
    blocking_weight_key: "claims_authorization_unverified",
    priority: "high",
    brand: "Revitalash",
  };

  it("⛔ blocking_weight_key and priority NEVER cross", () => {
    const [q] = projectQuestionsForClient([raw]);
    expect(JSON.stringify(q)).not.toContain("claims_authorization_unverified");
    expect(q).not.toHaveProperty("blocking_weight_key");
    expect(q).not.toHaveProperty("priority");
  });

  it("carries exactly the ruled client fields", () => {
    expect(Object.keys(projectQuestionsForClient([raw])[0]).sort()).toEqual(["brand", "question", "reason"]);
    expect([...QUESTION_CLIENT_ALLOWLIST].sort()).toEqual(["brand", "question", "reason"]);
  });

  it("a FUTURE field is private by default — the whole point of an allowlist", () => {
    const [q] = projectQuestionsForClient([{ ...raw, internal_score: 9, gate_decision: "reject" }]);
    expect(q).not.toHaveProperty("internal_score");
    expect(q).not.toHaveProperty("gate_decision");
  });

  it("survives the shapes the corpus actually holds — legacy strings, junk, empties", () => {
    expect(projectQuestionsForClient(["Plain legacy question?"])[0].question).toBe("Plain legacy question?");
    expect(projectQuestionsForClient([null, undefined, 42, {}, { reason: "no question" }, "   "])).toEqual([]);
    expect(projectQuestionsForClient(null)).toEqual([]);
    expect(projectQuestionForClient({ question: "" })).toBeNull();
  });
});

describe("LOCK — every consumer reads the ONE projection, none reads the raw row", () => {
  const CONSUMERS = [
    ["lib/data/cases.ts", "the RSC boundary"],
    ["lib/admin/reviewView.ts", "the operator's client-view"],
    ["lib/research/synthesisMethodScan.ts", "the blocking scanner"],
    // 2026-08-20: the route's locator + checkpoint moved into the ONE gate composition — the lock
    // follows the projection to where it lives now, and a separate lock below pins the route to
    // that composition so it can never quietly re-inline a raw read.
    ["lib/portal/publishGate.ts", "the publish-gate composition"],
  ] as const;

  it("the publish route consumes the ONE gate composition — never a hand-rolled scanner set", () => {
    const src = read("app/api/admin/cases/[id]/review/route.ts");
    expect(src).toContain("composePublishGate");
    // The exact raw-questions shapes that shipped the defects must never return to the route.
    expect(src).not.toMatch(/questions_to_ask\s*\?\?\s*null/);
    expect(src).not.toMatch(/cleanClientProseDeep\(\s*r\.questions_to_ask\s*\)/);
    expect(src).not.toContain("scanFindingsForBannedLanguage");
  });

  for (const [file, what] of CONSUMERS) {
    it(`${what} (${file}) projects questions`, () => {
      expect(read(file)).toContain("projectQuestionsForClient");
    });

    it(`${what} does NOT pass questions_to_ask raw`, () => {
      const src = read(file);
      // The exact shapes that shipped the three defects.
      expect(src).not.toMatch(/questions_to_ask\s*\?\?\s*null/);
      expect(src).not.toMatch(/cleanClientProseDeep\(\s*r\.questions_to_ask\s*\)/);
    });
  }

  it("the client Finding type is CLIENT-shaped, not the internal contract", () => {
    const src = read("lib/data/cases.ts");
    // It was QuestionToAsk[], which REQUIRES blocking_weight_key — the client type literally
    // demanded the fields that must never cross.
    expect(src).toMatch(/questions_to_ask:\s*ClientQuestionRow\[\]/);
  });

  it("findings keep their own allowlist — the precedent this one follows", () => {
    expect(FINDING_CLIENT_ALLOWLIST.length).toBeGreaterThan(0);
  });
});

// ── THE PROSE DISCIPLINE IS SCOPED TO THE SURFACE, NOT TO A FIELD NAME.
// The first instruction said "client_summary MUST NOT contain…" while the same prompts told the
// model to emit blocking_weight_key. Naming that key in the adjacent `reason` was the model
// obeying BOTH. A rule that enumerates fields leaves the next field uncovered by default.
describe("the prose rule covers the SURFACE", () => {
  it("names the questions fields, not only client_summary", () => {
    expect(CLIENT_PROSE_SURFACE_RULE).toContain("questions_to_ask");
    expect(CLIENT_PROSE_SURFACE_RULE).toContain("reason");
  });

  it("states the boundary rather than a list of field names", () => {
    expect(CLIENT_PROSE_SURFACE_RULE).toMatch(/EVERY FIELD A CLIENT CAN READ/i);
  });

  it("still REQUIRES blocking_weight_key as structured data — the key field is not the enemy", () => {
    expect(CLIENT_PROSE_SURFACE_RULE).toMatch(/STILL A REQUIRED FIELD/i);
  });

  it("reaches every finding track's prompt", () => {
    for (const n of [1, 2, 3, 4]) {
      expect(read(`lib/research/track${n}.prompt.ts`), `track${n}`).toContain("CLIENT_PROSE_SURFACE_RULE");
    }
  });
});
