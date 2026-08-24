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
// ── A PLACEHOLDER, NOT AN INVENTED COMPANY (founder-ruled 2026-08-24) ────────────────────────
// This was "Northgate Wholesale Co.", chosen to read as a plausible fictional wholesaler. That was
// the wrong target. The visual-assets ruling is "no company names — real OR invented; placeholders
// only", and the reason is the Nordvik catch: a name invented to be fictional turned out to be a
// real pharmaceutical company. A plausible-sounding invented name is exactly the one that collides.
//
// "Example Trading LLC" cannot be mistaken for a real business by a reader OR by accident, which is
// the whole property required. It also matches the homepage spec's register verbatim.
export const SAMPLE_VENDOR = "Example Trading LLC";

/** The live shape the generator emits. Presentation surfaces must never contain it. */
export const LIVE_CASE_ID_RE = /AWI-\d{4}-\d{3}/;
