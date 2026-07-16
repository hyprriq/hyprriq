# Module 7 — Doubt Matrix SKELETON (UNFILLED — founder authors every value)

**Status:** 🔴 EMPTY BY DESIGN. Per the A2 ruling (founder, 2026-07-16): the FOUNDER authors the
v1 matrix — not the build thread, not the planning thread. This file defines the two code-derived
axes and their value ranges; every cell and every derivation threshold is blank. Born as versioned
config (ADDENDUM-2 Move 1 reduced form, instance #1): on fill it becomes
`DOUBT_MATRIX_VERSION = "d7-1.0.0"` in the S-1 config layer. Tuning against the outcome corpus is
G4. Scenario-independent by construction — the axes are calibration inputs, never supplier types.
**OQ-S1 (BLOCKING) rules what feeds Axis 2 before this is filled.**

---

## Axis 1 — CLAIM-OBSERVABLE GAP (code-derived from the A1 record; no LLM input)

Derived per attempt from the widened M1 record + M3 assertions:
- `R` = load-relevant claims that died at the corroboration gate or sit `unresolved`
  (asserted-but-unverifiable — the firewall's rejection records, measured not inferred)
- `S` = load-relevant assertions `supported` with certainty `verified`

| Level | Meaning (fixed) | Derivation threshold (FOUNDER FILLS) |
|---|---|---|
| `none` | everything load-relevant is independently supported | R/S ≤ ____ and R ≤ ____ |
| `narrow` | isolated unverifiable claim(s) beside a verified core | ____ |
| `material` | the claim set leans on unverified assertions | ____ |
| `wide` | the story is mostly claim, little observable | ____ |

## Axis 2 — COST OF BEING WRONG (code-derived; inputs pending OQ-S1)

Recommendation on record (rec (a)): observable enforcement stakes only — Track 3 enforcement-posture
signal + validated veto-grade keys present + breadth of brands at issue. (Order value / account
exposure are NOT collected at intake — not available to v1 unless the founder rules a product change.)

Axis values renamed 2026-07-16 (founder): `elevated` collided with the OUTPUT enum (fixed by the
M7 contract), so the cost axis renames — `low | significant | severe`.

| Level | Meaning (fixed) | Derivation inputs/thresholds (FOUNDER FILLS after OQ-S1) |
|---|---|---|
| `low` | ____ | ____ |
| `significant` | ____ | ____ |
| `severe` | ____ | ____ |

## The matrix — doubt_level = MATRIX[gap][cost] (every cell FOUNDER-FILLED)

Output enum (fixed, from the B2/M7 contract): `minimal | targeted | elevated | broad`.

| gap \ cost | `low` | `significant` | `severe` |
|---|---|---|---|
| `none` | ____ | ____ | ____ |
| `narrow` | ____ | ____ | ____ |
| `material` | ____ | ____ | ____ |
| `wide` | ____ | ____ | ____ |

G005's own calibration examples, for orientation only (NOT prefilled): large gap + high cost →
heavy, broad doubt · small gap + high cost → light, targeted doubt at the one gap · small gap +
low cost → minimal · large gap + low cost → moderate, proportionate to stakes.

**What the LLM still does (unchanged ruling):** writes `doubt_focus` and `rationale` — WHERE the
doubt lands, never HOW MUCH. The gap/cost inputs and the chosen cell ride the stored record so
calibration is auditable and G4-tunable.
