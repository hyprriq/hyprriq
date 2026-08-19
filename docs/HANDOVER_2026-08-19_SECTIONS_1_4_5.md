# HANDOVER — 2026-08-19 → next session

**Read cold. Nothing here is to be taken on trust:** every number below was measured this session
and is re-checkable with the commands given. If your reading of the code or the data disagrees with
this file, **the file is wrong** — say so with evidence. That has happened repeatedly and it is how
the real defects keep getting found, including two of mine this session.

**Branch** `staging`. **Landed:** `cf033f5` (§1) · `be9975b` (Class 4) · `7b73cbb` (§5).
**Gates at handover:** 1495/1495 · tsc 0 · eslint 0 · frozen surfaces untouched.
**SSOT tracker:** `docs/HyprrIQ_OPEN_ITEMS.md` — the top three dated blocks are this session.

---

## 0 · THE ONE THING TO READ FIRST

**I RAISED THE PUBLISH GATE AND IT NOW BLOCKS 44% OF THE CORPUS.** Class 4 (`be9975b`) extended the
derivation scanner to track prose, as ruled. Census went **8/39 (21%) → 17/39 (44%)**.

**The rise is correct — those cases always leaked and nothing looked — but it is NOT mostly
`weight_key`, which is what the ruling anticipated.** It is **corroboration vocabulary in track
prose**, on 11 cases. The engine-prose pass retired that exact class in SYNTHESIS prose on
2026-08-17 and **was never run over TRACK prose**.

**PRACTICAL CONSEQUENCE: publishing a new case is now materially more likely to be held.** That is
the gate doing its job, but it is a launch-risk change made today and it needs a decision:
run the confirms→supports engine-prose pass over track prose, or re-scope the rule for that surface.
**Do not "fix" this by narrowing the scanner** — the coverage is ruled.

Re-measure any time:
```
npx tsx --conditions=react-server --tsconfig tsconfig.json --env-file=.env.local scripts/gate-census.ts
```

---

## 1 · CAN THE FOUNDER SHOW A PAYING CUSTOMER A REPORT TODAY?

**On screen: yes at $99 and $499, with one caveat. As a PDF: no, at any tier.**

| | on screen | as PDF |
|---|---|---|
| $99 `single_99` | ✅ 3 areas | ❌ |
| $149 `single_149` | ⚠️ unverified — env is the founder's check, not mine | ❌ |
| $499 `scale_499` | ⚠️ renders, but Track 6 is invisible + two rendering bugs (§2) | ❌ |

**Why the PDF is no at every tier — four separate missing pieces, none of them the document:**
the document itself is finished and verified. `renderCaseReportPdf({ case })` works and is
deterministic. What does not exist: (1) nothing calls it at publish; (2) there is no storage
bucket; (3) there is no authorized download route; (4) the portal button still says "coming soon".
`no_client_name` is no longer a blocker for NEW checkouts (`7b73cbb`) but **existing clients with a
null `full_name` are still blocked until the founder runs the backfill** — the names are in Stripe,
not in our DB, so it is not a pure SQL update. Exact steps are in `7b73cbb`'s commit message.

**The $499 caveat is §2, unstarted:** `category_compliance` renders as a raw internal key in the
areas list and the header reads "THE 6 ASSESSMENT AREAS" when we sell five. Track 6 — the Scale
differentiator — is invisible. **I would not show a $499 report to a paying customer today.**

---

## 2 · WHAT LANDED, AND THE FINDINGS THAT MATTER

### §1 — `cf033f5` — token leaks + presence checkpoint
Corpus effect, measured over all 35 projected payloads before and after:
**cases carrying an internal token 34/35 → 6/35.** `src_N` 169→0 · `EV-NNN` 3→0 · UUID 47→0 ·
`stub track_N` 47→0 · `dimension` 30→0. Residue: one accepted `A-NN`, and `weight_key` (Class 4).

**THE TRACKER'S ROOT CAUSE WAS WRONG AND IS NOW CORRECTED.** It was not "REF_GROUP matches
parenthesised groups only". AWI-2608-034's leaked field is `(EV-001, EV-004, EV-005, A05, A08)` —
that citation **is** parenthesised. The real cause: **the matcher requires EVERY member of a group
to be a known token, so one unrecognised shape (`A05`, `A08`) disabled the match for every known
token beside it. An unknown token does not merely survive — it PROTECTS the known ones.**

**Two of my own defects were caught by corpus fixtures, not by review:**
1. The "anchored" `EV-\d{3}` had **no anchor** — it matched inside the product model `EV-2000` and
   shipped "the **0** charger". A false strip corrupting a client's own product name is worse than
   the leak the module exists to stop.
2. A min-3-word fragment guard **deleted a real finding** ("Enforcement documented.").

The standing rule has now caught five things in three days. It is earning its place.

### Class 4 — `be9975b` — see §0 above.
**One UNRULED gap, deliberately left open:** `METHOD_PATTERNS` matches `weight[_\s]?key\b`, which
does **not** match the PLURAL, and the corpus contains plurals. Adding `s?` widens a GATE RULE, and
the ruling was a coverage extension. **The token-leak sweep (counts `keys?`) and the gate (narrower)
disagree on purpose until this is ruled. Do not reconcile them without the ruling.**

### §5 — `7b73cbb` — client name from Stripe
Captured above the three-way branch, set-if-null by SQL predicate.
**`company_name` has NO Stripe source** — `customer_details` has no company field and no
`custom_fields` are configured. Reported rather than invented. Collecting one means changing the
checkout session, which is a separate decision.

---

## 3 · THE QUEUE FROM HERE (founder-set, unchanged)

| § | Work | State |
|---|---|---|
| 2 | Track 6 client surface + area count + category scanner | **NEXT.** Fully ruled, unstarted |
| 3 | Presentation pass | Unblocked — prototype at `public/prototype/**` |
| 4 | PDF — make it real | Unblocked — four pieces, listed above |
| — | Engine prose over TRACK prose | **NEW, from §0. Decide before launch.** |
| — | Shared display copy → `lib/content/` | Ruled this session, unstarted |

### §2 — everything needed is already ruled; nothing is open
Projector BRANCH in `projectFindingJsonForClient`, never the allowlist (`matched_via:
"category_research"` must not cross). Two visibly separate blocks, separate attribution.
`risk_level` renders as "Flagged for closer attention than the other categories on this case",
**never HIGH** — without an ASIN the engine cannot know which category the product sits in.
**Five in the count, six rows on screen, the sixth marked advisory; the count derives from VOTING
areas only.** `findCategoryLanguageViolations` joins the delivery composition **inside** the merged
census — a third scanner outside it re-creates the defect the merge fixed.

**I did not start §2 because it edits `components/portal/report-view.tsx`, which §3 also rewrites.**
Half a section in a shared file is worse than none. Do §2 and §3 in that order, or together.

### §4 — the PDF, in dependency order
1. Verify the bucket is **private** BEFORE writing anything. **If it is public, STOP — that is a P0.**
2. Render at publish, after `checkDeliverable`, as a retriable Inngest job beside `seedCaseOutcome`
   (`app/api/admin/cases/[id]/review/route.ts`). A failed render alarms; it never rolls back or
   delays a delivery.
3. Store immutably: `{client_id}/{case_number}-attempt-{delivered_attempt}.pdf`. Never overwrite —
   a dispute re-run makes a new attempt and the delivered PDF stays byte-frozen (H1).
4. Authorized download route: resolve the client, confirm ownership, confirm delivered, short-lived
   signed URL re-issued per click. Never public or enumerable.
5. Wire the button, retire "coming soon". Attach to the delivery email — **ruled sequencing: publish
   completes immediately → render job → email sends WITH the attachment when the render finishes;
   if the render permanently fails, the email goes without it and says so.** Publish is never blocked.
6. `review_additions` must render. The count-derivation debt returns here — the area count must
   DERIVE, not say five.
7. **The checkpoint already binds at PDF render.** ⛔ Do NOT add token-stripping to the template.

---

## 4 · MECHANICS THE NEXT SESSION CANNOT GUESS

- **Founder-script invocation:**
  `npx tsx --conditions=react-server --tsconfig tsconfig.json --env-file=.env.local <script>`
- **`.env.local` IS NOT PRODUCTION.** No claim about production env state was made this session and
  none should be. `STRIPE_PRICE_SINGLE_149` is the founder's check.
- **Two sweeps, two surfaces, ON PURPOSE.** `scripts/gate-census.ts` measures the RAW publish
  surface (language + derivation). `scripts/token-leak-sweep.ts` (new) measures the PROJECTED
  client payload. Raw legitimately carries `src_N`; projected must not. **Never merge them.**
  `FOCUS=<class>` on the sweep dumps every matching sentence — that is how the `dimension`
  double-sense and the `A05` root cause were found. Class keys: `src_n`, `ev_id`, `uuid`,
  `stub_track`, `a_id`, `dimension`, `weight_key`.
- **Bash heredocs break on this content.** Write files with the Write tool, commit with
  `git commit -F <file>`. This bit me again this session.
- **CHECK THE STAGED COLUMN BEFORE EVERY COMMIT.** Explicit-path `git add` does not protect against
  an already-dirty index. It was clean all three times today; that is not a guarantee for tomorrow.
- Never `git add -A`. `skills-lock.json` and the founder's untracked folders stay out.
- Supabase `list_migrations` returns EMPTY — inspect the schema directly.

## 5 · THE STANDING RULES

1. **A fixture that only carries the shape the rule was written for proves nothing about the shapes
   it wasn't.** Every new cleaner or scanner ships with fixtures covering shapes the author did NOT
   have in mind. **This caught both of my defects this session, inside the commit implementing it.**
2. **An incomplete attempt suppresses the census.** Read any census run together with the
   incomplete-attempt sweep.
3. **The cleaners are SHAPE-based and may always miss; the checkpoint is PRESENCE-based and may
   NEVER be widened into a shape matcher.** Both are written into the code and into an executable
   test (`lib/portal/clientRenderPaths.lock.test.ts`).
4. **My own rules written during mechanical edits get flagged UNRULED, never slipped in.** The
   `weight key` plural is this session's example.
