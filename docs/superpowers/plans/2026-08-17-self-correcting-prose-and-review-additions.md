# Self-Correcting Prose Loop + Review Additions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The engine stops EMITTING banned language (self-scan → one targeted repair → escalate), every gate hit is logged so a recurring class surfaces as a prompt fix at source, and the operator can attach additive links/notes that reach the client and the PDF.

**Architecture:** A pure repair-guard module (`proseRepair.ts`, BUILT) plus a wrapper (`repairClientProse`) called from exactly **two lines** inside the frozen `pipeline.steps.ts` — after parse, before persist, at `stageFindingTrack` and `stageSynthesis`. The wrapper scans the same surface the delivery gate scans, regenerates one field once on a HARD hit, admits the rewrite only if all six invariants hold, and writes a `gate_events` row either way. Nothing in this plan reads or writes a scoring path.

**Tech Stack:** TypeScript, Next.js App Router, Supabase/Postgres, vitest, Anthropic via `lib/ai/runModel.ts`.

**Status at plan time:** `lib/research/proseRepair.ts` + tests are BUILT and green (11 tests). Both migrations are WRITTEN and awaiting the founder's hand. Everything below is unbuilt.

---

## Preconditions — ✅ BOTH DONE 2026-08-17

- [x] `supabase/migrations/20260818000000_gate_events.sql` — applied via MCP, read-back verified (table 1, rows 0, indexes 3, RLS true, policies 1; pattern query returns `[]` on empty rather than erroring).
- [x] `supabase/migrations/20260818000100_cases_review_additions.sql` — applied via MCP, read-back verified (`jsonb`/nullable, 0 rows carry a value, cases total unchanged at 39).

**Both tables/columns now exist and are EMPTY, and nothing reads them yet.** The fail-closed guidance that applied while they were pending no longer does: code can assume the schema is present. What still applies is the writer's fail-LOUD rule — a swallowed `gate_events` insert re-creates exactly the blind spot the table exists to remove (Task 4).

## File structure

| File | Responsibility |
|---|---|
| `lib/research/proseRepair.ts` | **BUILT.** Pure six-invariant guard. No IO. |
| `lib/research/proseRepairPrompt.ts` | NEW. The repair prompt. Its own version constant. |
| `lib/research/proseSelfScan.ts` | NEW. Scan surface + orchestration: scan → repair → check → log. The wrapper. |
| `lib/data/gateEvents.ts` | NEW. Insert-only writer for `gate_events`. |
| `lib/research/pipeline.steps.ts` | MODIFY. **Exactly two call lines.** Frozen surface. |
| `scripts/gate-census.ts` | MODIFY. Add the pattern report reading `gate_events`. |
| `lib/portal/reviewAdditions.ts` | NEW. Pure mutations over `cases.review_additions`. |
| `app/api/admin/cases/[id]/review-additions/route.ts` | NEW. Save/delete, gated at save. |
| `app/api/admin/cases/[id]/review/route.ts` | MODIFY. One line: additions join the delivery scan. |
| `components/portal/report-view.tsx` | MODIFY. "Added by our review team" section. |
| `scripts/pdf/report-document.tsx` | MODIFY (PDF lane). Additions must render. |

---

## Task 0: THE THREE-CLASS ENGINE-PROSE PASS — retire all three at source, in ONE pass

**Founder-ruled 2026-08-18: "Three classes, one pass — don't close them one at a time across three
sessions."** Do this BEFORE the repair loop. The loop is the safety net for what the engine still
gets wrong; every class retired at source is a class the net never has to catch.

**Files:** Modify `lib/research/synthesisCallC.prompt.ts` (classes 2+3), `lib/research/track2.prompt.ts`,
`track3.prompt.ts`, `track4.prompt.ts` (class 3); Modify `lib/research/ios.ts` (`prompt_version` bump);
Test: extend `lib/research/prosePass.test.ts`.

| # | Class | Status | Where it lives |
|---|---|---|---|
| 1 | confirms-authorization | ✅ done `cd68cfd` | all four prompts |
| 2 | **derivation / method vocabulary** | **open — blocks 034** | Call C (M9/M8/M7) |
| 3 | **bare legitimacy verdict** | **open — 3 cases** | all four prompts |

- [ ] **Step 1: Extend `prosePass.test.ts` with failing assertions for classes 2 and 3.** Assert Call C
      carries a METHOD VOCABULARY rule naming all four ruled patterns (corroboration vocabulary, gate
      names, source-count thresholds, firewall vocabulary) with substitutes; assert all four prompts
      carry a LEGITIMACY rule. Reuse the existing "WORD rule, not a strength rule" clause verbatim —
      it is the clause that made 033 reword rather than hedge.
- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Write the two rules**, additively, alongside the existing AUTHORIZATION VOCABULARY
      block. Method: *say what the sources do or do not show, never how many agreed; never a gate name,
      a count, a threshold, or firewall vocabulary.* Legitimacy: *describe observably — "consistent with
      an established wholesale operation", "registered since 2014" — never rule that the vendor is or is
      not legitimate.* Content instructions, veto definitions, attribution rules and output shapes stay
      byte-identical.
- [ ] **Step 4: Add two-sided fixtures** — the real blocking sentences from 034 and from 021/022/032
      into MUST_BLOCK, their rule-compliant rewrites into MUST_PASS, verified against the UNCHANGED
      scanners. **The gate is not touched by this task.**
- [ ] **Step 5: Bump `IOS.prompt_version`** `p001-1.0.0` → `p002-1.0.0` and `ios_version` with it (the
      memoization key — stored synthesis from the old prompts must never be reused). Update the pins in
      `prosePass.test.ts`.
- [ ] **Step 6: Full battery + `npx tsx … scripts/gate-census.ts`.** The MERGED census is the single
      acceptance number for all three classes — one instrument, one number, no per-class report.
- [ ] **Step 7: Commit.** Acceptance is founder-run: re-run 034 and one of 021/022/032, then re-census.

> **Read the census WITH the incomplete-attempt sweep.** An incomplete attempt suppresses the census
> (it scans near-empty records as clean) — that is how the legitimacy class stayed invisible until the
> stub cleanup. A falling number with rising stubs is false comfort.

---

## Task 1: The repair prompt, versioned

**Files:** Create `lib/research/proseRepairPrompt.ts`; Test `lib/research/proseRepairPrompt.test.ts`

> **Why a version constant:** `gate_events.prompt_version` answers "did the engine get better?". If the repair prompt changes without its own version, a drop in hits could equally mean "the repair got better at hiding it". Two versions, two questions.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { buildRepairPrompt, REPAIR_PROMPT_VERSION } from "@/lib/research/proseRepairPrompt";

describe("repair prompt", () => {
  it("carries the WORD-not-strength clause verbatim — the clause that made 033 come out clean", () => {
    const { system } = buildRepairPrompt("field text", "confirms/certifies authorization");
    expect(system).toMatch(/WORD rule, not a strength rule/i);
    expect(system).toMatch(/never hedge, soften, downgrade/i);
  });
  it("names the specific violation and forbids touching anything else", () => {
    const { user } = buildRepairPrompt("Portals confirm authorization.", "confirms/certifies authorization");
    expect(user).toContain("confirms/certifies authorization");
    expect(user).toContain("Portals confirm authorization.");
    expect(user).toMatch(/change ONLY/i);
  });
  it("is versioned independently of IOS.prompt_version", () => {
    expect(REPAIR_PROMPT_VERSION).toMatch(/^r\d+-\d+\.\d+\.\d+$/);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run lib/research/proseRepairPrompt.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
export const REPAIR_PROMPT_VERSION = "r001-1.0.0";

export function buildRepairPrompt(fieldText: string, label: string): { system: string; user: string } {
  const system = [
    "You repair ONE field of a due-diligence report that tripped a client-language gate.",
    "THIS IS A WORD RULE, NOT A STRENGTH RULE: never hedge, soften, downgrade or bury the finding.",
    "The claim, its polarity, its scope, every named entity, every src_N citation and every number",
    "must survive EXACTLY. Change ONLY the words that caused the violation.",
    "For authorization contexts write SUPPORTS / INDICATES / ESTABLISHES / SHOWS, and",
    "VERIFIED / DOCUMENTED / ON RECORD for the adjective.",
    "Return ONLY the repaired field text. No preamble, no explanation, no quotes.",
  ].join("\n");
  const user = [
    `VIOLATION: ${label}`,
    "FIELD (change ONLY what caused the violation):",
    fieldText,
  ].join("\n");
  return { system, user };
}
```

- [ ] **Step 4: Run tests — expect PASS**
- [ ] **Step 5: Commit**

```bash
git add lib/research/proseRepairPrompt.ts lib/research/proseRepairPrompt.test.ts
git commit -m "repair prompt for the self-correcting loop, independently versioned (r001-1.0.0)"
```

---

## Task 2: The scan surface must not be smaller than the publish gate's

**Files:** Create `lib/research/proseSelfScan.ts`; Test `lib/research/proseSelfScan.test.ts`

> **The correctness property:** if the self-scan reads fewer fields than the delivery gate, a case passes self-scan and still blocks at publish — which is the exact failure this whole feature exists to remove. Pin it with a test, not a comment.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { selfScanSurface } from "@/lib/research/proseSelfScan";
import { scanFindingsForBannedLanguage } from "@/lib/utils/banned-language";

describe("self-scan surface", () => {
  it("covers every string the delivery gate would scan", () => {
    const parsed = {
      brand_relationship_finding: "Portals confirm authorization.",
      reasoning_notes: "Dealers confirm authorization.",
      questions_to_ask: [{ question: "ok?", reason: "Records confirm authorization." }],
    };
    const surface = selfScanSurface(parsed, "track:supply_chain_relationship");
    const viaGate = scanFindingsForBannedLanguage(parsed);
    expect(surface.length).toBeGreaterThanOrEqual(viaGate.length);
    expect(surface.map((h) => h.label)).toEqual(expect.arrayContaining(viaGate));
  });
});
```

- [ ] **Step 2: Run it — expect FAIL (module not found)**

- [ ] **Step 3: Implement using the ALREADY-BUILT locator**

```ts
import { locateBannedLanguage, type BannedHit } from "@/lib/utils/bannedLanguageReport";

/** The self-scan surface IS the locator's walk — the same walk the delivery gate uses. */
export function selfScanSurface(parsed: unknown, target: string): BannedHit[] {
  return locateBannedLanguage(parsed, target);
}
```

- [ ] **Step 4: Run tests — expect PASS**
- [ ] **Step 5: Commit**

---

## Task 3: The repair loop — one retry, six invariants, escalate

**Files:** Modify `lib/research/proseSelfScan.ts`; Test same file's test

- [ ] **Step 1: Write the failing tests**

```ts
it("replaces the field when the repair is faithful", async () => {
  const out = await repairClientProse(
    { brand_relationship_finding: "Portals confirm authorization (src_1)." },
    "track:supply_chain_relationship",
    async () => "Portals support authorization (src_1).",
  );
  expect(out.value.brand_relationship_finding).toBe("Portals support authorization (src_1).");
  expect(out.events[0].outcome).toBe("repaired");
});

it("ESCALATES rather than accepting a repair that fails an invariant", async () => {
  const out = await repairClientProse(
    { brand_relationship_finding: "No positive confirmation of authorization exists (src_1)." },
    "track:supply_chain_relationship",
    async () => "Authorization was not fully documented (src_1).",
  );
  expect(out.value.brand_relationship_finding).toContain("No positive confirmation");  // original kept
  expect(out.events[0].outcome).toBe("escalated_invariant");
  expect(out.events[0].invariant_failures).toContain("localized_edit");
});

it("retries at most ONCE, then escalates", async () => {
  let calls = 0;
  const out = await repairClientProse(
    { f: "Portals confirm authorization." }, "track:t",
    async () => { calls++; return "Portals confirm authorization."; },
  );
  expect(calls).toBe(2);                       // initial + one retry
  expect(out.events[0].outcome).toBe("escalated_retry");
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement** (`repairClientProse(parsed, target, callModel)` — `callModel` injected so tests never hit the network): for each hit from `selfScanSurface`, call the model with `buildRepairPrompt(hit.field_text, hit.label)`, run `checkRepairInvariants(hit.field_text, repaired)`; on `[]` substitute the field and emit `outcome: "repaired"`; on failure retry ONCE; if the retry also fails emit `escalated_invariant` (invariant failure) or `escalated_retry` (still gate-blocked) and **leave the original untouched**.

- [ ] **Step 4: Run — expect PASS**
- [ ] **Step 5: Commit**

---

## Task 4: gate_events writer (fails closed until the migration lands)

**Files:** Create `lib/data/gateEvents.ts`; Test `lib/data/gateEvents.test.ts`

- [ ] **Step 1: Test** — a write that errors must throw loudly, never resolve silently (mirror `getProseOverrides`'s fail-loud comment; a swallowed write here re-creates exactly the blind spot this table exists to remove).
- [ ] **Step 2: Run — FAIL**
- [ ] **Step 3: Implement** insert-only writer taking `{case_id, attempt_number, target, field_path, label, sentence, outcome, invariant_failures, text_before, text_after, prompt_version, model_version}`.
- [ ] **Step 4: Run — PASS**
- [ ] **Step 5: Commit**

---

## Task 5: The two frozen call lines

**Files:** Modify `lib/research/pipeline.steps.ts` (`stageFindingTrack` ~:116, `stageSynthesis` ~:290)

> **Frozen surface — founder-ruled amendment 2026-08-17.** Exactly two lines. If this task's diff is longer than two call lines plus imports, STOP: the logic belongs in the wrapper.

- [ ] **Step 1:** In `stageFindingTrack`, after `parseTrackNOutput`, before the upsert: `const repaired = await repairClientProse(out, \`track:${trackKey}\`, callModel);` then persist `repaired.value` and write `repaired.events`.
- [ ] **Step 2:** Same shape in `stageSynthesis` after `parseCallCOutput`, target `"synthesis"`.
- [ ] **Step 3:** Run the FULL battery: `npx vitest run` — all existing pipeline tests must stay green (they pin persistence shapes).
- [ ] **Step 4:** `npx tsx --conditions=react-server --tsconfig tsconfig.json --env-file=.env.local scripts/rejudge-case.ts 15fc3396-68b9-4984-8d18-4b5224b8cf93 2` — expect `PASS`. The determinism proof must still hold after touching the pipeline.
- [ ] **Step 5:** Commit.

---

## Task 6: Census reads gate_events — the ruled threshold of 3

**Files:** Modify `scripts/gate-census.ts`

- [ ] **Step 1:** Add a third section running the pattern query from the migration's footer (label, prompt_version, ≥3 hits in 30 days), printing `FIX AT SOURCE:` per row.
- [ ] **Step 2:** Run the script; with an empty table it must print `(none)`, never crash.
- [ ] **Step 3:** Register on the existing daily-cron precedent (the degraded-write tripwire).
- [ ] **Step 4:** Commit.

---

## Task 7–9: Part B — review additions

- [ ] **Task 7:** `lib/portal/reviewAdditions.ts` — pure add/remove over the jsonb array, mirroring `lib/portal/additional-questions.ts`. Tests first.
- [ ] **Task 8:** `app/api/admin/cases/[id]/review-additions/route.ts` — auth/capability/scope guards copied from the review route; **`scanHard` on every string at save**, 422 with labels on a hit; audit row per change. Then **one line** in the review route so additions join the delivery scan — a test must assert an addition containing banned language blocks publish.
- [ ] **Task 9:** `report-view.tsx` renders an "Added by our review team" section reusing `QUESTION_SOURCE_LABEL` vocabulary. **PDF requirement goes into the PDF lane's spec in this same commit** — `scripts/pdf/report-document.tsx` must render additions; the lane is paused, so the spec entry is the deliverable now.

---

## Self-review

- **Spec coverage:** A1 Task 5 · A2 no task (cost is observational; the Opus price row is the founder's go-live checklist, deliberately out) · A3 Tasks 1+3 (guard BUILT) · A4 Task 5 step 4 · A5 Task 3 outcomes · A6 Tasks 4+6 · B Tasks 7–9.
- **Type consistency:** `repairClientProse` returns `{value, events}` in Tasks 3 and 5; `selfScanSurface` returns `BannedHit[]` in Tasks 2 and 3; `outcome` strings match the migration's CHECK-free text column in Tasks 3, 4, 6.
- **Open ruling carried forward:** do review additions survive a re-run? (Migration header. Intended: yes.)
