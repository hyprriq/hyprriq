# SB-2 — Same-Entity False-Ambiguity Comparator Gate (founder-review spec)

> **For agentic workers:** REQUIRED SUB-SKILL after approval: superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Status:** 🟢 **BUILD AUTHORIZED (founder, 2026-07-10) — ALL FOUR SIGN-OFFS SIGNED, ALL FOUR OQs RULED (OQ-B exact string in its entry).** TDD through Tasks 1–5, commit per task, full verify → push staging → **STOP — founder personally runs ATs → SB-2 FROZEN.** SO-2's two conditions are TEST OBLIGATIONS (one-directional narrowing: never resolve silently; Medline/medlink survival). **Conscience pre-commitment BINDING: any genuinely-different-entity case resolving during ATs stops the build — no comparator tuning mid-build.** Frozen core untouchable; flag bugs found while building; stop if anything turns architectural.
**Founder review record (2026-07-10):** SO-2's conditions, locked as tests not arguments: **(1) one-directional narrowing** — every case that previously escalated `multiple_entities` must now either STILL escalate or resolve WITH the mismatch note; **never resolve silently**; (2) the Medline/medlink conscience lock. Endorsement: "a narrowing that routes cases into a clearer disclosure is strictly better on both axes — a narrowing into silence would have been the dangerous one." **OQ-A CONFIRMED** — domains differ ⇒ escalate, no name-string override: "domain evidence beats name evidence, always; names speak only when domains are silent" (a company's second domain is also the exact shape of a lookalike/impersonation attack — precisely where a human should look). **OQ-C CONFIRMED** — do NOT null `resolved_name` (rider withdrawn as under-thought: NOT NULL rollup join key; the ledger's job is recording what was researched; frozen `researchIdentityFor` consumes it; the READING experience was the problem and SO-4 fixes it) — add the clarifying sentence to unresolved notes; null semantics, if ever, is its own scoped item WITH a migration. **OQ-D CONFIRMED** — unit lock is the mandatory survival proof; live two-entity half deferred-live; AWI-2607-018 re-run rides as regression sentinel (H7 AT-2/AT-4 reasoning). **The gate's-conscience pre-commitment is ACCEPTED AND BINDING:** any genuinely-different-entity case resolving during ATs stops the build; no comparator tuning mid-build. **OQ-B:** the copy has a HARDER job than website_dead — it must convey a factual finding about the INPUTS (name and site point to two different companies; we can't tell which was meant), which IS a finding about the inputs, never an insinuation about the supplier. Exact string awaits founder ruling.
Gate rhythm: OQ-B ruled → TDD build (commit per task, tsc+eslint+vitest+build) → push staging → founder personally runs ATs → SB-2 frozen.
**Phase:** SB-2 ONLY. **NOT in this phase:** Track 3 (next gate), the wrong-but-confirmed residual class, the different-entity client-note product improvement (rider — but note SB-2's routing makes its existing `name_website_mismatch` note reach the same-entity cases), the mandatory-brands product question, Phase H PDF, pre-launch security.
**Migration:** **NONE.** All record changes are additive optional fields inside `supplier_identity` JSON.

---

## PROBLEM — proven live by SB-1's AT cycle (both sides of the contrast on record)

`decideWebsiteAnchored` decides "the name and website refer to different businesses" by **normalized name-string equality** ([websiteAnchor.ts:76](../../lib/research/websiteAnchor.ts)): `norm(name.entity_name) !== norm(website.entity_name)`. Two structural defects:

1. **No corporate-suffix handling:** "TD SYNNEX" vs "TD SYNNEX Corporation" normalize to different strings → declared different businesses.
2. **The deeper one — the domain is dropped:** `toEntityResolution` ([track05.ts](../../lib/research/track05.ts)) maps the resolver's full identity down to `{ resolved, entity_name, confidence }`, discarding `resolved_domain`. The founding principle of the whole system is **domain-keyed identity**, yet the ambiguity check literally cannot see that both resolutions point at the same domain.

**The live contrast that defines the fix (from SB-1's AT record):**
- **AWI-2606-012** ("TD Synexx" + tdsynnex.com): website research → "TD SYNNEX Corporation", name research → the same company under a variant string → **FALSE `multiple_entities`** escalation, and the client note asserts the name and website "appear to refer to different businesses" — a **false insinuation about a real supplier** (fails the standing OQ-B client-copy bar; same harm class as the 429-masquerade SB-1 killed).
- **AWI-2607-018** ("Bosch" + globaldist.com): Bosch and openborder genuinely ARE different businesses → the same code path escalates **truthfully**.

A name-string comparator cannot tell these apart. **Resolved-domain comparison can** — in the TD Synexx case both sides resolve tdsynnex.com; in the Medline/medlink class they resolve different domains. That asymmetry is the entire fix.

**Folded-in riders (both founder-ruled into SB-2's scope during SB-1):**
- **Discarded inner audits:** the anchored branch throws away the inner domain- and name-research resolver audits and writes a constant `resolution_audit` (score 0/winner null) — the very score/margin data SB-1's stop-rule asked to present.
- **`resolved_name` on unresolved records** carries the ENTERED name while `resolved_domain=null`/`unconfirmed=true` — semantically confusing (made AT-1b's read ambiguous). Ruled here as OQ-C (with an honest cost assessment — it is heavier than it looks).

## GOAL

When name research and website research resolve **the same entity** (same resolved domain), the case routes to `resolved_from_website` with the existing `name_website_mismatch` note — **SB-2's reference output** (founder-designated from SB-1 AT-1: *"Our investigation found that the website provided belongs to TD SYNNEX Corporation. This report's analysis is based on TD SYNNEX Corporation. If this was not your intended supplier, please contact us…"*) — and `multiple_entities` fires only when two **genuinely distinct** entities were found, under copy that passes the OQ-B bar. The Medline/medlink class (truly different companies) must still escalate — proven two-sided.

## ARCHITECTURE (smallest touch; the frozen resolver untouched again)

- **Thread the domain through:** `EntityResolution` gains `resolved_domain: string | null` (additive); `toEntityResolution` carries it from the identity it already has. No new research, no new calls.
- **Domain-first comparison in branch 2b** (pure, deterministic, in `decideWebsiteAnchored`):
  1. `name.resolved_domain` canonically **equals** `provided_host` → **same entity** → fall through to 2a (`resolved_from_website`, reference output). *(Kills the TD Synexx false ambiguity — the typo name resolves to the anchor's own domain.)*
  2. `name.resolved_domain` **differs** from `provided_host` → **`multiple_entities`** escalation (Medline → medline.com ≠ medlink.com — survival preserved). Per OQ-A recommendation, a name-string match does NOT override a domain conflict (escalate-never-guess).
  3. Defensive fallback (domain absent on a resolved entity — shouldn't occur via `toEntityResolution`, guarded anyway): **suffix-normalized entity-name equality** (`entityNameMatch`, one shared pure fn: `normalizeBrandToken` + corporate-suffix strip — corporation/corp/inc/incorporated/llc/ltd/limited/co/company/gmbh/plc/…) decides sameness; non-match escalates.
- **Inner audits carried:** `ResolutionResearchRecord` gains optional `audit?: ResolutionAudit` (additive) — the anchored branch stores the real inner resolver audits (score/margin/winner per research call). The constant outer audit stays as-is (its `matched_by: ["website_anchored"]` marker is the branch record).
- **Copy:** the `multiple_entities` note is re-ruled under the OQ-B bar (OQ-B below; exact string becomes a Task expectation + scanner-locked both tiers).
- `identityResolver.ts` untouched again. `resolveIdentity`, weights, threshold, margin — byte-identical.

**Cost:** zero new LLM/Serper calls. **PIPELINE_VERSION:** 1.2.0 → 1.3.0 proposed (resolution-decision behavior changes for NEW attempts). **No migration.**

## FROZEN-CORE GUARANTEE

Untouched: `identityResolver.ts` entirely, `deriveTrackSignal`, `computeVerdict`, `weights.ts`, firewall logic+config, `applyVerdictCeiling`, `researchIdentityFor`, Evidence Pack 1.1.0, publish-confirm, H1–H7 + SB-1 frozen semantics. The touches are enumerated below; nothing outside them.

---

## SIGN-OFFS — 🔴 ALL UNSIGNED

- **SO-1 — `EntityResolution` gains `resolved_domain` (additive) + `toEntityResolution` carries it** (`websiteAnchor.ts` interface + `track05.ts` mapper). Pure plumbing of data the resolver already produced; no behavior change by itself.
- **SO-2 — `decideWebsiteAnchored` branch-2b LOGIC change (the real touch this gate exists for).** Domain-first comparison per the Architecture section. This is a frozen Spec-B DECISION-LOGIC change — the largest frozen-surface touch since H4 — which is why it gets its own gate, two-sided ATs, and this explicit signature. Direction of change: strictly *narrows* `multiple_entities` to genuine domain-level two-entity cases; every case it stops escalating routes into the resolve-from-website branch **with the client told whose site it is** (the reference output) — never into silence.
- **SO-3 — `multiple_entities` client copy replacement** (copy only; exact string per OQ-B ruling; scanner-locked both tiers — own-voice string, ASSERTION tier blocking).
- **SO-4 — `ResolutionResearchRecord` gains optional `audit?: ResolutionAudit`** (additive contract change in `contracts.ts`, H7 union-member precedent) + the anchored branch populates it.

## OPEN QUESTIONS — 🔴 ALL UNRULED (recommendations included)

- **OQ-A — does a name-string match override a domain conflict?** When the name resolves a *different* domain but its entity name matches the website's entity (e.g. a company's regional second domain), should we treat as same-entity? **Recommendation: NO — domains differ ⇒ escalate `multiple_entities`.** Two distinct dominant domains = two candidate identities = a human confirms (escalate-never-guess; the residual false-ambiguity this keeps is rare and safe). Suffix-normalized name matching decides sameness ONLY in the defensive domain-absent fallback.
- **OQ-B — ✅ RULED (founder, 2026-07-10): Option 1, amended — UNHEDGED, both entities named. The exact string for Task 3** (`{name_entity}` = the name-side resolution, `{website_entity}` = the website-side resolution — SO-3's `clientNote` signature extension approved to thread the name-side entity):
  > *Identity clarification: The supplier name "{entered_name}" resolves to {name_entity} in public sources, while the website you provided belongs to {website_entity}. Our research found these to be two different businesses, and we could not determine which is your intended supplier. This reflects what we found about the two inputs you provided — it is not a finding against either business. Please contact us to confirm your intended supplier before relying on the findings.*

  Founder's amendments + the ruling's principles (standing): **"resolves to … in public sources"** not "matches" (describes what our research DID; "matches" implies a validation never performed); **unhedged "found these to be two different businesses"** — post-SB-2 this is an EARNED finding (two dominant resolutions, two distinct domains), and *"hedging an earned finding is its own dishonesty — the old note was wrong because it asserted without evidence, not because it asserted; assert only what's evidenced, precisely"*; **"what we found about the two inputs" + "not a finding AGAINST either business"** — we ARE making a finding about the inputs (they differ); what we are not doing is finding against anyone (precise denial: no wrongdoing attributed, no misrepresentation implied). Verify against BOTH scanner tiers on the real template, blocking.
- **OQ-C — the `resolved_name`-on-unresolved rider (honest cost assessment).** Nulling `resolved_name` on unresolved records is heavier than it looks: the contract field is non-optional, `intelligence_events.resolved_name` is NOT NULL and is the rollup join key (unconfirmed events legitimately record the entered name as the researched-subject truth), and frozen `researchIdentityFor` consumes it. **Recommendation: do NOT null the field.** Fix the confusion at the READING layer instead: (a) SO-4's carried audits make unresolved records self-describing; (b) add one sentence to unresolved `resolution_notes` ("resolved_name carries the entered name as research subject — nothing was resolved"); (c) AT templates read `resolution_method` first. *Alternative (if founder insists on null): scope it as its own future item with the full frozen-consumer list — not inside SB-2.*
- **OQ-D — live fixture for the two-entity survival AT.** No known live fixture currently produces a genuine dominant-both-sides two-entity case (AT-1b showed openborder doesn't earn dominance on globaldist.com). **Recommendation: unit lock is the mandatory survival proof (Medline/medlink class); the live half goes to the deferred-live register** — the first natural genuine two-entity case exercises it, and the AWI-2607-018 re-run doubles as a live regression sentinel (it must NOT change class).

---

## ACCEPTANCE TESTS (founder runs all; fixtures by DB mechanism; stored vs live verified separately)

**AT-1 — the false ambiguity dies (positive, live).** Re-run **AWI-2606-012** (`c14dc564-d941-4df3-923e-7b45d3214dc6`, "TD Synexx" + tdsynnex.com — the exact case that exposed SB-2, becoming its positive fixture). **PASS** = `resolved_from_website`, `resolved_domain=tdsynnex.com`, `identity_unconfirmed=false`, `resolved_name` = the discovered entity, kind `name_website_mismatch` with the reference-output note naming it; `resolution_research` carries BOTH records with populated `audit` (SO-4 — non-zero score visible for the website call).

**AT-2 — genuinely-different-companies survival (two-sided core).** *Unit (mandatory):* website resolves entity A on the anchor domain; name resolves entity B on a DIFFERENT domain → `multiple_entities` with the new copy (Medline/medlink class); plus: name-string match + domain conflict → still escalates (OQ-A); defensive domain-absent fallback both ways. *Live:* per OQ-D ruling (deferred-live recommended) + re-run **AWI-2607-018** as a regression sentinel — its outcome class must be unchanged (website_dead or truthful escalation; FAIL = `resolved_name="Bosch"` as ever).

**AT-3 — the copy.** Exact OQ-B-ruled string locked as a test; passes both scanner tiers on the real template.

**AT-4 — determinism.** `npx tsx --env-file=.env.local scripts/rejudge-case.ts 2b359a6a-98f9-49c9-8f57-c19f4d8daaac` → PASS (frozen attempts unaffected; SB-2 changes NEW-attempt decisions only).

**AT-5 — regression locks (unit).** All SB-1 locks green unchanged (wrong-domain locks, anchor-earns-dominance, llm_failed routing); `name_is_brand` precedence unchanged; existing `decideWebsiteAnchored` expectations unchanged except the ruled copy string and the new 2b cases.

---

## TASKS (TDD; commit per task; execute ONLY after all SOs signed + OQs ruled)

### Task 1 — thread the domain (SO-1)
- [ ] Failing tests: `toEntityResolution` output carries `resolved_domain`; existing callers unaffected. Implement; verify; commit.

### Task 2 — domain-first comparator (SO-2, OQ-A)
- [ ] Failing tests: same-domain ⇒ 2a with reference output; different-domain ⇒ `multiple_entities` (incl. name-match + domain-conflict per OQ-A); domain-absent fallback via shared `entityNameMatch` (suffix strip cases: "TD SYNNEX" ≡ "TD SYNNEX Corporation"; "Medline Industries" ≢ "Medlink Inc"). Implement (pure fns only); verify; commit.

### Task 3 — copy (SO-3, OQ-B)
- [ ] Failing tests: exact ruled string + both scanner tiers. Implement; verify; commit.

### Task 4 — carried audits (SO-4) + OQ-C reading-layer fix
- [ ] Failing tests: anchored branch populates `resolution_research[].audit` with the inner resolver audits; unresolved notes carry the OQ-C clarifier sentence (if ruled). Implement; verify; commit.

### Task 5 — version + docs
- [ ] PIPELINE_VERSION 1.2.0 → 1.3.0 (pin test RED-first, founder-approval noted); tracker + spec records; full verify (tsc+eslint+vitest+build); push staging. **STOP — founder runs ATs → SB-2 FROZEN.**

---

## NOTES FOR THE RECORD

- SB-2 narrows escalation, so the two-sided burden is on the SURVIVAL side: the Medline/medlink unit lock is the gate's conscience. If any AT shows a genuinely-different-entity case resolving, the build STOPS and returns to the founder — no comparator tuning mid-build.
- The different-entity client-note product improvement (rider, logged 2026-07-09) is NOT built here — but SB-2's routing means same-entity cases now receive the existing entity-naming note, which already satisfies most of that rider's intent for this class.
- Wrong-but-confirmed remains the open identity-layer question after SB-2 — unchanged by this gate, by design.
