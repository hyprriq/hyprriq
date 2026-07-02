-- ============================================================
-- Migration — cases.additional_questions (ADR-T2-002 follow-up; analyst/review-team questions).
-- Analyst-authored questions added during admin review, SEPARATE from and never mixed with the
-- immutable AI-generated case_track_results.questions_to_ask (which stays per-track, untouched). This
-- is case-level. Merge + source-labelling happens in the view-model, not the data. Each element:
--   { id, question, reason, brand, priority, required, created_by, created_at }
--   - id          : client-generated uuid/string, used to target edit/delete
--   - question    : the analyst's question text
--   - reason      : optional analyst note (why it matters)
--   - brand       : optional submitted-brand tag ("" = case/vendor-level)
--   - priority    : "high" | "medium" | "low"
--   - required    : boolean — blocking (must be answered) vs helpful
--   - created_by  : Clerk user id of the analyst
--   - created_at  : ISO timestamp
-- NO status field (Pending/Answered/…) — that belongs to a future client-response feature with its
-- own spec + migration; deliberately out of scope here. Additive + nullable; no existing data affected.
-- ============================================================
BEGIN;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS additional_questions jsonb;
COMMIT;

-- VERIFY (run separately):
-- select column_name from information_schema.columns
--   where table_name = 'cases' and column_name = 'additional_questions';  -- expect 1 row
