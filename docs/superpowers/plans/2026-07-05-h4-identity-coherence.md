# H4 — Identity Coherence Implementation Plan (tracks research the RESOLVED entity)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** DRAFT — founder-review artifact. **No code until approved** (same gate as H1/H2/H3, all FROZEN 2026-07-05).
**Phase:** H4 ONLY. No corpus changes (memory already keys on the resolved identity — Spec-B), no client-surface changes, no prompt-philosophy changes (analyst-style prompts stay in the prompt phase).

**Goal:** after Track 0.5 resolves who the supplier actually is, every downstream track researches **that entity** — never the client's raw entry. The audit's N1 (wrong-entity verdicts) dies, and Spec B becomes properly validatable end-to-end.

**The defect being fixed (audit N1, fresh-context-verified):** the Spec-B contract says tracks operate only on the resolved identity (`contracts.ts:51` — "tracks use THIS, not original_input"), but `buildTrack1Requests` builds every query from `ctx.vendor_name` (`track1.queries.ts:51`), the Track-1 prompt receives the entered name (`track1.ts` prompt ctx), and `buildTrack2Requests` does the same (`track2.queries.ts:43`). On the globaldist case the engine resolves "Global Distribution LLC," tells the client so, then researches **Bosch**. Only the WHOIS host and Track 2's source classification use `resolved_domain` today; Track 2's prompt gets `resolved_name` as a note but still analyzes the entered name.

**Frozen-core guarantee:** `deriveTrackSignal`, `computeVerdict`, `weights.ts`, the firewall, Evidence Pack contract, H1/H2/H3 semantics — untouched. **One frozen-surface touch requiring explicit sign-off (SO-1 below):** a one-line condition change in frozen Track 0.5's fast-path.

**Migration: NONE.** The research-identity audit trail rides inside `compiled_findings_json` (jsonb).

---

## SIGN-OFFS for founder (both decided-with-rationale; veto either)

- **SO-1 (frozen Track 0.5, one line):** the zero-research fast-path currently accepts **fuzzy** name↔host matches (`track05.ts:87` uses `.match`; tolerance is 25% edit distance — `nameMatch.ts:33`), so "Medline" + medlink.com silently binds with high confidence and no discovery. Change the condition to `.exact`: an exact match keeps the free fast-path; a fuzzy near-miss now runs the **existing** Spec-B website-anchored discovery (Branch 2 — no new logic, just routing). A genuine typo ("TD Synexx" + tdsynnex.com) resolves to the real entity with the mismatch recorded as an input-consistency signal, exactly per Spec-B philosophy. Cost: 1–2 extra Sonnet+Serper rounds ONLY on near-miss cases (rare); exact matches and no-website cases are untouched. *This is the smallest possible touch to a frozen surface and it routes INTO frozen Spec-B logic, not around it.*
- **SO-2 (unconfirmed identities research the entered name):** when Track 0.5 could not confirm an identity (`identity_unconfirmed = true` — ambiguous/unresolved/dead-website), tracks research the entered name. Rationale: those cases already escalate to `manual_override_required` (H2), the research output exists to aid the reviewing human, and researching a low-confidence resolved guess would be worse than researching what the client actually typed.

---

## ACCEPTANCE TESTS (defined up front — founder validates before H4 freezes)

**AT-1 — the globaldist test (kills N1; THIS is what finally validates Spec B).** Re-run the Bosch/globaldist case (`086655bb-1e0d-4818-9df7-2343e650ea0d`) via the harness, then:
```sql
SELECT track, compiled_findings_json->>'research_name' AS researched,
       compiled_findings_json->>'research_alias' AS alias
FROM case_track_results
WHERE case_id = '086655bb-1e0d-4818-9df7-2343e650ea0d'
  AND attempt_number = (SELECT max(attempt_number) FROM case_track_results WHERE case_id = '086655bb-1e0d-4818-9df7-2343e650ea0d')
  AND track_number IN (1, 2);
```
PASS = `research_name` is the website-resolved entity (per Spec-B: "Global Distribution LLC"-class, NOT "Bosch"), `research_alias = 'Bosch'`; and eyeball Track 1's `evidence_items` — statements must be about the resolved entity. (Track 0.5's own resolution behavior is FROZEN and unchanged — if the site resolves `website_dead` again as in your last live validation, the case escalates and researches the entered name per SO-2; PASS is then that `research_name` honestly records what was researched. The wrong-entity kill is proven either by this case or by AT-1b below.)
**AT-1b (deterministic wrong-entity proof, no live dependency):** unit test locked in Task 2 — resolved identity present ⇒ zero query strings contain the entered name (except as the alias line in the prompt).

**AT-2 — regression on the matched path.** Re-run one clean TD Synnex case: `research_name` = entered name (fast-path resolved == entered), `research_alias` NULL, signals/verdict in family with the prior attempt. The normal path pays nothing.

**AT-3 — determinism standing check.** `npx tsx --env-file=.env.local scripts/rejudge-case.ts <both case ids>` → exit 0 on the new attempts (H4 changes what is researched, never how it is judged).

**Unit-covered (no founder action):** the near-miss fast-path rerouting (Medline/medlink + TD Synexx fixtures — staging a live near-miss requires submitting a new case; optional, your call, ~1 credit).

---

## TASKS (execute after founder approves plan + sign-offs)

### Task 1: the research-identity selector (one shared pure function — the H3 pattern rule)

**Files:** Create: `lib/research/researchIdentity.ts` · Test: Create `lib/research/researchIdentity.test.ts`

- [ ] **Step 1: failing tests:**
```ts
import { researchIdentityFor } from "./researchIdentity";
it("uses the RESOLVED entity when identity is confirmed, with the entered name as alias", () => {
  const r = researchIdentityFor({ ...ctx, vendor_name: "Bosch", supplier_identity: identity({ resolved_name: "Global Distribution LLC", resolved_domain: "globaldist.com", identity_unconfirmed: false, resolution_method: "resolved_from_website" }) });
  expect(r.name).toBe("Global Distribution LLC");
  expect(r.alias).toBe("Bosch");
  expect(r.domain).toBe("globaldist.com");
});
it("matched path: resolved == entered → no alias noise", () => {
  const r = researchIdentityFor({ ...ctx, vendor_name: "TD Synnex", supplier_identity: identity({ resolved_name: "TD Synnex", identity_unconfirmed: false, resolution_method: "provided" }) });
  expect(r.name).toBe("TD Synnex");
  expect(r.alias).toBeNull();
});
it("SO-2: unconfirmed identity → entered name (case escalates; research aids the human)", () => {
  const r = researchIdentityFor({ ...ctx, vendor_name: "Acme", supplier_identity: identity({ resolved_name: "Acme", identity_unconfirmed: true, resolution_method: "ambiguous" }) });
  expect(r.name).toBe("Acme");
});
it("no identity at all (defensive) → entered name", () => {
  expect(researchIdentityFor({ ...ctx, vendor_name: "Acme", supplier_identity: undefined }).name).toBe("Acme");
});
```
- [ ] **Step 2:** FAIL. **Step 3: implement** (~25 lines, pure):
```ts
// H4 — THE research identity: who the tracks investigate. One shared pure function (H3 pattern
// rule) used by track1/track2 queries AND prompts, so "who are we researching" is decided once.
// Confirmed resolution → resolved_name (entered name rides as alias for alias-scoped evidence);
// unconfirmed/absent → entered name (SO-2: those cases escalate; research aids the reviewer).
export interface ResearchIdentity { name: string; alias: string | null; domain: string | null }
export function researchIdentityFor(ctx: TrackContext): ResearchIdentity {
  const entered = ctx.vendor_name ?? "";
  const si = ctx.supplier_identity;
  const domain = si?.resolved_domain ?? null;
  if (!si || si.identity_unconfirmed || !si.resolved_name) return { name: entered, alias: null, domain };
  const alias = entered && normalizeName(entered) !== normalizeName(si.resolved_name) ? entered : null;
  return { name: si.resolved_name, alias, domain };
}
```
- [ ] **Step 4:** PASS. **Step 5:** Commit `H4: researchIdentityFor — who the tracks investigate, decided once`.

### Task 2: queries research the resolved entity

**Files:** Modify: `lib/research/tracks/track1.queries.ts:50-64`, `lib/research/tracks/track2.queries.ts:42-55` · Test: extend `lib/research/tracks/track1.queries.test.ts`, `track2.queries.test.ts`

- [ ] **Step 1: failing tests (the AT-1b lock):**
```ts
it("H4: with a confirmed resolved identity, NO query string contains the entered name", () => {
  const reqs = buildTrack1Requests({ ...ctx, vendor_name: "Bosch", supplier_identity: resolvedGlobalDist });
  const serperInputs = reqs.filter((r) => r.question !== "domain_age").map((r) => r.input);
  expect(serperInputs.length).toBeGreaterThan(0);
  for (const q of serperInputs) {
    expect(q).toContain("Global Distribution LLC");
    expect(q).not.toContain("Bosch");
  }
});
```
(mirror for `buildTrack2Requests` — every per-brand query names the resolved vendor; the brand terms stay.)
- [ ] **Step 2:** FAIL. **Step 3: implement** — both builders replace `const vendor = ctx.vendor_name ?? ""` with `const vendor = researchIdentityFor(ctx).name`. (`track1.queries.ts`'s whois host already prefers `resolved_domain` — unchanged.) **Step 4:** PASS. **Step 5:** Commit `H4: track 1/2 queries research the resolved entity (N1 query half dead)`.

### Task 3: prompts name the resolved entity + alias guard

**Files:** Modify: `lib/research/track1.prompt.ts` (buildTrack1Prompt ctx + rendering), `lib/research/track2.prompt.ts` (same) · Test: extend both prompt test files

- [ ] **Step 1: failing tests:** prompt user-text names the research identity as the vendor; when an alias is present it appears with the guard sentence; entered name never appears as the research subject.
- [ ] **Step 2:** FAIL. **Step 3: implement** — `buildTrack1Prompt` ctx gains `research_alias: string | null`; rendering: `Vendor: ${research name}` plus, when alias present:
```
The client entered this supplier as "<alias>". Treat evidence naming "<alias>" as this entity ONLY where it clearly refers to the same company (same domain, address, or registration) — never merge evidence about a different company that happens to share the name.
```
`buildTrack2Prompt`: vendor-under-analysis = research name; the existing settled-identity note stays (now consistent with the subject instead of contradicting it). **Step 4:** PASS. **Step 5:** Commit `H4: prompts investigate the resolved entity; alias evidence guarded`.

### Task 4: tracks thread it + the audit trail (who was researched is part of the record)

**Files:** Modify: `lib/research/track1.ts` (prompt ctx + output), `lib/research/track2.ts` (same), `lib/research/contracts.ts` (TrackOutput), `lib/research/pipeline.steps.ts` (persist into compiled_findings_json) · Test: extend `track1.test.ts`, `track2.test.ts`, `pipeline.steps.test.ts`

- [ ] **Step 1: failing tests:** `runTrack1` output carries `research_identity: { name, alias }`; `stageFindingTrack` writes `research_name`/`research_alias` into `compiled_findings_json` when present.
- [ ] **Step 2:** FAIL. **Step 3: implement** — both tracks: `const rid = researchIdentityFor(ctx);` feeds the prompt builders; `TrackOutput` gains `research_identity?: { name: string; alias: string | null }` ("who this track actually investigated — Truth & Record: auditable per attempt"); both tracks return it; `stageFindingTrack`'s success branch spreads `research_name: out.research_identity?.name ?? null, research_alias: out.research_identity?.alias ?? null` into `compiled_findings_json`. **Step 4:** full suite PASS. **Step 5:** Commit `H4: tracks investigate the resolved entity; the record says WHO was researched`.

### Task 5 (SO-1): fast-path accepts only EXACT matches; near-misses verify via Spec-B

**Files:** Modify: `lib/research/track05.ts:86-90` (one condition) · Test: extend `lib/research/track05.test.ts`

- [ ] **Step 1: failing test:**
```ts
it("H4 (SO-1): a fuzzy (non-exact) name↔host near-miss does NOT take the zero-research fast path — it runs website-anchored discovery", async () => {
  // "Medline" + medlink.com — pre-H4 this silently bound with high confidence and no research.
  // Post-H4 it routes into the EXISTING Spec-B branch (gather is called; branch logic unchanged).
  const ctx = { ...base, vendor_name: "Medline", vendor_website: "https://medlink.com" };
  gather.mockResolvedValue({ pack: emptyPack });
  await resolveSupplierIdentity(ctx);
  expect(gather).toHaveBeenCalled(); // discovery ran — no silent bind
});
it("H4: an EXACT match keeps the zero-research fast path (no cost added)", async () => {
  const ctx = { ...base, vendor_name: "TD Synnex", vendor_website: "https://tdsynnex.com" };
  await resolveSupplierIdentity(ctx);
  expect(gather).not.toHaveBeenCalled();
});
```
- [ ] **Step 2:** FAIL. **Step 3: implement** — `track05.ts:87`: `if (providedHost && nameMatch(vendor_name, providedHost).exact) {` (was `.match`), with the comment updated: *"exact match = free fast-path; a FUZZY near-miss (typo or a different company one letter away — Medline/medlink) must verify via website-anchored discovery: Spec-B resolves the real entity and records the input-consistency signal."* Nothing else in Track 0.5 changes; the fuzzy case flows into the existing, frozen, validated Branch 2. **Step 4:** track05 suite PASS (existing fast-path tests use exact fixtures — verify none relied on fuzzy). **Step 5:** Commit `H4 (SO-1): fast-path is exact-only; near-misses verify via Spec-B discovery`.

### Task 6: full verify + tracker + push

- [ ] `npx tsc --noEmit && npm run lint && npm test && npm run build` → all PASS.
- [ ] Update `D:\Projects\Hyprriq\Docs\HyprrIQ_OPEN_ITEMS.md`: H4 → 🟡 built, pending AT-1/2/3; note Spec B validation now unblocked.
- [ ] Commit + push `staging`.

---

## EXECUTION ORDER & FOUNDER GATES

1. Founder approves plan + SO-1 + SO-2.
2. No migration. Tasks 1–6 (TDD, commit per task, full verify) → push → deploy.
3. **Founder validates AT-1 (globaldist: research_name = resolved entity, alias = Bosch, evidence about the right company), AT-2 (TD Synnex regression: research = entered, no alias), AT-3 (rejudge exit 0).**
4. H4 freezes → **Spec B can finally be declared validated end-to-end** → H5 (client surface) next.

## Notes & suggestions logged (per standing bug-check order)
- **Consistency note (not a bug):** `lib/data/intelligence.ts` already computes the resolved-vs-entered alias independently (Spec-B). Task 1's selector and the memory write MUST agree; H6's event-ledger work should refactor the memory write onto `researchIdentityFor` so there is exactly one definition (logged for H6, not done here — H6 owns that file's changes).
- **Suggestion (Track 3 build, logged):** Track 3's future queries builder must use `researchIdentityFor` from day one — add to its build checklist alongside the firewall registry entries.
- **Observation:** after H4, the July-4 "TD Synexx scored highest of all Synnex runs" anomaly class closes — a typo'd submission resolves to the real entity and researches it, instead of fragmenting evidence across spellings.
- **Cost:** zero on exact-match and no-website paths; +1–2 Sonnet/Serper rounds only on fuzzy near-misses (rare by construction).
