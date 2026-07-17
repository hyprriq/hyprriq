# Claimant-Provenance Sizing — R's ruled candidate, sized against the corpus (2026-07-17)

**Context:** founder ruling (pending sizing): R's replacement candidate = claimant provenance — asserted-side = vendor-claimant accepted items; observed-side = independent-claimant accepted items at certainty `verified`. This document sizes it. READ-ONLY census #3 (temp script, run once, deleted; same base as the enumeration: 260 scoring-track rows, 65 attempts, 500 accepted items).
**Discipline:** SIZING ONLY. No R formula proposed, no cell, no threshold, no grouping. The planning thread rules R's shape; the founder places his own cases.

## VERDICT UP FRONT: IT DOES NOT DISCRIMINATE ON THIS CORPUS — STATED PLAINLY, PER THE RULING'S OWN STOP CONDITION.

**Vendor-claimant count is 0 on 62 of 65 attempts.** The only attempts with a non-zero asserted side are the one documents-bearing case: AWI-2607-031 attempts 1/2/3 (vendor = 2, 2, 1; ratios vs non-vendor-verified = 0.67, 1.00, 0.25). Everywhere else the ratio is 0/undefined on the asserted side. An axis that reads identically on 95% of cases is as dead here as the last two candidates.

**Why, structurally (not just corpus poverty):** `claimant: "vendor"` is written ONLY at Track 4's construction site (the OQ-S5 equivalence, code-literal, verified). So the asserted side of this candidate sees ONLY document-borne assertions — and exactly one case in the corpus has documents. Two distinct causes stack: (1) the test corpus is document-poor (corpus fact — real clients arrive with a pre-payment document, per the dormant-by-design note, so this half improves with real traffic); (2) **the vendor's WEB-BORNE story is invisible to claimant** on any corpus — a claim on the vendor's own website enters Track 1/2/3 items under claimant `independent_registry`/`third_party` (per-track code literals; the M1-claimant-is-provenance-class-not-per-claim-truth naming law recorded this exact fact). Cause (2) does not improve with adversarial cases.

**Supplementary measured fact for the ruling (data, not a proposal):** the stored record DOES carry a per-item, code-classified marker of vendor-asserted content that covers web items too — `source_type: "vendor_self_assertion"` (set from the deterministic source classifier, stored on every item, feeds evidence_hash). Corpus: **56 such items across 27 of 65 attempts** — populated where claimant-vendor is empty. Reported because the ruling's stop condition asks whether the signal exists; whether source_type belongs in R's definition is the planning thread's call, not made here.

## 1 · The full cross-tab (claimant × certainty per attempt)

Per-attempt table (v=verified / i=inferred / o=other; `vsa` = source_type vendor_self_assertion, supplementary): full 65-row listing preserved in this file's census output — headline rows: every attempt except AWI-2607-031's three shows `vendor=0`; independent_registry and third_party carry all remaining volume (e.g. AWI-2606-012#1: ir 7v, tp 4v+1o, vsa=2 · AWI-2607-022#5: ir 4v/1i/1o, tp 5v/17i, vsa=2 · AWI-2607-031#1: **vendor 2v**, ir 2v, tp 1v/4i/1o, vsa=2). Zero-item attempts: 13 (the absence state — re-runs that landed n_a, junk fixtures).

| attempt (non-zero vendor only) | vendor (all cert) | indep_registry verified | non-vendor verified | vendor ÷ non-vendor-verified |
|---|---|---|---|---|
| AWI-2607-031#1 | 2 | 2 | 3 | 0.67 |
| AWI-2607-031#2 | 2 | 1 | 2 | 1.00 |
| AWI-2607-031#3 | 1 | 2 | 4 | 0.25 |

## 2 · Discrimination

- vendor-claimant = 0: **62/65 attempts**. Non-vendor verified = 0: 18/65 (13 of those have zero items entirely). Both sides zero: 18.
- The ratio is defined and non-zero on exactly 3 attempts — one case. **No spread exists to report.** On this corpus the founder could place ONE case on the axis.

## 3 · THE HONEST HOLE (the question that decides the ruling) — reasoning both ways

Claimant tells us the vendor ASSERTED something; it does not tell us whether the assertion was independently corroborated (corroboration is M2's LLM judgment; the firewall's deterministic corroboration guards only the 7 fraud keys). So the candidate measures **asserted-vs-observed VOLUME**, not asserted-and-uncorroborated.

- **The case that volume is an acceptable proxy:** the axis's job is proportional doubt, not adjudication — "the story is mostly vendor-supplied with little independent verification" is arguably the honest condition doubt should track. And when a vendor claim IS corroborated, the corroborating source typically generates its own independent item, raising the observed side — the ratio partially self-corrects in the right direction without per-claim linkage.
- **The case that it conflates:** a corroborated vendor claim still counts on the asserted side, so a vendor with excellent, independently-confirmed paperwork reads as high-assertion — doubt the evidence did NOT earn. That overshoot is conservative in the caution sense but is precisely the failure mode A2 exists to kill (the paranoia machine, proportionality being the product). And the refinement that would fix it — per-claim corroboration linkage — does not exist deterministically today; adding it would be M2's LLM judgment, which collapses this candidate into the LLM-derived fallback.
- Also inherited: same-document items are all vendor-claimant (multi-item documents inflate the asserted side absent the OQ-S5-style same-source discipline), and cause (2) above — web-borne vendor assertion invisibility — biases the asserted side low on non-document cases.

## 4 · Conditionality

- `claimant` is present and inside the enum on **all 500 accepted items (0 missing, 0 defaulted)** — unconditional per item, code-literal per track, never LLM-written.
- It is carried BY evidence items, so the 13 zero-item attempts have nothing to read — an absence state, not a default.
- Both sides of the candidate live in `evidence_items` (stored on 256/260 rows; unconditional on every current path). No era-conditionality (unlike weight_validation).

## Routing finding logged separately (tracker) — NOT this gate's scope

The dealer_page_listed routing finding (98 rejections vs 2 weak-key acceptances; nothing routes a failed strong key to its weak counterpart) is logged in the tracker as a TRACK-LAYER finding per the ruling. **Verified from data: all 98 rejections sit on `supply_chain_relationship` (Track 2) rows — the ruling's parenthetical said "Track 3"; the key lives in Track 2's registry. Flagged, not silently reconciled.** Track 3 untouched, Track 2 untouched — nothing fixed here.

## What stands (restated)

The widening stands · Move 2 stands · S-0's lock unaffected by design · Axis 2 unblocked · doubt_level shape PROPOSED. **The honest fallback the founder placed on the table (Axis 1 ships LLM-derived — M3 `unresolved` + unknowns — labeled truthfully, blast radius bounded by the S-0 lock, tuned at G4) is now the live ruling question, with this sizing and the supplementary source_type fact as its data.**
