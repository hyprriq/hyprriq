# H1 — Truth & Record (Case Investigation Ledger) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** DRAFT — founder-review artifact. **No code is written until this plan is approved.**
**Phase:** H1 ONLY (per ADR-G007 roadmap + OPEN_ITEMS Tier 1 item 1). Nothing from H2–H7 is bundled; analyst-style prompts are NOT here.

**Goal:** every pipeline execution is an immutable, numbered **attempt**; evidence packs and track rows are written per attempt and never overwritten; a delivered verdict can never be silently changed by a re-run.

**Architecture (ADR-G007, approved):** re-runs write `attempt_number = max+1` (the UNIQUE `(case_id, track, attempt_number)` already exists and is currently bypassed by the hard-coded `attempt_number: 1`); delivery pins `cases.delivered_attempt`; `stageFinalize`/`stageSetRunning`/`stagePersistIdentity` refuse to mutate a delivered case (a re-investigation instead sets `reinvestigation_pending`); readers resolve to the delivered attempt (client) or the latest attempt (admin/pipeline). A read-only re-judge script proves the verdict is reproducible from the stored record.

**Tech stack:** existing only — TypeScript, supabase-js, Inngest, vitest (house mock pattern: `vi.hoisted` + `vi.mock("@/lib/supabase/admin")`). No new dependencies.

**Frozen-core guarantee:** `deriveTrackSignal`, `computeVerdict`, `weights.ts`, the 6-gate firewall, Evidence Pack `schema_version 1.0.0` fields, ADR-G003/G004 — **untouched**. The one shared-contract edit is one optional field `attempt_number?: number` on `TrackContext` (orchestration plumbing, same precedent as `supplier_identity`); flagged here for explicit founder approval.

**Explicit scope deviations from the design spec (for founder sign-off):**
1. The "replay from stored packs through the LLM" seam is **deferred to H7** (the consensus gate consumes it there). H1 ships the deterministic re-judge instead (stored evidence → signals → verdict, zero API calls) — that is the determinism proof AT-3 needs. Rationale: keeps H1 out of `track1.ts`/`track2.ts` internals.
2. `case_acquisition_metrics` is NOT attempt-tagged (ops data, append-only is fine; YAGNI).

**Known limitations accepted in H1 (documented, addressed later):** two *concurrent* runs of the same case could compute the same next attempt and collide (H2 adds the concurrency guard; today re-runs are founder-initiated and serial). Pre-H1 history destroyed by the July-4 overwrites is unrecoverable from the DB (exists only in `backups/rerun-*`).

---

## ACCEPTANCE TESTS (defined up front — founder validates these before H1 freezes)

**AT-1 — a re-run writes a new attempt and does not overwrite the prior one.**
Founder runs (after deploy) on ONE non-delivered test case via the updated harness (`npx tsx --env-file=.env scripts/rerun-batch.ts --run` with a single case in `CASES`), then verifies in Supabase SQL editor:
```sql
-- expect two attempt sets; attempt-1 updated_at UNCHANGED from before the re-run
SELECT attempt_number, count(*) AS rows, max(updated_at) AS last_touched
FROM case_track_results WHERE case_id = '<CASE_ID>' GROUP BY attempt_number ORDER BY attempt_number;
-- expect packs for both attempts, none overwritten
SELECT attempt_number, track_key, collected_at FROM case_evidence_packs
WHERE case_id = '<CASE_ID>' ORDER BY attempt_number, track_key;
```
PASS = attempt 1 rows exist with pre-re-run `updated_at`; attempt 2 rows exist; `case_synthesis` has one row per attempt; `audit_log` has a `reinvestigation_attempt: 2` entry.

**AT-2 — a delivered verdict stays frozen when re-investigated.**
Founder publishes a test case (admin → publish), records `verdict`, `status`, `delivered_at`, `delivered_attempt`, then re-runs it. Verify:
```sql
SELECT verdict, status, delivered_at, delivered_attempt, reinvestigation_pending
FROM cases WHERE id = '<CASE_ID>';
```
PASS = `verdict`/`status`/`delivered_at`/`delivered_attempt` identical to pre-re-run; `reinvestigation_pending = true`; the client case page shows the delivered attempt's findings (unchanged); the new attempt's rows exist in `case_track_results`.

**AT-3 — the delivered verdict is reproducible from the stored record (determinism of record).**
```
npx tsx --env-file=.env scripts/rejudge-case.ts <CASE_ID>
```
PASS = recomputed signals + verdict from stored `evidence_items` match the stored `track_verdict_signal`s and `cases.verdict`, printed as a table, exit code 0. (Read-only; zero API calls.)

---

## MIGRATION — ⚠️ FOUNDER-RUN, FLAGGED SEPARATELY ⚠️

**One file, three parts (A/B/C), each independently verifiable.** I write the file; the founder runs it in the Supabase SQL editor; code tasks only merge after the founder confirms via the verification queries.

**File to create:** `supabase/migrations/20260706000000_h1_case_investigation_ledger.sql`

```sql
-- ============================================================
-- H1 — Case Investigation Ledger (ADR-G007). FOUNDER-RUN.
-- A: case_evidence_packs gains attempt_number (+backfill by time, then UNIQUE)
-- B: case_synthesis becomes per-attempt (UNIQUE(case_id) → UNIQUE(case_id, attempt_number))
-- C: cases gains delivered_attempt (pin) + reinvestigation_pending (flag)
-- DEPLOY WINDOW: run A+B+C, then deploy the H1 code promptly. Between B and the
-- code deploy, the OLD code's synthesis upsert (onConflict "case_id") will FAIL LOUDLY
-- and Inngest will retry — run this while no cases are in flight (test corpus).
-- ============================================================
BEGIN;

-- ── Part A — case_evidence_packs ──
ALTER TABLE case_evidence_packs ADD COLUMN IF NOT EXISTS attempt_number int;
-- Backfill: number existing packs 1..n per (case_id, track_key) by collection time.
-- The July-4 re-runs appended packs (never overwrote), so this reconstructs true attempt
-- history for packs even though the corresponding track rows were overwritten in place.
WITH numbered AS (
  SELECT id, row_number() OVER (PARTITION BY case_id, track_key ORDER BY created_at, id) AS rn
  FROM case_evidence_packs
)
UPDATE case_evidence_packs p SET attempt_number = n.rn FROM numbered n WHERE p.id = n.id;
ALTER TABLE case_evidence_packs ALTER COLUMN attempt_number SET NOT NULL;
ALTER TABLE case_evidence_packs ALTER COLUMN attempt_number SET DEFAULT 1;
-- Full (not partial) UNIQUE so supabase-js upsert onConflict can target it.
ALTER TABLE case_evidence_packs
  ADD CONSTRAINT case_evidence_packs_case_track_attempt_key UNIQUE (case_id, track_key, attempt_number);

-- ── Part B — case_synthesis per attempt ──
ALTER TABLE case_synthesis ADD COLUMN IF NOT EXISTS attempt_number int NOT NULL DEFAULT 1;
ALTER TABLE case_synthesis DROP CONSTRAINT IF EXISTS case_synthesis_case_id_key;
ALTER TABLE case_synthesis
  ADD CONSTRAINT case_synthesis_case_attempt_key UNIQUE (case_id, attempt_number);

-- ── Part C — cases: delivery pin + re-investigation flag ──
ALTER TABLE cases ADD COLUMN IF NOT EXISTS delivered_attempt int;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS reinvestigation_pending boolean NOT NULL DEFAULT false;
-- Backfill the one delivered case (manual Morendelli) to attempt 1.
UPDATE cases SET delivered_attempt = 1 WHERE status IN ('delivered','complete') AND delivered_attempt IS NULL;

COMMIT;

-- ── POST-APPLY VERIFICATION (founder runs; confirm before code merges) ──
-- A: expect 0 rows (no duplicate attempts):
--   SELECT case_id, track_key, attempt_number, count(*) FROM case_evidence_packs
--   GROUP BY 1,2,3 HAVING count(*) > 1;
-- A: expect the 8 re-run cases to show attempts up to 4:
--   SELECT case_id, max(attempt_number) FROM case_evidence_packs GROUP BY 1 ORDER BY 2 DESC LIMIT 10;
-- B: SELECT constraint_name FROM information_schema.table_constraints
--    WHERE table_name='case_synthesis' AND constraint_type='UNIQUE';  -- expect case_synthesis_case_attempt_key
-- C: SELECT column_name FROM information_schema.columns WHERE table_name='cases'
--    AND column_name IN ('delivered_attempt','reinvestigation_pending');  -- expect 2 rows
-- audit_log nullability check (Task 3 uses actor_id:'system'; if actor_id is NOT NULL this confirms it's safe):
--   SELECT column_name, is_nullable FROM information_schema.columns
--   WHERE table_name='audit_log' AND column_name IN ('actor_id','actor_type');
```

**Schema changes, itemized for founder sign-off:**
| # | Table | Change | Destructive? |
|---|---|---|---|
| A1 | `case_evidence_packs` | ADD `attempt_number int NOT NULL DEFAULT 1` + backfill by time | No (additive; backfill renumbers a column that didn't exist) |
| A2 | `case_evidence_packs` | ADD UNIQUE `(case_id, track_key, attempt_number)` | No (verification A proves no dupes first) |
| B1 | `case_synthesis` | ADD `attempt_number int NOT NULL DEFAULT 1` | No |
| B2 | `case_synthesis` | DROP UNIQUE `(case_id)` → ADD UNIQUE `(case_id, attempt_number)` | **Constraint swap** — creates the deploy window noted above |
| C1 | `cases` | ADD `delivered_attempt int NULL` + backfill delivered case | No |
| C2 | `cases` | ADD `reinvestigation_pending boolean NOT NULL DEFAULT false` | No |

`case_track_results` needs **no schema change** (`attempt_number` + UNIQUE already exist from `20260623000000`).

---

## TASKS (execute only after founder approves plan + runs migration)

### Task 1: `TrackContext.attempt_number` (contract plumbing)

**Files:** Modify: `lib/research/contracts.ts:69-77`

- [ ] **Step 1:** Add the optional field to `TrackContext`:
```ts
export interface TrackContext {
  case_id: string;
  vendor_name: string | null;
  vendor_website: string | null;
  supplier_identity?: SupplierIdentity; // Phase 5.1c.5 — resolved identity (Track 0.5); tracks read resolved_domain
  attempt_number?: number; // H1 — this execution's investigation attempt (1 = first run; re-runs increment). Orchestration plumbing, not a research input.
  brands_submitted: string[];
  marketplace: string;
  plan_type: PlanType;
}
```
- [ ] **Step 2:** Run `npx tsc --noEmit` → expect PASS (optional field, no callers break).
- [ ] **Step 3:** Commit: `git commit -am "H1: TrackContext.attempt_number (investigation attempt plumbing)"`

### Task 2: attempt resolution + explicit attempt writes (`lib/data/track-results.ts`)

**Files:** Modify: `lib/data/track-results.ts:57-66` · Test: Create `lib/data/track-results.test.ts`

- [ ] **Step 1: Write the failing tests** (house mock pattern):
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { maybeSingle, from, upsert } = vi.hoisted(() => {
  const maybeSingle = vi.fn();
  const limit = vi.fn(() => ({ maybeSingle }));
  const order = vi.fn(() => ({ limit }));
  const eq = vi.fn(() => ({ order }));
  const select = vi.fn(() => ({ eq }));
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn(() => ({ select, upsert }));
  return { maybeSingle, from, upsert };
});
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: { from } }));

import { getNextAttemptNumber, upsertTrackResult } from "./track-results";

beforeEach(() => { from.mockClear(); upsert.mockClear(); maybeSingle.mockReset(); });

describe("getNextAttemptNumber (H1 Case Investigation Ledger)", () => {
  it("returns 1 for a case with no prior rows or packs", async () => {
    maybeSingle.mockResolvedValue({ data: null });
    expect(await getNextAttemptNumber("c1")).toBe(1);
  });
  it("returns max(track rows, packs)+1 — packs count even where track rows were overwritten pre-H1", async () => {
    maybeSingle
      .mockResolvedValueOnce({ data: { attempt_number: 1 } })   // case_track_results max
      .mockResolvedValueOnce({ data: { attempt_number: 4 } });  // case_evidence_packs max (July-4 history)
    expect(await getNextAttemptNumber("c1")).toBe(5);
  });
});

describe("upsertTrackResult (H1)", () => {
  it("writes the caller's attempt_number — no hardcoded 1", async () => {
    await upsertTrackResult({ case_id: "c1", track: "track_1", track_key: "supplier_identity", track_number: 1, attempt_number: 2 });
    expect(upsert.mock.calls[0][0].attempt_number).toBe(2);
    expect(upsert.mock.calls[0][1]).toEqual({ onConflict: "case_id,track,attempt_number" });
  });
});
```
- [ ] **Step 2:** Run `npm test -- track-results` → expect FAIL (`getNextAttemptNumber` not exported).
- [ ] **Step 3: Implement** — replace `upsertTrackResult` (require `attempt_number`, drop the default) and add the resolver:
```ts
// H1 — the next investigation attempt for a case: max across track rows AND evidence packs
// (packs preserved true history through the pre-H1 era when track rows were overwritten in place).
export async function getNextAttemptNumber(caseId: string): Promise<number> {
  const latest = (table: string) =>
    supabaseAdmin.from(table).select("attempt_number").eq("case_id", caseId)
      .order("attempt_number", { ascending: false }).limit(1).maybeSingle();
  const [ctr, packs] = await Promise.all([latest("case_track_results"), latest("case_evidence_packs")]);
  const maxCtr = (ctr.data as { attempt_number?: number } | null)?.attempt_number ?? 0;
  const maxPack = (packs.data as { attempt_number?: number } | null)?.attempt_number ?? 0;
  return Math.max(maxCtr, maxPack) + 1;
}

// Upsert a single track row on the (case_id, track, attempt_number) natural key.
// H1: attempt_number is REQUIRED from the caller — a re-run writes a NEW attempt, never attempt 1 again.
export async function upsertTrackResult(
  row: Partial<TrackResultRow> & { case_id: string; track: string; track_key: string; track_number: number; attempt_number: number },
): Promise<{ error: string | null }> {
  const { error } = await supabaseAdmin
    .from("case_track_results")
    .upsert(row, { onConflict: "case_id,track,attempt_number" });
  return { error: error?.message ?? null };
}
```
(TypeScript now FAILS compilation at every call site missing `attempt_number` — that is the checklist for Task 3.)
- [ ] **Step 4:** Run `npm test -- track-results` → expect PASS (compile of pipeline.steps fails until Task 3 — run the single test file only).
- [ ] **Step 5:** Commit: `git commit -am "H1: getNextAttemptNumber + upsertTrackResult requires attempt_number"`

### Task 3: pipeline stages — attempt threading, resolve step, guarded set-running (`lib/research/pipeline.steps.ts`)

**Files:** Modify: `lib/research/pipeline.steps.ts` (stages at :44-51, :69-132, :135-145, :154-157) · Test: extend `lib/research/pipeline.steps.test.ts`

- [ ] **Step 1: Write the failing tests** (extend the existing file; the supabase mock must gain `select`/`insert` — replace the mock factory at :6-14 with):
```ts
const { runTrack1, upsertTrackResult, resolveSupplierIdentity, casesUpdate, casesEq, casesNot, statusMaybeSingle, auditInsert, getNextAttemptNumber } = vi.hoisted(() => {
  const casesEq = vi.fn().mockResolvedValue({ error: null });
  const casesNot = vi.fn().mockResolvedValue({ error: null });
  const casesUpdate = vi.fn(() => ({ eq: vi.fn(() => ({ not: casesNot })), ...( { eq: casesEq } ) }));
  const statusMaybeSingle = vi.fn().mockResolvedValue({ data: { status: "awaiting_review" } });
  const auditInsert = vi.fn().mockResolvedValue({ error: null });
  return {
    runTrack1: vi.fn(), upsertTrackResult: vi.fn(), resolveSupplierIdentity: vi.fn(),
    casesUpdate, casesEq, casesNot, statusMaybeSingle, auditInsert,
    getNextAttemptNumber: vi.fn().mockResolvedValue(1),
  };
});
vi.mock("@/lib/data/track-results", () => ({ upsertTrackResult, getNextAttemptNumber }));
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: { from: (table: string) => table === "audit_log"
    ? { insert: auditInsert }
    : { update: casesUpdate, select: () => ({ eq: () => ({ maybeSingle: statusMaybeSingle }) }) } },
}));
```
New tests:
```ts
describe("H1 attempt threading", () => {
  it("stageFindingTrack writes the ctx attempt_number onto the row", async () => {
    runTrack1.mockResolvedValue({ track_key: "supplier_identity", evidence_items: [], reasoning_notes: "n", unknowns: [], weight_validation: [], acquisition_failed: true });
    await stageFindingTrack({ ...ctx, attempt_number: 3 }, 1);
    expect(upsertTrackResult.mock.calls[0][0].attempt_number).toBe(3);
  });
  it("stageResolveAttempt returns next attempt and audit-logs a re-investigation", async () => {
    getNextAttemptNumber.mockResolvedValueOnce(2);
    const attempt = await stageResolveAttempt("c1");
    expect(attempt).toBe(2);
    expect(auditInsert).toHaveBeenCalledWith(expect.objectContaining({ record_id: "c1", new_value: { reinvestigation_attempt: 2 } }));
  });
  it("stageResolveAttempt does NOT audit-log a first run", async () => {
    getNextAttemptNumber.mockResolvedValueOnce(1);
    await stageResolveAttempt("c1");
    expect(auditInsert).not.toHaveBeenCalled();
  });
  it("stageMemoryWrite skips re-runs (attempt > 1) so the corpus never double-counts", async () => {
    await stageMemoryWrite({ ...ctx, attempt_number: 2 }, "pass", false);
    expect(writeIntelligence).not.toHaveBeenCalled(); // add writeIntelligence to the hoisted mocks + vi.mock("@/lib/data/intelligence")
  });
});
```
- [ ] **Step 2:** Run `npm test -- pipeline.steps` → expect FAIL (`stageResolveAttempt` not exported; attempt not threaded).
- [ ] **Step 3: Implement** in `pipeline.steps.ts`:
```ts
import { upsertTrackResult, getNextAttemptNumber } from "@/lib/data/track-results";

// H1 — resolve this execution's investigation attempt ONCE at pipeline start (durable step in
// Inngest). A re-investigation (attempt > 1) is audit-logged; rows/packs/synthesis all write
// under this attempt so no prior attempt is ever overwritten.
export async function stageResolveAttempt(caseId: string): Promise<number> {
  const attempt = await getNextAttemptNumber(caseId);
  if (attempt > 1) {
    await supabaseAdmin.from("audit_log").insert({
      table_name: "cases", record_id: caseId, action: "UPDATE",
      actor_id: "system", actor_type: "system", new_value: { reinvestigation_attempt: attempt },
    });
  }
  return attempt;
}

// H1 — status flip guarded: a delivered/complete case keeps its client-visible status while a
// re-investigation runs; only non-terminal cases show research_running.
export async function stageSetRunning(caseId: string): Promise<void> {
  await supabaseAdmin.from("cases")
    .update({ status: "research_running", pipeline_version: PIPELINE_VERSION })
    .eq("id", caseId)
    .not("status", "in", "(delivered,complete)");
}
```
Thread `const attempt = ctx.attempt_number ?? 1;` into **all three** `upsertTrackResult` calls (`stageTrack0` :46, the guard branch :77, the main branch :104) as `attempt_number: attempt`. Guard `stagePersistIdentity` (:63-65) with the same `.not("status", "in", "(delivered,complete)")`. `stageMemoryWrite` (:155-157) becomes:
```ts
// H1 interim guard (full event ledger lands in H6): only a case's FIRST investigation feeds the
// corpus — re-runs must never inflate case_count or overwrite history.
export async function stageMemoryWrite(ctx: TrackContext, identitySignal: TrackSignal | null, identityAcquisitionFailed: boolean): Promise<void> {
  if (!identityAcquisitionFailed && (ctx.attempt_number ?? 1) === 1) await writeIntelligence(ctx, identitySignal);
}
```
- [ ] **Step 4:** Run `npm test -- pipeline.steps` → expect PASS.
- [ ] **Step 5:** Commit: `git commit -am "H1: stages thread attempt_number; resolve-attempt + guarded set-running; memory write first-attempt-only"`

### Task 4: `stageFinalize` immutability (the AT-2 behavior)

**Files:** Modify: `lib/research/pipeline.steps.ts:160-181` · Test: extend `lib/research/pipeline.steps.test.ts`

- [ ] **Step 1: Write the failing test:**
```ts
it("stageFinalize on a DELIVERED case: only reinvestigation_pending is set; verdict/status untouched", async () => {
  statusMaybeSingle.mockResolvedValueOnce({ data: { status: "delivered" } });
  await stageFinalize({ ...ctx, attempt_number: 2 }, { included: new Set([1, 2]), identityAcquisitionFailed: false, verdict: "do_not_rely", confidence_0_15: 3 });
  const update = casesUpdate.mock.calls[0][0];
  expect(update).toEqual({ reinvestigation_pending: true });
});
it("stageFinalize on a non-delivered case: full case update as before", async () => {
  statusMaybeSingle.mockResolvedValueOnce({ data: { status: "research_running" } });
  await stageFinalize(ctx, { included: new Set([1, 2]), identityAcquisitionFailed: false, verdict: "verify_before_purchase", confidence_0_15: 7 });
  expect(casesUpdate.mock.calls[0][0]).toMatchObject({ status: "awaiting_review", verdict: "verify_before_purchase" });
});
```
- [ ] **Step 2:** Run `npm test -- pipeline.steps` → expect FAIL.
- [ ] **Step 3: Implement** — at the top of `stageFinalize`, before building `caseUpdate`:
```ts
// H1 — Case Investigation Ledger: a delivered case is IMMUTABLE. A re-investigation persists its
// rows under the new attempt (already done upstream) and only raises a flag for admin review;
// verdict/status/delivered_at/delivered_attempt never change outside an explicit admin publish.
const { data: current } = await supabaseAdmin.from("cases").select("status").eq("id", ctx.case_id).maybeSingle();
if (current?.status === "delivered" || current?.status === "complete") {
  const { error } = await supabaseAdmin.from("cases").update({ reinvestigation_pending: true }).eq("id", ctx.case_id);
  return { error: error?.message ?? null };
}
```
- [ ] **Step 4:** Run `npm test -- pipeline.steps` → expect PASS.
- [ ] **Step 5:** Commit: `git commit -am "H1: stageFinalize never mutates a delivered case (reinvestigation_pending instead)"`

### Task 5: evidence packs written per attempt (`lib/data/acquisition.ts` + track callers)

**Files:** Modify: `lib/data/acquisition.ts:7-13`, `lib/research/track1.ts:23`, `lib/research/track2.ts:34` · Test: extend `lib/data/acquisition.test.ts`

- [ ] **Step 1: Write the failing test** (mirror the file's existing mock style):
```ts
it("persistEvidencePack upserts on (case_id, track_key, attempt_number) — step retries never duplicate a pack", async () => {
  await persistEvidencePack(pack, 2);
  const [row, opts] = upsert.mock.calls[0];
  expect(row.attempt_number).toBe(2);
  expect(opts).toEqual({ onConflict: "case_id,track_key,attempt_number" });
});
```
- [ ] **Step 2:** Run `npm test -- acquisition` → expect FAIL.
- [ ] **Step 3: Implement:**
```ts
// H1 — packs are the frozen input-of-record, one per (case, track, attempt). Upsert (not insert):
// an Inngest step retry re-gathers and REPLACES its own attempt's pack (keeping the stored pack
// consistent with what was actually scored) — it can never touch another attempt's pack.
export async function persistEvidencePack(pack: EvidencePack, attemptNumber: number): Promise<{ error: string | null }> {
  const { error } = await supabaseAdmin.from("case_evidence_packs").upsert({
    case_id: pack.case_id, track_key: pack.track_key, pack: pack.sources,
    evidence_hash: pack.evidence_hash, schema_version: pack.schema_version,
    collected_at: pack.collected_at, attempt_number: attemptNumber,
  }, { onConflict: "case_id,track_key,attempt_number" });
  return { error: error?.message ?? null };
}
```
Callers: `track1.ts:23` and `track2.ts:34` become `await persistEvidencePack(pack, ctx.attempt_number ?? 1);`
- [ ] **Step 4:** Run `npm test -- acquisition track1 track2` → expect PASS (existing track tests unaffected — they mock `persistEvidencePack`).
- [ ] **Step 5:** Commit: `git commit -am "H1: evidence packs written per attempt (upsert on case/track/attempt)"`

### Task 6: synthesis per attempt — writer AND readers (`lib/data/synthesis.ts`)

**Files:** Modify: `lib/data/synthesis.ts:7-37` (writer), `:78-125` (readers), `lib/research/pipeline.steps.ts:135-145` (caller) · Test: extend `lib/data/synthesis.test.ts` (create if absent)

- [ ] **Step 1: Write the failing tests:**
```ts
it("upsertCaseSynthesis writes attempt_number and conflicts on (case_id, attempt_number)", async () => {
  await upsertCaseSynthesis("c1", stubSynthesis, ios, 2);
  const [row, opts] = upsert.mock.calls[0];
  expect(row.attempt_number).toBe(2);
  expect(opts).toEqual({ onConflict: "case_id,attempt_number" });
});
it("getCaseIntelligence returns the LATEST attempt (order desc, limit 1) — maybeSingle no longer valid on case_id alone", async () => {
  await getCaseIntelligence("c1");
  expect(order).toHaveBeenCalledWith("attempt_number", { ascending: false });
  expect(limit).toHaveBeenCalledWith(1);
});
```
- [ ] **Step 2:** Run `npm test -- synthesis` → expect FAIL.
- [ ] **Step 3: Implement:** `upsertCaseSynthesis(caseId, output, ios, attemptNumber: number)` adds `attempt_number: attemptNumber` to the row and `{ onConflict: "case_id,attempt_number" }`. **Both readers must become attempt-aware in the same commit** (post-migration a case can have >1 row and `.maybeSingle()` on `case_id` alone would error): `getCaseIntelligence` adds `.order("attempt_number", { ascending: false }).limit(1)` before `.maybeSingle()`; `getClientDecisionSnapshot` pins the delivered attempt:
```ts
export async function getClientDecisionSnapshot(caseId: string): Promise<ClientSnapshot | null> {
  // Client reads are pinned to the DELIVERED attempt (H1 immutability); fall back to latest pre-delivery.
  const { data: c } = await supabaseAdmin.from("cases").select("delivered_attempt").eq("id", caseId).maybeSingle();
  let q = supabaseAdmin.from("case_synthesis").select("decision_snapshot, vendor_questions")
    .eq("case_id", caseId).is("deleted_at", null);
  q = c?.delivered_attempt ? q.eq("attempt_number", c.delivered_attempt) : q.order("attempt_number", { ascending: false }).limit(1);
  const { data } = await q.maybeSingle();
  return (data as ClientSnapshot) ?? null;
}
```
Caller: `stageSynthesis` passes `ctx.attempt_number ?? 1` as the 4th arg.
- [ ] **Step 4:** Run `npm test -- synthesis pipeline.steps` → expect PASS.
- [ ] **Step 5:** Commit: `git commit -am "H1: case_synthesis per attempt; readers attempt-aware (latest / delivered pin)"`

### Task 7: orchestrators — resolve the attempt first (Inngest + sync)

**Files:** Modify: `lib/inngest/functions/pipeline.ts:24-38`, `lib/research/pipeline.ts:18-30`

- [ ] **Step 1: Implement** (both callers, same shape — Inngest shown; sync mirrors without `step.run`):
```ts
export async function pipelineHandler({ event, step }: { event: { data: TrackContext }; step: InngestStep }) {
  const base = event.data;
  const included = new Set(tracksForPlan(base.plan_type).map((t) => t.track_number));

  // H1 — resolve this execution's attempt ONCE (durable; memoized across retries), then thread it
  // through every stage so all writes land under this attempt.
  const attempt = await step.run("resolve-attempt", () => stageResolveAttempt(base.case_id));
  const ctx: TrackContext = { ...base, attempt_number: attempt };

  await step.run("set-running", () => stageSetRunning(ctx.case_id));
  await step.run("track-0", () => stageTrack0(ctx));
  // ... (identity + fan-out + synthesis + verdict + memory + finalize UNCHANGED below this line,
  //      all already reading ctx/ictx which now carry attempt_number)
```
The old inline `set-running` update (`pipeline.ts:28-30` in the Inngest file) is replaced by the `stageSetRunning` call. Sync `runPipeline` (`lib/research/pipeline.ts`) inserts `const attempt = await stageResolveAttempt(ctx.case_id);` then `ctx = { ...ctx, attempt_number: attempt };` before `stageTrack0` (and does NOT call stageSetRunning — it never did).
- [ ] **Step 2:** Run `npx tsc --noEmit && npm test` → expect PASS (full suite green — the compile errors from Task 2 are now all resolved).
- [ ] **Step 3:** Commit: `git commit -am "H1: both orchestrators resolve the investigation attempt first and thread it"`

### Task 8: readers + delivery pin (`lib/data/track-results.ts`, `lib/data/cases.ts`, review route)

**Files:** Modify: `lib/data/track-results.ts:47-55`, `lib/data/cases.ts:115-135`, `app/api/admin/cases/[id]/review/route.ts:73-98` · Test: extend `lib/data/track-results.test.ts`

- [ ] **Step 1: Write the failing test:**
```ts
it("getCaseTrackResults returns only the LATEST attempt's rows by default", async () => {
  // mock the select chain to return rows across two attempts
  rowsResult.mockResolvedValueOnce({ data: [
    { track: "track_1", attempt_number: 1, track_verdict_signal: "hard_fail" },
    { track: "track_1", attempt_number: 2, track_verdict_signal: "pass" },
  ]});
  const rows = await getCaseTrackResults("c1");
  expect(rows).toHaveLength(1);
  expect(rows[0].attempt_number).toBe(2);
});
```
- [ ] **Step 2:** Run `npm test -- track-results` → expect FAIL.
- [ ] **Step 3: Implement:**
```ts
// H1 — attempt-aware read: `attempt` pins an investigation; default = the LATEST attempt
// (admin review + report-ready + banned-language all evaluate the newest investigation).
export async function getCaseTrackResults(caseId: string, attempt?: number): Promise<TrackResultRow[]> {
  const { data } = await supabaseAdmin.from("case_track_results").select(COLS)
    .eq("case_id", caseId).is("deleted_at", null).order("track_number", { ascending: true });
  const rows = (data as TrackResultRow[]) ?? [];
  if (rows.length === 0) return rows;
  const chosen = attempt ?? Math.max(...rows.map((r) => r.attempt_number ?? 1));
  return rows.filter((r) => (r.attempt_number ?? 1) === chosen);
}
```
`getCaseFindings` (`lib/data/cases.ts`): the ownership query (:120-125) also selects `delivered_attempt`; add `attempt_number` to the findings select (:129); after fetch, `const chosen = owned.delivered_attempt ?? Math.max(...rows.map((r) => r.attempt_number ?? 1));` and filter — **the client always sees the delivered attempt once delivered.**
Review route publish (:84): pin the attempt that passed the banned-language gate:
```ts
const attempt = rows.length ? Math.max(...rows.map((r) => r.attempt_number ?? 1)) : 1;
const update: Record<string, unknown> = {
  status: "delivered", delivered_at: now, delivered_attempt: attempt,
  reinvestigation_pending: false, internal_notes: JSON.stringify(decision),
};
```
(`rows` is already `getCaseTrackResults(id)` = latest attempt, so the scan and the pin cover the same rows. `TrackResultRow.attempt_number` is already in `COLS`.)
- [ ] **Step 4:** Run `npm test` → expect PASS.
- [ ] **Step 5:** Commit: `git commit -am "H1: readers resolve latest attempt; client pinned to delivered_attempt; publish pins + clears flag"`

### Task 9: re-judge script (AT-3) + harness update

**Files:** Create: `scripts/rejudge-case.ts` · Modify: `scripts/rerun-batch.ts:1-21` (header), `:106-108` (read-back)

- [ ] **Step 1: Create `scripts/rejudge-case.ts`** (founder-run, READ-ONLY — zero API calls, zero writes):
```ts
/**
 * H1 determinism proof — re-derives every track signal from the STORED evidence_items and the
 * verdict from those signals, then compares against what is persisted. READ-ONLY.
 * PASS = the stored record fully determines the verdict (Case Investigation Ledger property).
 *   npx tsx --env-file=.env scripts/rejudge-case.ts <case_id> [attempt]
 */
import { supabaseAdmin } from "@/lib/supabase/admin";
import { deriveTrackSignal } from "@/lib/research/signals";
import { computeVerdict } from "@/lib/research/verdictEngine";
import type { TrackKey } from "@/lib/constants/tracks";
import type { TrackSignal, SynthesisOutput, EvidenceItem } from "@/lib/research/contracts";

const [caseId, attemptArg] = process.argv.slice(2);
if (!caseId) { console.error("usage: rejudge-case.ts <case_id> [attempt]"); process.exit(1); }

const EMPTY_SYNTH: SynthesisOutput = {
  module_1_normalized_evidence: [], module_2_claim_attributions: [], module_3_assertions: [],
  module_4_contradictions: [], module_5_hypotheses: { hypotheses: [], what_would_change_the_leader: "" },
  module_6_risk_gaps: [], module_7_doubt_calibration: { doubt_level: "minimal", doubt_focus: "", rationale: "" },
  module_8_vendor_questions: [], module_9_decision_snapshot: { headline: "", leading_interpretation: "", the_real_risk: "", what_to_verify: [], what_to_monitor: [] },
};

async function main() {
  const { data } = await supabaseAdmin.from("case_track_results")
    .select("track_key, track_number, attempt_number, track_verdict_signal, evidence_items")
    .eq("case_id", caseId).is("deleted_at", null).order("track_number");
  const all = data ?? [];
  if (!all.length) { console.error("no track rows"); process.exit(1); }
  const attempt = attemptArg ? Number(attemptArg) : Math.max(...all.map((r) => r.attempt_number ?? 1));
  const rows = all.filter((r) => (r.attempt_number ?? 1) === attempt && r.track_number >= 1 && r.track_number <= 4);

  const signals: Partial<Record<TrackKey, TrackSignal>> = {};
  let mismatches = 0;
  for (const r of rows) {
    const stored = r.track_verdict_signal as TrackSignal | null;
    if (stored === "n_a" || stored === null) { signals[r.track_key as TrackKey] = "n_a"; continue; }
    const keys = [...new Set(((r.evidence_items as EvidenceItem[] | null) ?? []).map((e) => e.weight_key).filter((k): k is string => !!k))];
    const re = deriveTrackSignal(r.track_key as TrackKey, keys).signal;
    signals[r.track_key as TrackKey] = re;
    const ok = re === stored;
    if (!ok) mismatches++;
    console.log(`${ok ? "✔" : "✘"} ${r.track_key}: stored=${stored} rejudged=${re}`);
  }
  const { data: synth } = await supabaseAdmin.from("case_synthesis").select("contradictions")
    .eq("case_id", caseId).eq("attempt_number", attempt).is("deleted_at", null).maybeSingle();
  const verdict = computeVerdict(signals, { ...EMPTY_SYNTH, module_4_contradictions: (synth?.contradictions as SynthesisOutput["module_4_contradictions"]) ?? [] });
  const { data: c } = await supabaseAdmin.from("cases").select("verdict, delivered_attempt").eq("id", caseId).maybeSingle();
  const verdictOk = c?.verdict === verdict.verdict || (c?.delivered_attempt != null && c.delivered_attempt !== attempt);
  console.log(`${verdictOk ? "✔" : "✘"} verdict: stored=${c?.verdict} rejudged=${verdict.verdict} (attempt ${attempt}${c?.delivered_attempt != null ? `, delivered_attempt ${c.delivered_attempt}` : ""})`);
  process.exit(mismatches === 0 && verdictOk ? 0 : 1);
}
main();
```
- [ ] **Step 2:** `rerun-batch.ts` — rewrite the SAFETY header (lines 8-14): re-runs now write a NEW attempt and never overwrite; backups remain a belt-and-braces snapshot. Fix the read-back (:106-108) to compare like-with-like: select `attempt_number` too and filter to `max(attempt_number)` before computing `signalsByTrack`/`validatedKeys`.
- [ ] **Step 3:** Run `npx tsc --noEmit` → expect PASS. Commit: `git commit -am "H1: rejudge-case determinism proof (AT-3); rerun harness reads latest attempt"`

### Task 10: full verify + tracker update

- [ ] **Step 1:** Run the full gate: `npx tsc --noEmit && npm run lint && npm test && npm run build` → all PASS.
- [ ] **Step 2:** Update `D:\Projects\Hyprriq\Docs\HyprrIQ_OPEN_ITEMS.md`: H1 → 🟡 built, pending founder migration + AT-1/2/3 validation; note the two scope deviations (replay-through-LLM deferred to H7; metrics not attempt-tagged).
- [ ] **Step 3:** Commit: `git commit -am "H1: verify green; tracker updated — awaiting founder migration + AT validation"`

---

## EXECUTION ORDER & FOUNDER GATES

1. **Founder approves this plan** (including the one `TrackContext` contract edit + the two scope deviations).
2. I write the migration file (Task 0 artifact) → **founder runs it** in Supabase → confirms via the verification queries (including the `audit_log.actor_id` nullability check).
3. I execute Tasks 1–10 (TDD, commit per task, full verify at the end) → push to `staging` → Vercel deploy.
4. **Founder validates AT-1, AT-2, AT-3** against prod (founder-run scripts only).
5. H1 freezes → H2 (Fail-loud) spec/plan next. Bugs found during H1 that need anything beyond this plan's scope get logged to OPEN_ITEMS, not fixed inline.

## Self-review notes (plan vs. spec)
- Spec coverage: evidence freezing (Tasks 5, 9), attempt history (Tasks 2, 3, 5, 6, 7), immutable delivered verdicts (Tasks 4, 8), acceptance tests (top), migrations separate (top), frozen core untouched (rejudge *imports* `deriveTrackSignal`/`computeVerdict` read-only; no modifications). ✔
- Bug found while planning (logged, in-scope): synthesis readers `.maybeSingle()` on `case_id` would break post-migration → fixed in Task 6, same commit as the writer.
- Bug found while planning (logged, OUT of H1 scope → OPEN_ITEMS): `pipeline.ts:28-30` Inngest `set-running` used to flip even delivered cases to `research_running` — the guarded `stageSetRunning` fixes the delivered case; the *non-delivered* re-run status UX (client sees "research running" again on an `awaiting_review` re-run) is acceptable and unchanged.
