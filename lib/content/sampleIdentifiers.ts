// ── SAMPLE IDENTIFIERS — STRUCTURALLY UNCOLLIDABLE (founder-locked 2026-08-22, item 4b/4c) ───
//
// Every marketing mock, prototype and reference that shows a case ID reads from HERE.
//
// WHY THIS EXISTS: the homepage hero shipped `AWI-2606-014` and the design reference shipped
// `AWI-2607-022 · TD SYNNEX` — a REAL delivered case paired with a REAL distributor's name. The
// dashboard preview had already been fixed once, on its own, with a different trick (month "00"),
// which left TWO conventions and four other surfaces still using live-shaped ids. Ids like
// AWI-2608-041 were not safe, merely UNREACHED: 2608-032 through -039 are real, so the next
// submissions walk straight into them.
//
// THE GUARANTEE: the DB generator (20260601000000_initial_schema.sql) builds case numbers as
//   'AWI-' || to_char(NOW(),'YYMM') || '-' || <sequence>
// so the middle segment is ALWAYS four digits. A NON-NUMERIC middle segment therefore cannot be
// produced by the generator at any date, for any sequence value — collision is impossible by
// construction rather than avoided by luck. sampleIdentifiers.lock.test.ts enforces that no
// presentation surface reuses the live shape.
//
// The vendor is fictional to match: a real distributor's name beside a verdict-shaped mock is a
// claim about a real business, which is exactly what the product refuses to make.

export const SAMPLE_CASE_IDS = ["AWI-SAMPLE-001", "AWI-SAMPLE-002", "AWI-SAMPLE-003", "AWI-SAMPLE-004"] as const;
export const SAMPLE_CASE_ID = SAMPLE_CASE_IDS[0];
export const SAMPLE_VENDOR = "Northgate Wholesale Co.";

/** The live shape the generator emits. Presentation surfaces must never contain it. */
export const LIVE_CASE_ID_RE = /AWI-\d{4}-\d{3}/;
