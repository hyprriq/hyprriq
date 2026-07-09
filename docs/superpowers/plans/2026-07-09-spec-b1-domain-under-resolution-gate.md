# SB-1 — Spec-B Domain-Research Under-Resolution Gate (founder-review spec)

> **For agentic workers:** REQUIRED SUB-SKILL after approval: superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Status:** 🟢 **BUILD AUTHORIZED (founder, 2026-07-09) — ALL THREE SIGN-OFFS SIGNED, ALL FOUR OQs RULED (records inline below; OQ-B exact string in its entry).** TDD per the task list, commit per task, full verify → push staging → **STOP — founder personally runs ATs 1–5 → SB-1 FROZEN.** Frozen core untouchable: `identityResolver.ts` byte-identical (thresholds/weights/margin unchanged — fix the signal, not the logic). Flag any bugs found while building; stop if anything turns architectural.
**Founder review record (2026-07-09):** root cause accepted as CONFIRMED — "malformed input, not a threshold problem"; fixing the signal rather than `identityResolver.ts` endorsed as the H4 SO-1 pattern exactly. SO-2 called the phase's most important fix: "an Anthropic 429 must never again become a client-facing statement casting doubt on a real supplier." Also confirmed: `address_consistent`-unreachable stays logged-not-fixed (deserves its own small gate eventually); the wrong-but-confirmed residual class remains explicitly open (this gate fixes false-negatives only — it is the next identity-layer question after this); **PIPELINE_VERSION 1.1.0 → 1.2.0 APPROVED**.
**Phase:** SB-1 ONLY. **NOT in this phase** (each its own gate): Track 3 (next gate after this), Phase H PDF, client confirmation loop, pre-launch security phase, analyst-prompt rewrite, any `identityResolver.ts` threshold/weight change (explicitly excluded — see Frozen-core guarantee).
**Migration:** **NONE.** All record changes are additive optional fields inside the `supplier_identity` JSON column.

---

## PROBLEM — and the ROOT CAUSE, now CONFIRMED mechanically (upgrade from the tracker's hypothesis)

Real, live domains (tdsynnex.com; globaldist.com twice) score `website_dead` in Spec-B domain research. Behavior is SAFE (escalate-never-guess) but LOSSY: obviously-real suppliers land in the manual queue under a note that reads as "your supplier's site is dead". Identity resolution keys the corpus, selects the research identity, and is what replay reuses — the weakest load-bearing layer, being fixed before Track 3 pushes more traffic through it.

**The tracker's root-cause hypothesis ("dominance threshold tuned for NAME discovery, over-strict for DOMAIN research") is directionally right, but the concrete mechanism is sharper — traced in code, no live run needed:**

1. Spec-B branch ([lib/research/track05.ts:97](../../lib/research/track05.ts)) researches the domain with `subject = providedHost` (e.g. `"tdsynnex.com"` — the raw canonical domain, **TLD included**).
2. Signal derivation (track05.ts:52) computes `name_match: nameMatch(subject, c.domain).match`. Inside `nameMatch` ([lib/research/nameMatch.ts:28](../../lib/research/nameMatch.ts)):
   - `name = normalizeBrandToken("tdsynnex.com")` → `"tdsynnexcom"` (11 chars — the dot is stripped, **the TLD letters stay**),
   - `label = normalizeBrandToken(domainLabel("tdsynnex.com"))` → `"tdsynnex"` (8 chars — **TLD stripped**),
   - not equal → fuzzy: tolerance = `max(1, floor(min(11,8) × 0.25))` = **2**, Levenshtein("tdsynnexcom","tdsynnex") = **3** → **`match: false`**.
3. So **the anchor candidate structurally NEVER earns `name_match` (2 pts) for the very domain being researched** — for any domain label shorter than 12 characters. (Labels ≥ 12 chars *accidentally* match because the tolerance reaches 3 — arbitrary, which confirms this is a broken derivation, not tuning. `globaldist` = 10 chars → same failure, distance 3 > tolerance 2.)
4. `address_consistent` is hardcoded `false` (track05.ts:60) — that weight (1 pt) is unreachable everywhere.
5. Net: to clear `HIGH_THRESHOLD = 4` the anchor must earn **BOTH** `registry_hit` (2) **AND** `self_identifies` (2) from LLM-cited pack sources. One of the two missing → score 2 → not dominant → `toEntityResolution` → `resolved: false` → `decideWebsiteAnchored` branch 2c → **`website_dead`**.

**Conclusion: the resolver (`identityResolver.ts`) is NOT wrong and is NOT touched.** The threshold/margin logic is doing exactly its job; the *input signal* fed to it in domain mode is structurally broken. Fix the derivation, route INTO the frozen logic unchanged — the H4 SO-1 precedent (smallest possible touch).

**Two adjacent defects in the same surface (both in the tracker's folded scope):**

- **A model failure masquerades as a dead website.** `researchEntity` (track05.ts:41-46) catches a thrown `runModel` / unparseable output and silently collapses to zero candidates → `unresolved` → `website.resolved=false` → **`website_dead` with a client-facing note** — an Anthropic 429 literally tells the client we couldn't confirm their supplier's business. H2 closed exactly this class for Tracks 1–2 (`llm_failed` → n_a + escalate, never a scored signal); Track 0.5 was out of H2's scope. This gate closes it.
- **The client-facing `website_dead` note over-claims.** Current copy ("We could not confirm an operating business at the website provided… Please verify the supplier's website") reads as a finding about the *supplier's site* even when the truth is a *resolution failure on our side*. Copy revised (SO-3 + OQ-B); the stored enum value `website_dead` is NOT renamed (it lives in frozen delivered records).

---

## GOAL

A live, real domain researched under Spec-B resolves to its operating entity when — and only when — the anchor candidate earns at least one **independent, code-derived** signal (registry citation or self-identification) on top of anchor identity; an infrastructure failure is recorded as `llm_failed` and escalates truthfully, never as a website finding; the client note for genuine non-confirmation stops implying the site is dead; and genuinely dead/fabricated domains (Zzqxwv / AWI-2606-003 class) still escalate exactly as today — proven two-sided.

## ARCHITECTURE (smallest touch, all inside Track 0.5's own files)

- **Domain-mode anchor matching** lives in `track05.ts` signal derivation only: when the research subject is a DOMAIN, a candidate's `name_match` boolean := `canonicalDomain(candidate.domain) === canonicalDomain(subject)` (anchor identity — the domain-mode analog of "domain label matches a vendor-name token"). NAME-mode derivation is byte-identical to today. `resolveIdentity`, `WEIGHTS`, `HIGH_THRESHOLD = 4`, `MARGIN = 2` — all untouched; the anchor still must EARN dominance via `registry_hit` OR `self_identifies` (both code-derived from cited pack sources, never LLM-settable), and the runner-up margin still applies. **Escalate-never-guess is preserved by construction**: anchor identity alone scores 2 < 4.
- **`llm_failed` instrumentation** mirrors H2: `researchEntity` records (never swallows) model-call failure and empty-pack acquisition per research call; `resolveSupplierIdentity` threads an additive optional `resolution_research` array onto `SupplierIdentity` (SQL-checkable in the stored JSON). On website-research failure the Spec-B branch returns an unresolved, `identity_unconfirmed: true` identity with truthful notes and **never reaches `decideWebsiteAnchored`** — a failure cannot mint a `website_dead` intelligence signal. Existing escalation routing (`stageFinalize` → `manual_override_required`) is reused unchanged.
- **Client note copy** changes in ONE place (`clientNote()` in `websiteAnchor.ts`); `decideWebsiteAnchored` decision logic byte-identical. New copy must pass the H5 banned-language scanner.
- If the live ATs show the fix insufficient (anchor still under-resolves with the corrected signal), the build **STOPS and returns to the founder with the recorded near-miss data** (`resolution_audit` score/margin per attempt). Thresholds are never tuned mid-build.

**Cost:** zero new LLM/Serper calls on any path (same research calls; instrumentation is free). **PIPELINE_VERSION:** bump 1.1.0 → 1.2.0 (resolution behavior changes for NEW attempts; frozen attempts untouched — same rationale as H7's bump). Founder may veto the bump in review if judged unwarranted.

## FROZEN-CORE GUARANTEE

Untouched, byte-identical: **`identityResolver.ts` in its entirety** (weights, threshold, margin, dominance logic), `deriveTrackSignal`, `computeVerdict`, `weights.ts`, all 6 firewall gates + config (1.3.0), `applyVerdictCeiling`, `researchIdentityFor`, Evidence Pack 1.1.0, `decideWebsiteAnchored` decision branches, publish-confirm, all H1–H7 semantics. Frozen delivered records never rewritten; every change affects NEW attempts only. The three frozen-surface touches are enumerated below as sign-offs — nothing outside them is modified.

---

## SIGN-OFFS — ✅ ALL THREE SIGNED (founder, 2026-07-09)

**Signature record:** SO-1 SIGNED — domain-mode anchor match confined to `track05.ts`; `identityResolver.ts` untouched; "correct the input, leave the frozen logic alone." SO-2 SIGNED — the phase's headline fix; brings Track 0.5 into H2's fail-loud discipline it was wrongly excluded from; a model failure can never again mint a `website_dead`. SO-3 SIGNED — enum value stays (frozen records reference it), client copy changes; "correct separation of frozen state-name vs client presentation."

- **SO-1 — `track05.ts` signal-derivation touch (domain-mode anchor match).** `researchEntity` gains subject-mode awareness (the two call sites already know their mode: name-discovery vs website-anchored). In DOMAIN mode a candidate's `name_match` is anchor identity via the existing shared `canonicalDomain` (handles `www.`/scheme/case variants the LLM may emit); in NAME mode the derivation is byte-identical to today (existing name-path tests must pass with zero expectation changes — the regression lock). Routes INTO the frozen `resolveIdentity` unchanged — H4 SO-1 precedent. *Risk note (two-sided):* this can only ever ADD 2 points to candidates that literally ARE the anchor domain; it cannot help a non-anchor candidate, cannot reach the threshold alone, and cannot affect name-discovery cases.
- **SO-2 — additive `SupplierIdentity` contract field + Track 0.5 `llm_failed` semantics.** `contracts.ts` gains an optional field on `SupplierIdentity` (additive-only; old stored records simply lack it — the H7 `ValidationGate` union-member precedent): `resolution_research?: { subject: string; role: "website" | "name"; sources: number; llm_failed: boolean }[]`. Behavior: website-research failure (model call threw / unparseable / zero-source pack) → identity returns `identity_unconfirmed: true`, `resolution_method: "unresolved"`, truthful `resolution_notes` ("identity research model call failed — resolution not attempted", or "…produced no sources"), `identity_discrepancy` per OQ-A ruling, and the failure recorded in `resolution_research`. Never a `website_dead`. Name-research failure during the ambiguity check: per OQ-C ruling.
- **SO-3 — `clientNote()` copy revision for `website_dead` (frozen Spec-B surface; copy only).** Exact wording per OQ-B ruling; decision logic byte-identical; new copy added to the banned-language scanner's test fixtures (must pass HARD + ASSERTION tiers). The `IdentityDiscrepancyKind` enum value `website_dead` is NOT renamed — it exists in frozen delivered records; only the human-facing copy changes, for NEW attempts.

## OPEN QUESTIONS — ✅ A/C/D RULED (founder, 2026-07-09) · 🔴 OQ-B HELD (copy ruling pending)

- **OQ-A — ✅ CONFIRMED: infra failures carry NO client note** (`identity_discrepancy = null`; the real reason — 429/timeout/unparseable — lives admin-side in `resolution_notes` + `resolution_research`). Founder ruling: "If our API failed, that's our problem, not a fact about the supplier. Never let our infrastructure failure become a claim about someone's business." Directly implements the truthfulness fix.
- **OQ-B — ✅ RULED (founder, 2026-07-09): Option 1, amended.** **The exact string for Task 3 (`{entered_name}` = `clientNote`'s `entered` argument):**
  > *Identity clarification: In this pass, we were unable to independently verify the website associated with "{entered_name}" from public sources. This reflects a limit of our verification in this investigation, not a finding about the supplier or its website. If you can confirm the supplier's official website, contact us and we will re-verify.*

  Founder's amendments over the presented Option 1: "we were unable to independently verify" (subject = us, not their input); "associated with" not "provided for" (removes the implication their submission was faulty); "not a finding about the supplier **or its website**" (denial covers BOTH the entity and the site — closes the inference gap); "in this investigation" (scopes to this pass). The re-verify offer kept — "it turns a limitation into a service action." Build must verify the string passes the H5 disclaimer-aware scanner (explicit denial = the allowed class). *The bar this ruling sets, now standing:* client copy states OUR limitation, never a conclusion about the supplier; the spec's original draft failed it ("operating business behind the website" edged toward a supplier conclusion; "received manual identity review" published process noise).
- **OQ-C — ✅ CONFIRMED: a failed name-call during the ambiguity check ESCALATES, never fails open** (`identity_unconfirmed: true`, truthful notes, no client note per OQ-A). Founder ruling: "if we can't complete the check, we escalate to human, never silently pass. Fail toward caution." — the H7 OQ-A precedent.
- **OQ-D — ✅ CONFIRMED: one-off test submission with a real dead domain** for AT-2's live negative half (post-cleanup, the corpus holds no genuinely-dead-domain vendor). **Founder condition — corpus non-pollution — CONFIRMED IN CODE:** a dead-domain case escalates with `identity_unconfirmed: true`, so (1) the incremental write skips rollups ([lib/data/intelligence.ts:113](../../lib/data/intelligence.ts) — `if (rec.inserted && !ev.identity_unconfirmed && !ev.identity_failed)`), and (2) the rebuild path excludes it structurally (`confirmedVendorEvents` / `confirmedBrandEvents` filter `.eq("identity_unconfirmed", false)` — intelligence.ts:75/82). The ledger row itself exists — by design, the ledger records truth (unconfirmed included); profiles never consume it. H6 AT-3 proved this class live (Zzqxwv re-run: ledger event written as unconfirmed, vendor row count stayed 0). The test case needs no OQ-1-style manual exclusion — the H6 gate excludes it by mechanism, incrementally and on any future rebuild.

---

## ACCEPTANCE TESTS (founder runs all; fixtures by DB mechanism; stored vs live class verified SEPARATELY — the 4×-earned rule)

**AT-1 — the false-negative dies (positive side) — ⚠ CORRECTED 2026-07-09 (founder live fixture check): tdsynnex.com is the ONLY positive fixture.**
**The correction (and the solved mystery):** founder's browser verification found tdsynnex.com loads the real TD SYNNEX (valid false-negative fixture) — but **globaldist.com loads "openborder", a completely different company**. The wrong domain was entered weeks ago; Global Distributors' actual site is **globalcloseouts.net**. So globaldist.com was NEVER a false negative — the resolver correctly refused to confirm a domain belonging to an unrelated entity (escalate-never-guess working as designed), and the long-running "globaldist website_dead mystery" is SOLVED as a data-entry error, not a bug. The fixture rule (verify stored vs LIVE class separately) caught this pre-AT — its 5th earn.
Select by mechanism (never by label/observed verdict):
```sql
SELECT id, case_number, vendor_name, vendor_website, status,
       supplier_identity->'identity_discrepancy'->>'kind' AS stored_kind,
       supplier_identity->'resolution_audit' AS audit
FROM cases
WHERE supplier_identity->'identity_discrepancy'->>'kind' = 'website_dead'
  AND vendor_website ILIKE '%tdsynnex.com%';
```
Verify LIVE class separately (tdsynnex.com loads the real company today). Fixture must NOT be delivered/complete (re-running updates live status per OQ-D real-attempt semantics; these sit in the manual queue, so re-running is the normal path). Re-run via admin → Request Further Investigation. **PASS** = newest `supplier_identity`: `resolution_method = 'resolved_from_website'`, `resolved_domain = 'tdsynnex.com'`, `identity_unconfirmed = false`, `resolved_name` = the discovered entity (e.g. "TD SYNNEX Corporation"), `input_consistency = 'low'`, discrepancy kind `name_website_mismatch` naming the entity — and the prior attempt's identity record untouched (H1).
**BONUS CLOSURE:** this is H4's logged limitation (live resolved-to-different-entity demo) — record its closure in the tracker's H4 line.

**AT-1 FIRST-RUN RECORD (2026-07-09, fixture AWI-2606-012 "TD Synexx" + tdsynnex.com): stop-rule fired; NOT a fix failure.** Post-run: method `ambiguous`, kind `multiple_entities`, resolved_name "TD SYNNEX Corporation". Diagnosis (accepted by founder): the fix WORKED at both research layers — website research resolved the anchor dominantly (proven by resolved_name arriving at all) and name research also resolved (search engines correct the typo) — but both discovered the SAME company under DIFFERENT name strings, and the ambiguity comparator (normalized name-string equality, no suffix handling, no domain visibility because `toEntityResolution` drops the domain) declared two entities. → **NEW GATE SB-2** (comparator + the false client-facing "different businesses" insinuation, which fails the OQ-B bar) — logged in the tracker, NOT folded into SB-1. Also confirmed live during diagnosis: `resolution_research` = website 14 sources + name 13 sources, both `llm_failed: false` (**SO-2 plumbing live-verified — bonus closure**); the byte-identical `resolution_audit` is constant-by-construction on the anchored branch, not a stale write (inner resolver audits are discarded — logged as an SB-1 rider). The typo fixture structurally cannot produce clean `resolved_from_website` (fixture problem #2).
**CORRECTED AT-1 FIXTURE (founder-ruled):** an existing non-delivered case with a LIVE domain + a non-resolvable entered name if one exists; else a fresh test submission — vendor name "Bulk Electronics Wholesale Vendor", website `https://www.tdsynnex.com`, no matching brands (name-side non-resolution structurally guarantees branch 2a when the website resolves). Rejected alternative: "correct name + correct domain" (same string-variance trap). The resulting confirmed TD SYNNEX ledger event is ACCEPTED — true data on a vendor with 9 legitimate events. PASS criteria unchanged (resolved_from_website / tdsynnex.com / unconfirmed=false / entity named / name_website_mismatch note).

**AT-1b — wrong-domain behavior check (globaldist.com, live) — the fix must NOT falsely resolve it.**
Re-run the globaldist fixture (same mechanism SQL with `%globaldist.com%`). Post-SB-1, ANY of these outcomes is a PASS: (a) resolves to the domain's ACTUAL occupant (the openborder entity) with a `name_website_mismatch` note naming THAT entity — the client is told whose site this is; (b) `multiple_entities` escalation if the entered name also resolves its own entity; (c) `website_dead` escalation if the occupant doesn't earn dominance this pass. **FAIL = any outcome where `resolved_name` equals the entered supplier name** — identity conferred by someone else's domain would be the wrong-but-confirmed regression. Mechanically impossible by construction (`resolved_name` derives ONLY from the LLM-discovered entity FOR the domain; anchor identity is `canonicalDomain` equality, which carries no name semantics) and unit-locked both ways (`track05.test.ts` wrong-domain locks, added with this correction).

**AT-2 — escalate-never-guess survives (negative side, two-sided mandatory).**
*Unit:* an anchor candidate earning anchor identity but ZERO independent signals (no registry citation, no self-identifying cited source) scores 2 < 4 → not dominant → `website_dead` escalation preserved. An LLM-proposed `entity_name` with no qualifying citations changes nothing (entity_name is resolver-ignored for scoring — already true, regression-locked now).
*Live:* per OQ-D ruling — select a case whose domain is verified dead/parked TODAY:
```sql
SELECT id, case_number, vendor_name, vendor_website, status
FROM cases WHERE vendor_website IS NOT NULL
ORDER BY created_at;  -- founder verifies each candidate domain's LIVE deadness by hand, picks one
```
Re-run → **PASS** = still escalates: `identity_unconfirmed = true`, no resolution, kind `website_dead`, new note copy (OQ-B) present.

**AT-3 — a model failure is a state, never a website finding.**
Force an LLM failure during Track 0.5 (the H2 AT-1 forcing method) on a queued test case → **PASS** = stored `supplier_identity.resolution_research` shows `llm_failed: true` for the website subject; `identity_unconfirmed = true`; `resolution_notes` truthful ("model call failed — resolution not attempted"); `identity_discrepancy` per OQ-A (recommended: null — NO website_dead note anywhere); case status `manual_override_required`. *Two-sided:* any normal re-run records `llm_failed: false` on every research call.

**AT-4 — regression locks on the untouched paths.**
*Unit:* every existing name-discovery and exact-fast-path test passes with ZERO expectation changes (the SO-1 byte-identical guarantee, enforced by the suite). `decideWebsiteAnchored` unit expectations unchanged except the `website_dead` copy string.
*Live determinism:* `npx tsx --env-file=.env.local scripts/rejudge-case.ts 2b359a6a-98f9-49c9-8f57-c19f4d8daaac` → PASS (frozen attempts re-judge identically; SB-1 changes NEW-attempt resolution only).

**AT-5 — `multiple_entities` guard survival (unit).** Website resolves entity A, name research resolves a DIFFERENT entity B → still escalates `multiple_entities` — the fix must not let the anchor steamroll genuine two-entity ambiguity. (Also covers OQ-C's ruled behavior for a failed name call.)

---

## TASKS (TDD; commit per task; execute ONLY after all SOs signed + OQs ruled)

### Task 1 — domain-mode anchor match (SO-1)
**Files:** `lib/research/track05.ts` · tests beside it (repo pattern)
- [x] Failing tests: (a) domain subject "tdsynnex.com" + candidate "tdsynnex.com" ⇒ `name_match: true` (the confirmed-mechanism case: label < 12 chars); (b) candidate "www.tdsynnex.com" / "https://tdsynnex.com/about" ⇒ true via `canonicalDomain`; (c) candidate "othersite.com" under a domain subject ⇒ false; (d) NAME-mode derivation byte-identical (existing tests untouched + an explicit lock); (e) anchor + no independent signals ⇒ resolver returns non-dominant (AT-2 unit).
- [x] Implement: subject-mode parameter at the two `researchEntity` call sites; derivation switch only. `identityResolver.ts` diff must be EMPTY.
- [x] Full verify; commit.

### Task 2 — `llm_failed` instrumentation + additive contract field (SO-2)
**Files:** `lib/research/contracts.ts` (additive optional field only), `lib/research/track05.ts` · tests
- [x] Failing tests: thrown `runModel` ⇒ recorded `llm_failed: true` + Spec-B branch returns unresolved identity WITHOUT calling `decideWebsiteAnchored` (spy) + discrepancy per OQ-A; unparseable output ⇒ same; zero-source pack ⇒ same with "no sources" reason; successful run ⇒ `llm_failed: false` recorded on every call; name-call failure during ambiguity check ⇒ per OQ-C ruling; name-only discovery path failure ⇒ escalates as today WITH the failure now recorded truthfully.
- [x] Implement; full verify; commit.

### Task 3 — client note copy + reason strings (SO-3)
**Files:** `lib/research/websiteAnchor.ts` (`clientNote` only) · scanner fixture test
- [x] Failing tests: new `website_dead` copy (exact OQ-B-ruled string); copy passes the banned-language scanner (HARD + ASSERTION tiers); all other kinds' copy byte-identical.
- [x] Implement; full verify; commit.

### Task 4 — version bump + docs
- [x] `PIPELINE_VERSION` 1.1.0 → 1.2.0 (✅ founder-approved 2026-07-09); tracker updated (SB-1 line + H4 limitation-closure pointer readied for AT-1); full verify (tsc + eslint + vitest + build); push staging. **STOP — founder runs ATs 1–5 → SB-1 FROZEN.**

---

## BUGS FOUND WHILE PLANNING (standing rule: flag, don't silently fix)

1. **ROOT CAUSE (fixed by this gate):** domain-mode `name_match` compares TLD-included subject vs TLD-stripped label — anchor structurally scores 0 on its own domain (labels < 12 chars); accidental matches at ≥ 12 chars. Traced above.
2. **`address_consistent` is hardcoded `false`** (track05.ts:60) — its weight (1 pt) is unreachable on every path, silently capping the real max score at 6/7. Benign (conservative direction) — **logged, NOT fixed this phase** (deriving it = new signal semantics = its own review).
3. **LLM failure → `website_dead` masquerade** — fixed by this gate (Task 2).
4. **Residual class, unchanged by this gate (honest scope note):** wrong-but-confirmed identity (e.g. a lapsed domain re-registered by someone else, with stale index self-citations) has no structural guard before OR after SB-1 — the tracker already carries it. SB-1 does not widen it: the threshold, margin, and independent-signal requirements are untouched.
