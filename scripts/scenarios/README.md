# Review-screen scenarios

Each scenario is a **standalone, self-contained `.mjs` seed** that writes ONE throwaway case into
the live schema so a human can walk the admin review screen on staging. Scenarios are how we
validate the Intelligence-OS rendering deterministically, **without** live providers (Phase 5).

> **Scaffold status:** only `scenario-001` exists. The library is intentionally *not* populated
> further yet — real scenarios are authored after Phase 5 produces genuine evidence shapes, so the
> fixtures mirror what the live tracks actually emit instead of guesses.

## How a scenario works
A scenario writes only the **persisted inputs** the engine consumes:
- `cases` — one throwaway row (`status = awaiting_review`, `synthesis_status = complete`).
- `case_track_results` — per-track evidence, `track_verdict_signal`, score/band, unknowns.
- `case_synthesis` — the 9 modules (Module 9 decision snapshot, Module 4 contradictions,
  Module 5 hypotheses, Module 7 doubt) + the IOS version vector.

It does **not** write the verdict. The review screen **recomputes** it at read time via
`computeVerdict()` (Fork A), so the verdict you see is the real ADR-G004 output for the seeded
signals — the scenario only chooses the inputs.

## Required header schema
Every scenario `.mjs` MUST open with a documented header containing:

| Field             | Meaning                                                                 |
|-------------------|-------------------------------------------------------------------------|
| `Scenario name`   | kebab-case id, matches the filename suffix                              |
| `Purpose`         | what this scenario exercises / why it exists                            |
| `Signal spread`   | the `track_verdict_signal` per track (T0–T5) + score                   |
| `Expected verdict`| the verdict the screen should recompute, with the weighted score        |
| `Expected veto`   | which veto (if any) fires, and the reason string                        |

Filename convention: `scenario-NNN-<kebab-verdict-or-theme>.mjs` (zero-padded, sequential).

## Running
From `D:\Projects\Hyprriq\portal`:
```
node scripts/scenarios/scenario-001-verify-before-purchase.mjs [client_id]
```
Reads `.env.local` for `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (same Supabase
project staging reads). Prints the case id, the staging review URL, and the cleanup SQL.

## Cleanup
Each scenario is a **throwaway**. The seed prints three deletes to remove its case
(`case_synthesis` → `case_track_results` → `cases`). To remove **all** scenario cases at once:
```
node scripts/scenarios/cleanup.mjs
```
`cleanup.mjs` deletes every case with `case_number LIKE 'SEED-REVIEW-%'` and its child rows. Safe to
re-run.

## Current scenarios
- **`scenario-001-verify-before-purchase.mjs`** — solid identity, unproven sourcing channel.
  Recomputes to **Verify Before Purchase** (weighted 2.40/4), floored by **2 load-bearing
  contradictions**. Exercises every admin panel (Pass/Flag/Infer/Soft-Fail/N-A spread, unknowns,
  veto, all three Founder Decision actions).
