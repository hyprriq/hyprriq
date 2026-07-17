# Stop-the-Line Investigation — zero corroboration-gate rejections across the corpus (2026-07-17)

**Trigger:** the doubt-matrix corpus pull reported zero corroboration-gate rejections on every attempt that stores validation — against A1's premise that corroboration deaths ARE the claim-observable gap, "already computed, deterministic, stored per attempt."
**Discipline:** REPORT ONLY. Nothing fixed, nothing proposed as a ruling, no frozen surface touched, no matrix value anywhere. The planning thread rules what A1, SO-S1-1 Condition 2, and Axis 1 become.
**Method:** source reading (`weightValidation.ts` @ VALIDATION 1.7.0, `weights.ts`, `pipeline.steps.ts`, track builders) + a read-only census over `case_track_results.weight_validation` (temp script, run once, deleted — methodology reproduced below).

## VERDICT: (c) — the corpus is clean. (a) is NOT the cause: persistence exists and is rich. (b) is NOT the cause: the live gate counts distinct real-world URLs; the tracker's two lines were both true at their timestamps. PLUS ONE STRUCTURAL FINDING nobody asked for, reported because it is decisive: the corroboration gate's rejection population has the OPPOSITE POLARITY from the gap M7 wants.

## (a) Are rejections persisted? — YES, end to end, and the class is heavily populated

- `validateWeights` (weightValidation.ts:167-235) emits a `WeightValidation` record for EVERY proposal — accepted or rejected — with `gate` + `rejection_reason`; the corroboration rejection path is line 190.
- Track builders carry it on `TrackOutput.weight_validation` (track1.ts:176, track2.ts:203, track4 equivalents); `pipeline.steps.ts:192/212/273` persists it to `case_track_results.weight_validation`, attempt-keyed rows, H1-frozen.
- **Census: 970 proposals stored across 114 track rows · 500 accepted · 470 REJECTED with gates.** Rejections by gate: provenance 347 · llm_returned_unknown 104 · contradiction 17 · grounding 1 · consensus 1 · **corroboration 0**.
- **Consequence for ADDENDUM-2 Move 2:** "ours eats nothing" is FALSE as stated for the widened record broadly — the rejection-record class carries 470 live records. What is empty is specifically the CORROBORATION-GATE subset, which is the subset A1's text and the skeleton's R definition name.
- Coverage caveat: attempts predating the validation plumbing store nothing; how many rejections those attempts WOULD have recorded is uncomputable without re-running — not estimated.

## (b) Does the gate reject in practice? — the live code is correct; the tracker does not contradict itself ACROSS TIME

- Live code (weightValidation.ts:190): corroboration counts `new Set(matching)` — DISTINCT VALID CITED SOURCE IDS, evaluated after provenance. Since H7 SO-1 (pack 1.1.0, 2026-07-09) canonical-URL dedupe at `finalizePack`, distinct pack IDs ⟺ distinct real-world URLs. The file's own version history states it: "Post-SO-1 dedupe, 'distinct' finally means distinct real-world URLs" (v1.3.0 note).
- **Tracker line 114 (June audit: "counts pack IDs, same URL twice = 2 sources") described the PRE-H7 1.0.0 pack era — true then. Line 151 (post-Track-3 sweep: "counts DISTINCT VALID sources") describes the post-H7 state — true now. Both correct at their timestamps; no live under-rejection defect; nothing to describe-and-stop on this claim.**
- Still-live residuals, already on record, both conservative (over-rejection direction, cannot cause the zero): the gate is per-item (split citations across two items each die individually — mitigated by the cite-all-on-one-item prompt rule); canonical dedupe cannot merge mirror sites (ADR-T1-001's known residual seam).

## (c) Is the corpus clean? — YES, and quantified

- **In 970 proposals across the whole corpus, a corroboration-required key was proposed exactly ONCE** (`website_fraudulent`), and it died at GROUNDING (no valid citation) before corroboration was ever evaluated. **The corroboration gate has never once evaluated a proposal that reached it.** Zero rejections is fully explained: 65 mostly-test attempts on legitimate mega-distributors; the LLM almost never proposes fraud-class keys against them, which is correct behavior.
- Meaning for A1's timeline, stated plainly: **right in principle, unmeasurable today** for the corroboration subset — no live nonzero example exists, and none can exist until an adversarial case both draws a fraud-class proposal AND cites valid-but-insufficient sources.

## THE STRUCTURAL FINDING — polarity (reported, not ruled)

`CORROBORATION_REQUIRED` (weightValidation.ts:137-152) lists exactly 7 keys — **all hard_fail/veto-class fraud keys** (scam_reports_corroborated, website_fraudulent, address_fraudulent, active_ip_complaints, cease_and_desist_distributed, confirmed_amazon_restrictions, b2b_only_confirmed; confirmed against weights.ts). Every other key defaults to corroboration 1 and **can never die at the corroboration gate**.

Therefore, structurally and on ANY corpus: **"claims that died at the corroboration gate" measures uncorroborated ALLEGATIONS AGAINST the vendor** (doubt-of-fraud), **not the vendor's own unverified claims** (the claim-observable gap G005/M7 describes). The vendor's asserted-but-unverifiable story lives elsewhere in the frozen record: in VALIDATED low-weight keys (`claims_authorization_unverified` — schema-designed for exactly this), in provenance/grounding rejections of claim-shaped proposals (the 347+1 above include many), and in stored `unknowns`. Even an adversarial corpus would not make R-as-defined measure what the axis wants — it would count something else.

## Consequence map (facts against the three ruled items — rulings are the planning thread's)

1. **ADDENDUM-2 Move 2 / A1:** the "stored per attempt" premise is TRUE mechanically; "the gap MEASURED" is FALSE for the corroboration subset on two independent grounds (empty today per (c); wrong polarity structurally). The broader rejection-record class is real, populated, and proprietary — which parts of it mean what is the open question.
2. **SO-S1-1 Condition 2:** signed against R = corroboration deaths + M3 `unresolved`. With corroboration deaths structurally ≈ 0, R as defined is effectively `unresolved`-only — **entirely LLM-derived**, and the "primarily deterministic" label does not hold under the current definition. (Whether a redefined R over other stored rejection classes restores the deterministic half is a ruling, not reported as a recommendation.)
3. **A2:** under the current definition the LLM would drive one of the two axes. The S-0 lock still bounds blast radius to narrative tone — that safety property is unaffected by any of this.
4. **The matrix fill is BLOCKED on this ruling, not on the founder:** Axis 2 is unblocked by the corpus pull (stakes are stored); Axis 1 has no placeable firewall data under the current definition.

## Census methodology (reproducible)

Read-only query over `case_track_results` (`deleted_at` null, `weight_validation` non-null): count entries, split accepted (`validated_weight_key` set) vs rejected, group rejections by `gate`, and list every proposal whose `proposed_weight_key` is one of the 7 corroboration-required keys with its outcome. The 7-key set was transcribed from `CORROBORATION_REQUIRED` (module-private, not exported) and checked against source this session.
