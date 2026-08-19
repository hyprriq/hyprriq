# HANDOVER — 2026-08-20 → next session

**Read cold. Nothing here is to be taken on trust.** Every number was measured and is re-checkable
with the command given. **If your reading of the code or the data disagrees with this file, THE
FILE IS WRONG** — say so with evidence. That has happened repeatedly and it is how every real
defect this week was found, including several of mine.

**Branch** `staging`. **HEAD** `83c51cb`. **⚠ ONE COMMIT UNPUSHED** (`83c51cb`, the jurisdiction
fix) — `origin/staging` is at `1d42c23`.
**Gates:** 1655/1655 · tsc 0 · eslint 0 · build clean.
**SSOT tracker:** `docs/HyprrIQ_OPEN_ITEMS.md`.

---

## 0 · THE FIRST THING TO DO

```bash
git push origin staging          # the founder pushes; ask, do not assume
```

Then **re-run one case** (do not republish an old one). It will be the first case ever to exercise
`client_summary` with a schema that permits it, the surface-scoped prose rule, AND jurisdiction-aware
research together. Everything below about prose quality is **unproven** until that run exists.

Verify it stamped correctly before spending on more:
```sql
select c.case_number, c.pipeline_version, s.prompt_version, s.ios_version
from cases c join case_synthesis s on s.case_id = c.id order by c.created_at desc limit 1;
```
Want `p002-1.0.0` / `HyprrIQ IOS v0.3-client-summary`.

---

## 1 · THE THREE THINGS THAT ARE STILL UNPROVEN

Say these plainly to the founder rather than implying they work.

1. **NO PDF HAS EVER BEEN RENDERED.** `report_pdf` audit rows: **0, all time.** The `reports`
   bucket is **empty**. Chromium in the deployed Inngest worker is UNTESTED. The whole §4 chain —
   render, store, signed download, email attachment — is unit- and source-locked and has never
   executed once.
2. **`client_summary` HAS NEVER PRODUCED PROSE.** On AWI-2608-039 (first p002 case) all three
   scored areas rendered the code-owned placeholder, because the output schema forbade the field.
   Schema fixed in `27877eb`; **still never exercised.**
3. **NO CASE HAS BEEN PUBLISHED SINCE THE SESSION BEGAN.** Five attempts (035–039), zero
   deliveries. Every one sits at `awaiting_review`.

## 2 · WHY PUBLISHES KEEP NOT HAPPENING — the live thread

The founder clicks publish; nothing is delivered. **Audit log shows only the operator-run `INSERT`.**
A gate block WRITES an audit row (`not_deliverable` / `banned_language` / `internal_tokens`), so its
absence means the route returned before any audit write. Paths that leave no trace: 401, 403
(`isAdmin` / `can()` / `caseInScope`), 404, 400.

**The unanswered question: what does the screen say when the founder clicks publish?** Ask. A 403 or
404 is the shape of what the data shows. Do not theorise further without that.

**Known real blocks on 039** (measured, `scripts/publish-preflight.ts`): **3**, all genuine —
weight-key names the model wrote into question `reason` prose under p001. Those need a re-run, not
a republish.

---

## 3 · WHAT LANDED THIS SESSION (23 commits, `cf033f5`..`83c51cb`)

### The root causes found, in order of how much they explained
- **`summary` IS `reasoning_notes`** (`0dd8824`). `pipeline.steps.ts` assigned the client-facing
  summary FROM the model's internal scratchpad on all five write sites. That one line explained the
  weight-key narration, the corroboration vocabulary, the raw key names and the first-person voice.
  **Every strip, cleaner and substitution before it treated symptoms.** Fixed with a second field,
  `client_summary`; `reasoning_notes` stays internal and is deliberately NOT disciplined.
- **`questions_to_ask` had NO projection** (`1d42c23`). `compiled_findings_json` has had an
  allowlist since F2; questions never did, so every consumer improvised and THE SAME BUG SHIPPED
  FOUR TIMES (scanner, locator, RSC boundary, checkpoint payload). The client `Finding` type was
  the INTERNAL contract (`QuestionToAsk[]`), which *requires* `blocking_weight_key` — the client
  shape demanded the fields that must never cross.
- **The engine had no concept of jurisdiction** (`83c51cb`). `business_registry` searched
  `"secretary of state"` for every supplier on earth; `bbb_listing` searched a US/Canada-only body.
  `government_registration` is **+4, the largest positive in the identity table**. A legitimate
  non-US distributor lost up to 5 points for being non-US.
- **Module 9 interpolated `doubt_focus` into FOUR noun-phrase slots** (`a59c5cd`) across three
  doubt levels — the concatenation, diagnosed wrongly twice before.

### Also landed
§1 token leaks + presence checkpoint (`cf033f5`) · Class 4 track-prose coverage (`be9975b`) ·
§5 Stripe client name (`7b73cbb`) · §2 Track 6 client surface (`ba63e4d`) · §3 layout + reading
column (`12fea70`, `90cf0dc`) · §4 PDF end-to-end code (`bf4236f`) · shared display copy +
Sourcing Logic option (b) (`1e818f2`) · weight-key names in the gate (`b27b32c`).

### ⚠ DEFECTS I SHIPPED AND THEN FIXED — read these, they are the pattern
- `EV-\d{3}` matched inside the product model **`EV-2000`** and shipped "the **0** charger".
- A min-3-word fragment guard **deleted a real finding** ("Enforcement documented.").
- `client_summary` added to prompt + parser but **not the schema** → structurally impossible for the
  model to return. **My fixtures all passed**: they proved the instruction arrived and the parser
  coped, and never that the model was ALLOWED to answer.
- The Class 4 scanner read `blocking_weight_key` — a field whose value IS a weight key — and blocked
  nearly every case. **I fixed the scanner and not its twin the locator, written in the same commit.**
- The delivery email's origin moved to an env var **nothing else in the codebase reads**.

**The pattern:** each was a rule that enumerated instances instead of defining a boundary, or a
fixture that tested what I had in mind. The founder's standing rule exists for exactly this.

---

## 4 · OPEN — THE FOUNDER'S PRODUCT QUESTIONS, NEVER ANSWERED

He asked for these **read-only, report-only, do not propose fixes**. They were deferred for the
publish thread and are still owed. **They decide whether $99 can be sold and whether the verdict
scale is doing any work.**

**3a · Why did $99 land differently?** Same vendor, four tiers: $99 came out **Do Not Rely**;
$149, Growth and Scale all came out **Verify Before Purchase**. Report side by side: resolved
identity + confidence (all four unified to `Lacaco Wholesale` / `lacacorp.com`), per-area signals
and 0–15 scores, the weighted score and **how weights redistributed with two of five areas absent**,
whether a veto or floor fired, verdict and margin to the nearest band. Then answer plainly: is it a
correct consequence of running three areas, or is something wrong? If correct, explain what a $99
buyer would understand from a harsher verdict on the same vendor than a Growth buyer got the same
day. **A cheaper tier that systematically reads more negatively is a product characteristic that
either needs saying on the pricing page or the tier needs rethinking.**

**3b · Is "Verify Before Purchase" the default answer?** Verdict distribution across every
delivered case. For cases where authorization could not be positively confirmed: what verdict, and
what did the report tell the client about the consequence of buying from an unauthorized source —
**quote the actual sentences**. If nearly every case lands mid-scale, the four-level scale carries
little information and the product's value is the reasoning and checklist instead.

**3c · The authorization-absence problem — the one that matters most.** Many genuinely authorized
distributors are not listed on a brand's site and never will be. Trace precisely: which weight keys
fire on absence (`no_connection_found`, "not found in brand locator"), what points they carry,
whether any veto or floor is reachable **by absence alone**. Is absence NEUTRAL or quietly scoring
negative? And the inverse ceiling question: **when a brand publishes no locator at all, can the
engine ever reach a positive supply-chain finding — or is a real authorized distributor
structurally indistinguishable from an unauthorized one?** If so, that is a ceiling on what this
product can honestly claim and it must be named.

---

## 5 · THE QUEUE AFTER THAT

| # | Item | Note |
|---|---|---|
| 1 | Prove the PDF path end to end | Needs a published case. Operator-house cases can prove render/store/download but **NEVER the email attachment** — `shouldEmailClient` skips `operator_house` by ruling. Use a real client account for that link |
| 2 | Marketing claims — strip 2 unbacked | "Deep analysis + contradiction checks" (**no plan gating exists anywhere in synthesis**) and "Delivered within 24 hours" framed as a Scale extra (**one constant, same on $99**) |
| 3 | Virus scanning | Launch-blocking; Growth accepts uploads. **Not VirusTotal free tier** — Scanii or Cloudmersive |
| 4 | `staging` → `main` | `main` is still *"Initial commit from Create Next App"*. Plan as its own event |
| 5 | RLS / tenancy isolation | Service-role with manual scoping, unproven before a first real client |
| 6 | Legal pages | Parallel, no code |
| 7 | Live Stripe — **$99 + Growth only** | $149/Scale stay test-mode until they open |
| 8 | Keepa | The deferred lane. Three inert Track 3 keys + Track 6 ASIN path + synthesis reasoning |

**Ruled and recorded:** build all four tiers, **sell $99 and Growth**, show $149/Scale as coming
soon. Only Keepa is deferred.

---

## 6 · MECHANICS YOU CANNOT GUESS

- **Founder-script invocation:**
  `npx tsx --conditions=react-server --tsconfig tsconfig.json --env-file=.env.local <script>`
- **`.env.local` IS NOT PRODUCTION.** Claude asserted production state from it three times and was
  wrong every time. If env state matters, say it cannot be verified locally and ask.
- **The instruments, and what each measures — never merge them:**
  - `scripts/gate-census.ts` — RAW publish surface, language + derivation. **The launch-risk number.**
  - `scripts/token-leak-sweep.ts` — PROJECTED client payload. `FOCUS=<class>` dumps every sentence.
  - `scripts/publish-preflight.ts` — what the publish route will do, without publishing. **Use this
    before telling the founder to click publish.**
  - `scripts/pdf-preflight.ts` — Chromium, client names, bucket, tiers, email key.
  - `scripts/render-check-034.ts` — `CASE=X` prints the exact client projection. Settles
    "the report says…" arguments in one run.
  - `scripts/jurisdiction-probe.ts` · `scripts/doubt-focus-shape-probe.ts` ·
    `scripts/track6-surface-probe.ts` · `scripts/track-prose-class-census.ts`
- **Census is 58% and that is EXPECTED, not a failed fix.** It measures STORED prose from old
  prompts. Corpus re-runs are ruled OUT. Anyone reading the number cold will assume otherwise.
- **Bash heredocs and `node -e` mangle this content** (backticks, `${}`, em-dashes). Write files
  with the Write tool; commit with `git commit -F <file>`. This bit me four times.
- **CHECK THE STAGED COLUMN BEFORE EVERY COMMIT.** Never `git add -A`. `skills-lock.json` and the
  founder's untracked folders (`.claude/`, `backups/`, `codex-fresh-design/`,
  `mockups-codex-exploration/`) stay out.
- **Supabase MCP works** and the founder has authorised its use for reads and for writes he names.
  Project `mjkacjrrrmlwlwkienvq`. `ios_version` is TEXT not jsonb — `s.prompt_version` is a column.
- **Two writers.** The founder edits the DB while you work; `ecommerce.a@libereconline.com` gained a
  name between two of my reads. Never claim a change you did not make.

---

## 7 · STANDING RULES (founder-set; violating these is the actual failure mode)

1. **A named case is a test example, NEVER the design input.** Measure the corpus before writing any
   rule. Check every component at all four tiers before writing it.
2. **Every new cleaner or scanner ships with fixtures covering shapes the author did NOT have in
   mind.** This caught five defects in three days, three of them mine.
3. **One instrument, one number** — a gate and its census never measure different things.
4. **A per-case JSON flag cannot define a product claim.** (`non_voting` is inconsistent across
   stored `sourcing_logic` rows; the area count derives from the `TRACKS` registry.)
5. **Scan the CLIENT PROJECTION, not the raw row.** If a field does not cross, it must not be
   scanned. This had four instances.
6. **Discipline is scoped to the SURFACE, not to a field name.** A rule that lists fields leaves the
   next field uncovered by default.
7. **One section per commit. Check the staged column first.**
8. **Founder runs all prod actions.** Any migration → describe and stop with exact SQL + read-backs.
9. **Frozen surfaces:** engine, tracks, synthesis, verdict engine, category gate. The frozen rule
   protects THE VERDICT — signals, weights, thresholds, vetoes. An added output field the verdict
   never reads does not touch it (that ruling is what made `client_summary` buildable, and it is
   asserted by a test, not assumed).
10. **Do not ask for rulings the founder would obviously grant.** Decide, build, and list the
    judgement calls at the end. Stop only for: migrations/data writes, a public bucket, frozen-surface
    changes, the corpus contradicting the brief, or a change to what a client is charged/promised/shown.

---

## 8 · UNRULED, RECORDED, NOT DECIDED

- **Three strings of our own client copy trip the derivation scanner** —
  `CHIP_DEFS.verified` ("multiple independent sources confirm this"), `CHIP_DEFS.assessed`, and
  `AREA_DEFS.documentation_review` ("What any documents you provided corroborate", a clear false
  positive). Explicit three-item carve-out in `reportCopy.test.ts` with a test that FAILS if the
  copy is reworded, so it cannot widen into a class. **Editing them changes what a client reads.**
- **`MODERATE-HIGH`** exists in the category flags table; the ruling named only HIGH and MODERATE.
  Mapped to the flagged label — my reading, not a ruling.
- **Bucket-level `file_size_limit` / `allowed_mime_types` are now set** (founder ran it; verified
  live, and the preflight's `text/plain` probe is rejected). No longer open.
