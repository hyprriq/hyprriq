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

-- ============================================================
-- POST-APPLY VERIFICATION (founder runs each; confirm before the H1 code merges)
-- ============================================================
-- A-1: expect 0 rows (no duplicate attempts):
--   SELECT case_id, track_key, attempt_number, count(*) FROM case_evidence_packs
--   GROUP BY 1,2,3 HAVING count(*) > 1;
-- A-2: expect the 8 re-run cases to show attempts up to ~4:
--   SELECT case_id, max(attempt_number) FROM case_evidence_packs GROUP BY 1 ORDER BY 2 DESC LIMIT 10;
-- B-1: expect exactly case_synthesis_case_attempt_key (and NOT case_synthesis_case_id_key):
--   SELECT constraint_name FROM information_schema.table_constraints
--   WHERE table_name='case_synthesis' AND constraint_type='UNIQUE';
-- C-1: expect 2 rows:
--   SELECT column_name FROM information_schema.columns WHERE table_name='cases'
--   AND column_name IN ('delivered_attempt','reinvestigation_pending');
-- C-2: expect the one delivered case pinned:
--   SELECT id, case_number, status, delivered_attempt FROM cases WHERE status IN ('delivered','complete');
-- audit_log nullability (Task 3 writes actor_id:'system'; confirm the column accepts it):
--   SELECT column_name, is_nullable, data_type FROM information_schema.columns
--   WHERE table_name='audit_log' AND column_name IN ('actor_id','actor_type');
