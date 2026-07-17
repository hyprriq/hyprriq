# Doubt-Matrix Corpus Pull — raw axis inputs from the frozen records (2026-07-17)

**Purpose:** founder matrix-fill material (the fill blocks S-1). One row per stored (case, attempt) pair, raw values only.
**Discipline (same as the skeleton):** no cell is filled, no threshold suggested, no rows grouped or banded, no "looks like" — the founder places his own cases; that IS the authoring.
**Provenance:** produced by `scripts/doubt-matrix-corpus-pull.ts` (READ-ONLY — zero writes, zero API calls; re-runnable: `npx tsx --env-file=.env.local scripts/doubt-matrix-corpus-pull.ts`). Data read 2026-07-17.

## Stated approximations and data facts (plainly, not smoothed)

1. **M3 does not exist yet, so `unresolved` cannot be counted.** Axis 1's R is defined as corroboration-gate deaths + M3 `unresolved`; only the first half is measurable today. **Accepted-verified is the honest proxy for S**; the R column below is the firewall half ONLY. The table understates R relative to its S-1 definition — by an amount nobody can compute until M3 exists.
2. **The corroboration gate has ZERO recorded rejections on every attempt that stores weight_validation.** A fact of the stored corpus, reported as found: R's firewall half currently has no nonzero live example. (Attempts predating the validation plumbing show "not stored" instead of 0.)
3. **Per-attempt verdicts are not persisted.** `cases.verdict` belongs to the delivered attempt (delivered cases) or rides the live pointer (latest attempt) otherwise — attributed per row; every other attempt prints "not stored".
4. **65 rows, not A5's ~36:** the pull includes junk/seed fixtures (Zzqxwv, SEED-VALIDATE), superseded-era attempts, and unconfirmed-identity cases. Nothing was filtered — the founder includes or excludes his own cases.
5. Pre-Track-3 attempts show track_3 "not stored"/`n_a`; `weight_validation` coverage grew across the hardening arc (per-row notes show how many tracks lack it).
6. **Veto-grade key set derived from `weights.ts` at run time (not remembered):** registration_fabricated, address_fraudulent, website_fraudulent, scam_reports_corroborated, counterfeit_channel, conflicting_authorization, b2b_only_confirmed, active_ip_complaints, confirmed_amazon_restrictions, cease_and_desist_distributed, document_alteration, retail_receipt_as_wholesale.

## The table

| case | att | vendor | stored verdict | A1: corro-gate rejections | A1: accepted verified (S proxy) | A2: track_3 signal [enforcement keys] | A2: veto-grade keys validated | A2: brands at issue |
|---|---|---|---|---|---|---|---|---|
| AWI-2606-001 | 1 | Morendelli | source_clear (delivered) | not stored | 0 | not stored [no enforcement-class keys] | none | 2 (milwaukee, knipex) |
| AWI-2606-001 | 2 | Morendelli | not stored (per-attempt verdicts are not persisted) | 0 (2/4 tracks w/o stored validation) | 0 | soft_fail [no enforcement-class keys] | none | 2 (milwaukee, knipex) |
| AWI-2606-003 | 1 | Global Dist | verify_before_purchase (live ptr) | not stored | 0 | n_a [no enforcement-class keys] | none | 1 (now foods) |
| AWI-2606-004 | 1 | Ingram Micro | do_not_rely (live ptr) | 0 (3/4 tracks w/o stored validation) | 5 | soft_fail [no enforcement-class keys] | none | 1 (Samsung) |
| AWI-2606-005 | 1 | Ingram Micro | do_not_rely (live ptr) | 0 (3/4 tracks w/o stored validation) | 4 | soft_fail [no enforcement-class keys] | none | 1 (Samsung) |
| AWI-2606-007 | 1 | TD SYnnex | do_not_rely (live ptr) | 0 (3/4 tracks w/o stored validation) | 4 | soft_fail [no enforcement-class keys] | none | 1 (Lenovo) |
| AWI-2606-008 | 1 | D and H | do_not_rely (live ptr) | 0 (3/4 tracks w/o stored validation) | 0 | soft_fail [no enforcement-class keys] | none | 1 (Lenovo) |
| AWI-2606-009 | 1 | TD Synnex | do_not_rely (live ptr) | 0 (2/4 tracks w/o stored validation) | 2 | soft_fail [no enforcement-class keys] | none | 2 (lenovo, Bosch) |
| AWI-2606-010 | 1 | Ingram Micro | verify_before_purchase (live ptr) | 0 (2/4 tracks w/o stored validation) | 11 | soft_fail [no enforcement-class keys] | none | 1 (Samsung) |
| AWI-2606-011 | 1 | TD Synnex | verify_before_purchase (live ptr) | 0 (2/4 tracks w/o stored validation) | 5 | soft_fail [no enforcement-class keys] | none | 2 (lenovo, bosch) |
| AWI-2606-012 | 1 | TD Synexx | not stored (per-attempt verdicts are not persisted) | 0 (2/4 tracks w/o stored validation) | 11 | soft_fail [no enforcement-class keys] | none | 2 (Lenovo, Bosch) |
| AWI-2606-012 | 5 | TD Synexx | not stored (per-attempt verdicts are not persisted) | 0 (2/4 tracks w/o stored validation) | 0 | soft_fail [no enforcement-class keys] | none | 2 (Lenovo, Bosch) |
| AWI-2606-012 | 6 | TD Synexx | not stored (per-attempt verdicts are not persisted) | 0 (2/4 tracks w/o stored validation) | 9 | n_a [no enforcement-class keys] | none | 2 (Lenovo, Bosch) |
| AWI-2606-012 | 7 | TD Synexx | not stored (per-attempt verdicts are not persisted) | 0 (2/4 tracks w/o stored validation) | 7 | n_a [no enforcement-class keys] | none | 2 (Lenovo, Bosch) |
| AWI-2606-012 | 8 | TD Synexx | not stored (per-attempt verdicts are not persisted) | 0 (2/4 tracks w/o stored validation) | 8 | n_a [no enforcement-class keys] | none | 2 (Lenovo, Bosch) |
| AWI-2606-012 | 9 | TD Synexx | usable_with_conditions (live ptr) | 0 (2/4 tracks w/o stored validation) | 8 | n_a [no enforcement-class keys] | none | 2 (Lenovo, Bosch) |
| AWI-2607-013 | 1 | Ingram Micro | not stored (per-attempt verdicts are not persisted) | 0 (2/4 tracks w/o stored validation) | 11 | soft_fail [no enforcement-class keys] | none | 2 (Dell, Samsung) |
| AWI-2607-013 | 5 | Ingram Micro | do_not_rely (live ptr) | 0 (2/4 tracks w/o stored validation) | 0 | soft_fail [no enforcement-class keys] | none | 2 (Dell, Samsung) |
| AWI-2607-014 | 1 | Ingram Micro | verify_before_purchase (live ptr) | 0 (2/4 tracks w/o stored validation) | 10 | soft_fail [no enforcement-class keys] | none | 2 (dell, lenovo) |
| AWI-2607-015 | 1 | TD Synexx | not stored (per-attempt verdicts are not persisted) | 0 (2/4 tracks w/o stored validation) | 10 | soft_fail [no enforcement-class keys] | none | 1 (microsoft) |
| AWI-2607-015 | 5 | TD Synexx | do_not_rely (live ptr) | 0 (2/4 tracks w/o stored validation) | 0 | soft_fail [no enforcement-class keys] | none | 1 (microsoft) |
| AWI-2607-016 | 1 | Zzqxwv Nonexistent Trading | not stored (per-attempt verdicts are not persisted) | 0 (2/4 tracks w/o stored validation) | 4 | soft_fail [no enforcement-class keys] | registration_fabricated | 1 (xyz) |
| AWI-2607-016 | 2 | Zzqxwv Nonexistent Trading | not stored (per-attempt verdicts are not persisted) | 0 (2/4 tracks w/o stored validation) | 0 | n_a [no enforcement-class keys] | none | 1 (xyz) |
| AWI-2607-016 | 3 | Zzqxwv Nonexistent Trading | do_not_rely (live ptr) | 0 (2/4 tracks w/o stored validation) | 0 | n_a [no enforcement-class keys] | none | 1 (xyz) |
| AWI-2607-017 | 1 | JC Sales | not stored (per-attempt verdicts are not persisted) | 0 (2/4 tracks w/o stored validation) | 1 | soft_fail [no enforcement-class keys] | none | 1 (colox) |
| AWI-2607-017 | 5 | JC Sales | not stored (per-attempt verdicts are not persisted) | 0 (2/4 tracks w/o stored validation) | 0 | soft_fail [no enforcement-class keys] | none | 1 (colox) |
| AWI-2607-017 | 6 | JC Sales | verify_before_purchase (live ptr) | 0 (2/4 tracks w/o stored validation) | 1 | n_a [no enforcement-class keys] | none | 1 (colox) |
| AWI-2607-018 | 1 | Bosch | not stored (per-attempt verdicts are not persisted) | 0 (2/4 tracks w/o stored validation) | 2 | soft_fail [no enforcement-class keys] | none | 1 (nike) |
| AWI-2607-018 | 5 | Bosch | not stored (per-attempt verdicts are not persisted) | 0 (2/4 tracks w/o stored validation) | 0 | soft_fail [no enforcement-class keys] | none | 1 (nike) |
| AWI-2607-018 | 6 | Bosch | not stored (per-attempt verdicts are not persisted) | 0 (2/4 tracks w/o stored validation) | 4 | n_a [no enforcement-class keys] | none | 1 (nike) |
| AWI-2607-018 | 7 | Bosch | not stored (per-attempt verdicts are not persisted) | 0 (2/4 tracks w/o stored validation) | 3 | n_a [no enforcement-class keys] | none | 1 (nike) |
| AWI-2607-018 | 8 | Bosch | not stored (per-attempt verdicts are not persisted) | 0 (2/4 tracks w/o stored validation) | 0 | n_a [no enforcement-class keys] | none | 1 (nike) |
| AWI-2607-018 | 9 | Bosch | usable_with_conditions (live ptr) | 0 (2/4 tracks w/o stored validation) | 3 | n_a [no enforcement-class keys] | none | 1 (nike) |
| AWI-2607-019 | 1 | TD Synnex | verify_before_purchase (live ptr) | 0 (2/4 tracks w/o stored validation) | 10 | soft_fail [no enforcement-class keys] | none | 1 (Lenovo) |
| AWI-2607-020 | 1 | Td Synnex | not stored (per-attempt verdicts are not persisted) | 0 (2/4 tracks w/o stored validation) | 6 | soft_fail [no enforcement-class keys] | none | 1 (Bosch) |
| AWI-2607-020 | 5 | Td Synnex | do_not_rely (live ptr) | 0 (2/4 tracks w/o stored validation) | 0 | soft_fail [no enforcement-class keys] | none | 1 (Bosch) |
| AWI-2607-021 | 1 | TD Synnex | not stored (per-attempt verdicts are not persisted) | 0 (2/4 tracks w/o stored validation) | 7 | soft_fail [no enforcement-class keys] | none | 1 (Bosch) |
| AWI-2607-021 | 5 | TD Synnex | not stored (per-attempt verdicts are not persisted) | 0 (2/4 tracks w/o stored validation) | 0 | soft_fail [no enforcement-class keys] | none | 1 (Bosch) |
| AWI-2607-021 | 6 | TD Synnex | usable_with_conditions (delivered) | 0 (2/4 tracks w/o stored validation) | 6 | n_a [no enforcement-class keys] | none | 1 (Bosch) |
| AWI-2607-021 | 7 | TD Synnex | not stored (per-attempt verdicts are not persisted) | 0 (2/4 tracks w/o stored validation) | 6 | n_a [no enforcement-class keys] | none | 1 (Bosch) |
| AWI-2607-021 | 8 | TD Synnex | not stored (per-attempt verdicts are not persisted) | 0 (1/4 tracks w/o stored validation) | 8 | flag [brand_enforcement_signals] | none | 1 (Bosch) |
| AWI-2607-021 | 9 | TD Synnex | not stored (per-attempt verdicts are not persisted) | 0 (1/4 tracks w/o stored validation) | 5 | flag [brand_enforcement_signals] | none | 1 (Bosch) |
| AWI-2607-022 | 1 | TD Synnex | not stored (per-attempt verdicts are not persisted) | 0 (2/4 tracks w/o stored validation) | 7 | soft_fail [no enforcement-class keys] | none | 2 (Lenovo, Bosch) |
| AWI-2607-022 | 2 | TD Synnex | not stored (per-attempt verdicts are not persisted) | 0 (2/4 tracks w/o stored validation) | 8 | n_a [no enforcement-class keys] | none | 2 (Lenovo, Bosch) |
| AWI-2607-022 | 3 | TD Synnex | not stored (per-attempt verdicts are not persisted) | 0 (2/4 tracks w/o stored validation) | 7 | n_a [no enforcement-class keys] | none | 2 (Lenovo, Bosch) |
| AWI-2607-022 | 4 | TD Synnex | not stored (per-attempt verdicts are not persisted) | 0 (1/4 tracks w/o stored validation) | 12 | flag [no_enforcement_found, brand_enforcement_signals] | none | 2 (Lenovo, Bosch) |
| AWI-2607-022 | 5 | TD Synnex | verify_before_purchase (live ptr) | 0 (1/4 tracks w/o stored validation) | 9 | flag [no_enforcement_found, brand_enforcement_signals] | none | 2 (Lenovo, Bosch) |
| AWI-2607-023 | 1 | kehe | not stored (per-attempt verdicts are not persisted) | 0 (2/4 tracks w/o stored validation) | 3 | soft_fail [no enforcement-class keys] | none | 1 (organic india) |
| AWI-2607-023 | 2 | kehe | verify_before_purchase (delivered) | 0 (2/4 tracks w/o stored validation) | 4 | soft_fail [no enforcement-class keys] | none | 1 (organic india) |
| AWI-2607-024 | 1 | Mototec USA | not stored (per-attempt verdicts are not persisted) | 0 (2/4 tracks w/o stored validation) | 3 | soft_fail [no enforcement-class keys] | none | 1 (mototec) |
| AWI-2607-024 | 5 | Mototec USA | not stored (per-attempt verdicts are not persisted) | 0 (2/4 tracks w/o stored validation) | 2 | soft_fail [no enforcement-class keys] | none | 1 (mototec) |
| AWI-2607-024 | 6 | Mototec USA | do_not_rely (live ptr) | 0 (2/4 tracks w/o stored validation) | 0 | soft_fail [no enforcement-class keys] | none | 1 (mototec) |
| AWI-2607-026 | 1 | Bulk Electronics Wholesale Vendor | verify_before_purchase (live ptr) | 0 (2/4 tracks w/o stored validation) | 4 | n_a [no enforcement-class keys] | none | 1 (nike) |
| AWI-2607-027 | 1 | Stree Sutra Trading Co | verify_before_purchase (live ptr) | 0 (2/4 tracks w/o stored validation) | 0 | n_a [no enforcement-class keys] | none | 1 (Test Brand) |
| AWI-2607-028 | 1 | TD SYNNEX Corporation | verify_before_purchase (live ptr) | 0 (1/4 tracks w/o stored validation) | 10 | flag [no_enforcement_found, brand_enforcement_signals] | none | 1 (microsoft) |
| AWI-2607-029 | 1 | Mazel Company | verify_before_purchase (live ptr) | 0 | 1 | flag [no_enforcement_found] | none | 1 (HC Planters) |
| AWI-2607-030 | 1 | 4gsm | not stored (per-attempt verdicts are not persisted) | 0 (1/4 tracks w/o stored validation) | 5 | soft_fail [no enforcement-class keys] | none | 1 (sterllite) |
| AWI-2607-030 | 2 | 4gsm | do_not_rely (live ptr) | 0 (1/4 tracks w/o stored validation) | 2 | soft_fail [no enforcement-class keys] | none | 1 (sterllite) |
| AWI-2607-031 | 1 | di Morandelli Luca & C. sas | not stored (per-attempt verdicts are not persisted) | 0 | 5 | flag [no_enforcement_found, brand_enforcement_signals] | none | 1 (petzl) |
| AWI-2607-031 | 2 | di Morandelli Luca & C. sas | not stored (per-attempt verdicts are not persisted) | 0 | 2 | flag [no_enforcement_found, brand_enforcement_signals] | none | 1 (petzl) |
| AWI-2607-031 | 3 | di Morandelli Luca & C. sas | verify_before_purchase (delivered) | 0 | 5 | flag [no_enforcement_found, brand_enforcement_signals] | none | 1 (petzl) |
| SEED-VALIDATE-T1-1782628513681 | 1 | Ingram Micro | do_not_rely (live ptr) | 0 (3/4 tracks w/o stored validation) | 0 | soft_fail [no enforcement-class keys] | none | 1 (Samsung) |
| SEED-VALIDATE-T1-1782630128321 | 1 | Ingram Micro | do_not_rely (live ptr) | 0 (3/4 tracks w/o stored validation) | 0 | soft_fail [no enforcement-class keys] | none | 1 (Samsung) |
| SEED-VALIDATE-T1-1782631228537 | 1 | Ingram Micro | do_not_rely (live ptr) | 0 (3/4 tracks w/o stored validation) | 4 | soft_fail [no enforcement-class keys] | none | 1 (Samsung) |
| SEED-VALIDATE-T1-1782799704622 | 1 | Ingram Micro | verify_before_purchase (live ptr) | 0 (2/4 tracks w/o stored validation) | 8 | soft_fail [no enforcement-class keys] | none | 1 (Samsung) |

65 attempt rows.
