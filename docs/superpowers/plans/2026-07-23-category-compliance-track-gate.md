# Category Compliance Track — V1 SPEC (BRAND-LEVEL) · 2026-07-23

**Status: 🟡 UPDATED 2026-07-23 (same day) — CENTRAL DESIGN APPROVED; OQ-CC3 CLOSED (real table recovered); OQ-CC2 HELD; OQ-CC4 + §4 ACCEPTED. Remaining open: OQ-CC1 (amended payload) + OQ-CC5. STILL NO CODE — the founder rules the updated spec before any build.**
**(original status line, kept)** 🔴 DRAFT — AWAITING FOUNDER RULING. NO CODE UNTIL RULED (the gate discipline S-1 just completed under).
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

**Vocabulary provenance — ✅ OQ-CC3 CLOSED (2026-07-23, same day): THE REAL TABLE IS RECOVERED.**
The founder extracted Brief v1 §8 from the .docx (confirmed genuinely absent from the repo) —
**`docs/CATEGORY_FLAGS_TABLE_recovered.md`**, now committed. **NINE subcategories** with verbatim
trigger keywords, verbatim founder-authored flag language, and founder-authored risk levels
(**HIGH | MODERATE-HIGH | MODERATE** — this IS the risk enum; nothing invented). The table's
governing law, verbatim: *"All category flags use 'may require' language. Never state requirements
as absolute. Amazon policies change. These flags inform the client of potential requirements —
they do not confirm or deny Amazon approval."* — this is §3's honesty law, in the founder's own
words, and the flag-language column is **code-injected VERBATIM, never paraphrased** (founder-
authored client-facing copy; the byte-identical-injection law, same as `VERDICT_SENTENCES`).

The nine subcategories (see the recovered file for the full verbatim table): energy/stimulant
supplements (HIGH) · general supplements/vitamins (MODERATE) · baby/infant (MODERATE-HIGH) ·
children's toys (MODERATE) · food/grocery/perishables (MODERATE) · topical/beauty/cosmetics
(MODERATE-HIGH) · medical devices/health monitors (HIGH) · hazmat/chemical/aerosol/battery (HIGH)
· electronics major-brand partner programmes (MODERATE-HIGH).

~~PROPOSED requirement enum (reconstructed)~~ **SUPERSEDED by the recovered table** — the
reconstructed five-key enum (third_party_lab_testing / restricted_substances /
hazmat_dangerous_goods / category_documentation / other_category_requirement) is retired; the
payload keys on the table's subcategories directly (§2, amended). Kept struck-through as the
record of what stood in while the source was off-disk.

## 1b. THE TWO-HOP DESIGN — what the recovery surfaced (spec'd explicitly, per the ruling)

**The table's trigger keywords are PRODUCT keywords** ("pre-workout", "aerosol", "SPF") — it was
designed for ASIN/product-description matching. **At brand level you cannot keyword-match.** V1
therefore runs TWO HOPS, and the keyword column changes role:

- **HOP 1 — brand → categories:** web research per brand (the Track 3 acquisition pattern):
  what does this brand observably sell? Sources, in reliability order: the brand's own catalogue/
  product-line pages (highest — the brand describing itself), major-retailer category placement
  (Amazon browse paths, big-box category listings), third-party retail/industry descriptions.
  Each category attribution must cite evidence (the evidence_ids discipline); a category no source
  supports is never emitted. Multi-source agreement upgrades confidence; a single weak source
  yields the category with `confidence: "low"`, stated as such.
- **HOP 2 — categories → flags:** DETERMINISTIC CODE, not research. The brand's evidenced
  categories are matched against the nine subcategories; **the keyword column is a CATEGORY-
  DEFINITION AID, not a matcher** — it tells the Hop-1 research (and the Hop-2 prompt-free code
  mapping) what "energy/stimulant supplements" MEANS, so "thermogenic fat-burner line" lands in
  the right subcategory. A hit emits the row's verbatim flag language + risk level.
- **THE EXCEPTION — the electronics row needs NO hop:** its trigger column is ALREADY brand-keyed
  (Lenovo, HP, Cisco, Microsoft, Adobe, Samsung Business, Zebra, Honeywell, Epson — B2B line).
  It matches `brands_submitted` directly, deterministically, with no research dependency — and it
  is **the row most likely to fire on the actual client base.** V1 fires it in code even if Hop 1
  returns nothing.
- **THE KNOWN LIMITATION, stated (the one place brand-level V1 is genuinely weaker than ASIN V2):**
  Hop 1 finds the brand's category SPREAD, not the client's product. A brand selling in a flagged
  category triggers the flag even if the client's intended product sits in the brand's unflagged
  line — brand-level truth, product-level over-breadth. The scope sentence (§3) carries this
  honestly; V2's ASIN collapses the spread to the actual product. This limitation is BY DESIGN
  (founder ruling: multi-category coverage of the whole potential order is the V1 feature).

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
      category: string;                      // as researched (Hop 1), e.g. "pre-workout supplements"
      evidence_ids: string[];                // must resolve to this track's evidence items
      confidence: "high" | "medium" | "low"; // Hop-1 source agreement, stated
      flags: Array<{                         // Hop 2 — DETERMINISTIC from the recovered table
        subcategory: string;                 // the table's Subcategory column, verbatim key
        flag_language: string;               // the table's Flag Language column, VERBATIM (code-injected, never LLM-written)
        risk_level: "HIGH" | "MODERATE-HIGH" | "MODERATE"; // the table's enum — nothing invented
        matched_via: "category_research" | "brand_keyed";  // the electronics row = brand_keyed, no hop
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

**The governing law is now the founder's own, verbatim from the recovered Brief v1 §8:** *"All
category flags use 'may require' language. Never state requirements as absolute. Amazon policies
change. These flags inform the client of potential requirements — they do not confirm or deny
Amazon approval."*

- Findings state **"these categories MAY carry these requirements"** — NEVER "your product is
  restricted," never a guarantee, never ungating language. Flag language is the table's column,
  code-injected verbatim — the LLM never writes it, so the law cannot drift in generation. **Code enforcement, not just prompt:**
  a banned-pattern scan on every client-purposed string (the `procurementLanguage.ts` /
  `containsProcurementLanguage` pattern, `track3.ts:21` — a category-specific sibling:
  no "restricted/banned/approved/ungated/eligible" as verdictive claims about THE CLIENT'S product).
- **Brand-level precision stated as such**: every assessment carries `scope: "brand_level"` and a
  fixed, code-injected scope sentence. ~~The PROPOSED admin-side literal: "Identified at category
  level from the brand's observable catalogue — not a SKU-level gating check for a specific
  product."~~ **SUPERSEDED — the founder drafted the scope sentence himself (OQ-CC5 on the ruling
  board, verbatim there); exact final wording remains a client-surface ruling.**
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

## THE RULING BOARD (founder rulings 2026-07-23, same-day update)

- **CENTRAL DESIGN (§5/§6) — ✅ APPROVED, and the finding behind it is RULING-GRADE, recorded:**
  `SCORING_TRACKS` being closed stops the weighted score, but M1 → Call B contradictions →
  certified M4 → the ≥2 load-bearing floor is a LIVE verdict path (the A5 flip mechanism, proven
  on the real corpus). A naive "just another evidence track" build WOULD have moved verdicts.
  V1 keeps category evidence OUT of M1 entirely — Track 5's zero-items non-voting shape, evidence
  on its own row for replay/audit, assessment on the sibling block. **Verdict-inertia is absolute
  because the engine is never entered.**
  **THE COST, RECORDED PLAINLY (founder's words):** V1's category finding is **UN-SYNTHESIZED** —
  the engine never reasons over it; it is a parallel assessment rendered alongside. That is the
  correct V1 trade (absolute verdict-inertia, zero engine change). OQ-CC2 is what would turn it
  from a bolted-on section into integrated intelligence — **a V2 ENGINE-TOUCH with its own gate
  and its own certification. Never a rider.**
- **OQ-CC1 — ✅ APPROVED AS AMENDED (founder, 2026-07-23):** keyed on the table's nine
  subcategories; the 3-state category verdict + code-derived basis stand. **The ruling-grade part,
  in the founder's words: `matched_via: "category_research" | "brand_keyed"` puts the two-hop
  provenance IN THE DATA — a deterministic brand-keyed electronics hit is never confused with an
  evidenced, confidence-bearing researched match. Honest-label discipline on a new field.**
- **OQ-CC2 — ⏸ HELD (correct describe-and-stop). Not in V1.** V2 engine-touch, own gate, own
  certification.
- **OQ-CC3 — ✅ CLOSED FROM SOURCE:** the real Brief v1 §8 table recovered to
  `docs/CATEGORY_FLAGS_TABLE_recovered.md`; supersedes the reconstructed enum (§1, marked).
- **OQ-CC4 — ✅ ACCEPTED:** additive `case_track_results` CHECK update; **the FOUNDER runs it at
  build time.**
- **§4 single_149 — ✅ ACCEPTED:** gate on `scale_499` alone until the tier exists. **Do not create
  a PlanType.**
- **OQ-CC5 — ✅ RULED, FOUNDER-DRAFTED (2026-07-23; exact final wording remains a client-surface
  ruling). The scope sentence, verbatim:**
  > *"Category findings are assessed at brand level. We identify the product categories these
  > brands sell in and flag categories that may carry Amazon selling requirements. These findings
  > describe the CATEGORY, not any specific product — a brand may sell across several categories,
  > so a flag may apply to a product line you are not purchasing. Category requirements are stated
  > as 'may require'; they are not confirmation of Amazon approval or refusal."*
  The closing clause deliberately echoes the recovered table's own governing law **so the two
  cannot drift apart** — build-time consequence: a lock should assert the echo (both strings carry
  "may require" + the not-confirmation clause). The over-breadth limitation is stated as a
  LIMITATION, in the client's own sentence, not buried in the spec. This literal replaces §3's
  PROPOSED scope sentence (superseded, kept there marked).

---

# BUILD RECORD — CORE BUILT 2026-07-23 (approved-with-conditions sitting) · ⛔ STOPPED BEFORE WIRING + ATs

**Built, TDD RED-first throughout, 845/845 unpiped exit 0 · tsc 0 · eslint 0 · frozen surfaces
byte-identical (18-file diff empty):**

- **`lib/research/categoryFlagsTable.ts` (cc-1.0.0)** — the nine §8 rows as config, flag language
  verbatim. **The doc-identity lock** (`categoryFlagsTable.test.ts`): every string byte-identical
  to the recovered doc, or it fails by name — module and founder doc can never drift.
- **`lib/research/categoryLanguage.ts` — CONDITION 1 satisfied.** Polarity-blind on status claims
  (both "restricted" and "not restricted" are violations — the negation-escape hole closed by
  design, not by carve-out), alternation-complete (sell/list/stock/resell; approve/reject/accept/
  allow/permit/take-action), **RED-proven by feeding 18 actual evasion shapes through the live
  scanner** (the audit's method), two-sided (all nine flag strings + the governing law + the
  founder's scope sentence PASS).
- **`lib/research/track6.ts` — the two-hop track.** LLM proposes categories + closed-key
  subcategory candidates; CODE decides: key validation (invalid keys dropped + audited), verbatim
  injection, `matched_via` provenance, roster lock, scanner-scrubbed narrative (violating notes
  nulled + audited), code-derived 3-state category verdict (the model's opinion of it is never
  read), brand-keyed electronics row fired deterministically — proven to fire on EMPTY acquisition.
  `could_not_determine` stated as absence of research, never clearance.

## CONDITION 2 REPORT — founder copy vs founder bans (BEFORE injection code, as ruled)

**The nine flag strings are CLEAN** — against the built scanners at runtime AND against the
recovered §12 table pair-by-pair. **But both flanking texts CONFLICT with the BUILT scanner:**
the §8 governing law and the OQ-CC5 scope sentence each contain "Amazon approval" in DENIAL form
("do not confirm or deny Amazon approval" / "not confirmation of Amazon approval or refusal") —
and **H4 (`/amazon\s+approv/i`) has no negation carve-out**, unlike H2's guarantee handling. This
is not §8-vs-§12 (the founder's artifacts are consistent); it is founder-denial-copy vs the built
regex — the H2-precedent fix shape (negation carve-out for H4) **belongs to the banned-language
fix gate**. NOT resolved here. **Build consequence, RED-proven:** an embedded governing-law copy
in the payload tripped the delivery gate's HARD walk (watched-fail: `["amazon approved"]`) — the
payload now carries `contract_version` only (the law derivable from cc-1.0.0), plus a standing
**delivery-gate compatibility lock**: the full assessment payload must walk clean through
`scanFindingsForBannedLanguage`, forever.

## STRUCTURAL FINDING (build-time, ruling-grade class): THE FROZEN CORE FORCES THE PARALLEL DESIGN

`DIMENSION_TOKENS: Record<TrackKey, RegExp>` in **FROZEN `synthesisCallB.ts:130` is exhaustive
over the TrackKey union** — `category_compliance` cannot join TrackKey without breaking a frozen
file. So the approved design isn't just chosen, it is structurally enforced: Track 6 has its OWN
output type (`CategoryTrackOutput`), its own key-space, and touches neither `contracts.ts` nor
`lib/constants/tracks.ts`. Zero frozen-surface diff.

## ⛔ DESCRIBE-AND-STOP 1 — THE ORCHESTRATION FORK (founder rules before wiring)

The spec's §9 proposed a `TRACK_REGISTRY` entry. **Build-time verification shows a registry entry
IS an engine input:** frozen `deriveDimensionRunRecord` (synthesisEngine.ts) maps over the
registry — a track-6 entry would add a `dimension_run_record` row (assessed on scale, or
`plan_excluded` on lower plans), which feeds Call B's prompt and M6 limitations → synthesis no
longer byte-identical on/off, and "category" leaks into vendor-verdict limitation sentences on
plans that never bought it. **This violates the mandatory AT-B1-style proof.** The alternative:
Track 6 runs as its **own orchestration step outside the registry** (the Track-0/identity
precedent), plan-gated in the step (`scale_499` now, `single_149` when the tier exists) — the
engine's world literally does not change. Consequences to rule: it forgoes the registry's
"one entry" convenience; `requiredFindingTracks`/report-readiness would not require the category
row in V1 (readiness inclusion = a data-layer follow-up decision); the registry drift-lock stays
untouched. **RECOMMENDED: own step. Founder rules.**

## ⛔ DESCRIBE-AND-STOP 2 — THE MIGRATION (founder-run, additive; exact text to be finalized at wiring)

```sql
-- Category Compliance V1 (cc-1.0.0) — additive only.
-- (a) allow the new track row:
ALTER TABLE case_track_results DROP CONSTRAINT IF EXISTS case_track_results_track_check;
ALTER TABLE case_track_results ADD CONSTRAINT case_track_results_track_check
  CHECK (track IN ('track_0','track_1','track_2','track_3','track_4','track_5','track_6'));
-- (equivalent additive widening for the track_key CHECK: + 'category_compliance')
-- (b) admin dashboard status column (mirrors track_1..5):
ALTER TABLE cases ADD COLUMN IF NOT EXISTS track_6_status text DEFAULT 'pending'
  CHECK (track_6_status IN ('complete','failed','skipped','manual_required','pending'));
```
Also at wiring: the acquisition layer's frozen `ResearchQuestion`/`AcquisitionRequest.track_key`
unions predate this track — the wiring either reuses an existing routable question (the Track-0.5
precedent) or widens the union at a gate that may touch frozen acquisition types. Described, not
done: **live `gather`/`model` defaults are deliberately absent** (deps are required parameters)
so nothing can run against the frozen unions before the ruling.

## NON-BLOCKING COST REPORT (shape now, figure at ATs)

Per brand: ~2 search calls + 1 LLM proposal call ⇒ $499 worst case (5 brands): ~10 searches +
5 LLM calls/case on top of today's pipeline; $149 (1 brand): ~2 + 1. Comparable to one extra
Track-3 per brand. Actual dollars measured at the AT run (the AT-SYN-COST pattern).

**STOPPED before: orchestration wiring (fork ruling) · the migration (founder-run) · client
projection (client-surface gate) · ATs (founder-run: AT-B1-style on/off byte-identity ·
two-sided honesty scan · multi-category fixture · could_not_determine · cost).**

## CONTINUATION RECORD (same sitting, resumed after interruption)

- **The mandated AT-B1-style proof is now BUILT, not deferred:** `track6.inertia.test.ts`,
  TWO-SIDED. Side 1 reproduces the §5 trap ON PURPOSE — naive M1 wiring + two load-bearing
  synthesis-born contradictions flips `source_clear → verify_before_purchase` through the ≥2
  floor (the A5 mechanism as a permanent test; if it ever stops flipping, the floor changed).
  Side 2: track on vs off — synthesis deep-equal, composed verdict identical — plus structural
  source locks (`category_compliance` appears in NO frozen file). Suite 845 → **848/848**.
- **Condition-2 runtime re-scan (the live-scanner method):** all nine flag strings CLEAN through
  scanHard + scanAssertion + findProcurementLanguage; the OQ-CC5 scope sentence TRIPS H4 at
  runtime (confirming the governing-law finding above — same "Amazon approval"-in-denial class).
  Second semantic conflict logged for founder ruling: §8 row 5 "Expiry dates visible on units
  required." states a requirement as absolute, against §8's own governing law. Injected verbatim
  pending amend-or-accept.
- **The doc-identity lock is MUTATION-PROVEN:** a one-word paraphrase ("may"→"might") fails three
  tests by name; an accidental encoding corruption during the sitting (a PowerShell ANSI
  round-trip mangling em-dashes) was ALSO caught by the same lock and repaired from the verbatim
  source. The lock guards against paraphrase AND transport damage.
- **Final gates at stop:** 848/848 unpiped exit 0 · tsc 0 · eslint 0 · frozen-core diff EMPTY
  across the 18-file list including tracks.ts / registry / pipeline.steps / contracts.

---

# 🟢 CATEGORY COMPLIANCE CORE FROZEN — founder-declared 2026-07-23 at `14bf958` on `staging` · `contract_version cc-1.0.0`

**CORE FROZEN; WIRING NOT DONE.** The frozen set: `lib/research/categoryFlagsTable.ts` ·
`lib/research/categoryLanguage.ts` · `lib/research/track6.ts` + their three test files +
`track6.inertia.test.ts` + `docs/CATEGORY_FLAGS_TABLE_recovered.md` (row 5 as amended).

## AT record (founder-declared; build-thread evidence re-verified from source at recording time)

| AT | Result |
|---|---|
| `track6.inertia` | **3/3** — Side 1: the §5 trap REPRODUCED (naive M1 wiring + 2 load-bearing contradictions flips `source_clear → verify_before_purchase`; the A5 mechanism as a permanent test) · Side 2: on/off BYTE-IDENTICAL (synthesis deep-equal, composed verdict identical) · structural locks green BY NAME (`category_compliance` in no frozen file) |
| `categoryLanguage` | **34/34** — the ten audit holes closed by name (polarity-blind, alternation-complete, 18 evasion shapes through the live scanner); the AMENDED row 5 passes as a live test (the must-pass set iterates the table) |
| `categoryFlagsTable` | **6/6** — doc-identical (mutation-proven: one-word paraphrase fails 3 by name; an encoding corruption was also caught), may-require law checked per row, electronics row the sole brand-keyed exception |
| Suite | **848/848 across 96 files, unpiped, `$LASTEXITCODE 0`** (797 → 848) · tsc 0 |
| Frozen surfaces | `git diff 82957b3~1..14bf958` over the 18-file frozen list = **EMPTY** (verified at recording); the two commits touched ONLY new `lib/research/category*`/`track6*` files, the recovered doc, and the tracker |

**Row 5 FOUNDER-AMENDED 2026-07-23** ("…visible on units required." → "…may need to be visible on
units.") under §8's own governing law — the higher authority; marked on BOTH sides (module comment
+ doc repo note preserving the original verbatim) against future "restoration."

**The three build conditions, met:** (1) the honesty scanner is evasion-proof by the audit's own
method (live-scanner feeding, not regex review); (2) the nine §8 flag strings were honesty-scanned
BEFORE injection code (two conflicts surfaced and ruled/routed); (3) `category_verdict` is an
INTERNAL field name only — the client never sees the word "verdict" for it (client-surface-gate
constraint, recorded).

## OPEN BEHIND THE FREEZE (recorded; none blocks the core)

- **ORCHESTRATION FORK — ✅ RULED: Track 6 wires as its OWN STEP OUTSIDE THE REGISTRY**, plan-gated
  in the step (the Track-0.5 precedent). Reason on the record: the registry is itself a synthesis
  input (`deriveDimensionRunRecord` maps it; `DIMENSION_TOKENS` consumes the TrackKey union
  exhaustively) — category must stay invisible to the vendor verdict, so it cannot live in the
  registry.
- **MIGRATION (founder-run at wiring):** `case_track_results` CHECK widening (+ `track_6`,
  `category_compliance`) + `cases.track_6_status` (SQL text in the build record above).
- **OQ-CC5/H4 "Amazon approval" negation carve-out → the BANNED-LANGUAGE FIX GATE.** V1 embeds
  neither the governing law nor the scope sentence (RED-proven inert via the delivery-gate
  compatibility lock). Not now.
- **Tier gate:** `scale_499` alone until the `single_149` tier exists (no PlanType before then).

---

# 🟢🟢 TRACK 6 WIRING FROZEN — CATEGORY COMPLIANCE V1 COMPLETE END-TO-END

**Founder-declared 2026-07-23 · `cc-1.0.0` · gated `scale_499` · HEAD `42e4818`.**
The full capability is live behind $499: intake brands → live Hop-1 acquisition
(marketplace_signals reuse) → LLM proposes / code decides → verbatim founder flag language →
code-derived category verdict → non-voting row persisted (admin-only pending the client-surface
gate). **Core freeze (`14bf958`) + wiring freeze together close the capability that was specced
in Brief v1, silently dropped at OQ-B3, and recovered 2026-07-21.**

## AT record (evidence re-verified from git at recording time)

| Claim | Verified |
|---|---|
| `track6.inertia` 3/3 BY NAME, with the LIVE GATHER wired | ✅ Side 1: the trap reproduces (category-in-M1 moves the verdict — the design's premise, permanent) · Side 2: inert (synthesis deep-equal, composed verdict identical) · structural locks (not a TrackKey, not in SCORING_TRACKS, not in the engine) |
| Suite | ✅ **865/865 across 98 files, unpiped, `$LASTEXITCODE 0`** · tsc 0 · eslint 0 |
| `git diff 92a60ec..HEAD` | ✅ EXACTLY: acquisition types/orchestrator/pack (the ruled Decision-B edits) + categoryGather(+test) + categoryStep(+test) + the migration file — **NO frozen surface** (19-file frozen-list diff EMPTY across the span) |
| Migration `20260724000000` | ✅ file reproduces the founder-verified live state: `track_6` · `category_compliance` + legacy `intake` kept · `track_number <= 6` · `cases.track_6_status` — reconciles the hand-applied 2026-07-23 dashboard change; **applied to live: founder-verified** |
| Decision A | ✅ BUILT — live gather reusing `marketplace_signals` (routing-only, never persisted); discovery-shaped queries locked (never gating/eligibility); pack per attempt under `category_compliance`; pendingGather retired with a source-scan lock |
| Decision B | ✅ BUILT — `AcquisitionTrackKey` additive widen at the three ruled sites + finalizePack's parameter (mechanical propagation); **NO cast anywhere**; watched RED at type level; blast radius proven ACQUISITION-LAYER-ONLY (contract-freeze 3/3 · synthesisCallB 18/18) |
| STOP #2 | ✅ additive-optional HOLDS BY CONSTRUCTION (TRACK_CONFIG untouched; the fork-ruling lock forbids drift) |

**FROZEN SET now includes the wiring:** `categoryStep.ts` · `categoryGather.ts` (+ tests) · the
Decision-B acquisition edits · the two orchestrator dispatch sites · migration `20260724000000`.
**Still deliberately OUTSIDE this freeze:** the client-surface projection (that gate's), OQ-CC2
narrative integration (V2 engine-touch), ASIN/V2, the `single_149` gate widening (one line here
when the tier exists).
