-- ════════════════════════════════════════════════════════════════════════════════════════
-- GATE EVENTS (founder-ruled 2026-08-17) — ⛔ FOUNDER-RUN. Describe-and-stop: NOT applied by
-- Claude. ADDITIVE ONLY: one new table, nothing existing altered.
--
-- WHY: today a banned-language hit is recorded ONLY when an operator clicks Publish and gets
-- a 422. No operator, no click, no record — so the confirms-authorization class was detected
-- by the founder noticing two blocked cases. That must never be the detection mechanism
-- again. The pipeline writes here at SELF-SCAN time, whether or not the repair succeeded.
--
-- prompt_version IS THE LOAD-BEARING COLUMN. It is what lets a class be PROVEN retired: after
-- a prompt bump the label stops appearing under the new version. Without it the log says
-- "this keeps happening" and can never say "this stopped".
--
-- THE RULED THRESHOLD: 3 hits on the SAME label under the CURRENT prompt_version = fix the
-- prompt at source, not keep repairing. (Enforced by the census report, not by this table —
-- a table that decides policy is a table nobody can change their mind about.)
-- ════════════════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS gate_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  attempt_number integer NOT NULL,
  target text NOT NULL,               -- 'track:<key>' | 'synthesis' | 'identity'
  field_path text NOT NULL,           -- the locator's own path
  label text NOT NULL,                -- the gate's label, verbatim
  sentence text,                      -- the offending sentence (clipped by the writer)
  outcome text NOT NULL,              -- 'repaired' | 'escalated_invariant' | 'escalated_retry' | 'blocked_at_publish'
  invariant_failures text[],          -- which of the six refused a repair, when outcome is escalated_invariant
  text_before text,                   -- BOTH versions stored (founder-ruled) so drift is auditable
  text_after text,
  prompt_version text NOT NULL,       -- IOS.prompt_version at generation time
  model_version text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- The pattern query is (label, prompt_version) over a recent window — index for exactly that.
CREATE INDEX IF NOT EXISTS gate_events_label_version_idx ON gate_events (label, prompt_version, created_at DESC);
CREATE INDEX IF NOT EXISTS gate_events_case_idx ON gate_events (case_id, attempt_number);

ALTER TABLE gate_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gate_events_admin ON gate_events;
CREATE POLICY gate_events_admin ON gate_events FOR ALL USING (is_current_user_admin());

-- READ-BACK VERIFICATION (run after; never trust "Success. No rows returned"):
--   SELECT table_name FROM information_schema.tables WHERE table_name='gate_events';   -- 1 row
--   SELECT count(*) FROM gate_events;                                                  -- 0
--   SELECT indexname FROM pg_indexes WHERE tablename='gate_events';                    -- 3
--   SELECT relrowsecurity FROM pg_class WHERE relname='gate_events';                   -- true
--
-- THE PATTERN QUERY THIS TABLE EXISTS TO ANSWER (the ruled threshold is 3):
--   SELECT label, prompt_version, count(*) AS hits, count(DISTINCT case_id) AS cases
--     FROM gate_events
--    WHERE created_at > now() - interval '30 days'
--    GROUP BY 1,2 HAVING count(*) >= 3 ORDER BY hits DESC;
