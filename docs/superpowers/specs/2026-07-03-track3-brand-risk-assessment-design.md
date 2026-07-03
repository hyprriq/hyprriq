# Track 3 — Brand Risk Assessment (Design Spec)

**Date:** 2026-07-03 · **Branch:** `staging` · **Status:** DRAFT — for founder review before any implementation plan.
**Sequence slot:** **5.1d** — after Track 0.5 (frozen) + Track 1 retrofit (done) + Track 2 (ADR-T2-002, validated).
**Locked, do NOT touch:** `deriveTrackSignal`, `computeVerdict`, `weights.ts` scoring (incl. the `brand_risk_assessment` table below), the 6-gate firewall logic, the frozen Evidence Pack contract (`schema_version 1.0.0`), ADR-G003/G004.

## Why this exists (framing)
Tracks 1–2 answer "is the supplier real?" and "is there a real vendor↔brand relationship?" Track 3 answers a **different, independent** question: **does the BRAND itself make third-party resale risky or impossible?** A perfectly legitimate vendor with a genuine distributor relationship is still a bad buy if the brand aggressively enforces against resellers, gates its catalog on Amazon, sells direct-only, is effectively B2B-only, or has a history of IP complaints / price cliffs. Track 3 assesses the **brand's posture toward resellers**, per submitted brand. It is the **highest-weighted finding track (0.30)** — brand risk can sink an otherwise-clean case, and several signals are hard-fail disqualifiers.

## Governing principle (unchanged boundary)
**The LLM PROPOSES brand-risk evidence + a weight_key; deterministic CODE (firewall) validates and `deriveTrackSignal` scores** — identical to Tracks 1–2. Brand-isolated (every evidence item names exactly one submitted brand). **Unknown ≠ negative** (absence of enforcement evidence is not proof of safety, but is NOT scored as a risk). **No purchase implication** — Track 3 reports brand posture, never "buy/don't buy" (carries the ADR-T2-002 procurement-language guard).

## The locked scoring contract (weights.ts — DO NOT edit; Track 3 produces evidence to THESE keys)
| weight_key | points | meaning |
|---|---|---|
| `reseller_friendly` | +4 | brand has a reseller-friendly history/policy |
| `keepa_stable_no_cliff` | +3 | stable Keepa price/buybox history, no enforcement cliff |
| `low_seller_count_stable` | +2 | low, stable third-party seller count |
| `no_enforcement_found` | +2 | no reseller-enforcement actions found (after sufficient search) |
| `map_policy_present` | +1 | MAP policy present (structure, not hostility) |
| `keepa_enforcement_cliff` | −3 | Keepa shows a seller-count/price cliff (enforcement pattern) |
| `brand_enforcement_signals` | −3 | public signals the brand enforces against resellers |
| `brand_restricts_amazon` | −4 | brand restricts/gates Amazon resale |
| `b2b_only_confirmed` | −5, **hard_fail** | brand is confirmed B2B/enterprise-only for this channel |
| `active_ip_complaints` | **hard_fail** | active IP complaints against resellers |
| `confirmed_amazon_restrictions` | **hard_fail** | confirmed marketplace restriction (brand-gated) |
| `cease_and_desist_distributed` | **hard_fail** | brand has issued C&Ds to resellers |

Hard-fail handling is already in the firewall + `deriveTrackSignal` — Track 3 only proposes these; validation/scoring/veto are untouched.

## Architecture (mirror Track 2 — no new orchestration contract)
New files (pattern-identical to Track 1/2):
- `lib/research/tracks/track3.queries.ts` — capability matrix. serper/native capabilities for: reseller-enforcement search, IP-complaint/C&D search, Amazon-restriction/brand-gating check, MAP-policy check, direct-sales-vs-downstream check, B2B-only signals. **Keepa capability gated to the Scale plan** (price/seller-count history) — declared `available:false` until the Keepa plugin ships (OQ-1).
- `lib/research/track3.prompt.ts` — LLM proposes brand-isolated evidence citing pack sources + exactly one `brand_risk_assessment` weight_key (or honest `UNKNOWN`); a scoped, structured `brand_risk_finding` (ADR-T2-002 pattern); `questions_to_ask` (brand-tagged); tolerant parser.
- `lib/research/track3.ts` — `runTrack3`: Orchestrator([serper, native, (+keepa when live)]).gather → firewall `validateWeights` → `deriveTrackSignal("brand_risk_assessment", foundKeys)` → `TrackOutput` (+ the ADR-T2-002 non-blocking procurement/unknowns advisories). Replaces the current stub.
- Wiring: `pipeline.steps.ts` `TRACK_FNS[3]` already routes to `runTrack3` (stub today) — no orchestration change; Track 3 runs in the parallel fan-out group alongside 1/2/4.

**Nothing changes in** `deriveTrackSignal`/`computeVerdict`/`weights.ts`/firewall/Evidence Pack. Track weight 0.30 already registered.

## Decision separation (carry ADR-T2-002 forward)
`brand_risk_finding` is scoped to **brand posture toward resellers ONLY**:
- NOT supplier legitimacy (Track 1), NOT the vendor↔brand relationship (Track 2), NOT whether a marketplace approves THIS seller (that's account-specific — disclaim, don't conclude).
- Structured three-part: (1) confirmed positives (reseller-friendly / stable history), (2) risk signals found + what needs verification, (3) what the unknowns do NOT imply (no enforcement *found* ≠ *safe*; and a brand risk on one submitted brand never generalizes to another). Per-brand naming in multi-brand cases. Never implies a purchase decision.
- Reuse the code-templated boundary-note pattern where a boundary applies (e.g. an "account-specific marketplace eligibility" note distinct from Track 2's).

## Keepa (Scale plan) — new infrastructure
`keepa_stable_no_cliff` / `keepa_enforcement_cliff` / `low_seller_count_stable` need Keepa price + offer/seller-count history. **No Keepa plugin exists today** (only serper/whois/native). Options in OQ-1.

## Explicitly OUT of scope (deferred)
- Real Keepa API plugin build IF OQ-1 defers it (Track 3 ships with serper/native enforcement signals first).
- Any change to plan gating beyond declaring the Keepa capability Scale-only.
- Client-facing report formatting (Phase H).

## Testing (TDD, same discipline as Tracks 1–2)
Queries: capability matrix (Keepa gated); prompt: proposes brand-isolated evidence to the locked keys, honest UNKNOWN, no purchase language, per-brand naming; parser tolerance (string/`{text}` questions — the fix from `b659acd`). track3.ts: firewall-validated evidence → correct `deriveTrackSignal`; a proposed hard-fail (e.g. `active_ip_complaints`) flows to the locked veto; unknown≠negative (no enforcement found → neutral, not a risk score); procurement/unknowns advisories fire. Full suite stays green.

## OPEN QUESTIONS for founder (decide before the implementation plan)
- **OQ-1 (Keepa):** (a) **ship Track 3 core now** with serper/native enforcement/IP/restriction/MAP signals, Keepa capability declared `available:false`, and build the **Keepa plugin as a scoped fast-follow** *(my recommendation — mirrors incremental track delivery; Keepa is a distinct integration with its own API key/cost/retry concerns)*; or (b) build the Keepa plugin **now** as part of Track 3 (Scale-plan cases get price-cliff/seller-count signals immediately). Note: a Keepa MCP exists for *my* analysis, but the ENGINE needs its own server-side plugin.
- **OQ-2 (structured output):** apply the full ADR-T2-002 treatment to Track 3 (`brand_risk_finding` three-part + per-brand + procurement guard + brand-tagged questions + a scoped boundary note)? *(Recommend yes — consistency + the same failure modes apply.)*
- **OQ-3 (B2B reconciliation):** Track 2 already emits advisory `b2b_only_detected`/`b2b_only_brands` (where B2B-only is EXPECTED, not negative for *authorization*). Track 3's `b2b_only_confirmed` is a −5 **hard_fail** (B2B-only makes third-party marketplace resale a bad buy — a RISK). Confirm the two are intentionally different lenses: Track 2 = "absence of a reseller cert is expected, not negative"; Track 3 = "if the brand is genuinely B2B-only for this channel, that IS a disqualifying resale risk." *(Recommend: Track 3 owns the risk determination from its own evidence; Track 2's flag stays advisory. Cross-track synthesis, not Track 3, reconciles them.)*
- **OQ-4 (marketplace-restriction depth):** how far to read "brand_restricts_amazon"/"confirmed_amazon_restrictions" — public brand-gating / direct-only signals via serper/native, treating `confirmed_amazon_restrictions` as hard_fail only on concrete evidence (brand-gated ASIN, published restriction), else `brand_restricts_amazon` (−4) or UNKNOWN? *(Recommend yes — concrete evidence → hard_fail; softer/public signals → −4; thin → UNKNOWN, never inferred.)*
- **OQ-5 (slot):** confirm **5.1d**, Track 3 runs in the parallel finding-group (1–4), Track 5 (Sourcing Logic) is the last track after.
