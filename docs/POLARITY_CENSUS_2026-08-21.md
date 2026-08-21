# POLARITY CENSUS — 2026-08-21 (founder-ordered measurement; REPORT ONLY, nothing fixed)

**Question ruled:** how often does an evidence statement's polarity contradict the sign of its
validated weight key — both directions — across the WHOLE corpus; how many delivered verdicts
would move if corrected; what could catch it; and what the firewall actually guarantees.

**Method.** Every stored evidence item was exported from `case_track_results.evidence_items`
(all cases, all attempts, `deleted_at is null`) with its validated `weight_key`, the key's
points/sign from the registry, and whether the row is the delivered attempt. Instrument:
`scripts/polarity-export.ts` (read-only; run with the founder-script invocation). Every one of
the 941 statements was then read and judged BY THE REPORTING SESSION, one reader — the flagged
sets below are small enough to re-check by eye, and every delivered-attempt flag is quoted
verbatim. Judgment calls are argueable at the margins; the classes are kept separate so a
different ruling on one class does not contaminate the numbers of another.

**Population:** 941 validated evidence items across 45 cases / 128 track-rows.
240 negative-keyed + 2 veto-keyed · 504 positive-keyed · 195 zero-keyed (`no_connection_found`).
Delivered attempts carry 174 items (52 negative, 96 positive, 26 zero).

---

## 1 · The strict class the ruling named: sentiment contradicts the key's sign

### 1a. On DELIVERED attempts — 6 clear, 3 borderline (of 174 delivered items)

**Positive statement filed under a negative key (client punished for good news):**

1. **AWI-2608-043 · T1 · EV-005 · `negative_reputation` (−3)** — the ruling's case:
   "Reddit users in the r/BBQ community and Facebook group members reference using Special Shit
   seasonings positively, indicating real consumer product experience with the brand."
2. **AWI-2608-035 · T1 · EV-002 · `negative_reputation` (−3):**
   "ScamAdviser rates lacacorp.com as legitimate and safe, finding no indicators of fraud or
   scam activity associated with the domain." — a clean-bill-of-health scored −3.

**Negative statement filed under a positive key (vendor credited for something bad) — the worse
direction, and it exists on a delivered case:**

3. **AWI-2608-034 · T1 · `government_registration` (+4):**
   "The FDA issued a warning letter to NVE Pharmaceuticals… confirming the company's government
   registration and regulatory presence." — an adverse regulatory action earned the track's
   largest positive. (Nuance for the ruling: the letter does prove the entity exists at that
   address; but the evidence item as filed converts an FDA enforcement action into +4 credit,
   and the warning letter itself was never filed anywhere as a negative.)
4. **AWI-2608-034 · T2 · `trade_press_connection` (+2):**
   "NVE Pharmaceuticals filed for Chapter 11 bankruptcy, which was reported in trade press in
   connection with the Stacker 2 product line." — a bankruptcy filing earned supply-chain credit
   because the model matched "reported in trade press" to the key name.
5. **AWI-2608-035 · T1 (attempt 2, delivered) · `phone_verifiable` (+1):**
   "BeauteTrade lists Lacaco with different phone numbers… that do NOT match the (714) 854-4843
   number used on the vendor's own site and BBB profile." — evidence of inconsistency filed as
   verification. (Score-shielded: the key was already earned by a genuine item and keys dedupe.)

**Absence statement under a signed key (points fired on "nothing found"):**

6. **AWI-2607-031 · T3 · E5 · `brand_enforcement_signals` (−3):**
   "…No Petzl-specific enforcement action is documented." — the statement itself reports absence;
   the −3 fired anyway.

**Borderline (flagged, not counted):** AWI-2608-043 T3 `reseller_friendly` (+4) fired on the
brand's own DTC storefront ("Special Shit operates a direct-to-consumer storefront at
shop.specialshit.com") — the brand selling direct is not third-party-reseller posture; this is
the vendor-IS-brand confusion crossing into Track 3. AWI-2607-031 T3 `reseller_friendly` (+4)
fired on "family-owned, refused sale to conglomerates" — says nothing about resellers.
AWI-2607-022 T3 `brand_enforcement_signals` (−3) on "Lenovo is expanding DTC… may signal…" —
speculation, not enforcement.

### 1b. Across the whole corpus (all attempts)

Strict polarity contradictions (opposite + absence-under-signed-key), my judgment:
**~27 of 941 items ≈ 2.9%** (6 clear + 3 borderline delivered; ~18 non-delivered).
Non-delivered highlights, same signatures repeating:

- "ScamAdviser assessed click-entertainment.com as **legitimate and safe**" → `negative_reputation`
  (AWI-2608-039 a1) — the exact 035 signature on a second case.
- "Reddit MSP community reflects **mixed but generally neutral-to-positive** operational
  experience… without major complaints" → `negative_reputation` (AWI-2606-004).
- "Trustpilot 3.5/5 — mixed but **not predominantly negative**" → `negative_reputation`
  (AWI-2608-032, both attempts).
- "**No government registration record** for 'D and H' was found…" → `government_registration`
  **+4** (AWI-2606-008). Same pattern on AWI-2608-038 a1 (+4) and — on the seeded fake vendor
  AWI-2607-016 — "**no LinkedIn found**" +2, "**no BBB found**" +1, "**no verifiable address
  found**" +2: the nonexistent vendor earned +5 for its own absence.
- "no primary source documents a current gating policy" → `brand_restricts_amazon` **−4**
  (AWI-2608-036 a2).

So the strict class is real, symmetric (both directions), repeating in signature families, and
present on 4 of 13 delivered cases (034, 035, 043, 031).

---

## 2 · The adjacent class the census could not help but surface (kept OUT of the number above)

Reading every item shows the strict class is the smaller half of a bigger defect: **the sign is
applied to the wrong subject**. The statement's sentiment is genuinely negative (or positive) —
about someone who is not the vendor. The polarity is "consistent" only if you ignore who the
fact is about. ~60 items ≈ 6.4% of the corpus:

- **Vendor-as-victim filed as vendor-negative (~23 items, TD Synnex/Ingram families):** third
  parties run job-recruitment and fake-PO scams *impersonating* the vendor; the statements
  explicitly say "perpetrated by external bad actors, **not by TD SYNNEX itself**" — and
  `negative_reputation` (−3) fired on the vendor anyway, on attempt after attempt.
- **Brand-ecosystem noise filed as vendor grey-market (~16 items):** "grey-market Nike/ON/
  Microsoft channels exist… **no evidence links [vendor] to these channels**" → vendor −3
  `grey_market_signals`. Includes 2 items on DELIVERED AWI-2608-039 whose statements themselves
  disclaim attribution to Click Entertainment.
- **The brand's own anti-grey-market page filed as vendor grey-market (4 items):** Bosch's
  Origify awareness page — brand-protection marketing — repeatedly scored −3 against TD Synnex.
- **Wrong-entity CREDIT (~12 items):** Bosch corporate LinkedIn/BBB profiles credited to
  globaldist.com's Track 1 (statements say "none correspond to globaldist.com"); a Nike letter
  authorizing *APS Sport* credited to the vendor's Track 2; "Vast Inc is an official Nintendo
  distributor… **separate from Click Entertainment**" +2 to the vendor; QH Distribution's and
  Forcell's Bioderma authorizations credited +2 to DELIVERED AWI-2608-036's Track 2 — other
  companies' authorizations, framed by the statements as *alternatives* to the vendor, scored
  as the vendor's connections.
- **Vendor-IS-the-thing inversions (~6 items):** TD Synnex/KeHE being mega-distributors scored
  under `purchases_from_mega_distributor` — credit for *being* the thing the key says they buy
  from. (Same shape as vendor-IS-brand; see the manufacturer-direct design.)
- One **veto** key fired from this class on a non-delivered attempt: AWI-2608-035 a1
  `cease_and_desist_distributed` (hard-fail) from a C&D against a *counterfeit seller* — the
  statement's own content is the T3 prompt's named disqualifier. A hard-fail veto from a
  definitionally-wrong filing is the near-catastrophic version of this bug.
- Definitional families for separate rulings: counterfeit-only enforcement scored as reseller
  enforcement (statements often self-disclaiming: "directed at counterfeiters, **not third-party
  resellers of genuine product**"); "moving UK operations in-house" strategy statements scored
  −3 as enforcement; and ~40 items award `bbb_or_trade_association` +1 on "has a BBB profile but
  is **NOT accredited**" — whether directory presence is the earned fact needs a key-definition
  ruling, not a polarity one.

Known-and-separate: the wrong-entity research class (D&H Air Conditioning scored for D&H
Distributing) predates this census (audit 2026-07-05) and is not counted anywhere above.

---

## 3 · Delivered-verdict impact (the number the marketing site depends on)

Recomputed with the real machinery (deriveTrackSignal → computeVerdict, bands 3.2/2.2/1.2,
vetoes, delivered attempts; baselines re-proven with `rejudge-case.ts`, all PASS). Keys DEDUPE
before scoring — a mis-keyed item only moves a track when every item sharing its key is wrong.

| case | delivered verdict / score | corrected (strict class only) | band change |
|---|---|---|---|
| AWI-2608-043 | verify · 2.00 | T1 stays `flag` (2 pts < 4) → **2.00** | **none** |
| AWI-2608-035 | verify · 1.50 | T1 3→6 = `infer` → **2.00** | **none** (still verify) |
| AWI-2608-034 | verify · 2.32→capped | T1 9→5 = `infer`, T2 7→5 = `infer` → **1.79** | **none** (score drops — the errors flattered the vendor) |
| AWI-2607-031 | verify · 1.95 | E5 alone: enforcement key survives via E2 → **1.95** | **none** |

**Strict-class corrections change ZERO of 13 delivered verdicts.** The bands are wide and the
Track-3 soft-fail floor already pins most of these cases at verify.

**One delivered verdict moves only under the subject/definition class:** if AWI-2607-031's E2
(community counterfeit concern, "not a Petzl enforcement action") is ALSO ruled a mis-key, both
carriers of `brand_enforcement_signals` fall, T3 goes 3→6 = `infer`, and the verdict crosses
2.25 ≥ 2.2 → **usable_with_conditions** (no vetoes; baseline re-proven). That is the entire
delivered blast radius: 0 or 1 of 13, depending on where the ruling draws the class boundary.

⚠ **Handover correction (distrust rule).** HANDOVER_2026-08-20B §2D2 said 043 "likely lands
`infer` and ~2.5 → the usable boundary" without the mis-key. **The file is wrong.** Removing the
−3 leaves T1 at 2 points; `infer` needs 4; T1 stays `flag` and the score stays exactly 2.00,
verify, both ways. No plausible correct filing reaches 4 — Track 1 has no positive-reputation
key to re-file the Reddit statement under (see §6). The mis-key is a correctness defect on a
delivered case, but it did NOT move 043's verdict band.

---

## 4 · What the firewall actually guarantees

`weightValidation.ts` — the proposal it validates is `{ evidence_id, proposed_weight_key,
cited_source_ids }` (`ProposedMapping`, line 159). **The statement text is never passed in.**
The gates are: key ≠ UNKNOWN · cited source exists · key exists in some registry · key exists in
THIS track's registry · cited source's profile ∈ ALLOWED_PROFILES[key] · corroboration count for
veto keys · authority floor for variable-trust profiles · dedupe/hard-fail-wins/alternative
groups. Every semantic law — recency, never-from-absence, subject discipline, brand isolation,
and polarity — is PROMPT-ONLY; the file itself names the subject seam at lines 135–136.

So yes: the guarantee is weaker than "validates evidence classification." It validates that a
key is *legal*, with *provenance of the right shape* — never that the statement *supports* the
key. On 043, EV-005 passed every gate: `negative_reputation` is a real T1 key, and a social
source may earn it. Nothing in the pipeline has ever checked statement-vs-key direction; this
census is the first time anything read both sides of that pairing.

---

## 5 · What could catch it (DESIGN ONLY — flagged UNRULED, touches scoring acceptance)

**(1) Redundant self-declaration + deterministic cross-check — recommended.** The model already
writes the direction into the statement ("…positively…", "…not by TD SYNNEX itself…"). Make it
declare that direction as data: each evidence item gains two enum fields —
`polarity: favorable | adverse | neutral_absence` and `subject_is_target: boolean` (the vendor
for T1/T2/T4; the submitted brand's reseller-posture for T3). New firewall gate, pure code:
positive-signed key requires `favorable` + subject true · negative-signed and veto keys require
`adverse` + subject true · zero keys require `neutral_absence`. Mismatch → rejected exactly like
a wrong-track key (validated null, `gate: "polarity"`, audited in `weight_validation`), item
falls out of scoring. Prompt + parser + SCHEMA + firewall + fixtures move together;
VALIDATION_VERSION bump. This catches every delivered flag in §1a — in each, the model's own
prose states the contradiction, so a single mis-key becomes an inconsistency the code can see.
**Honest limit:** it converts a semantic check into a consistency check. A model wrong twice,
consistently — mis-key AND mis-declaration — passes. That residual is real and irreducible by
deterministic code.

**(2) Second-opinion LLM validation** (statement + key definition → coherent?) over signed-key
items only. Catches some double-errors; probabilistic, adds cost/latency/nondeterminism to the
acceptance path, and can itself be wrong. Honest framing: a smaller error rate, not a guarantee.
Optional later layer; not required for (1).

**(3) Prompt hardening.** The T3 prompt already carries per-key disqualifiers and worked
near-misses; T1/T2 keys carry none. The corpus says exactly which carve-outs are missing:
`negative_reputation` — "the vendor as the VICTIM of impersonation fraud is not vendor
reputation"; "a clean scam-checker result is not negative"; `grey_market_signals` — "the brand's
ecosystem having grey markets is not this vendor's sourcing"; positive T1 keys — "a failed
verification never earns the verification key." Reduces the rate; guarantees nothing; ships
with fixtures per standing rule.

**Plainly: nothing can catch it *reliably*.** (1) is the strongest deterministic option because
it only trusts the model to be consistent, not correct. Recommended shape: (1) + (3) together,
(2) deferred. Nothing is built; the shape awaits the ruling.

---

## 6 · Registry-shape observations the census forced into view (UNRULED, recorded)

- **Track 1 has `negative_reputation` and no positive mirror.** Positive-reputation statements
  have no legal home, and the census shows where they go instead: the only reputation key there
  is. This is 043's mechanism, and the same pull exists on every case with good reviews.
- **Track 2's absence key is 0 points; Track 3's absence key is +2** (`no_connection_found` vs
  `no_enforcement_found`) — 043 earned +2 from absence in T3 while its plan excluded T2 (whose
  absence would have earned 0). Asymmetry worth a deliberate ruling.
- **A lone zero-point key prevents `soft_fail`:** `no_connection_found` counts as evidence
  presence, so a track with only an absence finding lands `flag` (1.5) not `soft_fail` (0.5).
  Deliberate?
- **`bbb_or_trade_association` (+1)** is earned ~40 times by "profile exists, NOT accredited"
  (several delivered). Key-definition ruling needed: is directory presence the fact the +1 buys?

**Ruled sequence respected:** measurement reported; nothing fixed, no key added, no prompt
touched, no validator built.
