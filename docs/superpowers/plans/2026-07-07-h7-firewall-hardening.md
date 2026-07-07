# H7 — Firewall Hardening & Extraction Stability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** ✅ **APPROVED (founder, 2026-07-07) — ALL FOUR SIGN-OFFS SIGNED, ALL FOUR OQs RULED (records inline below). BUILD AUTHORIZED FOR THE NEXT SESSION (Opus), not this one** — this session produced and got approval on the spec; the build runs fresh with the full gate cycle (TDD, commit per task, tsc+eslint+vitest+build, push staging, founder runs ATs 1–7 → H7 FROZEN). Spec-B domain under-resolution stays its OWN separate gate — do not fold in.
**Phase:** H7 ONLY. NOT in this phase (each stays its own gate): Spec-B domain-research under-resolution, Phase H PDF, client confirmation loop, Track 3/4/5 builds (H7 only CODIFIES their pre-freeze firewall gate), analyst-style prompt rewrite, judgment backtesting harness (I1 — H7 ships only its SEAM).

**Goal:** the firewall counts real-world sources instead of pack rows, every irreversible veto key requires corroboration, `pass` requires source diversity, hard-fail keys survive only extraction consensus, parse failures stop happening at the source, and frozen evidence becomes replayable — "same evidence, morning hard_fail / evening pass" dies.

**Architecture:** all changes live at the acquisition/extraction/orchestration layers around the frozen judgment core. Canonical-URL dedupe happens once in `finalizePack` (pack 1.0.0 → 1.1.0, SO-1); the corroboration gate widens by config (firewall 1.2.0 → 1.3.0, SO-2); the pass-cap is ONE shared post-signal function applied at every signal site — the H3 pattern rule — never inside `deriveTrackSignal` (SO-3); the consensus gate is a code-side second-extraction check in the track layer (SO-4); structured outputs wire `runModel`'s dormant `schema` param, capability-guarded with the tolerant parser kept forever as fallback; the replay seam loads a stored pack instead of live acquisition.

**Tech stack:** no new dependencies. **NO DB MIGRATION** — H7 is code + one founder-run script. `PIPELINE_VERSION` bumps.

**Frozen-core guarantee:** `deriveTrackSignal`, `computeVerdict`, `weights.ts` scoring, the six firewall gates' LOGIC, `applyVerdictCeiling`, `researchIdentityFor`, H1–H6 semantics — untouched. H7 touches four frozen SURFACES by config/addition only, each with an explicit sign-off below. Historical frozen attempts are never rewritten; every change affects NEW attempts only (AT-7 proves it).

---

## SIGN-OFFS — ✅ ALL FOUR SIGNED (founder, 2026-07-07)

**Founder review record:** all four frozen-surface touches judged safe — additive, versioned, or shared-function; none mutates a delivered record. SO-1 signed (old packs stay frozen at 1.0.0 — H1 holds; versioned evolution is the right way to move a frozen contract). SO-2 signed (confirms the roadmap pre-answer; aligns with the standing domain principle that a single unverified fraud-flag is never load-bearing). SO-3 signed (shared-pure-fn at every site = the H3 discipline that has protected the frozen core all along; `deriveTrackSignal` byte-identical). SO-4 signed — called out as the best of the four: re-extracting over the SAME frozen pack tests extraction stability without adding collection variance, and directly kills the hard-fail coin-flip; +1 call on hard-fail runs only is worth it for the most consequential signal.

- **SO-1 — Evidence Pack contract 1.0.0 → 1.1.0 (canonical-URL dedupe in `finalizePack`).** The pack SHAPE is unchanged (contract-freeze key tests still pass); what changes is CONTENT semantics: identical canonical URLs (scheme/`www.`/trailing-slash/tracking-params stripped) collapse to one source before `src_N` numbering, so "same URL twice = two corroborating sources" dies at the root (`weightValidation.ts:105` counts DISTINCT valid cited sources — post-dedupe that finally means distinct real-world sources). Deliberate, documented bump per the freeze guard's own instruction; `contract-freeze.test.ts:13-15` expectation updates to 1.1.0 with the rationale. Old packs (1.0.0) are frozen history — never migrated, and replay respects whatever version a stored pack carries.
- **SO-2 — Firewall config: `CORROBORATION_REQUIRED` gains `website_fraudulent: 2` + `address_fraudulent: 2`; `VALIDATION_VERSION` 1.2.0 → 1.3.0.** Gate LOGIC untouched — this is the config surface the corroboration gate was built to grow (`weightValidation.ts:67`). Both keys are irreversible-veto class, same as the scam key ruled in v1.2.0. Strictly more conservative: can never produce a false PASS. *This was pre-answered YES at roadmap approval (the "5 OQs answered: 2-yes … incl. address_fraudulent") — this SO is confirmation, not a new question.* Includes updating `scripts/rerun-batch.ts`'s preflight pin (1.2.0 → 1.3.0) in the same commit, or the founder harness stops working.
- **SO-3 — Source-diversity pass-cap OUTSIDE the frozen scorer.** *(Pre-answered YES at roadmap approval: "3-yes, single source never = pass, cap to infer.")* `deriveTrackSignal` stays byte-identical; a new pure `applySourceDiversityCap(signal, evidence_items)` downgrades `pass` → `infer` with a recorded reason when the applied evidence cites <2 DISTINCT canonical sources. Applied at EVERY site that derives a track signal (pipeline `stageFindingTrack` + track1/track2's internal report signal) — one shared fn at all sites, the H3 pattern rule, so the stored row, the report, and rejudge can never disagree. `hard_fail`/`flag`/`soft_fail`/`infer` are never touched (only `pass` is capped). Note the conservative edge: a pass built purely on inference-cited items (no URLs) also caps — correct per "multiple independent sources confirm".
- **SO-4 — Hard-fail consensus gate at the EXTRACTION layer.** When a run's validated keys include any hard-fail key, the track makes ONE additional extraction call on the SAME frozen pack; the hard-fail key survives only if proposed in BOTH passes (code-side comparison — deterministic given the two outputs). `deriveTrackSignal`/`computeVerdict` untouched — a dropped key simply never reaches them, exactly like a firewall rejection. The drop is recorded in the validation audit (`gate: "consensus"` — additive union member on `ValidationGate`/`RejectionReason` in contracts.ts) and in `compiled_findings_json`. Cost: +1 Sonnet call ONLY on hard-fail-proposing runs (rare). This converts residual LLM proposal variance on the highest-stakes keys into a code-controlled gate.

## OPEN QUESTIONS — ✅ ALL RULED (founder, 2026-07-07)

**Rulings:** **OQ-A CONFIRMED** — consensus call fails → KEEP the hard-fail + escalate to manual review (fail toward caution + human; a real problem must never disappear because of an infra hiccup). **OQ-B CONFIRMED** — scope to Tracks 1 and 2, the hard-fail-carrying tracks (complete coverage, no wasted calls). **OQ-C CONFIRMED** — fail-open design approved: structured outputs capability-guarded, fall back to tolerant parsing on rejection, parser NEVER removed (the H5 scanner-stays-forever pattern; a capability change can never brick the pipeline). **OQ-D CONFIRMED** — real-attempt semantics: replay writes a real ledger event + audit marker, delivered rows untouched per H1 (append-only-consistent, never a silent shadow operation). Founder also endorsed Task 7 explicitly: the Track 3/4 pre-freeze gate as a failing test — "encode the rule structurally so it can't be forgotten."

- **OQ-A — consensus second-call failure semantics.** If the confirmation call itself fails (LLM error/unparseable), we cannot confirm OR deny the hard-fail. Recommendation: **KEEP the hard-fail key AND escalate the track to manual review** (fail toward caution + human, H2 style — dropping it could mask real fraud; keeping it silently defeats the gate's honesty). The record says `consensus: second_call_failed`.
- **OQ-B — consensus gate scope.** Recommendation: **Track 1 AND Track 2** (both carry hard-fail keys: `registration_fabricated`, `address_fraudulent`, `website_fraudulent`, `scam_reports_corroborated` / `counterfeit_channel`, `conflicting_authorization`). One shared helper, two call sites.
- **OQ-C — structured outputs are capability-guarded.** Anthropic's canonical parameter is `output_config: {format: {type: "json_schema", schema}}`; the docs' confirmed-support list does NOT explicitly include the pinned `claude-sonnet-4-6`. Design: wire the schema through `runModel`, and on a 400 naming `output_config` **retry once without the schema** (self-healing fallback to today's tolerant parsing; the H2 `llm_failed` path remains the backstop; `parseModelJson` is NEVER removed — the scanner-stays-forever pattern). AT-5 verifies live which path fired. Confirm this fail-open design (alternative — hard-require schema support — would couple the pipeline to model capability).
- **OQ-D — replay attempts are REAL attempts.** The replay seam (`runPipeline` with `replay_from_attempt: N`) writes a genuine NEW attempt: rows/pack/synthesis under the new attempt number, ledger event appended, audit-logged with a replay marker, delivered rows untouched (H1 pin). Replay SKIPS live acquisition (loads attempt N's stored packs) and SKIPS live identity resolution (reuses the case's frozen `supplier_identity`) — it re-runs extraction → firewall → signals → verdict, which is exactly the I1 seam ("did the judgment change, given identical evidence?"). Cost ≈ extraction LLM only (~$0.03-0.08/case, no Serper/WHOIS). Confirm the real-attempt semantics (the alternative — a side-channel that writes nothing — would break "the attempt ledger IS the record").

---

## ACCEPTANCE TESTS (defined up front — founder runs all; fixtures by DB mechanism)

**AT-1 — canonical-URL dedupe.** Unit-locked (www/scheme/trailing-slash/utm variants collapse; distinct paths don't). Live: re-run any confirmed case (admin → Request Further Investigation), then inspect the NEWEST pack:
```sql
SELECT p.track_key, p.attempt_number, p.pack_json->>'schema_version' AS ver,
       jsonb_array_length(p.pack_json->'sources') AS n_sources
FROM case_evidence_packs p WHERE p.case_id = '<id>' ORDER BY p.attempt_number DESC, p.track_key LIMIT 4;
```
PASS = newest packs say `1.1.0`; older attempts still say `1.0.0` (frozen history untouched); eyeball the newest pack's `sources` — no two entries share a canonical URL. *(Column name may be `pack_json`/`pack` — use whichever `lib/data/acquisition.ts` writes; verify before running.)*

**AT-2 — corroboration breadth.** Unit-locked two-sided: single-source `website_fraudulent` and `address_fraudulent` → REJECTED at the corroboration gate; two distinct valid sources → VALIDATED (and the existing scam-key tests still pass). Live half honestly DEFERRED — fraud can't be summoned on demand; first real single-source fraud proposal will show `gate: corroboration` in the admin validation report. Logged as deferred-live.

**AT-3 — source-diversity pass-cap.** Unit-locked two-sided: 4 keys × 1 canonical source → `pass` capped to `infer` with reason; 2+ distinct sources → `pass` stands. Live regression (the Bosch-flip lesson): re-run the confirmed TD Synnex fixture (select by mechanism: `vendor_name ILIKE 'td synnex' AND status='awaiting_review' AND supplier_identity->>'identity_unconfirmed'='false'`) → its Track 1 signal is UNCHANGED vs the prior attempt (its pass cites multiple distinct sources — no false capping on the flagship), verified:
```sql
SELECT attempt_number, track_verdict_signal, compiled_findings_json->'source_diversity' AS div
FROM case_track_results WHERE case_id='<id>' AND track_number=1 ORDER BY attempt_number DESC LIMIT 2;
```

**AT-4 — hard-fail consensus.** Unit-locked: key proposed in both passes → survives; pass-1-only → dropped with `gate: "consensus"` in the audit; second call failed → kept + `manual_review_required` (per OQ-A). Live: re-run **Zzqxwv AWI-2607-016** (`61685fec-a889-483d-9141-6868e8a999ce` — deterministic hard-fail mechanism) → the fake vendor's hard-fail survives both passes, verdict stays `do_not_rely`, and `compiled_findings_json->'hard_fail_consensus'` shows `checked` non-empty. (Bonus: its ledger event stays unconfirmed-identity → corpus untouched, re-proving H6 AT-3.)

**AT-5 — structured outputs.** Unit-locked: `runAnthropic` sends `output_config.format` when a schema is passed; the 400-fallback path retries schema-less. Live: re-run any case → all tracks `llm_failed=false`, and the script prints which path fired:
`npx tsx --env-file=.env.local scripts/check-structured-outputs.ts` → makes ONE tiny schema'd call and reports `structured outputs: SUPPORTED` or `FALLBACK (schema rejected — tolerant parsing in effect)`. Either result is a PASS (the design is fail-open, OQ-C); the result is LOGGED in the tracker.

**AT-6 — the replay seam (I1's foundation).**
```
npx tsx --env-file=.env.local scripts/replay-attempt.ts 2b359a6a-98f9-49c9-8f57-c19f4d8daaac 6
```
(replays the DELIVERED AWI-2607-021's pinned attempt 6.) PASS = a NEW attempt appended whose packs carry the SAME `evidence_hash` as attempt 6's (identical evidence in); a fresh verdict computed and diffed against the stored one in the script output; the delivered row untouched (`status/delivered_at/delivered_attempt/verdict` identical — H1) with only `reinvestigation_pending=true` raised; audit_log row carries the replay marker; ledger event appended for the new attempt. Verdict-in-family expected; a divergence is the gate WORKING (extraction variance made visible) — record whatever it shows.

**AT-7 — standing determinism check.** `npx tsx --env-file=.env.local scripts/rejudge-case.ts 2b359a6a-98f9-49c9-8f57-c19f4d8daaac` → PASS on the FROZEN attempts (H7 changes how NEW evidence is packed/extracted/capped, never how stored records re-judge).

**Deferred-live register (logged, not blocking):** AT-2's live fraud half; first live consensus DROP (needs a flaky hard-fail proposal in the wild); structured-outputs capability result on the pinned model.

---

## TASKS (execute after founder approves + signs off)

### Task 1: canonical URL + pack dedupe (SO-1)

**Files:** Create: `lib/research/canonicalUrl.ts`, `lib/research/canonicalUrl.test.ts` · Modify: `lib/research/acquisition/pack.ts` (`finalizePack`, `EVIDENCE_PACK_SCHEMA_VERSION`), `lib/research/acquisition/contract-freeze.test.ts:13-15`

- [ ] **Step 1: failing tests** (`canonicalUrl.test.ts`):
```ts
import { it, expect } from "vitest";
import { canonicalUrl } from "./canonicalUrl";

it("strips scheme, www, trailing slash, and tracking params", () => {
  expect(canonicalUrl("https://www.Example.com/path/?utm_source=x&fbclid=y")).toBe("example.com/path");
  expect(canonicalUrl("http://example.com/path")).toBe("example.com/path");
});
it("keeps meaningful query params, sorted (stable key)", () => {
  expect(canonicalUrl("https://example.com/p?b=2&a=1")).toBe("example.com/p?a=1&b=2");
});
it("distinct paths stay distinct", () => {
  expect(canonicalUrl("https://example.com/a")).not.toBe(canonicalUrl("https://example.com/b"));
});
it("null/unparseable inputs are handled without throwing", () => {
  expect(canonicalUrl(null)).toBeNull();
  expect(canonicalUrl("not a url")).toBe("not a url");
});
```
- [ ] **Step 2:** FAIL. **Step 3: implement:**
```ts
// H7 (SO-1) — ONE canonical form for a real-world source URL, shared by the pack dedupe and the
// source-diversity cap (one fn, all sites). Conservative: strips only noise that provably does not
// change the document (scheme, www, trailing slash, tracking params); meaningful queries survive.
const TRACKING_PARAM = /^(utm_|fbclid|gclid|msclkid|mc_|ref$|ref_)/i;

export function canonicalUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.trim());
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    const params = [...u.searchParams.entries()]
      .filter(([k]) => !TRACKING_PARAM.test(k))
      .sort(([a], [b]) => a.localeCompare(b));
    const query = params.length ? `?${params.map(([k, v]) => `${k}=${v}`).join("&")}` : "";
    const path = u.pathname.replace(/\/+$/, "");
    return `${host}${path}${query}`;
  } catch {
    return url.trim().toLowerCase(); // not a URL — still a stable key, never a throw
  }
}
```
- [ ] **Step 4:** PASS. **Step 5: dedupe in `finalizePack`** — failing test first (in the existing pack test file or contract-freeze sibling):
```ts
it("H7 (SO-1): identical canonical URLs collapse to ONE source before src_N numbering", () => {
  const src = (url: string): RawSource => ({ url, title: "t", snippet: "s", provenance: PROV });
  const pack = finalizePack("c1", "supplier_identity", [src("https://www.example.com/x/"), src("http://example.com/x?utm_source=a")], "t");
  expect(pack.sources).toHaveLength(1);
  expect(pack.schema_version).toBe("1.1.0");
});
it("null-url sources are never deduped against each other", () => { /* two null-url sources → both kept */ });
```
Implementation in `pack.ts` (after the deterministic sort, before hashing — first occurrence in sorted order wins, so the winner is deterministic):
```ts
export const EVIDENCE_PACK_SCHEMA_VERSION = "1.1.0";
// 1.1.0 (H7, SO-1): canonical-URL dedupe — identical real-world sources collapse to one entry so
// downstream "distinct sources" counts (corroboration gate, source-diversity cap) mean REAL sources.
// Shape unchanged; frozen 1.0.0 packs are history and are never migrated.
```
```ts
  const ordered = [...sources].sort((a, b) => orderKey(a).localeCompare(orderKey(b)));
  const seen = new Set<string>();
  const deduped = ordered.filter((s) => {
    const key = canonicalUrl(s.url);
    if (key === null) return true;            // no URL → nothing to dedupe on
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  // …hash + return use `deduped`
```
- [ ] **Step 6:** update `contract-freeze.test.ts:13-15` → `expect(EVIDENCE_PACK_SCHEMA_VERSION).toBe("1.1.0")` with a comment citing SO-1 + this plan (deliberate versioned bump per the guard's own instruction; the key-shape tests stay as-is and must still pass). **Step 7:** full `npx vitest run` → green. **Step 8: commit** `H7 (Task 1): canonical-URL dedupe in finalizePack - pack 1.1.0 (SO-1); distinct sources become REAL sources`

### Task 2: corroboration breadth + firewall 1.3.0 (SO-2)

**Files:** Modify: `lib/research/weightValidation.ts:15,67` · Test: the existing firewall test file (extend) · Modify: `scripts/rerun-batch.ts` preflight pin

- [ ] **Step 1: failing tests** (mirror the existing scam-key corroboration tests):
```ts
it("H7 (SO-2): single-source website_fraudulent is rejected at the corroboration gate", () => {
  const out = validateWeights({ track: "supplier_identity", sourceProfileById: { src_0: "news" },
    proposals: [{ evidence_id: "e1", proposed_weight_key: "website_fraudulent", cited_source_ids: ["src_0"] }] });
  expect(out[0]).toMatchObject({ validated_weight_key: null, gate: "corroboration" });
});
it("H7 (SO-2): two distinct valid sources validate website_fraudulent", () => { /* src_0 news + src_1 forum → validated */ });
// + the identical pair for address_fraudulent (profiles: government_record/registry/news; use two "news")
// + regression: the v1.2.0 scam_reports_corroborated tests still pass untouched
```
- [ ] **Step 2:** FAIL. **Step 3: implement** — config only:
```ts
const CORROBORATION_REQUIRED: Record<string, number> = {
  scam_reports_corroborated: 2,
  // H7 (SO-2) — every irreversible-veto key whose profiles include variable-trust sources requires
  // ≥2 DISTINCT valid sources. Post-SO-1 dedupe, "distinct" finally means distinct real-world URLs.
  website_fraudulent: 2,
  address_fraudulent: 2,
};
```
`VALIDATION_VERSION = "1.3.0"` with a changelog line (`1.3.0 (2026-07-07): corroboration breadth — website_fraudulent + address_fraudulent join the ≥2-distinct-sources class (H7 SO-2). Strictly more conservative.`). Update `scripts/rerun-batch.ts` preflight: `if (VALIDATION_VERSION !== "1.3.0")`.
- [ ] **Step 4:** PASS (full suite — any test pinning 1.2.0 updates deliberately). **Step 5: commit** `H7 (Task 2): corroboration breadth - website_fraudulent + address_fraudulent require 2 distinct sources; firewall 1.3.0 (SO-2)`

### Task 3: source-diversity pass-cap (SO-3 — one shared fn, every signal site)

**Files:** Create: `lib/research/sourceDiversity.ts`, `lib/research/sourceDiversity.test.ts` · Modify: `lib/research/pipeline.steps.ts:162-205` (stageFindingTrack scored path), `lib/research/track1.ts:110-111`, `lib/research/track2.ts` (same spot), their tests

- [ ] **Step 1: failing tests:**
```ts
import { it, expect } from "vitest";
import { applySourceDiversityCap } from "./sourceDiversity";
const item = (url: string | null) => ({ source_url: url }) as never;

it("caps pass → infer when applied evidence cites <2 distinct canonical sources", () => {
  const r = applySourceDiversityCap("pass", [item("https://www.reg.gov/x"), item("http://reg.gov/x/"), item("https://reg.gov/x?utm_source=a")]);
  expect(r).toMatchObject({ signal: "infer", capped: true, distinct_sources: 1 });
  expect(r.cap_reason).toMatch(/distinct/);
});
it("pass with ≥2 distinct sources stands", () => {
  expect(applySourceDiversityCap("pass", [item("https://a.com/1"), item("https://b.com/2")])).toMatchObject({ signal: "pass", capped: false, distinct_sources: 2 });
});
it("only pass is ever touched — hard_fail/flag/infer/soft_fail pass through untouched", () => {
  for (const s of ["hard_fail", "flag", "infer", "soft_fail", "n_a"] as const)
    expect(applySourceDiversityCap(s, [item("https://a.com/1")]).signal).toBe(s);
});
it("a pass built purely on inference (no URLs) caps — conservative edge", () => {
  expect(applySourceDiversityCap("pass", [item(null)]).signal).toBe("infer");
});
```
- [ ] **Step 2:** FAIL. **Step 3: implement:**
```ts
import type { TrackSignal, EvidenceItem } from "@/lib/research/contracts";
import { canonicalUrl } from "@/lib/research/canonicalUrl";

// H7 (SO-3) — the spec defines pass as "multiple independent sources confirm"; the scorer counted
// points, not sources (one registry page × 4 keys = 8 points = pass). ONE shared post-signal cap
// (H3 pattern rule: at EVERY site that derives a signal) downgrades a single-source pass to infer.
// deriveTrackSignal is FROZEN and untouched; only 'pass' is ever capped.
export interface DiversityCapResult { signal: TrackSignal; capped: boolean; cap_reason: string | null; distinct_sources: number }

export function applySourceDiversityCap(signal: TrackSignal, evidenceItems: Pick<EvidenceItem, "source_url">[]): DiversityCapResult {
  const distinct = new Set(evidenceItems.map((e) => canonicalUrl(e.source_url ?? null)).filter((k): k is string => !!k)).size;
  if (signal !== "pass" || distinct >= 2) return { signal, capped: false, cap_reason: null, distinct_sources: distinct };
  return {
    signal: "infer", capped: true, distinct_sources: distinct,
    cap_reason: `pass requires >=2 distinct sources; applied evidence cites ${distinct}`,
  };
}
```
- [ ] **Step 4:** PASS. **Step 5: apply at ALL THREE sites.** `stageFindingTrack` (the authoritative row): after `const sig = deriveTrackSignal(...)`:
```ts
  const div = applySourceDiversityCap(sig.signal, out.evidence_items);
```
row fields change: `track_verdict_signal: div.signal`, and `compiled_findings_json` gains `source_diversity: { capped: div.capped, cap_reason: div.cap_reason, distinct_sources: div.distinct_sources }` (signal field inside compiled_findings also uses `div.signal`). `track1.ts:110-111` + track2's mirror: `const derived_signal = applySourceDiversityCap(deriveTrackSignal(...).signal, evidence_items).signal;` so the validation REPORT can never disagree with the row. Extend `pipeline.steps.test.ts` with a cap-integration test (mock track output: 4 same-URL items scoring ≥8 → persisted row signal `infer`, `source_diversity.capped: true`).
- [ ] **Step 6:** full suite PASS. **Step 7: commit** `H7 (Task 3): source-diversity pass-cap - one shared fn at every signal site (SO-3); single-source pass is dead`

### Task 4: hard-fail consensus gate (SO-4)

**Files:** Create: `lib/research/hardFailConsensus.ts`, `lib/research/hardFailConsensus.test.ts` · Modify: `lib/research/contracts.ts:166-170` (additive union members), `lib/research/track1.ts:61-107`, `lib/research/track2.ts` (mirror), their tests

- [ ] **Step 1: failing tests** (the pure reconciler):
```ts
import { it, expect } from "vitest";
import { reconcileHardFailConsensus } from "./hardFailConsensus";

it("a hard-fail key proposed in BOTH passes survives", () => {
  const r = reconcileHardFailConsensus(["registration_fabricated"], ["registration_fabricated", "government_registration"]);
  expect(r).toEqual({ confirmed: ["registration_fabricated"], dropped: [], second_call_failed: false });
});
it("a pass-1-only hard-fail key is dropped (extraction variance made visible)", () => {
  const r = reconcileHardFailConsensus(["scam_reports_corroborated"], ["negative_reputation"]);
  expect(r.dropped).toEqual(["scam_reports_corroborated"]);
});
it("OQ-A: second call failed (null) → keys KEPT + second_call_failed flag (caller escalates)", () => {
  const r = reconcileHardFailConsensus(["website_fraudulent"], null);
  expect(r).toEqual({ confirmed: ["website_fraudulent"], dropped: [], second_call_failed: true });
});
```
- [ ] **Step 2:** FAIL. **Step 3: implement:**
```ts
// H7 (SO-4) — the highest-stakes keys must survive TWO independent extraction passes over the SAME
// frozen pack before they can veto. Pure reconciler: deterministic given the two outputs. On a
// failed second call we cannot confirm OR deny — keys are KEPT and the caller escalates to manual
// review (OQ-A: fail toward caution + human, never silently drop a possible fraud signal).
export interface ConsensusOutcome { confirmed: string[]; dropped: string[]; second_call_failed: boolean }

export function reconcileHardFailConsensus(hardFailKeys: string[], secondPassProposedKeys: string[] | null): ConsensusOutcome {
  if (secondPassProposedKeys === null) return { confirmed: [...hardFailKeys], dropped: [], second_call_failed: true };
  const second = new Set(secondPassProposedKeys);
  return {
    confirmed: hardFailKeys.filter((k) => second.has(k)),
    dropped: hardFailKeys.filter((k) => !second.has(k)),
    second_call_failed: false,
  };
}
```
- [ ] **Step 4:** contracts.ts — additive only: `RejectionReason` + `"consensus"`, `ValidationGate` + `"consensus"` (comment: `H7 SO-4 — hard-fail dropped for lack of two-pass extraction consensus`). `TrackOutput` gains optional `hard_fail_consensus?: { checked: string[]; dropped: string[]; second_call_failed: boolean }`.
- [ ] **Step 5:** wire into `runTrack1` (and mirror in `runTrack2`) after `validateWeights`:
```ts
  // H7 (SO-4) — hard-fail consensus: any validated hard-fail key triggers ONE re-extraction over
  // the same frozen pack; the key vetoes only if both passes proposed it.
  const validatedHardFails = validations
    .filter((v) => v.validated_weight_key && weightFor("supplier_identity", v.validated_weight_key)?.hard_fail)
    .map((v) => v.validated_weight_key as string);
  let consensus: ConsensusOutcome | null = null;
  if (validatedHardFails.length > 0 && !llmFailed) {
    let secondKeys: string[] | null = null;
    try {
      const second = await runModel({ task: "track", system, user, temperature: 0 });
      const secondParsed = parseTrack1Output(second.json);
      secondKeys = secondParsed.parse_failed ? null : secondParsed.items.map((it) => it.proposed_weight_key);
      llmCost += second.cost_usd;
    } catch { secondKeys = null; }
    consensus = reconcileHardFailConsensus([...new Set(validatedHardFails)], secondKeys);
  }
```
Then: items whose validated key is in `consensus.dropped` are removed from `evidence_items`/`accepted` and re-recorded in the audit as `rec(evidence_id, key, null, "consensus", "consensus")` (mutate the `validations` entry before the report is built so the audit trail shows the drop); `out.hard_fail_consensus = consensus ?? undefined` rides into `compiled_findings_json` via `stageFindingTrack` (add `hard_fail_consensus: out.hard_fail_consensus ?? null` to the persisted json). `second_call_failed === true` → the persisted row gets `manual_review_required: true, manual_review_reason: "hard-fail consensus call failed — veto kept, human confirms"` (per OQ-A; wire through `stageFindingTrack`'s scored path as a conditional).
- [ ] **Step 6:** integration tests in `track1.test.ts` (mock `runModel` twice; assert dropped key absent from evidence_items, present in audit with gate consensus; assert failure path flags review). Full suite PASS. **Step 7: commit** `H7 (Task 4): hard-fail consensus gate - two-pass extraction agreement required for veto keys (SO-4, OQ-A/B)`

### Task 5: structured outputs, capability-guarded (OQ-C)

**Files:** Modify: `lib/ai/runModel.ts` (pass schema through), `lib/ai/providers/anthropic.ts:30-56` · Create: `lib/research/schemas/track1.schema.ts`, `lib/research/schemas/track2.schema.ts`, `lib/ai/providers/anthropic.test.ts`, `scripts/check-structured-outputs.ts` · Modify: `lib/research/track1.ts:64` + track2 mirror (pass schema)

- [ ] **Step 1: failing tests** (mock the Anthropic SDK client):
```ts
it("sends output_config.format when a schema is provided", async () => { /* assert create called with output_config: { format: { type: "json_schema", schema } } */ });
it("OQ-C fallback: a 400 naming output_config retries ONCE without the schema", async () => { /* first create throws BadRequest('output_config…'), second succeeds → result returned, schema_fallback flag true */ });
it("no schema → no output_config (byte-identical to today's request)", async () => { /* ... */ });
```
- [ ] **Step 2:** FAIL. **Step 3: implement** in `runAnthropic`:
```ts
  const baseParams = {
    model: input.model, max_tokens: 8000, temperature: input.temperature ?? 0,
    system: input.system, messages: [{ role: "user" as const, content: input.user }],
    ...(tools.length ? { tools } : {}),
  };
  let res;
  let schemaFallback = false;
  try {
    res = await client.messages.create({
      ...baseParams,
      // H7 (OQ-C) — structured outputs: the model is CONSTRAINED to the parse target's schema, so
      // truncation/prose/fence parse failures stop happening at the source.
      ...(input.schema ? { output_config: { format: { type: "json_schema" as const, schema: input.schema } } } : {}),
    });
  } catch (e) {
    // OQ-C fail-open: if the pinned model rejects output_config (capability), fall back to the
    // tolerant-parse path — parseModelJson stays forever (scanner-stays-forever pattern); the H2
    // llm_failed guard remains the backstop. Any other error rethrows (H2 handles it upstream).
    const msg = e instanceof Error ? e.message : "";
    if (!input.schema || !/output_config|output_format|json_schema/i.test(msg)) throw e;
    schemaFallback = true;
    res = await client.messages.create(baseParams);
  }
```
(rest of the fn unchanged; `parseModelJson` still parses the text — schema-conforming output parses trivially). `runModel` already carries `schema` in its input type — it just spreads through (verify no strip). Schemas (mirror the parse targets exactly; every object `additionalProperties: false`, no min/max constraints per API limits):
```ts
// lib/research/schemas/track1.schema.ts — mirrors ParsedTrack1/parseTrack1Output's expected shape.
export const TRACK1_OUTPUT_SCHEMA = {
  type: "object", additionalProperties: false,
  required: ["evidence_items", "reasoning_notes", "unknowns"],
  properties: {
    evidence_items: { type: "array", items: {
      type: "object", additionalProperties: false,
      required: ["evidence_id", "statement", "proposed_weight_key", "supporting_source_ids", "mapping_justification", "counter_evidence", "certainty", "confidence"],
      properties: {
        evidence_id: { type: "string" }, statement: { type: "string" },
        proposed_weight_key: { type: "string" },
        supporting_source_ids: { type: "array", items: { type: "string" } },
        mapping_justification: { type: "string" }, counter_evidence: { type: "string" },
        certainty: { type: "string", enum: ["verified", "inferred", "unknown"] },
        confidence: { type: "string", enum: ["low", "medium", "high"] },
      },
    } },
    reasoning_notes: { type: "string" },
    unknowns: { type: "array", items: {
      type: "object", additionalProperties: false,
      required: ["unknown", "why_unresolvable", "resolvable_by_client"],
      properties: { unknown: { type: "string" }, why_unresolvable: { type: "string" }, resolvable_by_client: { type: "boolean" } },
    } },
  },
} as const;
```
*(Executor: verify field-for-field against `parseTrack1Output` before committing — the schema must be a superset-safe mirror of what the parser reads; same exercise for track2's parse target incl. questions_to_ask/auth_level fields.)* Track call sites: `runModel({ task: "track", system, user, temperature: 0, schema: TRACK1_OUTPUT_SCHEMA })` (both passes in Task 4's consensus call too). Track 0.5/synthesis: NOT in scope (0.5 is frozen; synthesis schema lands with the S-phase).
- [ ] **Step 4:** `scripts/check-structured-outputs.ts` (founder-run, ~$0.001): one tiny schema'd call via `runModel`; prints `SUPPORTED` / `FALLBACK` per AT-5.
- [ ] **Step 5:** full suite + build PASS. **Step 6: commit** `H7 (Task 5): structured outputs wired, capability-guarded with tolerant-parse fallback (OQ-C) - parse-failure class dies at the source`

### Task 6: the replay seam (OQ-D)

**Files:** Modify: `lib/research/contracts.ts:69-78` (TrackContext + `replay_from_attempt?: number`), `lib/data/acquisition.ts` (add `getEvidencePack(caseId, trackKey, attempt)`), `lib/research/track1.ts:20-29` + track2 mirror (replay branch), `lib/research/pipeline.ts:32-34` (identity reuse in replay) · Create: `scripts/replay-attempt.ts` · Tests: extend `pipeline.steps.test.ts` / track tests

- [ ] **Step 1: failing tests:** track1 with `replay_from_attempt: 2` calls `getEvidencePack` (mocked) instead of `orchestrator.gather`, persists the loaded pack under the NEW attempt (same hash), and never touches the orchestrator; `runPipeline` in replay mode uses the case's stored `supplier_identity` instead of `stageResolveIdentity`.
- [ ] **Step 2:** FAIL. **Step 3: implement.** `lib/data/acquisition.ts`:
```ts
// H7 (OQ-D) — replay reads the frozen input-of-record: the stored pack for a given attempt.
export async function getEvidencePack(caseId: string, trackKey: TrackKey, attempt: number): Promise<{ pack: EvidencePack | null; error: string | null }>
```
(select from `case_evidence_packs` by (case_id, track_key, attempt_number), return the stored pack json as-is — whatever schema_version it carries.) `runTrack1` top:
```ts
  // H7 (OQ-D) — REPLAY: judge the frozen record again. Same evidence in; extraction → firewall →
  // signals run fresh; the result lands as a genuine NEW attempt (H1 semantics unchanged).
  let pack: EvidencePack; let metrics: AcquisitionMetric[] = [];
  if (ctx.replay_from_attempt) {
    const stored = await getEvidencePack(ctx.case_id, "supplier_identity", ctx.replay_from_attempt);
    if (stored.error || !stored.pack) throw new Error(`replay: stored pack missing for attempt ${ctx.replay_from_attempt}: ${stored.error ?? "no row"}`);
    pack = stored.pack;
  } else {
    ({ pack, metrics } = await orchestrator.gather({ ... }));   // existing path, unchanged
  }
```
(then the existing `persistEvidencePack(pack, ctx.attempt_number ?? 1)` freezes the SAME evidence under the new attempt — identical `evidence_hash` is AT-6's proof; metrics persist skipped when replaying.) `runPipeline`: when `base.replay_from_attempt`, load `cases.supplier_identity` and use it instead of `stageResolveIdentity` (live identity research skipped — the identity IS part of the frozen record being replayed); memory-write still fires (a replay attempt is a real attempt; the ledger records it; rollups dedupe by case — H6). `scripts/replay-attempt.ts` (founder-run): args `<case-id> <attempt>`; preflight env; audit_log row `{ replay_of_attempt: N }`; call `runPipeline({ ...storedCtx, replay_from_attempt: N })`; print stored-verdict vs new-verdict diff + per-track signal diff (read both attempts' rows).
- [ ] **Step 4:** full suite PASS. **Step 5: commit** `H7 (Task 6): the replay seam - judge frozen evidence again as a real attempt (OQ-D); I1's foundation`

### Task 7: Track 3/4 firewall-registry gate, codified (spec H7.5)

**Files:** Modify: `lib/research/weightValidation.ts` (export the two config consts — no logic change) · Create: `lib/research/firewallRegistry.test.ts`

- [ ] **Step 1: the lock** (failing first if any current key is uncovered — expected to pass immediately for tracks 1/2; its JOB is to fail the moment Track 3/4 keys enter `weights.ts` without firewall entries):
```ts
import { it, expect } from "vitest";
import { ALLOWED_PROFILES, MIN_AUTHORITY } from "./weightValidation";
import { ALL_WEIGHT_KEYS } from "./weights"; // executor: use/add the registry-enumeration export weights.ts already has or trivially exposes (additive export only — scoring untouched)

// H7 (spec H7.5) — the pre-freeze gate for Track 3/4, as CODE: a track cannot ship weight keys the
// firewall doesn't know. Pre-H7 this was a plan bullet; now it's a failing test. When this fails on
// a Track 3/4 build: author ALLOWED_PROFILES + MIN_AUTHORITY entries + run the ADR-T1-001 collision
// audit BEFORE freeze — that is the ruled gate, not a chore to silence.
it("every registered weight key has firewall provenance + authority coverage", () => {
  for (const key of ALL_WEIGHT_KEYS) {
    expect(ALLOWED_PROFILES[key], `ALLOWED_PROFILES missing: ${key}`).toBeDefined();
    expect(MIN_AUTHORITY[key], `MIN_AUTHORITY missing: ${key}`).toBeDefined();
  }
});
```
- [ ] **Step 2:** export the consts (`export const ALLOWED_PROFILES…` — export-only diff) + whatever key-enumeration export `weights.ts` needs (additive). If the lock exposes an EXISTING uncovered track-1/2 key: STOP and surface to founder (that's a real finding, not a test to weaken). **Step 3:** PASS. **Step 4: commit** `H7 (Task 7): firewall-registry coverage lock - Track 3/4 pre-freeze gate is now a failing test, not a memo`

### Task 8: version stamp, full verify, docs, push

- [ ] **Step 1:** bump `PIPELINE_VERSION` (`lib/research/pipeline.registry.ts`) with an H7 changelog comment.
- [ ] **Step 2:** `npx tsc --noEmit && npx eslint . && npx vitest run && npx next build` → ALL green.
- [ ] **Step 3:** tracker H7 line (BUILT, founder sequence: deploy → ATs 1–7; deferred-live register) + handover note.
- [ ] **Step 4:** `git push origin staging`. **STOP — founder runs ATs 1–7 → declares H7 FROZEN → Track 3 gate opens (registry lock + ADR-T1-001 audit are its entry conditions).**

---

## Self-review (against the tracker's H7 scope line)

URL dedupe ✓ Task 1 · corroboration breadth (+address_fraudulent) ✓ Task 2 · source-diversity pass-cap ✓ Task 3 · hard-fail consensus gate ✓ Task 4 · LLM-replay seam ✓ Task 6 · structured outputs ✓ Task 5 · Track 3/4 firewall registry + ADR-T1-001 collision audit as pre-freeze gate ✓ Task 7 (codified as a lock; the audit itself runs during the Track 3 build, per spec H7.5). Type consistency: `canonicalUrl` (Task 1) consumed by Task 3; `ConsensusOutcome` (Task 4) shape matches its integration; `DiversityCapResult` fields match the persisted `source_diversity` json; `replay_from_attempt` named identically in contracts/tracks/script. Cost note: consensus +1 Sonnet call only on hard-fail runs; replay ≈ extraction-only. No migration; PIPELINE_VERSION + VALIDATION_VERSION + pack version all bump deliberately with changelog comments.
