# H6 — Money & Corpus Implementation Plan (atomic credits, the intelligence-event ledger, outcomes ground truth)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** **APPROVED — ALL OQs RULED; BUILD AUTHORIZED (founder, 2026-07-07).** OQ-1 ruled row-by-row (rulings filled into the table below; headline: mototec usa CONFIRMED REAL — V6/B6/C5 all KEEP/INCLUDE; jc sales kept with colox stripped via M2; deletes = td synexx, bosch-as-vendor, zzqxwv + brands colox/xyz/nike). Task 8's constants carry the FINAL ruled values. Founder runs the Task 1 migration and the cleanup (backup-first) when ready. Operational sequence founder-confirmed: migration (founder runs) → deploy → `cleanup-corpus.ts --apply` (founder-run, backup-first) BEFORE re-running any case. AT-5's 30-day email live-fires ~2026-07-20 (Morendelli's mark) — unit-locked now, logged deferred-live.
**Phase:** H6 ONLY. NOT in this phase (each stays its own gate): Spec-B domain-research under-resolution, H7 firewall hardening, Phase H PDF, the client confirmation loop, test/prod DB separation (ADR-G007 D5), `normalizeName` redesign (the corpus gains `resolved_domain` as the first step toward domain keying; the universal-key question stays logged).

**Goal:** the money paths can never lose a write, the corpus becomes an append-only per-case event ledger with profile tables as recomputable rollups keyed on confirmed identities only, and `case_outcomes` starts accumulating the moat's ground truth — with 30/90-day checkpoints so no delivered case is silently forgotten.

**Architecture:** one new append-only table (`intelligence_events`) becomes the corpus source of truth; `vendor_intelligence`/`brand_intelligence` become pure rollups computed by ONE shared function used by both the incremental pipeline write and the founder-run rebuild (the H3 pattern rule: any derived value is one shared fn at every site). Credits move from JS read-modify-write to SQL RPCs mirroring `deduct_client_credits`. `case_outcomes` is seeded at every delivery and swept by a daily Inngest cron.

**Tech stack:** Next.js route handlers, supabase-js RPCs, Inngest cron (watchdog pattern), vitest, founder-run tsx scripts with `--env-file=.env.local`.

**Frozen-core guarantee:** `deriveTrackSignal`, `computeVerdict`, `weights.ts`, the 6-gate firewall, Evidence Pack 1.0.0, `applyVerdictCeiling`, `researchIdentityFor`, Track 0.5, and all frozen H1–H5 semantics — untouched. `stageMemoryWrite` (orchestration, not judgment) is the only pipeline surface modified; nothing H6 does can change a verdict. **No frozen-surface sign-offs needed this phase.**

**Migration:** ONE founder-run file, `supabase/migrations/20260708000000_h6_money_and_corpus.sql` (full SQL in Task 1).

---

## BUGS FOUND WHILE PLANNING (standing rule — flagged before build; all die inside H6's approved scope, none architectural)

- **B1 (the known N6):** `addCredits` (webhook `route.ts:45-49`) and the `invoice.paid` rollover (`route.ts:208-222`) are JS read-modify-write on `credits_available` — a concurrent submit-deduction or second webhook loses writes. → Tasks 2–3.
- **B2 (new, money path, silent):** `addCredits` never checks the update's error — a failed top-up write is silently swallowed: client paid, no credits, no alert, `processed=true`. Violates H2 fail-loud on the money path. → Task 3 (RPC helpers return errors; webhook throws → Stripe retries).
- **B3 (new, money path, retry black hole):** the idempotency gate inserts `stripe_events` BEFORE processing. If the handler then fails, Stripe's retry hits the duplicate gate and is ACKed — the event is never reprocessed. A lost top-up stays lost forever. → Task 3 fix: a duplicate is ACKed only when the prior attempt reached `processed=true`; an unprocessed/error'd duplicate is reprocessed. Residual (documented, accepted): if the first attempt crashed between the credit RPC and the `processed` flag, one reprocess double-adds — window is a single statement wide; `billing_audit` makes it auditable. See OQ-4.
- **B4 (known from audit, now confirmed):** `reset_client_credits` keys on retired plan names (`growth_249`/`agency_999`) — it would zero a `growth_279` client. Grep confirms ZERO code callers (the webhook does its own inline rollover). → retire (DROP), Task 1.
- **B5 (new):** `writeIntelligence` (`lib/data/intelligence.ts:21`) keys the corpus on `identity?.resolved_name || enteredName` WITHOUT checking `identity_unconfirmed` — an unconfirmed resolution can key a profile row on a guess. It also re-implements the resolved-vs-alias logic that H4 centralized in `researchIdentityFor` (the logged refactor). → Tasks 4–5 (gating + refactor).
- **B6 (schema promise never kept):** `vendor_intelligence.risk_history` has never been written by any code path, and `case_count` counts write-events not cases — live data confirms (ingram micro 13, brand bosch 15, td synexx split 7/14). → rollups fix both by construction.

---

## LIVE CORPUS INVENTORY (read-only discovery, 2026-07-06 — grounds OQ-1)

`vendor_intelligence` (9 rows): `td synnex` (14, entered_names ["TD Synexx"]) / `td synexx` (7) — the split; `bosch` (4, brands ["nike"]) — wrong-entity mislabel-class rows (globaldist/AWI-2607-018 entered "Bosch" as vendor); `zzqxwv nonexistent trading` (1, hard_fail) — the fake test vendor; `jc sales` (4, brands ["colox"]); `mototec usa` (4); `ingram micro` (13); `d and h` (1); `kehe` (1).
`brand_intelligence` (10 rows): junk candidates `colox` (4), `xyz` (1), `nike` (4 — mislabel-case artifact); real: bosch, dell, lenovo, microsoft, mototec, organic india, samsung.
`case_outcomes`: **0 rows.** Delivered cases available for backfill: AWI-2606-001 Morendelli (source_clear, manual-era), AWI-2607-021 TD Synnex (usable_with_conditions, attempt 6), AWI-2607-023 kehe (verify_before_purchase, attempt 2).

---

## OPEN QUESTIONS — founder rulings

- **OQ-1 — ✅ RULED (founder, 2026-07-07), all rows — rulings filled into the table below.** All proposals accepted; the one open call (V6 mototec usa) ruled KEEP — confirmed real supplier, manufactures its own products, so brand mototec (B6) and case AWI-2607-024 (C5) stay too.
- **OQ-2 — ANSWERED (founder, 2026-07-06): YES, drop `clients.rollover_limit`.** Dead column (only reader was `reset_client_credits`), drift source removed. Task 1's migration keeps the DROP line.
- **OQ-3 — ANSWERED (founder, 2026-07-06): CONFIRMED admin-digest-only.** Client outcome emails stay with the gated confirmation-loop item.
- **OQ-4 — ANSWERED (founder, 2026-07-06): CONFIRMED the B3 retry-behavior change** (an error'd Stripe event reprocesses on retry; only `processed=true` duplicates are ACKed). Founder condition: the residual one-statement double-add window MUST be documented in code (Task 3's gate comment does this) AND in the tracker (Task 9 step added).
- **OQ-5 — ANSWERED (founder, 2026-07-06): CONFIRMED — Morendelli (AWI-2606-001) is EXCLUDED from the corpus backfill** (manual-era provenance); its `case_outcomes` row IS seeded (migration Part D already does).

---

## OQ-1 — THE FULL CLEANUP RULING TABLE — ✅ RULED (founder, 2026-07-07)

**Kill-mechanisms (each junk ruling must name one — found while expanding this table):** a profile row deleted in Phase 3 **resurrects in Phase 4's rebuild** if the ledger still holds confirmed events naming it. So junk dies via one of:
- **M1 `EXCLUDED_CASE`** — the whole case never enters the ledger backfill (for cases that are junk end-to-end).
- **M2 `BACKFILL_STRIP_BRANDS`** — a junk brand key is stripped from event `brands`/`brands_normalized` at backfill (for real-vendor cases that carried a junk test brand — keeps the vendor's history, kills the brand).
- **M3 explicit profile delete + orphan sweep** — belt-and-suspenders for rows M1/M2 already starve of events.
- *(auto)* — the `identity_unconfirmed` gate already keeps the case out of ROLLUPS; ledger records it as truth.

### A. Vendor rows (`vendor_intelligence`, 9 rows live)

| # | Key | Live state (2026-07-06 discovery) | My proposal | Mechanism | Founder ruling |
|---|---|---|---|---|---|
| V1 | `td synnex` | case_count 14 (inflated), brands lenovo/bosch/microsoft, entered_names ["TD Synexx"], signal pass | **KEEP** — flagship real supplier; rebuild corrects count to distinct confirmed cases | rebuild | ✅ per proposal |
| V2 | `td synexx` | case_count 7 — the pre-SO-1 typo split of V1 | **DELETE (merge)** — V1 already carries the alias in entered_names; the backfilled ledger records those cases under the resolved name where identity confirmed | M3 (starved: its cases backfill under `td synnex`) | ✅ per proposal |
| V3 | `bosch` (as VENDOR) | case_count 4, brands ["nike"], signal flag | **DELETE** — wrong-entity row: "Bosch" was the ENTERED name in the globaldist mislabel-class tests (AWI-2607-018); Bosch-the-company was never the supplier researched; "nike" is an artifact of the same tests | M1 (AWI-2607-018 excluded) + M3 | ✅ per proposal |
| V4 | `zzqxwv nonexistent trading` | case_count 1, hard_fail, brand xyz | **DELETE** — deliberately fake test vendor. The CASE + frozen track rows STAY (the H3 negative fixture selects from cases by mechanism, never from the corpus) | M1 (AWI-2607-016 excluded) + M3 | ✅ per proposal |
| V5 | `jc sales` | case_count 4, brands ["colox"], signal flag | **KEEP** — JC Sales is a real LA wholesaler and the research was real; the junk is the BRAND (colox), killed via M2 without losing the vendor history. (Veto option: exclude AWI-2607-017 entirely → this row dies by starvation) | rebuild + M2 for its brand | ✅ per proposal |
| V6 | `mototec usa` | case_count 4, brands ["mototec"], signal flag | **FOUNDER CALL** — real-ish company, test-corpus provenance. KEEP = rebuild corrects counts, brand mototec stays. EXCLUDE = add AWI-2607-024 to M1 → vendor AND brand both starve + M3 | founder call | ✅ **KEEP** — confirmed real supplier (manufactures own products) |
| V7 | `ingram micro` | case_count 13 (inflated by pre-H1 re-runs), brands samsung/dell/lenovo | **KEEP** — real distributor; rebuild corrects | rebuild | ✅ per proposal |
| V8 | `d and h` | case_count 1, brand lenovo | **KEEP** — real distributor (D&H Distributing) | rebuild | ✅ per proposal |
| V9 | `kehe` | case_count 1, brand organic india — the delivered AWI-2607-023 | **KEEP** | rebuild | ✅ per proposal |

### B. Brand rows (`brand_intelligence`, 10 rows live)

| # | Key | Live state | My proposal | Mechanism | Founder ruling |
|---|---|---|---|---|---|
| B1 | `bosch` (as BRAND) | case_count 15 (inflated) | **KEEP** — real brand, legitimately submitted in TD Synnex cases; rebuild corrects count | rebuild | ✅ per proposal |
| B2 | `colox` | case_count 4 | **DELETE** — junk test brand (JC Sales cases) | M2 (stripped at backfill) + M3 | ✅ per proposal |
| B3 | `dell` | case_count 5 | **KEEP** | rebuild | ✅ per proposal |
| B4 | `lenovo` | case_count 11 | **KEEP** | rebuild | ✅ per proposal |
| B5 | `microsoft` | case_count 4 | **KEEP** | rebuild | ✅ per proposal |
| B6 | `mototec` | case_count 4 | **rides V6** — KEEP if mototec usa kept; dies with it (M1+M3) if excluded | rides V6 | ✅ **KEEP** (V6 kept) |
| B7 | `nike` | case_count 4 | **DELETE** — artifact of the Bosch-as-vendor mislabel cases only | M1 (source case excluded → starves) + M3 | ✅ per proposal |
| B8 | `organic india` | case_count 1 | **KEEP** (kehe, delivered case) | rebuild | ✅ per proposal |
| B9 | `samsung` | case_count 12 | **KEEP** | rebuild | ✅ per proposal |
| B10 | `xyz` | case_count 1 | **DELETE** — junk (Zzqxwv case) | M1 + M3 | ✅ per proposal |

### C. Backfill case rulings (which history enters the ledger)

| # | Case(s) | State | My proposal | Founder ruling |
|---|---|---|---|---|
| C1 | 4× `SEED-VALIDATE-*` | synthetic seed-validation runs | **EXCLUDE** (M1) | ✅ per proposal |
| C2 | AWI-2607-016 (Zzqxwv) | fake-vendor test | **EXCLUDE** (M1) — frozen H3 fixture unaffected (lives in cases/track rows) | ✅ per proposal |
| C3 | AWI-2607-018 (Bosch mislabel) | wrong-entity test | **EXCLUDE** (M1) — also self-excludes from rollups via the unconfirmed gate; explicit for clarity | ✅ per proposal |
| C4 | AWI-2606-001 (Morendelli) | manual-era research | **EXCLUDE** — **RULED (OQ-5, 2026-07-06)**; outcomes row seeded regardless | ✅ ruled |
| C5 | AWI-2607-024 (Mototec) | rides V6 | **founder call** — include iff mototec usa is kept | ✅ **INCLUDE** (V6 kept) |
| C6 | AWI-2607-017 (JC Sales) | real vendor + junk brand | **INCLUDE, with colox stripped (M2)** | ✅ per proposal |
| C7 | AWI-2606-003 (Global Dist), AWI-2606-002 ("Ingram", research_failed), AWI-2607-025 (Mazel, submission_failed) | unconfirmed identity / never completed | **no ruling needed** — failed/incomplete cases have no completed attempts to backfill; Global Dist enters the ledger as truth and the unconfirmed gate keeps it out of rollups (auto) | — (auto) |
| C8 | Everything else (all Ingram Micro, TD Synnex/Synexx, D and H, kehe AWI cases) | real research | **INCLUDE** | ✅ per proposal |

**Note on the committed summary table (superseded):** the earlier compact OQ-1 table said "vendor jc sales KEEP (brand colox dies)" without naming a mechanism — expanding the table exposed that a Phase-3 delete alone would resurrect colox at rebuild. M2 (backfill strip) is the fix; V5/B2/C6 above are the coherent version. Task 8's constants now include `BACKFILL_STRIP_BRANDS`.

---

## ACCEPTANCE TESTS (defined up front — founder runs all; fixtures selected BY DB MECHANISM per the thrice-earned rule)

**AT-1 — atomic top-up, live.** Balance before: `SELECT credits_available FROM clients WHERE id='<your test client>';` → Stripe test-card top-up (same path as H2 AT-4 setup) → balance after = before + credits, `billing_audit` gains a `one_time_purchase` row, `stripe_events.processed=true`. (Proves `add_client_credits` live. The rollover RPC is unit-locked — a live renewal invoice can't be summoned on demand; it live-validates on the first real `subscription_cycle` invoice or via `stripe trigger invoice.paid` if you have the Stripe CLI. Logged as a deferred-live item either way.)

**AT-2 — the ledger appends; rollups count cases, not attempts.** Pick a confirmed-identity TD Synnex case by mechanism:
```sql
SELECT id, case_number FROM cases
WHERE vendor_name ILIKE 'td synnex' AND status = 'awaiting_review'
  AND supplier_identity->>'identity_unconfirmed' = 'false' LIMIT 1;  -- e.g. AWI-2607-022 / 1e13b79e-…
```
Re-run it (`npx tsx --env-file=.env.local scripts/rerun-batch.ts <id>`), then:
```sql
SELECT attempt_number, resolved_name, resolved_domain, identity_unconfirmed, verdict, signals->>'supplier_identity' AS id_signal
FROM intelligence_events WHERE case_id = '<id>' ORDER BY attempt_number;
SELECT case_count, resolved_domain, jsonb_array_length(risk_history) AS history_rows
FROM vendor_intelligence WHERE vendor_name_normalized = 'td synnex';
```
PASS = one event row for the new attempt with resolved identity + domain + signals + verdict; `case_count` = `SELECT count(DISTINCT case_id) FROM intelligence_events WHERE vendor_name_normalized='td synnex' AND NOT identity_unconfirmed AND NOT identity_failed` (cases, NOT attempts); `risk_history` populated; `resolved_domain='tdsynnex.com'`. Re-run the SAME case once more → a new event appends, prior events byte-untouched, `case_count` UNCHANGED.

**AT-3 — unconfirmed identities never touch profiles.** Pick the unconfirmed fixture by mechanism:
```sql
SELECT id, case_number FROM cases WHERE supplier_identity->>'identity_unconfirmed' = 'true' LIMIT 1;  -- e.g. AWI-2606-003 Global Dist
```
Re-run it → its `intelligence_events` row has `identity_unconfirmed=true` (the ledger records TRUTH), and `vendor_intelligence` has NO row created/updated for its key (`updated_at` unmoved).

**AT-4 — cleanup, founder-run, backup-first.** `npx tsx --env-file=.env.local scripts/cleanup-corpus.ts` (dry-run prints the full plan: backups → backfill counts → deletions per OQ-1 → rebuild diff) → review → re-run with `--apply`. PASS = `backups/corpus-<ts>/*.json` exist and non-empty BEFORE any write; OQ-1 junk rows gone; `td synexx` merged away; every remaining `vendor_intelligence.case_count` equals its distinct-case event count (the AT-2 SQL, per vendor); re-running `--apply` is a no-op (idempotent).

**AT-5 — outcomes ground truth.** `SELECT case_id, verdict_at_delivery, outcome_type FROM case_outcomes;` → 3 seeded rows matching the delivered verdicts, outcomes NULL. Record an outcome on AWI-2607-021 in the admin review page (e.g. no_issues + prediction_correct=true) → row gains `outcome_type`, `outcome_reported_at`, `reported_by='founder'`. Inngest dashboard shows 3 functions (pipeline, watchdog, outcome-checkpoints). The 30-day checkpoint email live-fires for Morendelli on ~2026-07-20 — **logged deferred-live validation**; the selection logic is unit-locked now.

**AT-6 — standing determinism check.** `npx tsx --env-file=.env.local scripts/rejudge-case.ts 2b359a6a-98f9-49c9-8f57-c19f4d8daaac` → PASS (H6 touches money + memory, never judgment).

**⚠ DEPLOY WINDOW (like H1's):** run the migration → deploy H6 code → **immediately run `cleanup-corpus.ts --apply` (backfill+rebuild) BEFORE re-running any case.** Between deploy and backfill, a pipeline run would compute rollups from a near-empty ledger and understate counts (self-heals on rebuild, but do it in order). Test corpus, founder-controlled — same discipline as H1's window.

---

## TASKS (execute after founder approves plan + OQs)

### Task 1: the migration (Claude WRITES, founder RUNS in Supabase dashboard, verified via information_schema)

**Files:** Create: `supabase/migrations/20260708000000_h6_money_and_corpus.sql`

- [ ] **Step 1: write the file exactly:**

```sql
-- ============================================================
-- H6 — Money & corpus (ADR-G007). FOUNDER-RUN.
-- A: atomic credit RPCs (webhook top-up + rollover) + retire reset_client_credits
-- B: intelligence_events — append-only per-case corpus ledger (source of truth;
--    vendor/brand_intelligence become recomputable rollups)
-- C: vendor_intelligence gains resolved_domain
-- D: case_outcomes — checkpoint columns + seed rows for already-delivered cases
-- DEPLOY WINDOW: run this, deploy H6 code, then run scripts/cleanup-corpus.ts --apply
-- (backfill+rebuild) BEFORE re-running any case.
-- ============================================================
BEGIN;

-- ── Part A — money ──
-- Top-up: pure atomic increment (a top-up is NOT usage — credits_used_this_cycle untouched).
CREATE OR REPLACE FUNCTION add_client_credits(p_client_id text, p_amount int)
RETURNS integer AS $$
  UPDATE clients SET credits_available = credits_available + p_amount
   WHERE id = p_client_id
  RETURNING credits_available;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Renewal rollover (invoice.paid, billing_reason=subscription_cycle). Cap + cycle credits are
-- PARAMETERS passed from lib/constants/plans.ts — plan names/numbers hardcoded in SQL is exactly
-- the drift that killed reset_client_credits. Keyed by stripe_customer_id (what the invoice has).
CREATE OR REPLACE FUNCTION rollover_client_credits(p_stripe_customer_id text, p_rollover_cap int, p_cycle_credits int)
RETURNS integer AS $$
  UPDATE clients SET
    credits_available = LEAST(credits_available, p_rollover_cap) + p_cycle_credits,
    credits_used_this_cycle = 0
   WHERE stripe_customer_id = p_stripe_customer_id
  RETURNING credits_available;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- B4: zero code callers; keys retired plan names (growth_249/agency_999) — would zero a
-- growth_279 client if ever called. Retired, not fixed: the webhook owns renewal credit math.
DROP FUNCTION IF EXISTS reset_client_credits(text);
-- OQ-2 RULED YES (founder, 2026-07-06): only reader was reset_client_credits; duplicates
-- PLAN_ROLLOVER_LIMIT (the TS single source of truth) — drift source removed.
ALTER TABLE clients DROP COLUMN IF EXISTS rollover_limit;

-- ── Part B — intelligence_events (ADR-G007: append-only corpus events) ──
CREATE TABLE IF NOT EXISTS intelligence_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
  attempt_number int NOT NULL,
  event_type text NOT NULL DEFAULT 'investigation_completed'
    CHECK (event_type IN ('investigation_completed')),  -- extensible by migration, per real need
  entered_name text,
  resolved_name text NOT NULL,                -- researchIdentityFor(ctx).name — WHO was researched
  vendor_name_normalized text NOT NULL,       -- normalizeName(resolved_name) — rollup join key
  resolved_domain text,
  identity_unconfirmed boolean NOT NULL DEFAULT false,  -- recorded as TRUTH; rollups exclude
  identity_failed boolean NOT NULL DEFAULT false,       -- H2 class: track 1 acquisition/llm failure
  brands text[] NOT NULL DEFAULT '{}',                  -- display strings as submitted
  brands_normalized text[] NOT NULL DEFAULT '{}',       -- normalizeName() of each — brand rollup key
  signals jsonb NOT NULL DEFAULT '{}'::jsonb,           -- track_key → track_verdict_signal
  verdict text,                                          -- this attempt's ceiled verdict
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (case_id, attempt_number, event_type)          -- Inngest retry/replay idempotency
);
CREATE INDEX IF NOT EXISTS idx_intelligence_events_vendor ON intelligence_events(vendor_name_normalized);
CREATE INDEX IF NOT EXISTS idx_intelligence_events_case ON intelligence_events(case_id);
CREATE INDEX IF NOT EXISTS idx_intelligence_events_brands ON intelligence_events USING gin(brands_normalized);

-- Append-only AT THE DB (service role included): UPDATE/DELETE raise. Founder escape hatch for a
-- ruled correction: DROP TRIGGER, fix, re-create (audit-log it) — deliberate friction.
CREATE OR REPLACE FUNCTION intelligence_events_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'intelligence_events is append-only (ADR-G007)';
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS intelligence_events_no_mutate ON intelligence_events;
CREATE TRIGGER intelligence_events_no_mutate
  BEFORE UPDATE OR DELETE ON intelligence_events
  FOR EACH ROW EXECUTE FUNCTION intelligence_events_immutable();

ALTER TABLE intelligence_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY intelligence_events_admin ON intelligence_events FOR ALL
  USING (is_current_user_admin());

-- ── Part C — corpus gains the domain key seed ──
ALTER TABLE vendor_intelligence ADD COLUMN IF NOT EXISTS resolved_domain text;

-- ── Part D — case_outcomes wiring ──
ALTER TABLE case_outcomes ADD COLUMN IF NOT EXISTS checkpoint_30_sent_at timestamptz;
ALTER TABLE case_outcomes ADD COLUMN IF NOT EXISTS checkpoint_90_sent_at timestamptz;
-- Seed the already-delivered cases (Morendelli, AWI-2607-021, AWI-2607-023). reported_by stays
-- NULL until a real outcome is recorded — 'system' would misstate who reported.
INSERT INTO case_outcomes (case_id, verdict_at_delivery)
SELECT id, verdict FROM cases
 WHERE status IN ('delivered','complete') AND deleted_at IS NULL
ON CONFLICT (case_id) DO NOTHING;

COMMIT;

-- ============================================================
-- POST-APPLY VERIFICATION (founder runs each; confirm before H6 code merges)
-- ============================================================
-- A-1 expect 3 rows (add/rollover/deduct present), reset gone:
--   SELECT routine_name FROM information_schema.routines
--   WHERE routine_name IN ('add_client_credits','rollover_client_credits','deduct_client_credits','reset_client_credits');
-- A-2 (OQ-2) expect 0 rows:
--   SELECT column_name FROM information_schema.columns WHERE table_name='clients' AND column_name='rollover_limit';
-- B-1 expect 15 columns:
--   SELECT count(*) FROM information_schema.columns WHERE table_name='intelligence_events';
-- B-2 append-only proof — expect ERROR 'intelligence_events is append-only':
--   INSERT INTO intelligence_events (case_id, attempt_number, resolved_name, vendor_name_normalized)
--     SELECT id, 999, 'PROBE', 'probe' FROM cases LIMIT 1;
--   UPDATE intelligence_events SET verdict='x' WHERE attempt_number=999;   -- must ERROR
--   -- then remove the probe: ALTER TABLE intelligence_events DISABLE TRIGGER intelligence_events_no_mutate;
--   -- DELETE FROM intelligence_events WHERE attempt_number=999;
--   -- ALTER TABLE intelligence_events ENABLE TRIGGER intelligence_events_no_mutate;
-- C-1 expect 1 row:
--   SELECT column_name FROM information_schema.columns WHERE table_name='vendor_intelligence' AND column_name='resolved_domain';
-- D-1 expect 3 rows, verdicts matching the delivered cases, outcome fields NULL:
--   SELECT case_id, verdict_at_delivery, outcome_type, reported_by FROM case_outcomes;
```

- [ ] **Step 2: commit** `git add supabase/migrations/20260708000000_h6_money_and_corpus.sql && git commit -m "H6 (Task 1): migration — atomic credit RPCs, intelligence_events ledger, outcomes wiring (FOUNDER-RUN)"`
- [ ] **Step 3: STOP — founder runs the migration + all verification queries. Build resumes only on founder confirmation.**

### Task 2: credit RPC helpers (`lib/data/credits.ts`)

**Files:** Create: `lib/data/credits.ts` · Test: Create `lib/data/credits.test.ts`

- [ ] **Step 1: failing tests** (mock `supabaseAdmin.rpc` the way `lib/data/intelligence.test.ts` mocks the client):

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: { rpc } }));
import { addClientCredits, rolloverClientCredits } from "./credits";

beforeEach(() => { rpc.mockReset().mockResolvedValue({ data: 7, error: null }); });

describe("addClientCredits (N6 — atomic top-up)", () => {
  it("calls the add_client_credits RPC with the exact args", async () => {
    const r = await addClientCredits("client_1", 3);
    expect(rpc).toHaveBeenCalledWith("add_client_credits", { p_client_id: "client_1", p_amount: 3 });
    expect(r).toEqual({ balance: 7, error: null });
  });
  it("B2 — surfaces the DB error instead of swallowing it", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    expect((await addClientCredits("client_1", 3)).error).toBe("boom");
  });
  it("no matching client → balance null + loud error (payment must never vanish silently)", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    const r = await addClientCredits("ghost", 3);
    expect(r.balance).toBeNull();
    expect(r.error).toMatch(/no client row/);
  });
});

describe("rolloverClientCredits (capped rollover, plan math stays in TS)", () => {
  it("passes the plan's cap + cycle credits from lib/constants/plans", async () => {
    await rolloverClientCredits("cus_123", "growth_279");
    expect(rpc).toHaveBeenCalledWith("rollover_client_credits",
      { p_stripe_customer_id: "cus_123", p_rollover_cap: 2, p_cycle_credits: 5 });
  });
  it("scale_499 → cap 4, cycle 12", async () => {
    await rolloverClientCredits("cus_9", "scale_499");
    expect(rpc).toHaveBeenCalledWith("rollover_client_credits",
      { p_stripe_customer_id: "cus_9", p_rollover_cap: 4, p_cycle_credits: 12 });
  });
});
```

- [ ] **Step 2:** run `npx vitest run lib/data/credits.test.ts` → FAIL (module not found). **Step 3: implement:**

```ts
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PLAN_CREDITS_PER_CYCLE, PLAN_ROLLOVER_LIMIT, type PlanType } from "@/lib/constants/plans";

// H6 (audit N6) — ALL credit arithmetic lives in atomic SQL RPCs (mirrors deduct_client_credits).
// Plan numbers are passed as parameters: lib/constants/plans.ts stays the single source of truth
// (plan names hardcoded in SQL is the drift that killed reset_client_credits).
// Money-path errors are returned LOUD — callers decide throw/retry; nothing is swallowed (B2).

export async function addClientCredits(clientId: string, amount: number): Promise<{ balance: number | null; error: string | null }> {
  const { data, error } = await supabaseAdmin.rpc("add_client_credits", { p_client_id: clientId, p_amount: amount });
  if (error) return { balance: null, error: error.message };
  if (data === null || data === undefined) return { balance: null, error: `add_client_credits: no client row for ${clientId}` };
  return { balance: data as number, error: null };
}

export async function rolloverClientCredits(stripeCustomerId: string, plan: PlanType): Promise<{ balance: number | null; error: string | null }> {
  const { data, error } = await supabaseAdmin.rpc("rollover_client_credits", {
    p_stripe_customer_id: stripeCustomerId,
    p_rollover_cap: PLAN_ROLLOVER_LIMIT[plan],
    p_cycle_credits: PLAN_CREDITS_PER_CYCLE[plan],
  });
  if (error) return { balance: null, error: error.message };
  if (data === null || data === undefined) return { balance: null, error: `rollover_client_credits: no client row for customer ${stripeCustomerId}` };
  return { balance: data as number, error: null };
}
```

- [ ] **Step 4:** PASS. **Step 5: commit** `H6 (Task 2): atomic credit RPC helpers — plan math stays in TS, errors loud`

### Task 3: the webhook uses the RPCs + the retry black hole dies (B1+B2+B3)

**Files:** Modify: `app/api/webhooks/stripe/route.ts` (the `addCredits` fn at 45-49, the `invoice.paid` block at 197-224, the idempotency gate at 100-107)

- [ ] **Step 1:** delete the local `addCredits` helper; the top-up branch (`route.ts:119-124`) becomes:

```ts
        if (kind.startsWith("topup:")) {
          const topupId = kind.slice("topup:".length) as TopupId;
          const credits = TOPUP[topupId]?.credits ?? 0;
          if (credits > 0) {
            const { error: creditErr } = await addClientCredits(clientId, credits);
            // B2 — a paid top-up that fails to land must FAIL LOUD: throw → stripe_events.error is
            // written below → Stripe retries → the unprocessed-duplicate path reprocesses (B3 fix).
            if (creditErr) throw new Error(`top-up credit grant failed: ${creditErr}`);
          }
          if (customerId) await supabaseAdmin.from("clients").update({ stripe_customer_id: customerId }).eq("id", clientId);
          await recordBillingEvent(clientId, { event: "one_time_purchase", stripeEventId: event.id, notes: `Top-up: ${credits} credit${credits === 1 ? "" : "s"}` });
        } else if (s.mode === "subscription" && s.subscription) {
```

with `import { addClientCredits, rolloverClientCredits } from "@/lib/data/credits";` added to the imports.

- [ ] **Step 2:** the `invoice.paid` rollover block (`route.ts:208-222`) becomes:

```ts
        if (plan && customerId) {
          // Capped rollover (decision 2026-06-20), now ATOMIC (N6): unused credits carry over up
          // to the plan's cap, then the cycle's allotment lands on top — one SQL statement, no
          // read-modify-write window against a concurrent submit deduction.
          const { error: rolloverErr } = await rolloverClientCredits(customerId, plan);
          if (rolloverErr) throw new Error(`renewal rollover failed: ${rolloverErr}`);
          await supabaseAdmin.from("clients").update({ billing_status: "active" }).eq("stripe_customer_id", customerId);
        }
```

- [ ] **Step 3:** the idempotency gate (`route.ts:100-107`) becomes (B3 — an error'd event reprocesses on retry; only a `processed=true` duplicate is ACKed):

```ts
  // Idempotency: the UNIQUE constraint on stripe_event_id rejects replays — but ONLY a replay of a
  // COMPLETED event is ACKed (B3). A duplicate whose first attempt error'd before processed=true is
  // REPROCESSED (handlers are idempotent-by-upsert; the credit RPCs have a one-statement residual
  // window documented in the H6 plan — billing_audit keeps it auditable).
  const { error: dupeErr } = await supabaseAdmin
    .from("stripe_events")
    .insert({ stripe_event_id: event.id, event_type: event.type, payload_json: event as unknown as object });
  if (dupeErr) {
    const { data: prior } = await supabaseAdmin
      .from("stripe_events").select("processed").eq("stripe_event_id", event.id).maybeSingle();
    if (prior?.processed) return NextResponse.json({ received: true, duplicate: true });
    // fall through: prior attempt never completed — process it now.
  }
```

- [ ] **Step 4: full verify** `npx tsc --noEmit && npx vitest run` → green (the route has no direct test file; its logic is covered by Task 2's helper tests + type-check — matches the codebase's route-thin/lib-tested convention). **Step 5: commit** `H6 (Task 3): webhook money paths atomic + fail-loud; retry black hole closed (B1/B2/B3)`

### Task 4: the investigation-event writer (`lib/data/intelligence-events.ts`)

**Files:** Create: `lib/data/intelligence-events.ts` · Test: Create `lib/data/intelligence-events.test.ts`

- [ ] **Step 1: failing tests:**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
const insert = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: { from: vi.fn(() => ({ insert })) } }));
import { buildInvestigationEvent, recordInvestigationEvent } from "./intelligence-events";
import type { TrackContext } from "@/lib/research/contracts";

const identity = (over: object) => ({
  original_input: { name: "TD Synexx", website: null }, resolved_name: "TD Synnex", resolved_domain: "tdsynnex.com",
  candidate_domains: [], registration_signals: [], identity_confidence: "high" as const,
  identity_unconfirmed: false, resolution_method: "resolved_dominant" as const, resolution_notes: "",
  resolution_audit: { winner: "tdsynnex.com", score: 3, runner_up: null, runner_up_score: 0, matched_by: ["name_match"], warnings: [] },
  ...over,
});
const ctx: TrackContext = {
  case_id: "case-1", vendor_name: "TD Synexx", vendor_website: null, attempt_number: 2,
  brands_submitted: ["Lenovo", "Bosch GmbH"], marketplace: "amazon_us", plan_type: "growth_279",
  supplier_identity: identity({}),
};

describe("buildInvestigationEvent (pure — the ledger row is derived ONCE, via researchIdentityFor)", () => {
  it("records the RESOLVED identity, normalized keys, signals, verdict", () => {
    const ev = buildInvestigationEvent(ctx, {
      signals: { supplier_identity: "pass", brand_relationship: "infer" }, verdict: "usable_with_conditions",
      identityFailed: false, identityUnconfirmed: false,
    });
    expect(ev).toMatchObject({
      case_id: "case-1", attempt_number: 2, event_type: "investigation_completed",
      entered_name: "TD Synexx", resolved_name: "TD Synnex", vendor_name_normalized: "td synnex",
      resolved_domain: "tdsynnex.com", identity_unconfirmed: false, identity_failed: false,
      brands: ["Lenovo", "Bosch GmbH"], brands_normalized: ["lenovo", "bosch"],
      verdict: "usable_with_conditions",
    });
    expect(ev.signals).toEqual({ supplier_identity: "pass", brand_relationship: "infer" });
  });
  it("unconfirmed identity → keyed on the ENTERED name (researchIdentityFor), flag recorded as truth", () => {
    const ev = buildInvestigationEvent(
      { ...ctx, supplier_identity: identity({ identity_unconfirmed: true }) },
      { signals: {}, verdict: "verify_before_purchase", identityFailed: false, identityUnconfirmed: true },
    );
    expect(ev.resolved_name).toBe("TD Synexx"); // SO-2 semantics: what was actually researched
    expect(ev.identity_unconfirmed).toBe(true);
  });
});

describe("recordInsvestigationEvent → recordInvestigationEvent (idempotent append)", () => {
  beforeEach(() => insert.mockReset());
  it("inserted on first write", async () => {
    insert.mockResolvedValue({ error: null });
    expect(await recordInvestigationEvent({} as never)).toEqual({ inserted: true, error: null });
  });
  it("23505 duplicate (Inngest replay) → inserted:false, NO error (already recorded)", async () => {
    insert.mockResolvedValue({ error: { code: "23505", message: "dup" } });
    expect(await recordInvestigationEvent({} as never)).toEqual({ inserted: false, error: null });
  });
  it("real DB error surfaces", async () => {
    insert.mockResolvedValue({ error: { code: "XX000", message: "down" } });
    expect((await recordInvestigationEvent({} as never)).error).toBe("down");
  });
});
```

- [ ] **Step 2:** FAIL. **Step 3: implement:**

```ts
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { TrackContext, TrackSignal } from "@/lib/research/contracts";
import type { TrackKey } from "@/lib/constants/tracks";
import { researchIdentityFor } from "@/lib/research/researchIdentity";
import { normalizeName } from "@/lib/utils/normalize-name";

// H6 — the append-only Case Intelligence Event (ADR-G007): the corpus's source of truth. One row
// per completed investigation attempt, recorded whether or not the identity was confirmed (the
// ledger stores TRUTH; the profile ROLLUPS exclude unconfirmed/failed events). Idempotent under
// Inngest retry/replay via UNIQUE(case_id, attempt_number, event_type) — this is what makes the
-- corpus write safe to retry (the H2-era case_count re-increment hazard dies here).
export interface InvestigationEvent {
  case_id: string;
  attempt_number: number;
  event_type: "investigation_completed";
  entered_name: string | null;
  resolved_name: string;
  vendor_name_normalized: string;
  resolved_domain: string | null;
  identity_unconfirmed: boolean;
  identity_failed: boolean;
  brands: string[];
  brands_normalized: string[];
  signals: Partial<Record<TrackKey, TrackSignal>>;
  verdict: string | null;
}

export interface MemoryWriteArgs {
  signals: Partial<Record<TrackKey, TrackSignal>>;
  verdict: string | null;
  identityFailed: boolean;
  identityUnconfirmed: boolean;
}

export function buildInvestigationEvent(ctx: TrackContext, args: MemoryWriteArgs): InvestigationEvent {
  const rid = researchIdentityFor(ctx); // H4's ONE identity selector — the logged intelligence.ts refactor
  const brands = ctx.brands_submitted ?? [];
  return {
    case_id: ctx.case_id,
    attempt_number: ctx.attempt_number ?? 1,
    event_type: "investigation_completed",
    entered_name: ctx.vendor_name ?? null,
    resolved_name: rid.name,
    vendor_name_normalized: normalizeName(rid.name),
    resolved_domain: rid.domain,
    identity_unconfirmed: args.identityUnconfirmed,
    identity_failed: args.identityFailed,
    brands,
    brands_normalized: brands.map(normalizeName).filter(Boolean),
    signals: args.signals,
    verdict: args.verdict,
  };
}

export async function recordInvestigationEvent(ev: InvestigationEvent): Promise<{ inserted: boolean; error: string | null }> {
  const { error } = await supabaseAdmin.from("intelligence_events").insert(ev);
  if (!error) return { inserted: true, error: null };
  if (error.code === "23505") return { inserted: false, error: null }; // replay — attempt already in the ledger
  return { inserted: false, error: error.message };
}
```

(Note: fix the comment typo `--` → `//` when writing; the test describe-string typo above is cosmetic — name it `recordInvestigationEvent (idempotent append)`.)

- [ ] **Step 4:** PASS. **Step 5: commit** `H6 (Task 4): investigation-event writer — append-only, idempotent, identity via researchIdentityFor`

### Task 5: profiles become rollups (ONE shared compute fn) + `writeIntelligence` rewired

**Files:** Modify: `lib/data/intelligence.ts` (full rewrite below), `lib/data/intelligence.test.ts` (rewrite), `lib/research/pipeline.steps.ts:234-239` (stageMemoryWrite), `lib/research/pipeline.ts:64`, `lib/inngest/functions/pipeline.ts:70`, `lib/research/pipeline.steps.test.ts:157-165` (memory-write tests)

- [ ] **Step 1: failing tests** — rewrite `lib/data/intelligence.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeVendorRollup, computeBrandRollup, type LedgerEvent } from "./intelligence";

const ev = (over: Partial<LedgerEvent>): LedgerEvent => ({
  case_id: "c1", attempt_number: 1, entered_name: "TD Synnex", resolved_name: "TD Synnex",
  vendor_name_normalized: "td synnex", resolved_domain: "tdsynnex.com",
  identity_unconfirmed: false, identity_failed: false,
  brands: ["Lenovo"], brands_normalized: ["lenovo"],
  signals: { supplier_identity: "pass" }, verdict: "usable_with_conditions",
  created_at: "2026-07-06T10:00:00Z", ...over,
});

describe("computeVendorRollup (profiles are RECOMPUTABLE from the ledger — one fn, all sites)", () => {
  it("case_count = DISTINCT cases, never attempts (B6)", () => {
    const r = computeVendorRollup("td synnex", [
      ev({ case_id: "c1", attempt_number: 1 }), ev({ case_id: "c1", attempt_number: 2 }), ev({ case_id: "c2" }),
    ]);
    expect(r.case_count).toBe(2);
  });
  it("merges brands + aliases; carries resolved_domain; risk_history is per-event, chronological", () => {
    const r = computeVendorRollup("td synnex", [
      ev({ case_id: "c1", entered_name: "TD Synexx", brands_normalized: ["lenovo"], created_at: "2026-07-01T00:00:00Z" }),
      ev({ case_id: "c2", brands_normalized: ["microsoft"], created_at: "2026-07-02T00:00:00Z" }),
    ]);
    expect(r.known_brand_relationships).toEqual(["lenovo", "microsoft"]);
    expect(r.entered_names).toEqual(["TD Synexx"]);
    expect(r.resolved_domain).toBe("tdsynnex.com");
    expect(r.risk_history).toHaveLength(2);
    expect(r.risk_history[0]).toMatchObject({ case_id: "c1", attempt_number: 1, signal: "pass", verdict: "usable_with_conditions" });
  });
  it("overall_risk_signal = latest event WITH an identity signal (a null run never erases history)", () => {
    const r = computeVendorRollup("td synnex", [
      ev({ signals: { supplier_identity: "flag" }, created_at: "2026-07-01T00:00:00Z" }),
      ev({ case_id: "c2", signals: {}, created_at: "2026-07-02T00:00:00Z" }),
    ]);
    expect(r.overall_risk_signal).toBe("flag");
  });
});

describe("computeBrandRollup", () => {
  it("case_count = distinct cases naming the brand", () => {
    const r = computeBrandRollup("lenovo", [
      ev({ case_id: "c1", brands: ["Lenovo"], brands_normalized: ["lenovo"] }),
      ev({ case_id: "c1", attempt_number: 2, brands: ["Lenovo"], brands_normalized: ["lenovo"] }),
      ev({ case_id: "c3", brands: ["Lenovo"], brands_normalized: ["lenovo"] }),
    ]);
    expect(r.case_count).toBe(2);
    expect(r.brand_name).toBe("Lenovo");
  });
});
```

And in `lib/research/pipeline.steps.test.ts`, replace the two `stageMemoryWrite` tests (`:157-165`):

```ts
  it("stageMemoryWrite passes signals/verdict/identity flags through to writeIntelligence", async () => {
    await stageMemoryWrite({ ...ctx, attempt_number: 2 }, { signals: { supplier_identity: "pass" }, verdict: "source_clear", identityFailed: false, identityUnconfirmed: false });
    expect(writeIntelligence).toHaveBeenCalledOnce(); // H6: EVERY attempt appends an event (rollups dedupe by case)
  });
```

- [ ] **Step 2:** FAIL. **Step 3: implement** — full rewrite of `lib/data/intelligence.ts`:

```ts
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { TrackContext, TrackSignal } from "@/lib/research/contracts";
import {
  buildInvestigationEvent, recordInvestigationEvent, type MemoryWriteArgs,
} from "@/lib/data/intelligence-events";

// ADR-G006/G007 Institutional Memory — H6 shape: the append-only intelligence_events ledger is the
// SOURCE OF TRUTH; vendor_intelligence / brand_intelligence are recomputable ROLLUPS. ONE shared
// compute function per table (H3 pattern rule) serves both the incremental pipeline write and the
// founder-run rebuild (scripts/cleanup-corpus.ts). Rollups consume ONLY confirmed-identity events
// (identity_unconfirmed/identity_failed excluded — the ledger records truth, the corpus stays clean).
// Loud-but-non-fatal contract unchanged (H2 OQ-2): failures log + audit_log, return degraded:true.

export interface LedgerEvent {
  case_id: string; attempt_number: number;
  entered_name: string | null; resolved_name: string; vendor_name_normalized: string;
  resolved_domain: string | null; identity_unconfirmed: boolean; identity_failed: boolean;
  brands: string[]; brands_normalized: string[];
  signals: Partial<Record<string, TrackSignal>>; verdict: string | null; created_at: string;
}

export interface VendorRollup {
  vendor_name: string; vendor_name_normalized: string; resolved_domain: string | null;
  known_brand_relationships: string[]; entered_names: string[];
  overall_risk_signal: TrackSignal | null;
  risk_history: { case_id: string; attempt_number: number; date: string; signal: TrackSignal | null; verdict: string | null }[];
  case_count: number; last_reviewed_at: string;
}

const byTime = (a: LedgerEvent, b: LedgerEvent) => a.created_at.localeCompare(b.created_at);

export function computeVendorRollup(key: string, events: LedgerEvent[]): VendorRollup {
  const sorted = [...events].sort(byTime);
  const latest = sorted[sorted.length - 1];
  const withSignal = [...sorted].reverse().find((e) => e.signals.supplier_identity);
  return {
    vendor_name: latest.resolved_name,
    vendor_name_normalized: key,
    resolved_domain: [...sorted].reverse().find((e) => e.resolved_domain)?.resolved_domain ?? null,
    known_brand_relationships: [...new Set(sorted.flatMap((e) => e.brands_normalized))],
    entered_names: [...new Set(sorted.map((e) => e.entered_name).filter((n): n is string => !!n && n !== latest.resolved_name && !sorted.some((s) => s.resolved_name === n)))],
    overall_risk_signal: (withSignal?.signals.supplier_identity as TrackSignal | undefined) ?? null,
    risk_history: sorted.map((e) => ({
      case_id: e.case_id, attempt_number: e.attempt_number, date: e.created_at,
      signal: (e.signals.supplier_identity as TrackSignal | undefined) ?? null, verdict: e.verdict,
    })),
    case_count: new Set(sorted.map((e) => e.case_id)).size,
    last_reviewed_at: latest.created_at,
  };
}

export interface BrandRollup { brand_name: string; brand_name_normalized: string; case_count: number; last_reviewed_at: string }

export function computeBrandRollup(brandKey: string, events: LedgerEvent[]): BrandRollup {
  const relevant = events.filter((e) => e.brands_normalized.includes(brandKey)).sort(byTime);
  const latest = relevant[relevant.length - 1];
  const display = latest.brands[latest.brands_normalized.indexOf(brandKey)] ?? brandKey;
  return {
    brand_name: display, brand_name_normalized: brandKey,
    case_count: new Set(relevant.map((e) => e.case_id)).size,
    last_reviewed_at: latest.created_at,
  };
}

// Fetch the confirmed events feeding a vendor rollup. Used by the incremental write below AND the
// rebuild script — same query, same compute, same upsert (one fn, all sites).
async function confirmedVendorEvents(key: string): Promise<{ events: LedgerEvent[]; error: string | null }> {
  const { data, error } = await supabaseAdmin.from("intelligence_events")
    .select("case_id, attempt_number, entered_name, resolved_name, vendor_name_normalized, resolved_domain, identity_unconfirmed, identity_failed, brands, brands_normalized, signals, verdict, created_at")
    .eq("vendor_name_normalized", key).eq("identity_unconfirmed", false).eq("identity_failed", false);
  return { events: (data ?? []) as LedgerEvent[], error: error?.message ?? null };
}

async function confirmedBrandEvents(brandKey: string): Promise<{ events: LedgerEvent[]; error: string | null }> {
  const { data, error } = await supabaseAdmin.from("intelligence_events")
    .select("case_id, attempt_number, entered_name, resolved_name, vendor_name_normalized, resolved_domain, identity_unconfirmed, identity_failed, brands, brands_normalized, signals, verdict, created_at")
    .contains("brands_normalized", [brandKey]).eq("identity_unconfirmed", false).eq("identity_failed", false);
  return { events: (data ?? []) as LedgerEvent[], error: error?.message ?? null };
}

export async function rollupVendor(key: string): Promise<{ error: string | null }> {
  const { events, error } = await confirmedVendorEvents(key);
  if (error) return { error };
  if (events.length === 0) return { error: null }; // nothing confirmed → profiles untouched
  const r = computeVendorRollup(key, events);
  const { error: upErr } = await supabaseAdmin.from("vendor_intelligence")
    .upsert({ ...r }, { onConflict: "vendor_name_normalized" });
  return { error: upErr?.message ?? null };
}

export async function rollupBrand(brandKey: string): Promise<{ error: string | null }> {
  const { events, error } = await confirmedBrandEvents(brandKey);
  if (error) return { error };
  if (events.length === 0) return { error: null };
  const r = computeBrandRollup(brandKey, events);
  const { error: upErr } = await supabaseAdmin.from("brand_intelligence")
    .upsert({ ...r }, { onConflict: "brand_name_normalized" });
  return { error: upErr?.message ?? null };
}

export async function writeIntelligence(ctx: TrackContext, args: MemoryWriteArgs): Promise<{ degraded: boolean }> {
  const ev = buildInvestigationEvent(ctx, args);
  const failures: string[] = [];
  const rec = await recordInvestigationEvent(ev);
  if (rec.error) failures.push(`event(${ev.vendor_name_normalized}): ${rec.error}`);
  // Rollups fire only when THIS call appended a new event (replay-safe) AND the identity is
  // confirmed (H6 gate — unconfirmed/failed attempts live in the ledger as truth, never in profiles).
  if (rec.inserted && !ev.identity_unconfirmed && !ev.identity_failed) {
    const v = await rollupVendor(ev.vendor_name_normalized);
    if (v.error) failures.push(`vendor(${ev.vendor_name_normalized}): ${v.error}`);
    for (const brandKey of ev.brands_normalized) {
      const b = await rollupBrand(brandKey);
      if (b.error) failures.push(`brand(${brandKey}): ${b.error}`);
    }
  }
  if (failures.length > 0) {
    const detail = failures.join("; ");
    console.error(`[intelligence] memory write failed (case ${ctx.case_id}): ${detail}`);
    await supabaseAdmin.from("audit_log").insert({
      table_name: "intelligence_events", record_id: ctx.case_id, action: "UPDATE",
      actor_id: "system", actor_type: "system", new_value: { memory_write_failed: detail },
    });
    return { degraded: true };
  }
  return { degraded: false };
}
```

(The old `upsertVendorIntelligence`/`upsertBrandIntelligence` are deleted — grep confirms their only callers are `writeIntelligence` and `lib/data/intelligence.test.ts`.)

`lib/research/pipeline.steps.ts:234-239` becomes:

```ts
// Institutional memory (ADR-G006/G007, H6): EVERY completed attempt appends one intelligence_events
// row (append-only, replay-idempotent); profile rollups fire only for confirmed identities. The old
// attempt-1-only guard is retired — case_count dedupes by DISTINCT case_id by construction.
export async function stageMemoryWrite(ctx: TrackContext, args: MemoryWriteArgs): Promise<void> {
  await writeIntelligence(ctx, args);
}
```

with `import type { MemoryWriteArgs } from "@/lib/data/intelligence-events";` added, and both orchestrator call sites updated:

`lib/inngest/functions/pipeline.ts:70` →
```ts
  await step.run("memory-write", () => stageMemoryWrite(ictx, {
    signals, verdict: verdict.verdict, identityFailed, identityUnconfirmed: identity.identity_unconfirmed,
  }));
```
`lib/research/pipeline.ts:64` → same call shape (it has the same `signals`/`verdict`/`identityFailed`/`identity` locals).

- [ ] **Step 4:** `npx vitest run lib/data lib/research lib/inngest` → PASS (fix any pipeline.test.ts arg-shape assertions). **Step 5: commit** `H6 (Task 5): profiles are rollups of the event ledger — one compute fn, confirmed identities only (B5/B6 dead)`

### Task 6: `case_outcomes` — seed on delivery + admin recording

**Files:** Create: `lib/data/outcomes.ts`, `lib/data/outcomes.test.ts`, `app/api/admin/cases/[id]/outcome/route.ts`, `components/admin/outcome-panel.tsx` · Modify: `app/api/admin/cases/[id]/review/route.ts:124-127` (seed after delivery), `app/(admin)/admin/cases/[id]/review/page.tsx` (render panel for delivered cases)

- [ ] **Step 1: failing tests** (`lib/data/outcomes.test.ts`):

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
const upsert = vi.hoisted(() => vi.fn());
const update = vi.hoisted(() => vi.fn());
const eq = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: { from: vi.fn(() => ({ upsert, update: update.mockReturnValue({ eq: eq.mockReturnValue({ select: vi.fn().mockResolvedValue({ data: [{ id: "o1" }], error: null }) }) }) })) },
}));
import { seedCaseOutcome, recordCaseOutcome, OUTCOME_TYPES } from "./outcomes";

beforeEach(() => { upsert.mockReset().mockResolvedValue({ error: null }); update.mockClear(); eq.mockClear(); });

it("seedCaseOutcome upserts verdict_at_delivery keyed by case (re-publish refreshes the delivered verdict)", async () => {
  await seedCaseOutcome("case-1", "usable_with_conditions");
  expect(upsert).toHaveBeenCalledWith(
    { case_id: "case-1", verdict_at_delivery: "usable_with_conditions" },
    { onConflict: "case_id" },
  );
});
it("recordCaseOutcome rejects an unknown outcome_type", async () => {
  const r = await recordCaseOutcome("case-1", { outcome_type: "aliens", reported_by: "founder" } as never);
  expect(r.error).toMatch(/invalid outcome_type/);
});
it("recordCaseOutcome writes type/notes/correctness + reported_at/by", async () => {
  const r = await recordCaseOutcome("case-1", { outcome_type: "no_issues", outcome_notes: "clean", prediction_correct: true, reported_by: "founder" });
  expect(r.error).toBeNull();
  expect(update.mock.calls[0][0]).toMatchObject({ outcome_type: "no_issues", outcome_notes: "clean", prediction_correct: true, reported_by: "founder" });
  expect(update.mock.calls[0][0].outcome_reported_at).toBeTruthy();
});
it("OUTCOME_TYPES mirrors the DB CHECK exactly", () => {
  expect(OUTCOME_TYPES).toEqual(["no_issues","ip_complaint","invoice_rejected","account_action","brand_enforcement","client_stopped_using_vendor","other"]);
});
```

- [ ] **Step 2:** FAIL. **Step 3: implement** `lib/data/outcomes.ts`:

```ts
import { supabaseAdmin } from "@/lib/supabase/admin";

// H6 — case_outcomes is the moat's ground truth (audit Area 4: zero rows, zero code until now).
// Seeded at every delivery with the verdict the client actually received; the outcome fields are
// filled later by whoever learns what happened (founder via admin UI in H6; client path belongs to
// the gated confirmation-loop item). Mirrors the DB CHECK — extend both together or not at all.
export const OUTCOME_TYPES = [
  "no_issues", "ip_complaint", "invoice_rejected", "account_action",
  "brand_enforcement", "client_stopped_using_vendor", "other",
] as const;
export type OutcomeType = (typeof OUTCOME_TYPES)[number];

export async function seedCaseOutcome(caseId: string, verdictAtDelivery: string): Promise<{ error: string | null }> {
  // Upsert: a re-publish after re-investigation refreshes verdict_at_delivery (the outcome is
  // judged against what the client last received); recorded outcome fields are never touched here.
  const { error } = await supabaseAdmin.from("case_outcomes")
    .upsert({ case_id: caseId, verdict_at_delivery: verdictAtDelivery }, { onConflict: "case_id" });
  return { error: error?.message ?? null };
}

export async function recordCaseOutcome(caseId: string, o: {
  outcome_type: OutcomeType; outcome_notes?: string | null; prediction_correct?: boolean | null;
  reported_by: "client" | "founder" | "system";
}): Promise<{ error: string | null }> {
  if (!OUTCOME_TYPES.includes(o.outcome_type)) return { error: `invalid outcome_type: ${o.outcome_type}` };
  const { data, error } = await supabaseAdmin.from("case_outcomes")
    .update({
      outcome_type: o.outcome_type, outcome_notes: o.outcome_notes ?? null,
      prediction_correct: o.prediction_correct ?? null,
      outcome_reported_at: new Date().toISOString(), reported_by: o.reported_by,
    })
    .eq("case_id", caseId)
    .select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: "no outcome row — case was never delivered" };
  return { error: null };
}
```

- [ ] **Step 4:** seed on delivery — in `app/api/admin/cases/[id]/review/route.ts`, after the cases update succeeds (`:125`) and before the response:

```ts
  // H6 — outcomes ground truth: every delivery seeds/refreshes its case_outcomes row with the
  // verdict the client received (post-override). Loud-but-non-fatal: delivery already happened.
  const finalVerdict = action === "override" ? (body.override_verdict as string) : (c.verdict as string);
  const seeded = await seedCaseOutcome(id, finalVerdict);
  if (seeded.error) {
    await supabaseAdmin.from("audit_log").insert({
      table_name: "case_outcomes", record_id: id, action: "UPDATE",
      actor_id: userId, actor_type: "admin", new_value: { outcome_seed_failed: seeded.error },
    });
  }
```

- [ ] **Step 5:** the recording route — `app/api/admin/cases/[id]/outcome/route.ts` (same admin-gate pattern as the review route):

```ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { recordCaseOutcome, OUTCOME_TYPES, type OutcomeType } from "@/lib/data/outcomes";

// H6 — founder records what actually happened with a delivered case (the learning loop's raw
// material). Update-only: the row exists iff the case was delivered (seeded by the review route).

async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin.from("clients").select("role").eq("id", userId).maybeSingle();
  return !!data && data.role !== "client";
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await isAdmin(userId))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  let body: { outcome_type?: string; outcome_notes?: string; prediction_correct?: boolean } = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }
  if (!body.outcome_type || !OUTCOME_TYPES.includes(body.outcome_type as OutcomeType)) {
    return NextResponse.json({ error: "invalid_outcome_type" }, { status: 400 });
  }
  const r = await recordCaseOutcome(id, {
    outcome_type: body.outcome_type as OutcomeType, outcome_notes: body.outcome_notes ?? null,
    prediction_correct: body.prediction_correct ?? null, reported_by: "founder",
  });
  if (r.error) return NextResponse.json({ error: r.error }, { status: r.error.startsWith("no outcome row") ? 404 : 500 });
  await supabaseAdmin.from("audit_log").insert({
    table_name: "case_outcomes", record_id: id, action: "UPDATE",
    actor_id: userId, actor_type: "admin", new_value: { outcome_recorded: body },
  });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6:** the panel — `components/admin/outcome-panel.tsx`, a small `"use client"` card (match `components/admin/case-review.tsx` styling): outcome-type `<select>` over `OUTCOME_TYPES` with human labels, notes `<textarea>`, prediction correct/incorrect toggle, Save → `fetch(`/api/admin/cases/${caseId}/outcome`, { method: "POST", … })`, success/error message inline. Props: `{ caseId: string; existing: { outcome_type: string | null; outcome_notes: string | null; prediction_correct: boolean | null; outcome_reported_at: string | null } | null }` — render the recorded state read-only-with-edit when already reported. Wire into `app/(admin)/admin/cases/[id]/review/page.tsx` (left column, below Case Information) ONLY when `c.status === "delivered" || c.status === "complete"`, fetching the row via a new `getCaseOutcome(caseId)` in `lib/data/outcomes.ts`:

```ts
export async function getCaseOutcome(caseId: string) {
  const { data } = await supabaseAdmin.from("case_outcomes")
    .select("outcome_type, outcome_notes, prediction_correct, outcome_reported_at, verdict_at_delivery, checkpoint_30_sent_at, checkpoint_90_sent_at")
    .eq("case_id", caseId).maybeSingle();
  return data ?? null;
}
```

- [ ] **Step 7:** `npx tsc --noEmit && npx vitest run && npx next build` → green. **Step 8: commit** `H6 (Task 6): case_outcomes wired — seeded at delivery, founder-recordable in admin (moat ground truth begins)`

### Task 7: the 30/90-day outcome-checkpoint cron

**Files:** Create: `lib/inngest/functions/outcome-checkpoints.ts`, `lib/inngest/functions/outcome-checkpoints.test.ts` · Modify: `app/api/inngest/route.ts:14-19` (register)

- [ ] **Step 1: failing tests** (pure selection logic — the watchdog pattern):

```ts
import { describe, it, expect } from "vitest";
import { checkpointsDue, type OutcomeCheckpointRow } from "./outcome-checkpoints";

const row = (over: Partial<OutcomeCheckpointRow>): OutcomeCheckpointRow => ({
  case_id: "c1", case_number: "AWI-1", vendor_name: "TD Synnex",
  delivered_at: "2026-06-01T00:00:00Z", outcome_type: null,
  checkpoint_30_sent_at: null, checkpoint_90_sent_at: null, ...over,
});
const now = new Date("2026-07-06T00:00:00Z"); // delivered_at above = 35 days ago

describe("checkpointsDue (pure — the cron's selection brain)", () => {
  it("30-day: delivered ≥30d, no outcome, not yet nudged → due", () => {
    expect(checkpointsDue([row({})], now).due30.map((r) => r.case_number)).toEqual(["AWI-1"]);
  });
  it("already nudged at 30 → not due again", () => {
    expect(checkpointsDue([row({ checkpoint_30_sent_at: "2026-07-02T00:00:00Z" })], now).due30).toEqual([]);
  });
  it("outcome already recorded → never due (the question is answered)", () => {
    expect(checkpointsDue([row({ outcome_type: "no_issues" })], now).due30).toEqual([]);
  });
  it("90-day: delivered ≥90d → due90 (independent of the 30-day nudge)", () => {
    const r = row({ delivered_at: "2026-04-01T00:00:00Z", checkpoint_30_sent_at: "2026-05-01T00:00:00Z" });
    expect(checkpointsDue([r], now).due90.map((x) => x.case_number)).toEqual(["AWI-1"]);
  });
  it("delivered 10 days ago → nothing due", () => {
    const r = row({ delivered_at: "2026-06-26T00:00:00Z" });
    const d = checkpointsDue([r], now);
    expect(d.due30).toEqual([]); expect(d.due90).toEqual([]);
  });
});
```

- [ ] **Step 2:** FAIL. **Step 3: implement:**

```ts
import { inngest } from "@/lib/inngest/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendAdminAlert } from "@/lib/email/notify";

// H6 — outcome checkpoints (ADR-G006 ground truth; "every idle week is permanently lost learning").
// Daily sweep: any delivered case at 30/90 days with NO recorded outcome gets ONE admin digest
// mention per checkpoint (columns record the nudge — never re-nags). ADMIN-ONLY by founder ruling
// (OQ-3): client-facing outcome requests belong to the gated confirmation-loop item.

export interface OutcomeCheckpointRow {
  case_id: string; case_number: string | null; vendor_name: string | null;
  delivered_at: string; outcome_type: string | null;
  checkpoint_30_sent_at: string | null; checkpoint_90_sent_at: string | null;
}

const DAY_MS = 86_400_000;

export function checkpointsDue(rows: OutcomeCheckpointRow[], now: Date): { due30: OutcomeCheckpointRow[]; due90: OutcomeCheckpointRow[] } {
  const open = rows.filter((r) => r.outcome_type === null && r.delivered_at);
  const age = (r: OutcomeCheckpointRow) => (now.getTime() - new Date(r.delivered_at).getTime()) / DAY_MS;
  return {
    due30: open.filter((r) => age(r) >= 30 && !r.checkpoint_30_sent_at),
    due90: open.filter((r) => age(r) >= 90 && !r.checkpoint_90_sent_at),
  };
}

export async function sweepOutcomeCheckpoints(now: Date = new Date()): Promise<{ due30: number; due90: number }> {
  const { data } = await supabaseAdmin
    .from("case_outcomes")
    .select("case_id, outcome_type, checkpoint_30_sent_at, checkpoint_90_sent_at, cases!inner(case_number, vendor_name, delivered_at)")
    .is("outcome_type", null);
  const rows: OutcomeCheckpointRow[] = (data ?? []).map((r) => {
    const c = r.cases as unknown as { case_number: string | null; vendor_name: string | null; delivered_at: string | null };
    return {
      case_id: r.case_id as string, case_number: c.case_number, vendor_name: c.vendor_name,
      delivered_at: c.delivered_at ?? "", outcome_type: r.outcome_type as string | null,
      checkpoint_30_sent_at: r.checkpoint_30_sent_at as string | null,
      checkpoint_90_sent_at: r.checkpoint_90_sent_at as string | null,
    };
  }).filter((r) => r.delivered_at);
  const { due30, due90 } = checkpointsDue(rows, now);
  if (due30.length === 0 && due90.length === 0) return { due30: 0, due90: 0 };

  const line = (r: OutcomeCheckpointRow) => `${r.case_number ?? r.case_id} — ${r.vendor_name ?? "?"} (delivered ${r.delivered_at.slice(0, 10)})`;
  await sendAdminAlert(
    `Outcome check-in: ${due30.length + due90.length} delivered case(s) need a recorded outcome`,
    `<p><strong>30-day:</strong><br/>${due30.map(line).join("<br/>") || "—"}</p>
     <p><strong>90-day:</strong><br/>${due90.map(line).join("<br/>") || "—"}</p>
     <p>Record each on its admin review page (Outcome panel).</p>`,
  );
  const ts = now.toISOString();
  for (const r of due30) await supabaseAdmin.from("case_outcomes").update({ checkpoint_30_sent_at: ts }).eq("case_id", r.case_id);
  for (const r of due90) await supabaseAdmin.from("case_outcomes").update({ checkpoint_90_sent_at: ts }).eq("case_id", r.case_id);
  return { due30: due30.length, due90: due90.length };
}

// Daily at 06:00 UTC. retries:1 — tomorrow's tick is the retry.
export const outcomeCheckpoints = inngest.createFunction(
  { id: "outcome-checkpoints", name: "Outcome checkpoints (30/90-day ground-truth sweep)", retries: 1, triggers: [{ cron: "0 6 * * *" }] },
  async () => sweepOutcomeCheckpoints(),
);
```

Register in `app/api/inngest/route.ts`: import `outcomeCheckpoints` and add to `functions: [pipelineStart, pipelineWatchdog, outcomeCheckpoints]`.

- [ ] **Step 4:** PASS. **Step 5: commit** `H6 (Task 7): 30/90-day outcome-checkpoint cron — admin digest, one nudge per checkpoint`

### Task 8: `scripts/cleanup-corpus.ts` (FOUNDER-RUN, backup-first, dry-run default)

**Files:** Create: `scripts/cleanup-corpus.ts` (no unit tests — founder-run operational script, same class as `rerun-batch.ts`; its compute core is Task 5's tested `computeVendorRollup`/`computeBrandRollup`)

- [ ] **Step 1: implement** with this exact structure (single file, phases in order, every write gated behind `--apply`; dry-run prints the FULL plan):

```ts
// H6 — corpus cleanup + ledger backfill (FOUNDER-RUN, backup-first).
//   npx tsx --env-file=.env.local scripts/cleanup-corpus.ts          ← dry-run (prints plan, writes NOTHING)
//   npx tsx --env-file=.env.local scripts/cleanup-corpus.ts --apply  ← executes
// Phases: 1 BACKUP (always, even dry-run) → 2 BACKFILL intelligence_events from H1's attempt
// history → 3 CLEANUP (founder-ruled junk, OQ-1) → 4 REBUILD rollups from the ledger →
// 5 ORPHAN SWEEP (profile rows with zero confirmed events die) → 6 VERIFY (counts printed).
// Idempotent: backfill is ON CONFLICT DO NOTHING; rebuild recomputes; re-running --apply is a no-op.
```

Key contents (constants at top, founder-editable — FINAL VALUES SET FROM THE OQ-1 ANSWERS before build):

```ts
// OQ-1 rulings — FINAL (founder ruled the full table 2026-07-07; V6 mototec usa = KEEP,
// so AWI-2607-024 is INCLUDED and brand mototec stays). Every constant maps to a table row.
// M1 — cases whose history never enters the ledger:
const EXCLUDED_CASE_NUMBERS_PREFIX = ["SEED-VALIDATE"];               // C1
const EXCLUDED_CASE_NUMBERS = ["AWI-2607-016", "AWI-2607-018", "AWI-2606-001"]; // C2 Zzqxwv, C3 Bosch mislabel, C4 Morendelli
// M2 — junk brand keys stripped from event brands/brands_normalized at backfill (else the
// rebuild resurrects the brand row from the ledger — the coupling the ruling table documents):
const BACKFILL_STRIP_BRANDS = ["colox", "xyz", "nike"];               // B2, B10, B7
// M3 — explicit profile-row deletes (belt; the orphan sweep is the suspenders):
const JUNK_VENDOR_KEYS = ["td synexx", "bosch", "zzqxwv nonexistent trading"]; // V2, V3, V4
const JUNK_BRAND_KEYS = ["colox", "xyz", "nike"];                     // B2, B10, B7
```

Phase logic:
1. **Backup:** write `backups/corpus-<ISO-ts>/{vendor_intelligence,brand_intelligence,intelligence_events,case_outcomes}.json` (full-table selects; `fs.mkdirSync` + `writeFileSync`). Abort if any select errors. Runs in dry-run too — a backup can never hurt.
2. **Backfill:** for each non-excluded, non-deleted case: read `case_track_results` grouped by `attempt_number`; per attempt build one event — `signals` = `{ [track_key]: track_verdict_signal }` from that attempt's rows; `resolved_name`/`alias` from the attempt's `compiled_findings_json.research_name` when present (H4+ attempts), else `cases.supplier_identity.resolved_name`, else `vendor_name`; `resolved_domain` from `cases.supplier_identity.resolved_domain`; `identity_unconfirmed` from `cases.supplier_identity.identity_unconfirmed` (honest limitation, printed in the plan output: per-attempt identity is approximated by the case's current identity for pre-H4 attempts); `verdict` = `cases.verdict` on the LATEST attempt only (earlier attempts' verdicts were never stored — recorded as null, never guessed); `created_at` = max(`created_at`) of that attempt's rows. Insert via plain `.insert()` catching 23505 as skip (the append-only trigger allows INSERT; ON CONFLICT semantics via error-code skip, same as `recordInvestigationEvent`).
3. **Cleanup:** delete `JUNK_VENDOR_KEYS` rows from `vendor_intelligence`, `JUNK_BRAND_KEYS` from `brand_intelligence` (plain deletes — these tables are rollups, not the ledger).
4. **Rebuild:** `SELECT DISTINCT vendor_name_normalized FROM intelligence_events` (confirmed only) → `rollupVendor(key)` for each (imports Task 5's fn — ONE compute path); same for brand keys from `brands_normalized`.
5. **Orphan sweep:** any `vendor_intelligence`/`brand_intelligence` row whose key has zero confirmed events → print; delete under `--apply` (this is how stale junk not on the explicit list dies).
6. **Verify:** print per-vendor `case_count` vs `count(DISTINCT case_id)` from events — must match; print row counts before/after.

- [ ] **Step 2:** dry-run against prod (read-only + backup): `npx tsx --env-file=.env.local scripts/cleanup-corpus.ts` → eyeball the printed plan matches OQ-1. **Step 3:** `npx tsc --noEmit && npx eslint scripts/cleanup-corpus.ts` → green. **Step 4: commit** `H6 (Task 8): cleanup-corpus script — backup-first backfill + rebuild + junk rulings (FOUNDER-RUN)`

### Task 9: full verify, push, docs

- [ ] **Step 1:** `npx tsc --noEmit && npx eslint . && npx vitest run && npx next build` → ALL green.
- [ ] **Step 2:** update `D:\Projects\Hyprriq\Docs\HyprrIQ_OPEN_ITEMS.md` H6 line (BUILT, awaiting founder migration+ATs) + refresh the handover. **Per OQ-4's founder condition, the tracker entry MUST document the B3 residual window:** a Stripe-event retry that reprocesses after a crash between the credit RPC and the `processed=true` write can double-add once; window is one statement wide; `billing_audit` makes any occurrence auditable.
- [ ] **Step 3:** `git push origin staging`.
- [ ] **Step 4: STOP — founder runs: migration (if not yet) → deploy → cleanup-corpus --apply → AT-1..AT-6. On all-pass, founder declares H6 FROZEN → next session specs H7.**

---

## Self-review (run against the founder's 8-item scope)

1. Atomic credit RPCs → Tasks 1–3 ✓. 2. Retire `reset_client_credits` → Task 1 ✓. 3. `intelligence_events` + profile rollups → Tasks 1, 4, 5 ✓. 4. Memory writes gated on `identity_unconfirmed` → Task 5 (`rec.inserted && !identity_unconfirmed && !identity_failed`) ✓. 5. `resolved_domain` in corpus → Tasks 1 (column), 4 (event), 5 (rollup) ✓. 6. Corpus cleanup founder-run backup-first → Task 8 ✓. 7. `case_outcomes` + 30/90-day crons → Tasks 1, 6, 7 ✓. 8. `intelligence.ts` alias refactor onto `researchIdentityFor` → Task 4 (`buildInvestigationEvent`) + Task 5 (old duplicated logic deleted) ✓. Type consistency: `MemoryWriteArgs` defined once (Task 4), consumed by Tasks 5's `writeIntelligence`/`stageMemoryWrite`; `LedgerEvent` field list matches the Task 1 table columns minus `id`/`event_type` defaults ✓.
