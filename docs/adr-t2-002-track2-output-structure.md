# ADR-T2-002 — Track 2 Output Structure: Decision Separation

**Status:** Accepted (2026-07-01) · **Scope:** Track 2 (Supply Chain Relationship) narrative output · **Extends:** ADR-T2-001 (LOA exclusion)
**Deciders:** Founder/CTO · **From:** `docs/superpowers` planning thread + `track2-output-structure-refinement.md`

## Context
Track 2's single narrative (`auth_level_reasoning` / `reasoning_notes`) conflated three **independent** questions that have different owners and different evidence:
1. **Supplier legitimacy** — is this a genuine operating business? *(Track 1 / Track 0.5's lane.)*
2. **Brand relationship / authorization** — is the vendor authorized, recognized, or connected as a source for the submitted brand? *(Track 2's actual job.)*
3. **Marketplace eligibility** — will Amazon/Walmart/eBay approve resale? *(Not verifiable here — disclaim, never conclude.)*

Live cases exposed the failure modes:
- **TD Synexx/Microsoft** — Track 2's narrative re-litigated an identity Track 0.5 had already resolved at high confidence (`resolved_domain = tdsynnex.com`).
- **JC Sales/Clorox** — a legitimate wholesaler with an **unverified** Clorox authorization was framed as an implied "vendor is good → buy," conflating legitimacy with authorization. The gap should have surfaced as a `questions_to_ask` item, not an implied green light.

Additive **prompt + schema** fix. **Does NOT touch** `deriveTrackSignal`, `computeVerdict`, `weights.ts`, the 6-gate firewall, or the frozen Evidence Pack (`schema_version 1.0.0`). No migration — new fields ride in the existing `case_track_results.compiled_findings_json` jsonb.

## Decision
Split Track 2's narrative into **lane-isolated fields**, enforce brand isolation + legitimacy≠authorization + positives-first in the prompt, and **code-template the three boundary notes** so their wording can never drift.

### Fields (additive to Track 2's structured output)
| Field | Owner | Content |
|---|---|---|
| `brand_relationship_finding` | **LLM** | Track 2's conclusion ONLY, scoped to vendor↔brand. Internally three-part: **(1) confirmed positives first, plainly**; **(2) remaining unknowns / verification-needed, separately**; **(3) what those unknowns do NOT imply** (never a vendor-wide or purchase conclusion). Multi-brand: names EACH brand explicitly and never extends one brand's confirmed/unverified status to another. |
| `identity_scope_note` | **Code constant** | Boundary ↑ — legitimacy/identity assessed separately (Track 1/0.5). |
| `authorization_scope_note` | **Code constant** | This finding = the **contractual/commercial authorization** relationship (can this brand be commercially sourced from this vendor); distinct from platform approval. |
| `marketplace_eligibility_disclaimer` | **Code constant** | Boundary ↓ — a confirmed relationship does NOT guarantee **platform** (Amazon/Walmart/eBay) approval; separate seller-history/category/regional/brand review applies. |

`auth_level` + `auth_level_reasoning` remain (advisory); `auth_level_reasoning` narrows to the DIRECT/INDIRECT + geographic-scope justification for the letter grade — the relationship *narrative* now lives in `brand_relationship_finding`.

### The three notes are DISTINCT boundaries (not duplicate boilerplate)
- `identity_scope_note` hands **legitimacy** UP to Track 1/0.5.
- `authorization_scope_note` states what Track 2's finding **is** — commercial/contractual authorization eligibility.
- `marketplace_eligibility_disclaimer` hands **platform approval** DOWN, out of scope.

`authorization_scope_note` (contractual/commercial purchasing eligibility) and `marketplace_eligibility_disclaimer` (platform-specific approval policy) are **related but not redundant** — one is the vendor↔brand commercial layer, the other is the marketplace-policy layer. Worded so they never read as the same sentence.

## Options Considered
- **D1 — `brand_relationship_finding` shape:** single string, internally structured *(chosen)* vs per-brand keyed map. Chose single-string with an explicit prompt rule to name each brand and never cross-contaminate status; per-brand structural keying deferred (Phase H / if prompt-level isolation leaks in validation).
- **D2 — identity re-litigation fix:** deterministic `identity_scope_note` + feed `supplier_identity.identity_confidence` (+ resolved name) into the prompt as read-only "identity is settled — do not re-assess" *(chosen)* vs note-only. `ctx.supplier_identity` is available because Track 0.5 runs upstream of the fan-out.
- **Disclaimers: LLM vs code-templated:** code-templated *(chosen)* — guarantees consistent wording, removes drift/weakening risk over time.

## Additional rules folded in
- **`questions_to_ask` gains a `brand` field** — `{ question, reason, blocking_weight_key, priority, brand }` — so multi-brand cases carry open questions against the correct brand. (Separate from D1.)
- **LOA visibility sharply reduced** — mention LOA in `brand_relationship_finding` ONLY when an LOA is in the pack OR when specifically recommending the client obtain one for compliance. Otherwise omit (ADR-T2-001: LOA absence carries no weight).
- **Legitimacy ≠ Authorization** — `brand_relationship_finding` never implies buy/don't-buy; an unverified relationship yields a neutral "additional brand-specific verification required" and routes the gap to `questions_to_ask`.
- **Unknown ≠ Negative** — a brand with zero public evidence either way → neutral "additional verification required," never warning/rejection language.
- **Positive findings must not disappear** — confirmed positives stated first, before caveats.
- **Procurement-language prohibition** — `brand_relationship_finding` must never contain procurement language (buy, don't buy, safe to purchase, recommend purchasing, or close equivalents). Enforced by a code-owned detector used in tests (and as a non-blocking runtime advisory flag).

## Respecting parallel execution
Tracks 1–4 run in parallel (`Promise.all`). Track 2 must NOT reference Track 1's runtime findings — cross-track synthesis is Phase 6's job. (Track 0.5 is upstream and its result IS available, so D2 is legitimate.)

## Consequences
- **Easier:** admin sees three separated conclusions; disclaimers guaranteed-consistent; positives can't get buried; no cross-brand or cross-lane overreach.
- **Harder:** the prompt grows; LLM-behavioral requirements need live validation (not unit-testable).
- **Revisit:** Phase H renders these as labeled sections; per-brand structural keying (D1-B) if isolation leaks; canonical-name display (resolved_name currently defaults to raw input).

## Testing
Deterministic (unit): the three notes are byte-identical across cases regardless of evidence (incl. a strong-relationship case) and pairwise distinct; parser extracts `brand_relationship_finding` + per-question `brand`; empty/parse-error still yields the boilerplate; procurement-language detector (positive + negative). **Negative test:** representative `brand_relationship_finding` fixtures (esp. the strong-relationship case) contain NO procurement language.
Live (founder, ≥3 vendor/brand combos incl. one **strong** + one **ambiguous** + one **genuine two-brand case: Lenovo + Bosch**): confirm per-brand naming holds in the single string, disclaimers render identically, and no output implies a purchase.

## Sequence (held, not lost)
Track 2 fix → founder re-validates TD Synexx + JC Sales + Lenovo/Bosch narratives → **freeze Track 0.5** (Track 0.5 needs no re-validation) → **Track 1 retrofit** (`resolved_domain`, re-validated, OQ-2) → **5.1d (Track 3)**.
