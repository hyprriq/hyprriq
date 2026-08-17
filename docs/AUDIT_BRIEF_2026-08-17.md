# END-TO-END AUDIT BRIEF — HyprrIQ delivery path

> **Paste this whole file as the first message of a FRESH session.** It is written to be read cold.
> Nothing in it may be taken on trust: every number below was verified on 2026-08-17 and every one
> of them is re-checkable. If your reading of the code or the data disagrees with this brief, **the
> brief is wrong** — say so, with the evidence. That has already happened twice this week.

---

## 0 · REQUIRED SKILLS — invoke before you start

Invoke these, in this order, before any analysis:

1. **`superpowers:using-superpowers`** — establishes skill discipline for the session.
2. **`superpowers:systematic-debugging`** — this audit is a hunt, not a review. Use it whenever you
   find something that looks wrong, before you write it up.
3. **`engineering:architecture`** — for the CTO-lens sections (§6 debt, §7 dead weight, and the
   due-diligence verdict).
4. **`superpowers:dispatching-parallel-agents`** — you will fan out per path stage; read this first.
5. **`code-review`** at `high` — for the correctness sections. Do NOT let it replace data queries.

If a skill's guidance conflicts with this brief, this brief loses — except on read-only discipline,
which nothing overrides.

---

## 1 · YOUR TWO ROLES

You hold both lenses on every stage. Findings from either go in the same ranked list.

**AS TESTER** — *"does it actually work, and how do I know?"*
Exercise the path in the data. For every stage ask: has this ever run end to end? What is the
evidence it ran? What happens on the unhappy path? Who finds out when it breaks? A stage nobody has
executed is a finding even if the code looks perfect — **that class produced both of this week's
defects.**

**AS CTO** — *"what would a buyer's engineer find, and what will resist change?"*
The founder intends to sell this business. Assume a technical due-diligence reviewer runs this same
audit with less charity and more time. Where is logic duplicated so it can drift? Where does a
manual step sit in an automated path? What is dead? What would you be embarrassed to explain?

---

## 2 · HARD CONSTRAINTS

- **READ-ONLY. Change nothing, build nothing, fix nothing.** Report and rank only.
- **Spend no money.** No pipeline runs, no re-runs, no replays, no model calls. `rejudge-case.ts`,
  `gate-census.ts`, `prose-diff.ts` and SQL reads are all free — use them freely.
- **Never `git add -A`** (founder's untracked folders must stay out).
- **DB writes are founder-only.** Read via Supabase MCP `execute_sql` or a tsx script.
- Founder-script invocation:
  `npx tsx --conditions=react-server --tsconfig tsconfig.json --env-file=.env.local <script>`

---

## 3 · METHOD — the part that decides whether this audit is worth anything

**Go looking. Do not review from memory, and do not audit from the code alone.**

Both defects that bit this week were invisible to code review and obvious in the data:

- **The gate block rate** — needed the real gate run across the whole corpus. No amount of reading
  `banned-language.ts` would have produced the number.
- **The attempt skew** — needed attempt numbers compared between two tables. The code reads
  perfectly well; two functions each pinned to a *different* "latest" and nothing said so.

So for each stage: **trace the actual code, then query the actual data.** When a claim can be
checked in the DB, check it. When two reads should agree, verify they are pinned to the same thing —
**that is a defect class, not a one-off, and you should go hunting for more of it.**

A prior audit produced a long flat list where real problems sat beside cosmetic ones and missed both
defects above. Do not repeat it. Fewer findings, each verified, ranked honestly.

**Fan out:** dispatch one subagent per path stage (§5). Each traces its stage's code *and* queries
the data for it, returning structured findings. You synthesise and rank. Do not let a subagent
rank severity — that requires seeing the whole path.

---

## 4 · VERIFIED STATE — 2026-08-17 (re-check anything you rely on)

**Repo:** `D:\Projects\Hyprriq\portal`, branch `staging`. **SSOT tracker:** `docs/HyprrIQ_OPEN_ITEMS.md`
(read the top dated blocks first). **Supabase project:** `mjkacjrrrmlwlwkienvq`.

**Gates:** 1389/1389 tests · tsc 0 · eslint 0.

**Corpus:** 39 cases — `delivered` 6, `awaiting_review` 21, `manual_override_required` 8,
`research_failed` 3, `submission_failed` 1. MRR $778. 35 of 39 have synthesis at their latest attempt.

**Publish-block rate, measured today across all 39:** language gate 8, method scanner 1,
**either 9**. `AWI-2608-033` (Growth) verified PUBLISHABLE against the route's own preconditions;
`AWI-2608-034` (Scale) BLOCKED on the single word `"corroborated"` in
`decision_snapshot.leading_interpretation`.

**Landed this week:** the `confirms→supports` engine-prose pass (four prompts, `prompt_version`
`p001-1.0.0`, `ios_version` `HyprrIQ IOS v0.2-prose`); the publish-block locator
(`lib/utils/bannedLanguageReport.ts`); the deliverability precondition
(`lib/research/deliverability.ts`); the six-invariant repair guard (`lib/research/proseRepair.ts`,
localized-edit enforced as law); migrations `gate_events` and `cases.review_additions` (applied,
**both empty, nothing reads them**).

**NOT built — do not report these as discoveries:** the self-correcting loop; operator attachments;
a locator for the method scanner; a preflight on `replay-attempt.ts`; the PDF lane (paused).
`case_prose_overrides` exists in production **unwired, 0 rows, by ruling** (cancelled feature).

**Known and ruled, not findings:** email templates are plain text; the PDF is not attached to email;
Track 6's client surface shows a placeholder while real findings are stored.

**Traps that have already caught someone this week — do not repeat them:**

- **`.env.local` PROVES NOTHING about production.** Emails work and have for days;
  `RESEND_API_KEY`, `RESEND_FROM`, `SUPPORT_INBOX` are all set in Vercel. This error was made twice.
  If you need to know whether an env var is set in staging, **say you cannot verify it locally**.
- **Supabase `list_migrations` returns EMPTY** — migrations were applied by hand. It proves nothing.
  Inspect the schema directly.
- **`scripts/gate-census.ts` measures only the language gate.** The publish path runs a second
  scanner (`scanSynthesisAtDelivery`). Any "launch risk" number from the census alone is half a number.

---

## 5 · THE PATH — one subagent per stage

`signup → checkout → provisioning → submit → intake → identity resolution → the six tracks →
synthesis → verdict → review → publish → email → client report → PDF`

For each stage report: **does it work and how do you know · what can fail · is a failure visible to
the founder, to the client, or to nobody · what has never executed even once.**

Known-thin stages worth extra weight: **checkout at the $149 tier (never exercised,
`STRIPE_PRICE_SINGLE_149` believed unset — verify, do not assume), Track 6 (exactly one stored
result, ever), the PDF lane (paused), and Inngest failure handling (no timeout alarm known).**

---

## 6 · THE SEVEN QUESTIONS

1. **Never executed end to end, even once.** Name every one. This class produced this week's
   surprise. Include tiers, plans, routes and branches — not just stages.
2. **Silent failures.** Where can something go wrong and nobody be told? Specifically include: cost
   reporting `$0` when synthesis flips to Opus (`PRICES` in `lib/ai/providers/anthropic.ts` has one
   row); an Inngest wedge with no timeout alarm; a case sitting in `research_failed` indefinitely; a
   status nothing sets; an alert with nowhere to go; a field never written.
3. **Correctness risks.** Anywhere a wrong or empty answer could reach a client and look right.
   **Include the verdict derivation not being stored** — the review screen recomputes it, so a weight
   change makes every historical report re-explain itself with new maths. **Hunt the attempt-skew
   class specifically: find every pair of reads that should agree and are not pinned to the same
   thing.** One such pair let an empty report publish this week; assume there are others.
4. **Data integrity.** Anything that can corrupt credits, usage, MRR, verdicts or attempt pins.
   The credit rules are law in `docs/SAAS_ARCHITECTURE.md §I` — check the code against them, not the
   other way round.
5. **Security.** RLS and tenancy isolation (scoped operators vs `super_admin`), service-role usage,
   upload handling and file sniffing, the admin perimeter, anything a penetration test would find.
6. **Architecture debt.** Manual steps that should be automatic; duplicated logic that can drift;
   frozen surfaces blocking work they shouldn't. The client projection is supposed to be the single
   path (`lib/portal/clientReport.ts`) — verify nothing bypasses it.
7. **Dead weight. Quantify it.** Tables with no writer, statuses nothing sets, routes nothing links,
   columns nothing reads. A buyer reads dead code as risk, so give counts, not adjectives.

---

## 7 · OUTPUT FORMAT — group by severity, never by subsystem

- **P0 — would break a paying client or lose money.** What · where (`file:line`) · why · the fix ·
  how long.
- **P1 — real risk, not yet biting.**
- **P2 — debt and hygiene.**
- **CLEAN — what you checked and found genuinely sound.** State it plainly and specifically. This
  section is as valuable as the problems and a buyer will ask for it. "I checked X by doing Y and it
  holds" — not "looks fine".

Every finding carries **how you verified it**. A finding with no verification method goes in P2 as a
suspicion, clearly labelled, or does not go in at all.

**Then answer directly, and bluntly on both halves:**
*What would a technical due-diligence reviewer flag in this codebase, and what would they be
impressed by?*

**Do not fix anything.** Report and rank so the founder can rule the order.
