# FOUNDER QUESTIONS 3a / 3b / 3c — READ-ONLY REPORT — 2026-08-20

Asked read-only, report-only, no fixes proposed. Every number below was measured against the live
database (Supabase reads, founder-authorised) or recomputed from the frozen engine code at
`8c41cb5`. Where a claim is recomputed, the recomputation matched the stored value in every case.
Observations are labelled OBSERVED; nothing here is a recommendation.

---

## 3a · Why did $99 land differently?

Four cases, same vendor, same day (2026-08-19), pipeline 1.7.0, all `awaiting_review`. All four
resolved identically: **Lacaco Wholesale / lacacorp.com, identity_confidence `high`** (verified on
all four rows, `resolution_method: resolved_from_website`).

### Side by side

| | 035 · $99 | 036 · $149 | 037 · Growth | 038 · Scale |
|---|---|---|---|---|
| Areas run (scoring) | T1, T3 — **T2 and T4 are not in the single_99 plan** (`TRACK_CONFIG: [0,1,3,5]`) | T1, T2, T3 (T4 n_a — no docs) | T1, T2, T3 (T4 n_a) | T1, T2, T3 (T4 n_a) |
| T1 supplier_identity | **infer** · 6/15 (bbb +1, address +2, phone +1, linkedin +2) | **flag** · 3/15 (same four keys **+ negative_reputation −3**) | **infer** · 6/15 (identical to 035) | **pass** · 10/15 (same four keys **+ government_registration +4**) |
| T2 supply_chain | — not in plan | **flag** · 3/15 (no_connection_found 0, claims_authorization_unverified +1, trade_press_connection +2) | **flag** · 0/15 (no_connection_found only) | **flag** · 1/15 (no_connection_found, claims +1) |
| T3 brand_risk | **hard_fail** · 0/15 — `cease_and_desist_distributed` (hard-fail key) + enforcement −3, restricts_amazon −4, no_enforcement_found +2, reseller_friendly +4 | **flag** · 0/15 (reseller +4, enforcement −3, restricts −4 → −3, clamped to 0) | **flag** · 0/15 (same three keys as 036, reseller +4) | **flag** · 0/15 (enforcement −3, restricts −4, no_enforcement +2) |
| Weight redistribution | T2+T4 absent → totalWeight 0.60 → **T1 and T3 each carry 50%** (vs 30/30 nominal) | totalWeight 0.85 → T1 35.3%, T2 29.4%, T3 35.3% | same | same |
| Weighted score (0–4) | **1.25** | **1.50** | **1.85** | **2.38** |
| Score band | verify (margin **+0.05** above the 1.2 do_not_rely boundary) | verify (+0.30) | verify (−0.35 to usable) | **usable_with_conditions** (+0.18 above 2.2) |
| Veto / floor | **T3 hard_fail → LOCK do_not_rely**. (2 load-bearing contradictions also floored verify — irrelevant under the lock) | 2 load-bearing contradictions → floor verify (no-op, score already verify) | same, no-op | 2 load-bearing contradictions → **floor verify — this is what pulled 038 down from usable** |
| Verdict / conf 0–15 | **do_not_rely** / 5 | verify / 6 | verify / 7 | verify / 9 |

Recomputation note: all four verdicts and all four confidence scores reproduce exactly from stored
signals through `computeVerdict` → floors/locks. Nothing in the stored rows disagrees with the engine.

### The answer, plainly

**It is NOT a consequence of running three areas.** With two of five areas absent, 035's weighted
score (1.25) sat in the **same verify band** as 036 and 037. Had the score been the whole story,
$99 would have said Verify Before Purchase like the others.

**The entire verdict difference is one classification event.** The same real-world fact — Athena
Cosmetics' settlement requiring Perfume's Club to cease and desist RevitaLash sales — was
classified:
- **035 ($99):** `cease_and_desist_distributed` — a hard-fail key → verdict locked do_not_rely. The
  item's certainty is `inferred`.
- **037 (Growth):** the **same fact, near-identical statement**, keyed `brand_enforcement_signals`
  (−3, no veto).
- **036 / 038:** the C&D never surfaced as its own item; enforcement appeared as generic
  `brand_enforcement_signals` (the $1.1M counterfeiting judgment, the UK in-housing move).

Four independent runs, same vendor, same day → the hard-fail boundary was crossed by exactly one of
them. **This is run-to-run evidence-classification variance, not tier design.** Had 035's run keyed
that item as 037 did, 035 = verify_before_purchase, and all four tiers agree.

**What IS a real tier characteristic (OBSERVED, no fix proposed):** with T2/T4 absent, Track 3
carries **50%** of the $99 verdict (vs 35.3% at the other tiers), and 035's score sat 0.05 above
the do_not_rely boundary before any veto. The $99 configuration is structurally more sensitive to
any single Track-3 event — but in this instance the harsher verdict came through the hard-fail
lock, which is weight-independent and would have fired at any tier had the key been proposed there.

**What a $99 buyer would understand:** nothing defensible — same vendor, same day, harsher verdict
than a Growth buyer, for a reason (classification variance on a hard-fail key) that is not a
product characteristic anyone could state on a pricing page. On this evidence the tier did not
"read more negatively because it is cheaper"; a coin landed differently. Whether that distinction
matters to a buyer who only ever sees one report is the founder's call.

**Also OBSERVED:** 035's Track 3 carries `no_enforcement_found` (+2) and
`brand_enforcement_signals` (−3) simultaneously — the first is about Bioderma, the second about
RevitaLash. The track aggregates both brands into one key set, so opposing per-brand facts co-exist
in one score.

---

## 3b · Is "Verify Before Purchase" the default answer?

### Distribution

All non-deleted cases (44): verify **21** · do_not_rely **15** · usable_with_conditions **3** ·
source_clear **1** · pending **4**.

**Delivered cases (8):** verify **6** · usable_with_conditions **1** (AWI-2607-021) ·
source_clear **1** (AWI-2606-001). **75% of everything a client has ever received says Verify
Before Purchase.** do_not_rely has fired 15 times and has never once been delivered (all
operator/test cases).

### Authorization-unconfirmed delivered cases

7 of 8 delivered cases carry `no_connection_found` on Track 2 (the eighth, 001, has no Track-2 row
at all). Verdict for every one of them: mid-scale (6 verify, 1 usable). On the delivered corpus,
authorization-not-positively-confirmed has one outcome.

### What those clients were told — the actual sentences

**Four of the eight delivered cases said NOTHING.** At the delivered attempt, the stored decision
snapshot for AWI-2607-023, AWI-2607-021, AWI-2607-031 and SEED-VALIDATE-T1 is a literal stub:
`headline: "stub"`, `the_real_risk: ""`, `leading_interpretation: ""`. Verified through the exact
client projection (`render-check`, CASE=AWI-2607-023): headline, the_real_risk and
leading_interpretation all render **empty**; the documentation_review and brand_risk_assessment
summaries are also empty. Those clients received a verdict with no consequence prose whatsoever.
(AWI-2606-001, the lone source_clear, has **no synthesis row for its delivered attempt** — attempt
1 was delivered, only attempt 2 exists.)

The three recent deliveries do state consequences plainly:

- **AWI-2607-022** (verify): "…may lack the Bosch-issued authorization required to list and sell
  without facing listing removal, account suspension, or legal action from Bosch — outcomes Bosch's
  own documented enforcement posture makes plausible. This risk is resolvable before commitment:
  TD SYNNEX can either produce a current Bosch authorization covering the US Amazon channel or
  cannot."
- **AWI-2608-033** (verify): "A buyer purchasing Optimum Nutrition or Burt's Bees inventory from
  Bulk Buy America may be acquiring grey-market stock sourced outside official distribution. …
  inventory sourced without that authorization may be unsellable on Amazon."
- **AWI-2608-034** (verify): "…NVE's MAP policy, authorized dealer program, and Amazon gating
  status are entirely unknown, meaning a buyer cannot currently assess whether reselling Stacker 2
  products would expose them to brand enforcement action or platform delisting."

### The answer, plainly

On delivered work, yes — the scale has so far produced one answer with zero variance for
authorization-unconfirmed cases, and for half the delivered corpus the report carried no
explanation of what the verdict means (stub era). The delivered product's information has lived in
the track summaries and the questions/checklist, not in the four-level verdict. The full corpus
shows the engine CAN say do_not_rely (15 times) — but no client has ever seen it, so on evidence
to date the client-visible scale is doing little work. Whether that changes once real do_not_rely
cases deliver is unprovable from the current corpus.

---

## 3c · The authorization-absence problem

### Which keys fire on absence, and what they carry

- **T2 `no_connection_found`: 0 points** — neutral at the key level. But the signal layer is not
  neutral: any recognized key with track total < 4 → signal **flag = 1.5/4** at the verdict layer.
  A vendor whose only T2 fact is "no connection found" contributes 1.5 where a confirmed
  authorization contributes up to 4.0, at 25% nominal weight (29.4% after T4 redistribution).
  **Absence is quietly negative — not through the key, through the signal band.**
- **Inversion (OBSERVED):** finding *nothing recognized at all* → **soft_fail = 0.5/4**, while
  explicitly tagging `no_connection_found` → flag = 1.5/4. An explicit "we found no connection"
  reads three times better than silence. (Separate guard: an *empty acquisition pack* is treated as
  "could not research" → n_a, not soft_fail — absence here means researched-and-nothing-recognized.)
- **T3 `no_enforcement_found`: +2** — absence of enforcement is scored positive.
- **"Not found in brand locator"** has no key of its own; it lands in `no_connection_found`. The
  engine also **cannot represent** the difference between "brand has a locator and the vendor is
  not on it" and "brand publishes no locator at all" — both are the same key, same 0 points, same
  flag.

### Is a veto or floor reachable by absence alone?

- **Yes, floors:** T1 all-absence → soft_fail → floor verify_before_purchase ("vendor
  unverifiable"). T3 all-absence → soft_fail → floor verify. Both fire on absence alone.
- **No, the do_not_rely LOCK:** locks require an affirmative hard-fail key or a critical
  contradiction. Not reachable by absence.
- **But do_not_rely BY SCORE is reachable by absence alone:** all four tracks soft_fail →
  weighted 0.5, deep inside the do_not_rely band (< 1.2). A realistic mixed case — T1 infer,
  T2 + T3 soft_fail, T4 n_a — computes to 1.21, i.e. **0.01 above the do_not_rely boundary**.
  Absence-heavy cases live exactly on that line.

### The ceiling — traced

- T2's proposable positive keys (`SUPPLY_CHAIN_KEYS`): dealer_page_listed +5,
  invoice_matches_distributor +3, purchases_from_mega_distributor +3, trade_press_connection +2,
  claims_authorization_unverified +1.
- **T2 consumes only the web-acquisition evidence pack** (verified in `track2.ts` — the pack comes
  from `orchestrator.gather`; uploaded files never reach it). `invoice_matches_distributor` can
  therefore only fire if the invoice relationship is discoverable on the open web — effectively
  never for a private wholesale relationship.
- **The LOA is routed away from T2 by design** (ADR-T2-001: "post-relationship, private,
  unverifiable") into Track 4 — and `applyDocumentationNoOverride` (founder-ruled 2026-07-12)
  guarantees Track 4 can never lift the verdict above the research-only verdict.
- Therefore, when a brand publishes no locator: **T2 pass (≥8) is unreachable.** Maximum without a
  public listing = mega-distributor +3, trade-press +2, claims +1 = 6 → infer. The realistic
  private-relationship case = no_connection_found (+ claims) → **flag**.

### The answer, plainly

**Yes — at the supply-chain area, a genuinely authorized distributor whose authorization exists
only as a private contract is structurally indistinguishable from an unauthorized one.** The
document that proves the difference is scored in Track 4 and ruled unable to lift the verdict; the
research track that could distinguish them can only see the public web.

At the whole-verdict level the ceiling is softer but real: with T1 pass AND T3 pass, a
no-connection vendor computes to 3.26 → source_clear by **0.06** (decision_confidence "low"); the
realistic best is usable_with_conditions — exactly case 038's shape before its contradiction floor.
And on the $99 tier the question is never asked at all: `single_99` runs tracks [0,1,3,5] — **no
supply-chain area exists on $99**.

**The ceiling, named (as the question demanded):** for the large population of authorized
distributors that no brand page will ever list, this product cannot positively confirm
authorization — by construction, not by evidence quality. Its honest claim for that population is
"we verify what is publicly verifiable, and we tell you exactly what document to demand" — the
checklist, not the confirmation. Any marketing sentence implying the product can *confirm* an
authorized source overclaims for that population.

---

## Judgement calls made in this report (rule 10)

1. Attributed 035-vs-037's key difference to classification variance because the two items describe
   the same settlement with near-identical statements; I did not re-read the underlying sources.
2. Treated the decision snapshot as the client-facing consequence surface for 3b, and verified one
   stub case (023) through the exact client projection rather than all four.
3. Quoted `the_real_risk` sentences truncated at the stored 700-char window; full text is in
   `case_synthesis.decision_snapshot`.
4. Left `docs/HyprrIQ_OPEN_ITEMS.md` untouched — 3a/3b/3c live in the handover §4, not as tracker
   line items; recording the answers is this file plus the commit.
