# H5 — Client Surface Implementation Plan (payload gating + banned-language closure)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** DRAFT — founder-review artifact. **No code until approved** (same gate as H1–H4, all FROZEN).
**Phase:** H5 ONLY. No corpus work (H6), no firewall work (H7), no prompt-philosophy work.

**Goal:** nothing a client's browser receives has bypassed the gates — findings ship server-side only after delivery, every client-visible string passes compliance, and the compliance gate stops being an accidental total-block so the **first clean publish** becomes possible (closing H1's pin-write caveat in the same motion).

**Defects being fixed (audit N4 + logged gaps):**
1. `getCaseFindings` (`lib/data/cases.ts:115-135`) ships `compiled_findings_json`, `ai_output_json`, `manual_notes` into the `"use client"` CaseDetailView at EVERY status — the `findingsVisibleToClient` guard is render-only, so pre-review findings are in the browser payload (DevTools-visible). `ai_output_json` is currently NULL in prod (latent), `compiled_findings_json` is populated (active leak), `manual_notes` is internal.
2. The banned-language gate scans only `compiled_findings_json` (`app/api/admin/cases/[id]/review/route.ts:74-75`) — `questions_to_ask` (separate column) and the Spec-B `client_note` (in `cases.supplier_identity`) are never scanned; the regex list misses "fully legitimate", "brand approved", "approved seller" (`lib/utils/banned-language.ts:5-15`).
3. **The gate conflates HyprrIQ's own assertions with evidence description** — the deeper problem, and the reason every AI case currently blocks (your logged H5 item): "authorized distributor" is simultaneously banned vocabulary AND the product's core evidence domain. Track 2's whole job is reporting that a dealer page lists the vendor. As written, no AI case can EVER publish cleanly, which makes full automation impossible and leaves H1's pin-write caveat permanently open.

**Frozen-core guarantee:** verdict math, firewall, ledger, failure taxonomy, identity — untouched. H5 touches only the data layer, the scanner, the delivery route, and two components.

**Migration: NONE.**

---

## OQ-1 — the scanner's two voices (the one real decision in H5)

The master spec's banned list exists so HyprrIQ never **asserts or promises** status ("authorized seller", "guaranteed safe"). But an intelligence report must **describe evidence** ("Lenovo's official dealer locator lists TD Synnex as an authorized distributor") and **ask vendor questions** ("Are you an authorized distributor for Lenovo?" — the master spec's own example questions use this vocabulary). One flat regex list cannot serve both voices — hence today's total block.

**Proposed two-tier model (recommend):**
- **HARD tier — blocks delivery, every client-visible string, no exceptions:** `ungat*`, `guarantee*`, `account safe`, `amazon approv*`, `affiliated with amazon/walmart/ebay/shopify`, `fully legitimate`, `risk-free`. These are promises/affiliations that are never acceptable even inside quoted evidence.
- **ASSERTION tier — context-dependent:** `authorized seller/reseller/distributor`, `official distributor`, `safe/approved/verified/recommended supplier`, `brand approved`, `approved seller`.
  - In **HyprrIQ's own decision-layer strings** (verdict rationale, ceiling reason, boundary notes, future decision_snapshot/headline — all code-templated today): **blocks**. Nearly free — we author these strings.
  - In **LLM narrative + evidence + question fields** (summaries, `brand_relationship_finding`, evidence statements, `questions_to_ask`): **non-blocking review ADVISORY** surfaced to the admin before publish (same pattern as the existing ADR-T2-002 procurement-language advisory), plus a prompt-level attribution guard ("attribute authorization language to its source — never state it as HyprrIQ's own conclusion") in the tracks' system prompts.

Why not keep blocking everything: full automation + a gate that trips on the product's own subject matter = zero deliveries, forever. Why not field-scoped hard-blocking of the assertion tier in narratives: regex cannot distinguish "X **is** an authorized distributor" (assertion) from "the dealer locator **lists X as** an authorized distributor" (descriptive-attributed) — hard-blocking would just recreate the total block; the advisory + prompt guard + your publish click is the honest enforcement chain for LLM prose.

**OQ-2 (small, confirm):** the Spec-B pre-delivery client banner (`identity_discrepancy.client_note`) stays pre-delivery — it is deliberate confirmation UX, code-templated. H5 adds: the templates unit-locked against the HARD tier, and the stored `client_note` included in the delivery-time hard scan (belt-and-braces; interpolated vendor names are the client's own input echoed back).

---

## ACCEPTANCE TESTS (defined up front — founder validates before H5 freezes)

**AT-1 — the payload leak is closed.** Open a NON-delivered case in the portal as the test client with DevTools → Network: the page/RSC payload contains **no findings content** (empty findings array; the Spec-B banner and dimension statuses still render). Open the delivered Morendelli case: findings present. The gate moved from render to data.

**AT-2 — THE FIRST CLEAN PUBLISH (closes H1's pin-write caveat).** Pick a fresh post-H3/H4 attempt case (candidate: `2b359a6a` TD Synnex, DB-verified), review it in admin — assertion-tier advisories visible but non-blocking — and click Publish. PASS = publish succeeds through the HARD gate; then:
```sql
SELECT status, delivered_at, delivered_attempt, reinvestigation_pending
FROM cases WHERE id = '2b359a6a-98f9-49c9-8f57-c19f4d8daaac';
```
`delivered_attempt` = the reviewed attempt **written by the publish path** (H1's caveat validated live at last), `reinvestigation_pending = false`; and the client page now shows the findings, the H3 "did not assess" note, and the verdict with ceiling reason where applicable. If the hard gate blocks: the violations list names real hard-tier content — that's a correct block, we assess and pick another case.

**AT-3 — the hard tier still bites.** Attempt to publish a case whose findings contain a hard-tier phrase → 422 with the violations named. Fixture selected by DB (the rule): I'll hand you a `SELECT … WHERE compiled_findings_json::text ILIKE '%guarantee%'` at validation time; if no live case qualifies, the unit suite's hard-tier lock stands and the live half is logged residual.

---

## TASKS (execute after founder approves OQ-1/OQ-2)

### Task 1: the data gate — findings never leave the server pre-delivery

**Files:** Modify: `lib/data/cases.ts:100-135` (Finding type + getCaseFindings), `components/portal/case-detail-view.tsx:57` (drop the ai_output_json fallback) · Test: extend `lib/portal/case-status.test.ts` pattern or create `lib/data/cases.test.ts`

- [ ] **Step 1: failing test** — `getCaseFindings` returns `[]` for a non-delivered case regardless of rows; SELECT string contains neither `ai_output_json` nor `manual_notes`; delivered case returns rows filtered to `delivered_attempt` (H1 pin, already built — regression-locked here).
- [ ] **Step 2:** FAIL. **Step 3: implement** — `getCaseFindings`: ownership query already returns `delivered_attempt`; add `status` and return `[]` unless `findingsVisibleToClient(status)`; SELECT becomes `id, track, track_key, finding_certainty, confidence_band, compiled_findings_json, questions_to_ask, attempt_number` (drop `ai_output_json`, `manual_notes`); `Finding` type updated; `extractQuestions` in the component reads `compiled_findings_json` only. Render guard (`showFindings`) stays as belt-and-braces.
- [ ] **Step 4:** PASS. **Step 5:** Commit `H5: findings are server-gated by status — the payload leak is closed`.

### Task 2: scanner v2 — two tiers, closed gaps

**Files:** Modify: `lib/utils/banned-language.ts` (+ its test) — becomes:
```ts
export function scanHard(text: string): string[]            // hard tier — blocks
export function scanAssertion(text: string): string[]        // assertion tier — advisory in narratives, blocks in own-voice strings
export function scanFindingsForBannedLanguage(findings: unknown): string[]   // walks jsonb with the HARD tier (delivery gate)
export function assertionAdvisories(findings: unknown): string[]             // walks jsonb with the ASSERTION tier (admin advisory)
```
- [ ] **Step 1: failing tests** — hard list gains `fully legitimate`, `risk-free` (existing entries preserved: ungat/guarantee/account safe/amazon approv/affiliated-with); assertion list carries the authorization/status phrases + `brand approved`, `approved seller`; the attributed dealer-page sentence hard-scans CLEAN but raises an assertion advisory; `"guaranteed safe"` hard-blocks anywhere; websiteAnchor's `client_note` templates (all four discrepancy kinds) hard-scan clean (import and instantiate them in the test).
- [ ] **Step 2–4:** implement → PASS. **Step 5:** Commit `H5: two-tier scanner — promises always block; status-assertions advise in narrative, block in our own voice`.

### Task 3: the delivery gate covers every client-visible string

**Files:** Modify: `app/api/admin/cases/[id]/review/route.ts:73-82` · Test: route-adjacent unit via the scanner (route has no test harness; logic kept in lib)

- [ ] **Implement** — the publish/override path hard-scans: every row's `compiled_findings_json` (as today) **plus** every row's `questions_to_ask` **plus** `cases.supplier_identity.identity_discrepancy.client_note` (the case row is already fetched). Violations → 422 with the union list (unchanged shape). Assertion advisories are NOT computed here (they're pre-publish review material — Task 4), keeping the gate fast and deterministic.
- [ ] Full suite PASS. Commit `H5: delivery gate scans findings + questions + identity client_note (hard tier)`.

### Task 4: admin sees the assertion advisories before publishing

**Files:** Modify: `lib/research/verdictViewModel.ts` (compute `assertion_advisories: string[]` from the track rows' compiled findings + questions), `components/admin/case-review.tsx` (small amber list above the decision buttons: "Review wording before publish — status-assertion phrases found: …") · Test: extend `lib/research/verdictViewModel.test.ts`

- [ ] Failing test → implement → PASS. Commit `H5: assertion advisories surfaced to admin pre-publish (non-blocking)`.

### Task 5: the prompt attribution guard (the LLM half of OQ-1)

**Files:** Modify: `lib/research/track1.prompt.ts`, `lib/research/track2.prompt.ts` (one system line each) · Test: extend both prompt tests

- [ ] Add to both system prompts: `ATTRIBUTION: never state authorization/approval status as your own conclusion — always attribute it to its source ("the brand's dealer locator lists…", "the vendor claims…"). Words like "authorized distributor" may appear ONLY inside such attributed descriptions or vendor questions.` Tests assert the line's presence. Commit `H5: prompts attribute authorization language — never HyprrIQ's own voice`.

### Task 6: full verify + tracker + push

- [ ] `npx tsc --noEmit && npm run lint && npm test && npm run build` → all PASS.
- [ ] Update tracker: H5 → 🟡 built, pending AT-1/2/3; note AT-2 = H1 caveat closure.
- [ ] Commit + push `staging`.

---

## EXECUTION ORDER & FOUNDER GATES

1. Founder approves plan + OQ-1 (two-tier) + OQ-2 (banner stays pre-delivery, templates locked).
2. No migration. Tasks 1–6 TDD → push → deploy.
3. **Founder validates AT-1 (payload clean pre-delivery), AT-2 (first clean publish — H1 pin-write caveat closes), AT-3 (hard tier still blocks).**
4. H5 freezes → H6 (money & corpus) next; the H3 client "did not assess" note and H4 research-identity honesty get their first live client-facing showing via AT-2's delivered case.

## Notes & suggestions logged (per standing bug-check order)
- **Design note:** the two-tier model is the compliance mirror of H2's failure taxonomy — one flat list conflated two different things (promises vs. subject-matter vocabulary) exactly the way `soft_fail` once conflated "found nothing" with "couldn't look." Same cure: name the distinction, encode it.
- **Suggestion (Phase H, logged):** when the PDF layer ships, `scanFindingsForBannedLanguage` (hard tier) must run over the RENDERED document text too — template glue can juxtapose clean fragments into a banned phrase. Belongs in the Phase H template contract with the mandated disclaimer.
- **Suggestion (logged for the confirmation-loop item):** OQ-2's banner is the natural seam for the approved client-facing confirmation loop (design-round OQ-4: pause + no credit until confirmed) — when that item is picked up, the banner becomes its UI anchor.
- **Residual carried:** admin surfaces legitimately show everything (role-guarded routes; RLS backstop remains Phase I's test suite — unchanged by H5).
