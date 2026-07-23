# Category Compliance Track — V1 SPEC (BRAND-LEVEL) · 2026-07-23

**Status: 🔴 DRAFT — AWAITING FOUNDER RULING. NO CODE UNTIL RULED (the gate discipline S-1 just completed under).**
**Author:** build thread (Fable), from source. **Every repo-state claim below was verified from source this sitting; file:line cited.**
**Founder rulings already made (2026-07-19 + 2026-07-23) are marked RULED and are not proposals. Everything marked PROPOSED is mine and awaits his ruling.**

---

## 0. THE V1 RULING THIS SPEC IMPLEMENTS (founder, 2026-07-23 — RULED)

**V1 is BRAND-LEVEL, not ASIN-level.** Category is determined from the SUBMITTED BRANDS
(`cases.brands_submitted` — already collected, already the sole research scope). **NO ASIN. No new
intake field. No UI change. No schema column for intake.** His reasoning, on the record:

- **(a)** Amazon's restrictions are **CATEGORY rules, not product rules** — the ASIN was only ever
  a way to find the category.
- **(b)** A brand spanning many categories cannot be covered by a couple of ASINs — **multi-category
  is a FEATURE at brand level**: the finding covers the client's whole potential order, not one SKU.
- **(c)** It removes the ASIN dependency entirely, so this track **builds in parallel** rather than
  behind the client-surface gate.

**ASIN-level precision is V2**, ruled after real client feedback. **ASIN remains a KEEPA dependency
only** (see §10).

---

## 1. WHAT IT RESEARCHES

Per submitted brand (the Track 3 subject model — the BRAND is the research subject):

1. **Category discovery:** which Amazon product categories does this brand observably sell in?
   (Web research: the brand's own catalogue pages, Amazon browse-node presence, retailer listings.)
2. **Requirement lookup:** do those categories carry known Amazon selling requirements —
   seller-level independent third-party lab testing (separate from any manufacturer Certificate of
   Analysis), restricted-substances constraints, hazmat/dangerous-goods programs, category
   documentation requirements?

**Vocabulary provenance (⚠ flagged, not silently adopted):** the founder cites Brief v1 §8 and
Research Prompts v2.0/2.1 as carrying the vocabulary verbatim. Verified from source this sitting:
`Docs/HyprrIQ_Master_Research_Prompts_v2_1.md:190` confirms the category-flags line but says
**"carried from v2.0"** with no vocabulary detail; **the v2.0 file and `HyprrIQ_ClaudeCode_Brief_v1.docx`
are NOT on disk** (the docx is referenced in `CONTINUITY_BRIEFING 15-06.md` doc #3, whose content
list includes "category flags," but the file itself is absent from `Docs/` and `files1.zip`).
The vocabulary below therefore rides on the founder's two consistent verbatim quotes
(2026-07-21 + 2026-07-23) — **"may require seller-level independent third-party lab testing separate
from any manufacturer Certificate of Analysis; check Amazon's restricted substances list"** — plus
hazmat and category documentation. **PROPOSED requirement enum (from that quoted vocabulary, nothing
invented):**

```
requirement_kind:
  "third_party_lab_testing"     — seller-level 3P lab testing, distinct from a manufacturer COA
  "restricted_substances"       — Amazon restricted-substances list exposure
  "hazmat_dangerous_goods"      — hazmat / dangerous-goods program review
  "category_documentation"      — category-specific documentation Amazon may request
  "other_category_requirement"  — named in research but outside the four above (never guessed)
```

If the founder recovers Brief v1 §8, its table supersedes this enum — the spec reserves that.

**The OQ-B3 boundary, honored not fought:** OQ-B3 (2026-07-14) ruled Track 5 derived-only precisely
because category flags need NEW research. This track IS that new research — a first-class acquiring
track on the Track 3 pattern (Serper + native web via the frozen `Orchestrator`, per-brand queries,
evidence pack persisted, replay-capable), NOT a Track 5 flag. The 2026-07-19 casualty entry closes.

## 2. OUTPUT SHAPE — A SEPARATE ASSESSMENT (RULED), AND WHAT THAT MEANS STRUCTURALLY

Founder-ruled (2026-07-23): category risk is a **PARALLEL ASSESSMENT with its OWN verdict**,
travels with the PRODUCT/CATEGORY, delivered **ALONGSIDE** the vendor verdict, never folded in.

**PROPOSED payload** (rides `compiled_findings_json.category_compliance` on the track's own
`case_track_results` row — the Track 5 sibling-block pattern, `track5.ts:154-160`; no new table):

```ts
interface CategoryComplianceAssessment {
  contract_version: "cc-1.0.0";
  scope: "brand_level";                      // V1 truth-in-labeling, on every record
  per_brand: Array<{
    brand: string;                           // from cases.brands_submitted ONLY (the roster-lock discipline)
    categories_found: Array<{
      category: string;                      // as researched, e.g. "Dietary Supplements"
      evidence_ids: string[];                // must resolve to this track's evidence items
      requirements: Array<{
        requirement_kind: RequirementKind;   // the §1 enum
        statement: string;                   // "may require …" — the honesty law binds this
        evidence_ids: string[];
      }>;
    }>;
    brand_category_note: string | null;      // e.g. "brand spans 4 categories; 2 carry requirements"
  }>;
  category_verdict: "no_known_requirements" | "requirements_identified" | "could_not_determine";
  category_verdict_basis: string;            // code-derived from counts, never LLM-written
}
```

**The separate verdict is 3-state and CODE-DERIVED** (counts of requirement findings → verdict;
the LLM proposes findings, code decides the verdict — the standing law). `could_not_determine` is
the acquisition-failure/empty-research state and is stated as such — absence of findings is NEVER
rendered as clearance (B3's law, applied to categories).

## 3. THE HONESTY LAW (RULED — prompt law + code enforcement)

- Findings state **"these categories MAY carry these requirements"** — NEVER "your product is
  restricted," never a guarantee, never ungating language. **Code enforcement, not just prompt:**
  a banned-pattern scan on every client-purposed string (the `procurementLanguage.ts` /
  `containsProcurementLanguage` pattern, `track3.ts:21` — a category-specific sibling:
  no "restricted/banned/approved/ungated/eligible" as verdictive claims about THE CLIENT'S product).
- **Brand-level precision stated as such**: every assessment carries `scope: "brand_level"` and a
  fixed, code-injected scope sentence (exact client wording = client-surface gate; the PROPOSED
  admin-side literal: *"Identified at category level from the brand's observable catalogue — not a
  SKU-level gating check for a specific product."*).
- **Multi-category brands:** every category found is named; each carries or doesn't carry
  requirements explicitly — the client sees the full spread, not a summary rollup.

## 4. TIER GATING — $149/$499 ONLY (RULED), MECHANISM FROM SOURCE

The registry supports this natively: one entry with `plan_gates` (`pipeline.registry.ts:18`,
"Adding a track = ONE entry here"). **But verified from source: the $149 tier does not exist as a
`PlanType`** (`plans.ts:12` — `single_99 | growth_279 | scale_499`; Stripe has no $149 price beyond
the inert test env var wired this sitting). So:

- **At build time:** `plan_gates: ["scale_499"]` + the future `"single_149"` added when that tier
  lands (PlanType + Stripe + credits — client-surface/tier work, not this track's).
- `single_99` and `growth_279` are NOT in the gates — they never run it (RULED). Note the founder's
  standing: **$279 does not get it either** — the ruling is $149/$499, not "paid monthly."
- `TRACK_CONFIG`/`requiredFindingTracks` (`tracks.ts:28`) must agree with the registry — the
  existing drift-lock test covers this.

## 5. VERDICT RELATIONSHIP — NEVER TOUCHES computeVerdict (RULED) — AND THE ONE REAL TRAP

**Confirmed from source, two independent guarantees — and one path that would VIOLATE the ruling
if built naively:**

- ✅ **The weighted score cannot see it:** `SCORING_TRACKS` in FROZEN `verdictEngine.ts:15` is a
  closed, hardcoded four-track list. A new track_key never enters the score, no matter its signal.
- ✅ **The structural non-voting branch exists:** `stageFindingTrack`'s `non_voting` path
  (`pipeline.steps.ts`, Track 5 branch) persists `n_a` without ever calling `deriveTrackSignal` —
  the empty-set→soft_fail floor (which IS a vote) is bypassed by construction. This track sets
  `non_voting: true` and rides that branch. AT-B1's on/off byte-identical proof is the pattern to
  repeat as this track's own AT.
- ⛔ **THE TRAP — the M1 evidence path is NOT verdict-inert.** If category evidence items enter
  M1, Call B may mint synthesis-born contradictions citing them; certified M4 records feed
  `computeVerdict`'s ≥2 load-bearing floor. **This is not theoretical — it is exactly the A5 flip
  mechanism (018#9/021#8/022#2/022#6).** A naive "just another evidence track" build would let
  category research move the verdict band, violating the ruling.
  **Therefore (PROPOSED, and the spec's central structural decision): category evidence does NOT
  enter M1.** The track persists its evidence pack + items on its OWN row (replay/audit intact)
  and emits `evidence_items: []` to the pipeline — Track 5's exact "nothing vote-bearing can
  exist" shape (`track5.ts:164`) — with the assessment riding the sibling block. Verdict-inertia
  then holds absolutely, by the same structure that proved AT-B1.

## 6. SYNTHESIS INTEGRATION — ZERO ENGINE CHANGE, BECAUSE ZERO ENGINE ENTRY (V1)

The item asked whether a new track feeds M1→M9 with zero engine change. **From source, the honest
answer is: the generic seams exist, but the founder's own rulings close them for V1:**

- `m1Assembler` consumes ALL track outputs generically (`m1Assembler.ts:24-25`) — evidence WOULD
  flow with zero engine change, but §5's trap rules that path out.
- `unknowns` flow to the M1 extension and the doubt gap axis (`m1Assembler.ts:43`) — category
  unknowns would silently move `doubt_level`. **Kept out in V1** (emit `unknowns: []`): category
  gaps belong to the category verdict's own `could_not_determine`, not to the vendor's doubt.
- `questions_to_ask` flow to M8 (`synthesisEngine.ts:95`) — but M8 is VENDOR questions; category
  requirements are Amazon/category facts. **Kept out in V1.**

**So: V1 does not enter the synthesis engine at all — the engine is untouched because it is never
invoked on this data.** That is not a workaround; it is the founder's "separate assessment,
alongside, never folded in" ruling expressed structurally. The parallel to `brand_evidence_status`
and Keepa/Q-K1 holds at the delivery layer, not the engine layer.
**DESCRIBE-AND-STOP (one item):** if the founder wants the synthesis NARRATIVE (M9) to *mention*
category findings in V1, that IS an engine touch (runSynthesis reads only `sourcing_logic`
specially, `synthesisEngine.ts:94`) — described here, stopped on, not specced. V2's natural home.

## 7. CLIENT SURFACE — DATA SHAPE ONLY (the rendering is that gate's decision)

The §2 payload is the data contract. Client exposure today is **structurally nil by default**: the
`FINDING_CLIENT_ALLOWLIST` projection (`cases.ts:176`) drops any non-allowlisted
`compiled_findings_json` field, so `category_compliance` is admin-only until the client-surface
gate deliberately allowlists a client projection of it (which fields of the per-brand table cross,
how the category verdict renders beside the vendor verdict, the exact scope sentence — all that
gate's rulings). Noted for that gate; not specced here.

## 8. WHAT V2 (ASIN) WOULD ADD — the line, so it is not re-litigated

With the ASIN (client-surface gate, one per brand): pin the EXACT category/browse node instead of
the brand's spread → SKU-level phrasing becomes honest; the specific product's requirement set;
possible synthesis-narrative integration (§6's describe-and-stop); pairing with Keepa's per-ASIN
seller dynamics in one product-level view. **V2 is ruled AFTER real client feedback — nothing in
V1's shape blocks it** (the payload's `scope` field is the upgrade hinge: `"asin_level"` slots in).

## 9. BUILD SHAPE (PROPOSED, for the ruling — NOT built)

Track 6, `track_key: "category_compliance"`, Track 3's file pattern (`track6.ts` + prompt + queries
+ schema), `execution_order: 1, parallel_group: 1` (it reads only `brands_submitted` — no
dependency on other tracks), `non_voting: true`, empty evidence/unknowns to the pipeline, sibling
block payload. **One founder-run migration is required and is the ONLY schema touch:** the
`case_track_results` CHECK constraints pin `track`/`track_key` values (`tracks.ts:5` "kept in sync
with the case_track_results CHECK") — additive CHECK update, describe-and-stop honored: **the
migration text is written at build time, the founder runs it, nothing proceeds until it lands.**
PIPELINE_VERSION bumps (new step shape). TDD RED-first throughout; ATs: the AT-B1-style
on/off byte-identical verdict proof, the honesty-law scan two-sided, a multi-category fixture,
`could_not_determine` on empty acquisition.

## 10. FOUNDER RULINGS RECORDED THIS SITTING (2026-07-23) — context rulings, NOT this spec's scope

- **ASIN INTAKE IS NOT DEAD — IT IS A KEEPA DEPENDENCY.** A conditional ASIN field appears at
  $149/$499 submission only, alongside brands. It is a SUBMISSION-FORM change → **CLIENT-SURFACE
  GATE** (built once, together with the one-brand cap, so the form is touched once); Keepa arrives
  to a field that already exists. Not built now; not part of this spec.
- **ASIN SHAPE — ONE ASIN PER BRAND.** $149 = 1 brand + 1 ASIN; $499 = up to 5 brands + up to 5
  ASINs (one each). Reasoning: brand ENFORCEMENT is brand-wide (one ASIN suffices for posture);
  seller DYNAMICS are per-ASIN (a hot SKU may carry 40 sellers while a slow one carries 3).
  **The client instruction is NOT "any ASIN from this brand" — it is "the ASIN you are actually
  planning to buy." The ASIN is THE PRODUCT IN QUESTION, not a sample of the brand.**
- **REPORTING LAW (follows from the above):** brand enforcement risk is stated BRAND-WIDE
  (Track 3); seller competition is stated as THIS ASIN SPECIFICALLY (Keepa). Two scopes, stated
  separately — the client must never read one product's seller count as describing the whole
  brand. Submission-form copy must make one-per-brand + "the product you're buying" unmistakable;
  exact wording is a client-surface-gate ruling.
- **PRE-LAUNCH SEQUENCE:** Keepa AND Category Compliance both ship BEFORE soft launch, both gated
  $149/$499. Reason: **$149 must be visibly worth $50 more than $99 or the upgrade has no product
  behind it** — Keepa's seller dynamics and category findings ARE that difference. ~90% true build
  before go-live; the remaining 10% is depth and polish refined on real traffic — **NEVER
  truthfulness. An honest-and-thin finding ships; a confident-and-wrong one does not.**

## OPEN QUESTIONS FOR THE FOUNDER (the ruling board)

- **OQ-CC1:** §2 payload shape + the 3-state category verdict + code-derived basis — approve/amend?
- **OQ-CC2:** §5/§6 structural decision — evidence stays OUT of M1 in V1 (absolute verdict-inertia,
  zero engine entry) vs. any narrative integration (an engine touch, described and stopped on)?
- **OQ-CC3:** the §1 requirement enum stands in for the unrecoverable Brief v1 §8 table — adopt as
  cc-1.0.0, or recover the docx and reconcile first?
- **OQ-CC4:** Track number 6 + `category_compliance` key + the additive CHECK migration — approve?
- **OQ-CC5:** the admin-side scope-sentence literal (§3) — approve as PROPOSED (client wording
  stays at the client-surface gate)?
