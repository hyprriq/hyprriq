# ADR-T2-001 — LOA Excluded from Track 2 Authorization Scoring

**Status:** Accepted (2026-06-28) · **Scope:** Track 2 (Supply Chain Relationship) · **Supersedes:** master-spec Part 2 "Level B (valid LOA = pass)" for Track 2 scoring.

## Context
HyprrIQ is a **pre-purchase** decision tool — clients submit a supplier *before* they buy. A Letter of
Authorization (LOA) is:
- **Post-relationship** — issued by a brand only after a commercial relationship exists, often only when
  Amazon later demands compliance documentation.
- **Rare** — fewer than ~10–20% of legitimate wholesale sellers will ever hold one at the pre-purchase stage.
- **Unverifiable** — a private document signed by a brand manager, with no public registry to check against.

The master spec mapped "Level B = valid LOA = pass," and `loa_legitimate` carries `points: 4` in the (frozen)
`supply_chain_relationship` registry. Scoring on LOA presence would therefore (a) bias *against* the legitimate
pre-purchase majority who don't have one, (b) import an **unverifiable** claim into a deterministic engine —
violating the platform's governing principle of evaluating *observable* evidence, and (c) create a gaming
surface (a forged/overstated LOA inflating the score).

## Decision
1. **`loa_legitimate` is excluded from Track 2 authorization scoring entirely.** It is not a proposable key in
   the Track 2 prompt (9 keys, not 10).
2. **Absence of an LOA is always neutral** — it never maps to `no_connection_found` and never reduces the signal.
3. **Triple-guarded** (code-decides): (i) not in the prompt's key list; (ii) firewall-rejected — no Track 2
   `ALLOWED_PROFILES` entry, so the provenance gate rejects it if ever proposed; (iii) `runTrack2` drops any
   validated `loa_legitimate` before scoring.
4. **Registry stays frozen.** `loa_legitimate` remains a valid **Track 4 (documentation_review)** key — there an
   uploaded LOA is legitimately a *document to assess*, a different question from authorization discovery.
5. **Uploaded compliance documents (LOA, reseller certificates) belong to a separate, future Compliance
   Documentation module/report** — distinct from the authorization-discovery engine. An uploaded LOA may surface
   in Track 2 `reasoning_notes` as analyst context only (zero scoring weight).
6. **Level B is retired for Track 2.** The pass path is Level-A publicly-verifiable indicators: official dealer
   locators, official distributor pages, mega-distributor relationships, trade-press confirmation.
7. A "request an LOA" question is generated **only** when evidence already indicates likely authorization (an
   Amazon-compliance strengthener) — never as a primary gap question.

## Consequences
- Track 2 stays focused on observable, pre-purchase, publicly-verifiable authorization signals.
- The deterministic engine never depends on an unverifiable private document; the gaming surface is removed.
- The `[dealer_page_listed, loa_legitimate]` stacking alternative group is dropped (moot); the remaining public
  indicators are complementary, not mutually exclusive, so none are forced into "only strongest scores."
- A future Compliance Documentation capability is now an explicit, separate roadmap item.

## Alternatives considered
- **Lower `loa_legitimate` MIN_AUTHORITY to `low`** — rejected: `MIN_AUTHORITY` governs the authority gate, not the
  point value; the key would still score 4 toward pass. Does not achieve the goal.
- **Set `loa_legitimate` points to 0 in `weights.ts`** — rejected: modifies the frozen registry and damages the
  Track 4 documentation_review use of the same key.
- **Keep LOA as a non-scored Track 2 evidence item** — rejected (founder): conflates compliance documentation with
  authorization discovery; a separate Compliance layer is the correct boundary.
