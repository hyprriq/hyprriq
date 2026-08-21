# DESIGN — MANUFACTURER-DIRECT (vendor IS the brand) · 2026-08-21 · REPORT, NO CODE

Ruled input: 0-for-3 across the corpus; same-entity check belongs at identity resolution where
the data already exists; founder's starting position is that manufacturer-direct is a strong
positive on supply-chain relationship because the authorisation question dissolves. This is the
design and blast radius. Nothing here is built.

## 0 · The three cases, measured

| case | vendor / brand | resolved_domain | what the engine did |
|---|---|---|---|
| AWI-2607-024 (not delivered) | Mototec USA / mototec | mototecusa.com | T2 `no_connection_found` (a1) then `trade_press_connection` +2 (a5) — asked if the brand is connected to itself; verdict do_not_rely |
| AWI-2608-034 (delivered, scale_499) | stacker / stacker2 | stacker2.com | T2 crammed the same-entity fact into `dealer_page_listed` (+5): "NVE Pharmaceuticals owns and operates the stacker2.com website; Stacker 2 is NVE's own product line" — the model FOUND the fact and had no key for it; T3 soft_fail; verdict verify |
| AWI-2608-043 (delivered, single_99) | Special Shit / special shit | shop.specialshit.com | plan excludes T2 entirely; T3's `reseller_friendly` (+4) fired on the brand's own DTC storefront; verdict verify 2.00 |

Decisive corpus fact: during research, the source profiler ALREADY classified each of these
vendors' resolved domains as the brand's side of the fence — `official_brand` for stacker2.com
and shop.specialshit.com, `official_company` for mototecusa.com — independently of identity
resolution. The same-entity signal exists in stored data today; nothing consumes it.

## 1 · Detection — two stages, code-owned, under-resolve on doubt

**Stage 1 — candidate (at identity resolution, Track 0.5).** Cheap routing flag, never scores:
`nameMatch(brand_token, resolved_domain)` or `nameMatch(vendor_name, brand)` marks the case
same-entity-CANDIDATE. (Catches all three; TD Synnex/Lenovo etc. do not fire.) A candidate flag
alone changes NOTHING downstream — it only requests confirmation.

**Stage 2 — confirmation (research-time, from source profiling).** Signals, strongest first:

- **S1 — domain identity (HIGH):** eTLD+1 of `resolved_domain` equals eTLD+1 of a source
  profiled `official_brand` FOR THAT SUBMITTED BRAND in this case's evidence packs. The profiler
  independently judged the domain to be the brand's own site; identity resolution independently
  judged it to be the vendor's. Two independent classifications converging on one domain.
  (043: shop.specialshit.com ✓ subdomain→eTLD+1; 034: stacker2.com ✓.)
- **S2 — self-identification (MEDIUM-HIGH, requires the pair):** `official_company` profile on
  the resolved domain AND an evidence statement in which the vendor's own site identifies the
  brand as its own product line / itself as the manufacturer ("Stacker 2 is NVE's own product
  line"; MotoTec USA operating the MotoTec dealer-authorization program). Covers the 024 shape
  where the profiler saw the domain as the vendor's official company site rather than the
  brand's.
- **S3 — name similarity alone: NEVER sufficient.** This is the ruled false-positive: a
  distributor named "Mototec Parts Wholesale LLC" name-matches, but fails S1 (its domain is not
  the one profiled as the brand's site — the brand's real site gets profiled separately) and
  fails S2 (its own site self-identifies as a distributor, not the brand owner). Name gets a
  case to CANDIDATE and no further.

`same_entity = CONFIRMED` requires S1, or S2's pair. Anything less → not same-entity, normal
pipeline — the identityResolver's existing philosophy (under-resolving loses a benefit;
over-resolving poisons Track 2 trust signals) applied unchanged. Persisted additively on
`cases.supplier_identity` JSON (`same_entity: {brand, status, signals[]}`) with the audit trail
the resolver already writes; dispute-recheckable.

**Acceptance test (pre-ruled measurement, runs before anything scores):** run the detector over
all 44 stored cases; it must return exactly {024, 034, 043} CONFIRMED and zero others. If it
returns anything else, the design is wrong — stop.

Not in v1 (recorded): trademark-registry ownership lookup (USPTO assignee = vendor legal entity)
would be a fourth strong signal but needs a new acquisition integration; `national_distributors`
/ `partner_program_brands` tables are dormant and stay out of this.

## 2 · What it should be worth — mechanism options (the number is the founder's ruling)

**Option A (recommended): one new Track 2 registry key, `manufacturer_direct`, emitted by CODE,
never proposable by the LLM.** On CONFIRMED, the pipeline writes the evidence item itself
(statement composed from the machine signals, provenance = the resolver + profiler records) and
SKIPS Track 2 LLM research — the questions the track asks (authorisation, grey-market sourcing)
have no referent when the vendor is the source, and the corpus shows what running them anyway
produces. The key flows through `deriveTrackSignal` like any other; no scoring-path change.
Points are the ruling: **+5** matches `dealer_page_listed` and lands T2 = `infer` alone; **+8**
lands T2 = `pass` alone, which matches the founder's stated position ("the strongest possible
answer to the question — the question dissolves"). Convention note: 0–15 clamp and the 8/4
thresholds are untouched either way.

**Option B: on CONFIRMED, code sets Track 2 signal = `pass` directly, no key.** Smaller surface
in the registry, but it bypasses evidence→signal derivation — a second way a signal can exist,
which every instrument (rejudge, backtest, census) would need to special-case. Not recommended;
listed because it is the minimal-diff shape.

Under Option A the verdict engine, bands, vetoes, ceiling and no-override wrappers are untouched.

## 3 · Track 3 — it does NOT dissolve; keep it voting, fix its context

The client buying manufacturer-direct still resells on Amazon as a THIRD PARTY. The brand's
enforcement posture and Amazon gating are exactly the client's account risk whether they bought
from the brand or from a middleman — a client buying Nintendo stock from Nintendo directly walks
into the same gating the corpus documents on 039. So Track 3's question keeps its referent: it
was always about the brand vs the CLIENT-as-reseller, not the brand vs the vendor.

What actually breaks today is interpretation, measured on 043: the brand's own DTC storefront
scored `reseller_friendly` (+4) — the brand selling direct is not evidence it welcomes third-
party resellers. Design: pass the `same_entity` fact into the Track 3 prompt as interpretation
context (the brand and the vendor are one entity; the brand's own channels are not reseller
posture; enforcement/gating questions are unchanged). Prompt + schema + fixtures move together.

Recorded for the ruling, not required for the fix: whether a manufacturer selling wholesale
direct-to-reseller is itself Track 3 evidence of reseller-friendliness.

## 4 · Blast radius, full

| surface | touch | frozen? |
|---|---|---|
| `lib/research/weights.ts` | +1 Track 2 key (Option A) | **YES — founder ruling** (this ruling) |
| `lib/research/weightValidation.ts` + `firewallRegistry.test.ts` | code-emitted key never passes the LLM path; needs an explicit RULED_EXCLUSIONS entry or the coverage lock fails the build (by design) | policy file — moves with the ruling |
| `identityResolver.ts` / `track05.ts` / `pipeline.steps.ts` | candidate flag, confirmation, persistence on `cases.supplier_identity` (JSON, additive — no migration) | no |
| `track2.ts` | skip-research + code-emit branch on CONFIRMED | no |
| `track3.prompt.ts` + schema + fixtures | context line | prompt+parser+schema together (standing rule) |
| synthesis / client prose / PDF | how the report SAYS "this vendor is the brand's own storefront" — client-visible product claim; copy is the founder's | **YES — §0(5)** |
| plan scope | 043-class (single_99) excludes Track 2 entirely; giving manufacturer-direct evidence to a plan without T2 changes what $99 includes | **YES — §0(5), separate ruling** |
| verdict engine / bands / vetoes / ceiling / rejudge / backtest | none under Option A | — |

## 5 · Would existing signals and verdicts move? (measured, delivered artifacts frozen per H1)

Nothing stored moves until a re-run; delivered PDFs never move. On re-run with Option A at pass-
level points and the T3 context fix:

- **AWI-2607-024:** T2 `flag`→`pass` → weighted 1.05→1.675 → **do_not_rely → verify_before_purchase**
  (T3 soft_fail floor holds it at verify). One band, the only verdict that moves.
- **AWI-2608-034:** T2 `infer`→`pass` → score 2.32→2.76, band usable — **but T3 soft_fail floor
  caps it at verify regardless.** The measured "never better than mid-scale" ceiling on this case
  is NOT the missing Track 2 key; it is the Track 3 evidence drought (soft_fail floor). The
  manufacturer-direct fix un-breaks the question but does not lift 034 by itself.
- **AWI-2608-043:** plan has no Track 2; unchanged unless the plan-scope ruling says otherwise.
  (Its polarity mis-key is the census's; also band-neutral.)
- All other cases: detector returns not-same-entity; zero movement. Acceptance test in §1 pins
  this.

**Sequencing if ruled:** detector + acceptance census (measurement, no scoring) → founder rules
points + plan scope + client copy → registry/key/firewall/prompt/fixtures in one commit → re-run
only on ruled cases. No step builds ahead of its ruling.
