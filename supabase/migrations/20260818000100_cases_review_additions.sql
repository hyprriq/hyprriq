-- ════════════════════════════════════════════════════════════════════════════════════════
-- REVIEW ADDITIONS (founder-ruled 2026-08-17, Part B) — ✅ APPLIED 2026-08-17 by Claude via
-- Supabase MCP under explicit founder authorization. Read-back verified: column present as
-- jsonb/nullable, 0 rows carry a value, cases total unchanged at 39.
-- ADDITIVE ONLY: one nullable jsonb column, no backfill, no default rewrite of existing rows.
-- Zero behaviour change until code reads it.
--
-- ONE STORE (ruled): this SUPERSEDES the separately-proposed `case_reference_links` table.
-- Operator-attached links and operator-attached notes are the same feature and must not end
-- up in two places. If anyone later proposes case_reference_links, the answer is this column.
--
-- SHAPE — mirrors cases.additional_questions deliberately, because that is the shipped
-- precedent for "additive, source-tagged, visibly attributed to the review team":
--   [{ id, kind: 'link'|'note', url?, title?, body?, area?, added_by, added_at }]
--
-- THE RULES THIS COLUMN CARRIES (all founder-ruled):
--   ADDITIVE ONLY — never a rewrite of engine output, never evidence, never anything that
--   scores. Nothing in the verdict path reads this column, and nothing ever may.
--   GATED TWICE — every string runs the UNCHANGED scanHard at SAVE, and again on the PUBLISH
--   path (the delivery scan must include this column, or it is an unscanned hole straight to
--   the client — which is the one outcome explicitly ruled unacceptable).
--   ATTRIBUTED — rendered to the client under "Added by our review team", the same discipline
--   as analyst-added questions (report-view.tsx QUESTION_SOURCE_LABEL).
--   AUDITED — who/when/what via audit_log, as additional_questions already does.
--   CARRIED INTO THE PDF — a requirement of the PDF lane's spec, not an afterthought.
--
-- ⚠ OPEN, NEEDS A RULING BEFORE THE CODE LANDS: additions are PER CASE, not per attempt.
--   A re-run writes a new attempt; engine prose is replaced but operator additions are not
--   regenerated. Intended reading: additions SURVIVE a re-run (they are the operator's own
--   knowledge, not engine output). Stated here so the choice is deliberate — the alternative
--   (clear on re-run) silently loses operator work and must not happen by accident.
-- ════════════════════════════════════════════════════════════════════════════════════════

ALTER TABLE cases ADD COLUMN IF NOT EXISTS review_additions jsonb;

COMMENT ON COLUMN cases.review_additions IS
  'Operator-attached links/notes shown to the client as "Added by our review team". Additive only: never engine output, never evidence, never scored. Gated by scanHard at save and at publish.';

-- READ-BACK VERIFICATION (run after; never trust "Success. No rows returned"):
--   SELECT column_name, data_type, is_nullable FROM information_schema.columns
--     WHERE table_name='cases' AND column_name='review_additions';   -- 1 row, jsonb, YES
--   SELECT count(*) FROM cases WHERE review_additions IS NOT NULL;   -- 0
