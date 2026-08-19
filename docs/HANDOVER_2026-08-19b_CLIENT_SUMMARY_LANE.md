# HANDOVER — 2026-08-19 (second sitting) → next session

**Read cold.** Every number here was measured this sitting and is re-checkable with the command
given. If the code or the data disagrees with this file, **the file is wrong** — say so with
evidence. That has now happened four times this week and it is how every real defect was found.

**Branch** `staging`. **HEAD** `5478b78`. Working tree clean except the founder's untracked folders.
**Gates:** 1524/1524 · tsc 0 · eslint 0.
**SSOT tracker:** `docs/HyprrIQ_OPEN_ITEMS.md`, top dated blocks.

---

## 0 · WHY THIS SITTING STOPPED WHERE IT DID

The founder approved building `client_summary`, then §3 part 2, then §4 PDF, straight through.
**I ran out of context budget after the root-cause investigation and the P0 bucket check.** Nothing
was half-built: no prompt, no contract and no component was edited. Starting a frozen-surface
contract change I could not finish and verify would have been the worse outcome.

**The full design is below so the next session executes rather than re-derives it.**

## 1 · ✅ P0 CHECK CLEARED — the `reports` bucket is PRIVATE

    reports          public=false
    case-documents   public=false

⚠ **Measured against whatever `.env.local` points at, which is NOT production.** Claude has
asserted production env state from `.env.local` three times this week and was wrong every time.
**The founder must confirm the production bucket before §4 writes anything to it.**

## 2 · THE ROOT CAUSE — READ THIS BEFORE TOUCHING ANY CLEANER AGAIN

**`summary` IS `reasoning_notes`. Not derived from it — assigned from it.**

    lib/research/pipeline.steps.ts:247    summary: out.reasoning_notes,      ← the normal scored path
    lib/research/pipeline.steps.ts:131,148,191,211                            ← the four failure branches, same

`summary` is in `FINDING_CLIENT_ALLOWLIST`, so **the per-area summary every client has ever read is
the model's internal reasoning field, verbatim.** The client is reading the model's scratchpad.

This explains the whole recurring class in one line — the weight-key narration
(*"I cannot propose any weight key…"*), the corroboration vocabulary, the raw internal key names
(*"registration_fabricated is not warranted"*), the first-person voice. **Every strip, clean and
substitution built this week treated symptoms.** That is why it kept recurring.

## 3 · THE APPROVED BUILD — `client_summary` (founder-ruled, this sitting)

**The frozen rule protects the VERDICT — signals, weights, thresholds, vetoes. An added output
field the verdict never reads does not touch it.** That is the founder's ruling and the reason this
is buildable; keep the change inside that boundary and it stays true.

1. Add `client_summary` to the track output contract, across **all four** prompts
   (`lib/research/track{1,2,3,4}.prompt.ts` — parse interfaces at their tops, `Return STRICT JSON`
   lines near the bottom of each builder).
2. Prompt it as **plain reader-facing prose for a buyer**: no internal key names, no scoring
   narration, no first person, no evidence-quality commentary.
3. **`reasoning_notes` stays unchanged and internal.** ⛔ Do NOT discipline it to be client-safe —
   that degrades the operator's diagnostics to serve the client and is exactly why this class kept
   recurring.
4. Map the projection: `compiled_findings_json.summary` reads `client_summary`
   (`pipeline.steps.ts`, all five assignment sites above).
5. The vocabulary swap (corroboration voice, source-count thresholds) applies to `client_summary`
   ONLY — cheap there, and it is the only place it matters.
6. Bump `prompt_version`; it flows into the `ios_version` vector.
7. **Prove, don't assert:** signals and verdicts byte-identical on a replay, same acceptance bar as
   the 08-17 pass.

### ⚠ RECORD THIS IN THE TRACKER WITH THE REMEDY — founder-ordered, and it is the point
**After this pass the census stays near 44%. That is the EXPECTED OUTCOME, not a failed fix.**
A prompt change affects NEW ATTEMPTS ONLY; the census scans STORED prose, so the 13 currently
blocked cases keep their text. **The number measures stored history, not what the engine writes
tomorrow.** Anyone reading it cold will assume the fix failed — that conflation has bitten this
project twice. Corpus re-runs are ruled OUT (11 of the 13 are test cases nobody will read); what
matters is that the founder's three tier cases publish clean.

### The measured scope of the prose remedy (`scripts/track-prose-class-census.ts`)
Re-run: `npx tsx --conditions=react-server --tsconfig tsconfig.json --env-file=.env.local scripts/track-prose-class-census.ts`

| tier | class | cases | occ |
|---|---|---|---|
| DERIVATION (new, Class 4) | corroboration vocabulary | 11 | 14 |
| DERIVATION | firewall vocabulary | 5 | 6 |
| DERIVATION | source-count threshold | 1 | 1 |
| LANGUAGE (pre-existing) | confirms/certifies authorization | 4 | 5 |

11 cases are derivation-only · 2 blocked by both tiers · 2 language-only.
**Two remedies, not one:** corroboration + source-count are a vocabulary swap; firewall vocabulary
is the scratchpad problem `client_summary` fixes. A word-swap alone leaves those 5 blocked.

## 4 · §3 PART 2 — THE LAYOUT RE-LOOK (not started)

The headline run-on is fixed (`359a3c0`), so the summary is no longer inflated to ~2× its real
length — **look again before choosing any width.**
- Finding cards are much wider than the `max-w-[68ch]` measure (`report-view.tsx`, `FindingBody`),
  leaving the right half of every card empty. **The measure is right; the card is wrong.**
- The summary/areas grid (`md:grid-cols-2`) has dead space below the short column.
- Prototype: `public/prototype/**`.
- **Check all four tiers with RENDERED reports, not screenshots:** $99 (3 areas, no advisory row),
  Growth (5, none), $149 and Scale (5 + advisory row + category section). A grid that balances at
  one tier and breaks at another is not fixed.

## 5 · §4 PDF (not started) — full spec in `docs/PDF_INTEGRATION_HANDOFF.md`
Render at publish after `checkDeliverable`, retriable Inngest job beside `seedCaseOutcome`, loud on
failure, never blocking or delaying a delivery · immutable private storage keyed
`{client_id}/{case_number}-attempt-{delivered_attempt}.pdf`, never overwritten (H1) · authorized
route resolving ownership + delivered state, short-lived signed URL re-issued per click, never
enumerable · wire the button, retire "coming soon" (`report-view.tsx`, the "coming soon" string) ·
email sends WITH the attachment when the render finishes, WITHOUT it if the render permanently
fails · `review_additions` renders · the area count must DERIVE (use `isAssessmentArea`, already
built) · the presence checkpoint already binds at `renderReportPdf.ts` · ⛔ **never add
token-stripping to the template.**

**Also ruled:** lift the duplicated fixed display copy (verdict names, "what this level means", the
Verified/Assessed/Not-assessed definitions, checklist intro, category note, closing statement) out
of `report-view.tsx` and `lib/pdf/reportTemplate.ts` into `lib/content/`, imported by both.
⚠ **There are THREE copies of `AREA_NAMES` today** — `reviewView.ts:15`, `reportTemplate.ts:88`,
`report-view.tsx:58` — and I added the Track 6 entry to only the portal one this sitting, because
widening the drift inside §2 was worse than leaving it. **Fix all three in that refactor.**

## 6 · STOP CONDITIONS (founder-set, unchanged)
Migration or any write to existing data → describe and stop with exact SQL + read-backs · the
`reports` bucket public → stop · any frozen-surface change beyond the `client_summary` contract →
stop · **the corpus contradicting the brief → measure first, stop, and say so** (it has now done
this twice; both times the brief was wrong and the data was right) · anything changing what a
client is charged, promised or shown → stop.

## 7 · STANDING RULES
1. A named case is a test example, never the design input. Measure the corpus first; check every
   component at all four tiers before writing it.
2. Every new cleaner or scanner ships with fixtures covering shapes the author did NOT have in mind.
3. One instrument, one number — a gate and its census never measure different things.
4. **A per-case JSON flag cannot define a product claim.** (`non_voting` was inconsistent across
   `sourcing_logic` rows; the area count derives from the `TRACKS` registry instead.)
5. One section per commit. **Check the staged column first.**
