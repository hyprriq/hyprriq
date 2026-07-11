# SB-3 — Suffix-Aware Zero-Research Fast Path (mini-gate, founder-review spec)

**Status:** 🟢 **BUILD AUTHORIZED (founder, 2026-07-11) — SO-1 SIGNED, OQ-A CONFIRMED, OQ-B CONFIRMED (records inline).** One TDD sitting: fast-path condition (suffix-normalized-identical via `entityNameMatch`, ZERO edit-distance), H4 two-sided locks re-locked by test (TD Synexx typo + Medline/medlink still fall to discovery), the OQ-A note, PIPELINE 1.5.0 pin-first. Frozen core untouchable — `entityNameMatch` REUSED not modified, resolver thresholds byte-identical. **STOP before founder's three ATs.** AT-1 fixture reminder (earn #7): the fresh submission resolves CONFIRMED, so its mandatory brand writes to the corpus — pick a brand TD SYNNEX genuinely distributes (Lenovo, Microsoft) so it's TRUE data, no post-hoc strip like nike.
**Phase:** the fast-path condition ONLY. NOT in phase: `identityResolver.ts` (frozen — including its provided-path advisory, see OQ-B), the comparator (SB-2, frozen), any fuzzy-tolerance change, Tracks 4/5.
**Migration:** NONE.

## PROBLEM (the sweep's MED finding, founder-sequenced 2026-07-10 as "cost-and-exposure, not correctness")

Track 0.5's Branch-1 zero-research fast path fires only on `nameMatch(...).exact` — raw token equality with NO corporate-suffix handling. So **"TD SYNNEX Corporation" + tdsynnex.com** ("tdsynnexcorporation" vs "tdsynnex": distance 11 vs tolerance 2) misses both exact and fuzzy, and falls into full Spec-B website-anchored discovery: **two LLM calls + a serper batch on the most CORRECT input shape a client can give.** **The recorded irony (founder, on the record): the most correct input — our own stored `resolved_name` over its own domain — misses the fast path and pays double.** Three costs, only one of them money:

1. **Cost:** ~2 identity LLM calls + acquisition per such case — now quantified against the AT-7 baseline where identity cost is the known unaccounted gap.
2. **Exposure:** the case is needlessly routed through the `multiple_entities` comparator. Post-SB-2 the domain-first comparator handles the same-domain outcome correctly (which is why this is not a correctness gate), but a common name resolving elsewhere still reaches the escalation door SB-2 narrowed.
3. **Client experience (found while scoping):** today the suffix-class case exits discovery as `resolved_from_website` with a **`name_website_mismatch` client note** — telling a client who submitted a perfectly correct legal name + correct domain that "the website provided belongs to TD SYNNEX Corporation… if this was not your intended supplier, contact us." A correct input should never draw an identity-clarification note. SB-3 removes this class from the note entirely.

## FIX (one condition, one shared fn — nothing new invented)

Branch-1's gate widens from *token-identical* to *token-identical OR suffix-normalized-identical*, reusing **SB-2's existing `entityNameMatch`** (corporate-suffix strip, ZERO edit-distance tolerance) against the domain label:

```
before:  nameMatch(vendor_name, providedHost).exact
after:   nameMatch(vendor_name, providedHost).exact
         || entityNameMatch(vendor_name, domainLabel(providedHost))
```

**Why this does NOT weaken H4's SO-1 (the founder-signed exact-only rule):** H4's target was the silent bind on typos and one-letter-different companies — *edit-distance tolerance*. `entityNameMatch` has none: it strips legal boilerplate (Corporation/Inc/LLC/…) and then requires the stems to be **identical**. "TD Synexx" still fails (stem differs). "Medline" + medlink.com still fails (stems differ) — the H4 anti-silent-bind guarantee is preserved and re-locked by test. What changes is only the *definition of exact*: legal-suffix noise stops counting as a difference — the same principle SB-2 already ruled for the comparator's fallback tier.

## SIGN-OFF — ✅ SIGNED (founder, 2026-07-11)

- **SO-1 — `track05.ts` Branch-1 condition (a ruled WIDENING of H4 SO-1's "exact").** The only code touch. Frozen-surface honesty: H4 SO-1 was founder-signed, so redefining its "exact" from token-identical to suffix-normalized-identical needs this explicit signature, even though the anti-silent-bind property it protects is preserved (and re-locked two-sided). One shared fn (`entityNameMatch`) — no second suffix list ever exists.

## OPEN QUESTIONS — ✅ BOTH RULED (founder, 2026-07-11)

- **OQ-A — ✅ CONFIRMED (founder, 2026-07-11) as recommended:** `resolution_method` stays `provided` ("it IS a provided-website resolution — the client's website was accepted as given, still true"); `resolution_notes` appends "(name matches domain after corporate-suffix normalization)". The `provided_normalized` enum alternative REJECTED on principle: "a contract change rippling into every stored-record reader for information nothing branches on — the same anti-pattern as SB-2's resolved_name-null rider. **Mechanism goes in notes, not the contract field.**"
- **OQ-B — ✅ CONFIRMED (founder): accept medium + advisory, no second frozen-core signature.** Original entry: Branch-1 calls the FROZEN `resolveIdentity` provided path, whose own advisory `nameMatch` is NOT suffix-aware — so a suffix-matched case will carry `identity_confidence: "medium"` plus the advisory "does not appear to match" warning (reviewer-facing, never escalates, never blocks). **Recommendation: ACCEPT it — do not touch the resolver.** The trade vs today is still strictly better on every axis that matters: zero research cost (was 2 LLM calls + serper), NO client note (was a wrong-implying mismatch note), medium stored confidence + an internal advisory (was high confidence bought with two research calls). If the medium/warning noise ever grates, suffix-awareness inside the resolver's advisory is its own future frozen-surface ruling — not an SB-3 passenger. *Alternative (rejected): touch `identityResolver.ts` now — a second frozen-core signature for a cosmetic advisory.*

## ACCEPTANCE TESTS (founder-run; two-sided)

**AT-1 (live, the fix):** fresh submission "TD SYNNEX Corporation" + `https://www.tdsynnex.com` (mandatory brand per fixture-rule earn #7: pick deliberately — this case resolves CONFIRMED, so its brand writes into the corpus; a real brand already in the corpus is safe). **PASS** = `resolution_method: "provided"`, `resolution_research: []` (ZERO identity research calls — the cost win, SQL-visible), NO `identity_discrepancy` (no client note — the experience win), OQ-A note present, the advisory warning present-as-designed per OQ-B.
**AT-2 (unit, the H4 lock re-proven):** "TD Synexx" + tdsynnex.com and "Medline" + medlink.com still fall through to discovery (existing tests byte-identical + one explicit new lock naming SB-3); suffix-class inputs take the fast path with `gather`/`runModel` never called.
**AT-3 (standing):** `rejudge-case.ts` determinism on the frozen delivered fixture.

## TASK (one; TDD; single commit + docs)

- [x] Failing tests first (fast-path suffix cases + the H4 two-sided locks + OQ-A note), implement the one condition + note, full verify, `PIPELINE_VERSION` 1.4.0 → 1.5.0 (resolution behavior changes for NEW attempts — pin test RED-first; founder may veto the bump), tracker/spec records, push staging. **STOP — founder runs AT-1..3 → SB-3 FROZEN.**
