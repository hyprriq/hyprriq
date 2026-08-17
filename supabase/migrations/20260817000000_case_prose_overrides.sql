-- ════════════════════════════════════════════════════════════════════════════════════════
-- CLIENT-PROSE OVERRIDES (2026-08-17) — "Show + Fix" piece 2. ADDITIVE ONLY: one new table,
-- nothing existing altered. Applied by Claude under EXPLICIT founder authorization given in
-- session 2026-08-17 ("you can do the migration supa is connected i authorize to avoid
-- delays") — a named exception to the standing describe-and-stop law, recorded here because
-- the exception belongs in the record next to the change it permitted.
--
-- WHY IT EXISTS: the delivery gate blocks a publish on banned language. Until today the
-- operator was told only the gate's label — no sentence, no field — and had no way forward
-- but a code deploy or a full case re-run, with a paying client waiting. Piece 1 (385088b)
-- made the block legible. This table makes it FIXABLE.
--
-- ⚖ THE LAW THIS TABLE ENCODES (founder-ruled 2026-08-17 — the reason it is a separate table
--   and not a column on case_track_results / case_synthesis):
--
--     AN OVERRIDE IS A CLIENT-PROJECTION LAYER. IT IS NEVER AN EVIDENCE EDIT.
--
--   The stored attempt record stays FROZEN and authoritative (H1, the Case Investigation
--   Ledger). Overrides are applied on the way OUT, in lib/portal/clientReport.ts, to the text
--   a human reads. Nothing that scores, derives or decides ever reads this table:
--   rejudge-case.ts, the firewall, the signal derivation and the verdict engine all keep
--   reading raw evidence, so determinism survives BY CONSTRUCTION rather than by discipline.
--   An operator may reword narrative prose. An operator may NEVER change what the evidence
--   says, what it was mapped to, or what it scored — there is no path from this table to a
--   weight, a signal or a verdict, and there must never be one.
--
--   original_text is stored so an override can be REFUSED when it no longer matches: a
--   re-run writes a new attempt, and an override keyed to the old wording must never silently
--   rewrite different content. Stale override = ignored + surfaced, never applied.
-- ════════════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS case_prose_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  attempt_number integer NOT NULL,        -- overrides are PER ATTEMPT; a re-run starts clean
  target text NOT NULL,                   -- 'track:<track_key>' | 'synthesis' | 'identity'
  field_path text NOT NULL,               -- the locator's own path, e.g. 'questions_to_ask[1].reason'
  original_text text NOT NULL,            -- what the engine wrote; the staleness check
  replacement_text text NOT NULL,         -- what the operator wrote; gate-scanned before it lands
  reason text,                            -- optional operator note
  actor_id text NOT NULL,                 -- Clerk user id of the operator who wrote it
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz                  -- soft delete = revert to the engine's wording
);

-- One ACTIVE override per field per attempt; a revert soft-deletes and a re-edit inserts anew,
-- so the table reads as an append-mostly ledger of what the operator changed and when.
CREATE UNIQUE INDEX IF NOT EXISTS case_prose_overrides_field_uniq
  ON case_prose_overrides (case_id, attempt_number, target, field_path)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS case_prose_overrides_case_attempt_idx
  ON case_prose_overrides (case_id, attempt_number) WHERE deleted_at IS NULL;

ALTER TABLE case_prose_overrides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS case_prose_overrides_admin ON case_prose_overrides;
CREATE POLICY case_prose_overrides_admin ON case_prose_overrides FOR ALL USING (is_current_user_admin());

-- READ-BACK VERIFICATION (run after; never trust "Success. No rows returned"):
--   SELECT table_name FROM information_schema.tables WHERE table_name='case_prose_overrides';  -- 1 row
--   SELECT count(*) FROM case_prose_overrides;                                                 -- 0
--   SELECT indexname FROM pg_indexes WHERE tablename='case_prose_overrides';                   -- 3 (pkey + 2)
--   SELECT relrowsecurity FROM pg_class WHERE relname='case_prose_overrides';                  -- true
