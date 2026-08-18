# HANDOVER — 2026-08-18 → next session

**Read cold. Nothing here is to be taken on trust:** every number was verified today and is
re-checkable. If your reading of the code or the data disagrees with this file, **the file is
wrong** — say so with evidence. That has happened repeatedly this week and it is how the real
defects were found.

**Branch** `staging`, working tree clean except the founder's untracked folders.
**Gates at handover:** 1430/1430 · tsc 0 · eslint 0.
**SSOT tracker:** `docs/HyprrIQ_OPEN_ITEMS.md` — read the top dated blocks first; they carry every
ruling in full. This file is the *pointer*, the tracker is the record.

---

## 0 · THE LIVE POSITION

**Growth works end to end.** AWI-2608-033 published 2026-08-17: submit → research → review →
publish → email, on a live case.

**AWI-2608-034 (Scale) is BLOCKED** on one word — `"corroborated"` in
`decision_snapshot.leading_interpretation`, caught by the derivation-rule scanner. Scale is
therefore **unproven end to end**: one case, blocked.

**🔴 P0 LIVE ON A CLIENT ACCOUNT:** delivered 034 renders internal tokens. Not one case —
**19 of 35 cases (54%) carry `src_N` in their PROJECTED client payload**, 169 occurrences.

---

## 1 · THE WORK ORDER (founder-set, this is the queue)

| § | Work | Status |
|---|---|---|
| 1 | Token leaks + presence checkpoint | **NEXT.** Fully specified, unblocked |
| 2 | Track 6 client surface + area count + category scanner | Specified, unblocked |
| 5 | Client name from Stripe | Specified, small — **blocks §4** |
| 3 | Presentation pass | Needs the approved prototype |
| 4 | PDF | **UNBLOCKED — see §4 below** |

---

## 2 · §1 — THE FOUR LEAK CLASSES (corpus-measured, NOT from one case)

**This is the session's methodological correction.** The founder's words: *"you always fix things
keeping that one case in mind rather than the overall product."* He was right — the cleaner was
diagnosed from 034's single sentence. A corpus sweep over all 35 projected payloads then found four
classes and a shape no hand-written fixture set would have contained.

### Class 1 · `src_N` — 19/35 cases, 169 occurrences, FIVE grammar shapes

| Shape | Count | Cases |
|---|---|---|
| after punctuation, mid-sentence | 73 | 15 |
| SENTENCE-INITIAL subject | 28 | 11 |
| bare inline | 27 | 12 |
| after connector word (`and`/`see`/`sources`) | 25 | 11 |
| parenthesised — **the only one stripped today** | 16 | 6 |

**Plus `src_3–src_6` — an en-dash RANGE.** Not in the six shapes designed by hand. The corpus found
it. **This is the whole argument for corpus-derived fixtures.**

### Class 2 · UUID + `stub track_N` — 19 cases
Form: `"stub track_3 for case 7e2bd898-59d2-4e81-…"`. Dev-era stub rows, so the population is old
cases — but they render verbatim if published.

### Class 3 · `"dimension"` — 21 occurrences
e.g. *"no documents were provided for review — dimension excluded from scoring"*. **Retired
vocabulary**: the area-claims ruling replaced "dimension" with "assessment area" in all public copy.
`substituteInternalDimensionNames` replaces dimension *names*, not the bare word.

### Class 4 · `weight key` / `weight_key` — 6 occurrences IN TRACK PROSE
**A gate-coverage hole, same shape as everything else this week:**

| Scanner | Track prose | Synthesis |
|---|---|---|
| Banned language | ✅ | ✅ |
| Derivation/method | ❌ | ✅ |

`scanForMethodLeakage` already matches `weight[_\s]?key` — it simply never looks at track findings.

### ⚠ TWO RULINGS PENDING — ASK BEFORE BUILDING
- **(a)** Does the method scanner extend to track prose? (Coverage extension, not a rule change or
  bypass. It **will move the merged census number**, so it needs the founder's word.)
  Claude's read: yes, same commit.
- **(b)** `"dimension"` — cleaner or checkpoint? Claude's read: **cleaner** (substitute, preserve
  grammar). A checkpoint refusal should mean "something internal escaped", not "we used last
  month's word" — refusing a publish over vocabulary is the false-refusal failure mode.

### The rest of §1, already ruled (full text in the tracker)
Cleaner fix = **token-level strip + sentence-level drop + widen `dropSourceDisposalSentences`** —
NOT a wider regex alone; **grammar must survive the strip**. Fixtures **derived from the corpus**,
one per real shape, plus 034's delivered text as regression. **Render-path inventory is PART of the
fix** — the cleaner defect explains the leak but does not rule out a second uncleaned route.

**The presence checkpoint** — placement is counter-intuitive and is the thing most likely to be got
wrong: **it scans PROJECTED, not raw.** Raw legitimately carries `src_N` by founder ruling (the
operator's source-checking leverage), so built on the raw side it refuses every case on day one.
Bindings: tail of `cleanClientFindingJson` + `projectClientReport`; the publish gate over the
assembled projected payload; PDF render; email assembly. **Plus a lock test: no client-facing render
path may read raw track rows.** Anchor `EV-\d{3}` exactly; **drop bare `E-\d+`** (collides with real
product model numbers — a false refusal at publish is the worst failure a backstop can have).
`client_notes` in scope. `review_additions` URL-valued fields excluded before Part B ships.

**⛔ WRITE BOTH LAWS INTO THE CODE:** the cleaners are SHAPE-based and may always miss; the
checkpoint is PRESENCE-based and **may never be widened into a shape matcher.**

---

## 3 · §3 — PRESENTATION: DIAGNOSED, NOT FIXED

**Blocked on the approved prototype.** Guessing at column widths is the exact case-by-case habit the
founder called out. Diagnosis for whoever has the prototype:

- **Finding-card blank space** — `max-w-[68ch]` on finding bodies (`report-view.tsx:106`) inside a
  ~940px card: text wraps at ~460px, the right half is empty. **68ch is a deliberate, good measure —
  the defect is the card being much wider than it, not the measure. Do not just widen it.**
- **Summary/areas dead space** — `report-view.tsx:202` is `md:grid-cols-2`; Summary carries a long
  block, the areas box is six short rows, so the row is badly unbalanced. **Materially worsened by
  the concatenation bug below** — fix that first and re-look before changing the grid.
- **Concatenation** — *"…in the current evidence record. **— subject to verification of** The most
  concentrated doubt lands on…"*. This is **not two fields joined**: `"— subject to verification of"`
  is a connector expecting a list that rendered EMPTY, then the next field ran on with no separator.
  Two bugs stacked: an unguarded connector, and a missing separator. **Trace the composition and name
  the fields before fixing** (founder's instruction).
- **✅ DONE:** vendor website renders in the identity block (`cd95e6e`) — only when supplied, and
  deliberately NOT a link (the client typed it; we never verified it; an anchor implies we vouched
  for the destination).

---

## 4 · §4 — PDF IS UNBLOCKED (discovered at handover)

**The final design is already in the tree**, untracked. This retires the blocking question that was
open all session.

- **`docs/PDF_INTEGRATION_HANDOFF.md`** — the design lane's handoff. **READ IT FIRST.**
- **`lib/pdf/renderReportPdf.ts`** → `renderCaseReportPdf({ case })` — the entry point
- `lib/pdf/reportTemplate.ts` (pure), `lib/pdf/reportAssets.ts`, `lib/pdf/fonts/`
- **Superseded, do NOT build on:** `scripts/pdf/report-document.tsx`, `generate-samples.tsx`,
  `print-sample.tsx` (react-pdf era)
- Verification for CI: `scripts/pdf/verify-report.ts`

Contract: returns `{ pdf, html, pageCount, content }`; throws `ReportNotRenderable` with
`not_found` · `not_delivered` · `no_snapshot` · **`no_client_name`** — all four **loud by design,
never catch-and-default into a blank PDF**. Deterministic, and it reads the **delivered** attempt,
never the latest (H1).

**`no_client_name` is why §5 blocks §4** — capture the Stripe name first.

Ruled build shape: generate at publish **after `checkDeliverable`**, retriable background job; store
to the `reports` bucket (**verify it is PRIVATE first — if public, STOP, that is a P0**); short-lived
signed URL re-issued per click; ownership + delivered-state check on the download route; retire
"coming soon"; attach to the delivery email; `review_additions` renders; count-derivation debt
returns here; **the presence checkpoint binds here too.**

**⚠ STILL UNRULED — the email/render sequencing.** "Never block a publish" and "attach to the
delivery email" pull against each other. Claude's recommendation: publish completes immediately →
render job → email sends **with** attachment when the render finishes; if the render fails
permanently after retries, the email goes **without** it. This changes the delivery email from
synchronous-at-publish to job-driven, on a path hardened this week — **get the founder's word.**

---

## 5 · §5 — CLIENT NAME FROM STRIPE (~1h, blocks §4)

`s.customer_details?.name` is discarded at `app/api/webhooks/stripe/route.ts:132` while the email
beside it is kept. `clients.full_name` is written in exactly ONE place
(`app/api/onboarding/complete/route.ts:23`), so a client who skips onboarding has no name though
Stripe collected it. **Capture ABOVE the three-way branch** (topup / subscription / one-time) or two
of three paths miss it. **SET-IF-NULL ONLY** — Stripe's is a billing name, the onboarding one is what
they want to be called. Same for `company_name`.

---

## 6 · MECHANICS THE NEXT SESSION CANNOT GUESS

- **Founder-script invocation:** `npx tsx --conditions=react-server --tsconfig tsconfig.json --env-file=.env.local <script>`
- **`.env.local` IS NOT PRODUCTION.** Claude asserted production env state from it **three times**
  this week and was wrong every time. Emails work and have for days. **If env state matters, say it
  cannot be verified locally and ask.**
- **Supabase `list_migrations` returns EMPTY** — migrations were applied by hand. It proves nothing;
  inspect the schema directly. That is how the `20260812` "unrun" ghost survived three handovers.
- **`scripts/gate-census.ts` is now the MERGED instrument** — language + derivation, composed exactly
  as the publish route composes it. A third scanner outside it re-creates the defect the merge fixed.
- **⚠ CHECK THE INDEX BEFORE COMMITTING.** `cd95e6e` swept in 15 files that were pre-staged before
  the session (PDF font moves, sample renames). Explicit-path `git add` does **not** protect against
  an already-dirty index. Read the staged column of `git status --porcelain` first.
- Never `git add -A`. LF→CRLF warnings are normal. Verify UTF-8 with `git grep "Â"` after writes.
- **Bash heredocs break on this content** (backticks in `-m`, nested quotes). Write files with the
  Write tool and commit with `git commit -F <file>`.
- Frozen surfaces: engine, tracks, synthesis, verdict engine, category gate. The banned-language gate
  is editable **only** under explicit founder ruling, two-sided fixtures mandatory.

---

## 7 · THE TWO STANDING RULES EARNED THIS WEEK

1. **A fixture that only carries the shape the rule was written for proves nothing about the shapes
   it wasn't.** The token leak and the census undercount are the same failure: *the instrument only
   saw what it was built to see.* **Every new cleaner or scanner ships with fixtures covering shapes
   the author did NOT have in mind.** That is the acceptance bar.
2. **An incomplete attempt suppresses the census.** Empty records scan clean, so stubs make the
   corpus look safer than it is. Read any census run **together with** the incomplete-attempt sweep —
   a falling number with rising stubs is false comfort.

---

## 8 · ALSO OPEN (on the board, not in the queue)

Self-correcting loop + operator attachments (plan:
`docs/superpowers/plans/2026-08-17-self-correcting-prose-and-review-additions.md`, **Task 0 = the
three-class prose pass, before the loop**) · `replay-attempt.ts` preflight (those June/July Growth
attempts store only 2 packs, so they can NEVER be replayed — only re-run live) · the Opus price row
(`PRICES` has ONE entry; the ruled synthesis flip reports $0 until it moves) · nothing pushes (3
cases sit in `research_failed`; v2 dependency for removing the operator) · **the full end-to-end
audit — `docs/AUDIT_BRIEF_2026-08-17.md`, own fresh session, fanned out per stage.**
